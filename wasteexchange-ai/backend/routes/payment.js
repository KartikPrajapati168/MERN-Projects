// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const bcrypt = require('bcryptjs');
const { authMiddleware: auth } = require('../middleware/auth');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction'); // ✅ Import karein
const { generateInvoicePDF } = require('../utils/invoiceGenerator');
const { sendInvoiceEmail } = require('../utils/emailService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   POST /api/payment/set-pin
router.post('/set-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.userId;
    if (!pin || pin.length !== 4) return res.status(400).json({ message: 'PIN must be 4 digits' });
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    await User.findByIdAndUpdate(userId, { paymentPin: hashedPin });
    res.status(200).json({ message: '✅ Payment PIN set successfully' });
  } catch (error) {
    console.error("Set PIN Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/payment/create-order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, purpose, dealId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Invalid amount' });
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { purpose: purpose || 'wallet_topup', dealId: dealId || '', userId: String(req.userId) }
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/payment/add-money
router.post('/add-money', auth, async (req, res) => {
  try {
    const { amount, pin, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment details' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    if (amount < 100) return res.status(400).json({ message: 'Minimum amount is ₹100' });
    const user = await User.findById(userId);
    if (!user.paymentPin) return res.status(400).json({ message: 'Pehle apna Payment PIN set karein.' });
    const isPinValid = await bcrypt.compare(pin, user.paymentPin);
    if (!isPinValid) return res.status(400).json({ message: 'Invalid Payment PIN!' });

    const transactionId = razorpay_payment_id;
    const pdfBuffer = await generateInvoicePDF({ id: transactionId, amount: amount, type: 'Add Money' });
    
    try {
      await sendInvoiceEmail(user.email, pdfBuffer, transactionId);
    } catch (emailError) { console.error("Email error:", emailError); }

    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save();

    // ✅ Save Transaction History
    await WalletTransaction.create({
      userId: user._id,
      amount: Number(amount),
      type: 'add_money',
      method: 'razorpay',
      status: 'success',
      balanceAfter: user.walletBalance,
      description: `Added money via Razorpay (${transactionId})`
    });

    res.status(200).json({ message: '✅ Payment successful, Invoice emailed!', transactionId, newBalance: user.walletBalance });
  } catch (error) {
    console.error("Add Money Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ✅ NEW: @route   GET /api/payment/transactions
// @desc    Get user's transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ✅ NEW: @route   GET /api/payment/invoices
// @desc    Get user's invoices
router.get('/invoices', auth, async (req, res) => {
  try {
    const invoices = await WalletTransaction.find({ 
      userId: req.userId,
      type: { $in: ['add_money', 'deal_payment', 'deal_receive'] }
    }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// backend/routes/payment.js
const fs = require('fs');
const path = require('path');

// @route   GET /api/payment/invoice/:id
// @desc    Download invoice PDF by transaction ID
router.get('/invoice/:id', auth, async (req, res) => {
  try {
    const transaction = await WalletTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ msg: 'Transaction not found' });
    if (String(transaction.userId) !== String(req.userId)) return res.status(403).json({ msg: 'Unauthorized' });

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF({ 
      id: transaction._id, 
      amount: transaction.amount, 
      type: transaction.type 
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${transaction._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Invoice download error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;