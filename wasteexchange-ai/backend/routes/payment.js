// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { authMiddleware: auth } = require('../middleware/auth');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   GET /api/payment/key
// @desc    Return Razorpay key_id for frontend
router.get('/key', auth, (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// @route   POST /api/payment/create-order
// @desc    Create Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, purpose, dealId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Invalid amount' });

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { purpose: purpose || 'wallet_topup', dealId: dealId || '', userId: String(req.userId) }
    };

    const order = await razorpay.orders.create(options);
    console.log(`✅ Razorpay order created: ${order.id} for ₹${amount}`);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('❌ Razorpay order error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify Razorpay payment signature
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Missing payment verification fields' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');

    if (generated !== razorpay_signature) {
      console.warn('⚠️ Payment signature mismatch');
      return res.status(400).json({ success: false, msg: 'Invalid signature' });
    }

    console.log(`✅ Payment verified: ${razorpay_payment_id}`);
    res.json({ success: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
  } catch (err) {
    console.error('❌ Verify error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;