// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const bcrypt = require('bcryptjs');
const { authMiddleware: auth } = require('../middleware/auth');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Invoice = require('../models/Invoice');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const { logActivity } = require('../utils/activityLogger');
const { sendWalletTopupEmail } = require('../utils/emailService');

// ============================================================
// POST /api/payment/set-pin
// ============================================================
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
    console.error('Set PIN Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ============================================================
// POST /api/payment/create-order
// ============================================================
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, purpose, dealId } = req.body;

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { purpose: purpose || 'payment', dealId: dealId || '' },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ============================================================
// POST /api/payment/add-money
// ============================================================
router.post('/add-money', auth, async (req, res) => {
  try {
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify Razorpay signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Add money to wallet
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { walletBalance: Number(amount) } },
      { new: true }
    );

    const txn = await WalletTransaction.create({
      userId: user._id,
      amount: Number(amount),
      type: 'add_money',
      method: 'razorpay',
      status: 'success',
      balanceAfter: user.walletBalance,
      description: `Added money via Razorpay (${razorpay_payment_id})`,
    });

    // ✅ Log: Wallet top-up
    await logActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'wallet_topup',
      title: `Wallet top-up ₹${Number(amount).toLocaleString('en-IN')}`,
      details: `${user.name} added ₹${Number(amount).toLocaleString('en-IN')} via Razorpay`,
      metadata: { amount: Number(amount), razorpayPaymentId: razorpay_payment_id, newBalance: user.walletBalance },
      req,
    });

    // ✅ Email: Wallet top-up confirmation
    try {
      await sendWalletTopupEmail(user.email, user.name, Number(amount), user.walletBalance);
    } catch (e) { console.error('Topup email:', e.message); }

    // ✅ Create Invoice record (for PDF details)
    try {
      await Invoice.create({
        userId: user._id,
        amount: Number(amount),
        type: 'add_money',
        method: 'razorpay',
        status: 'success',
        description: `Added money via Razorpay`,
        transactionId: txn._id,
        buyerName: user.name || '',
        buyerEmail: user.email || '',
        subtotal: Number(amount),
        platformFee: 0,
        razorpayPaymentId: razorpay_payment_id,
      });
    } catch (invoiceErr) {
      console.error('⚠️ Invoice creation failed:', invoiceErr.message);
    }

    res.json({
      success: true,
      message: 'Payment successful!',
      newBalance: user.walletBalance,
    });
  } catch (err) {
    console.error('add-money error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET /api/payment/transactions
// ============================================================
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// GET /api/payment/invoices — list all invoices for user
// ============================================================
router.get('/invoices', auth, async (req, res) => {
  try {
    let invoices = await Invoice.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Fallback: If Invoice collection is empty, use WalletTransaction
    if (!invoices || invoices.length === 0) {
      const txns = await WalletTransaction.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .lean();

      invoices = txns.map((t) => ({
        _id: t._id,
        userId: t.userId,
        amount: t.amount,
        type: t.type,
        method: t.method,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        buyerName: '',
        material: '',
      }));
    }

    res.json(invoices);
  } catch (err) {
    console.error('❌ /invoices error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// GET /api/payment/invoice/:id — download PDF
// ============================================================
router.get('/invoice/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Try Invoice model first
    let invoice = await Invoice.findById(id).lean();
    let user = null;

    if (invoice) {
      user = await User.findById(invoice.userId).lean();
    } else {
      // ✅ Fallback to WalletTransaction
      const txn = await WalletTransaction.findById(id).lean();
      if (!txn) {
        return res.status(404).json({ msg: 'Invoice not found' });
      }
      user = await User.findById(txn.userId).lean();
      invoice = {
        _id: txn._id,
        userId: txn.userId,
        amount: txn.amount,
        type: txn.type,
        method: txn.method,
        status: txn.status,
        description: txn.description,
        createdAt: txn.createdAt,
        buyerName: user?.name || '',
        buyerEmail: user?.email || '',
        generatorName: '',
        generatorEmail: '',
        material: '—',
        materialSubtype: '',
        quantity: 0,
        pricePerUnit: 0,
        subtotal: Math.abs(txn.amount),
        platformFee: 0,
        location: '',
      };
    }

    // Verify ownership
    const invoiceUserId = String(invoice.userId);
    if (invoiceUserId !== String(req.userId)) {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ msg: 'Not authorized' });
      }
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${id}.pdf"`);

    // Generate PDF and pipe to response
    const pdfDoc = generateInvoicePDF(invoice, user || {});
    pdfDoc.pipe(res);
  } catch (err) {
    console.error('❌ /invoice/:id error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;






































// // backend/routes/payment.js
// const express = require('express');
// const router = express.Router();
// const crypto = require('crypto');
// const Razorpay = require('razorpay');
// const bcrypt = require('bcryptjs');
// const { authMiddleware: auth } = require('../middleware/auth');
// const User = require('../models/User');
// const WalletTransaction = require('../models/WalletTransaction'); // ✅ Import karein
// const { generateInvoicePDF } = require('../utils/invoiceGenerator');
// const { sendInvoiceEmail } = require('../utils/emailService');

// const { generateInvoicePDF } = require('../utils/pdfGenerator');
// const Invoice = require('../models/Invoice');
// const WalletTransaction = require('../models/WalletTransaction');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // @route   POST /api/payment/set-pin
// router.post('/set-pin', auth, async (req, res) => {
//   try {
//     const { pin } = req.body;
//     const userId = req.userId;
//     if (!pin || pin.length !== 4) return res.status(400).json({ message: 'PIN must be 4 digits' });
//     const salt = await bcrypt.genSalt(10);
//     const hashedPin = await bcrypt.hash(pin, salt);
//     await User.findByIdAndUpdate(userId, { paymentPin: hashedPin });
//     res.status(200).json({ message: '✅ Payment PIN set successfully' });
//   } catch (error) {
//     console.error("Set PIN Error:", error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

// // @route   POST /api/payment/create-order
// router.post('/create-order', auth, async (req, res) => {
//   try {
//     const { amount, purpose, dealId } = req.body;

//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID,
//       key_secret: process.env.RAZORPAY_KEY_SECRET,
//     });

//     const order = await razorpay.orders.create({
//       amount: Number(amount) * 100,
//       currency: 'INR',
//       receipt: `rcpt_${Date.now()}`,
//       notes: { purpose: purpose || 'payment', dealId: dealId || '' },
//     });

//     res.json({
//       success: true,
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       keyId: process.env.RAZORPAY_KEY_ID,   // ✅ YE LINE ADD KARO
//     });
//   } catch (err) {
//     console.error('create-order error:', err);
//     res.status(500).json({ success: false, msg: err.message });
//   }
// });

// // @route   POST /api/payment/add-money
// // router.post('/add-money', auth, async (req, res) => {
// //   try {
// //     const { amount, pin, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
// //     const userId = req.userId;

// //     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
// //       return res.status(400).json({ message: 'Missing Razorpay payment details' });
// //     }

// //     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
// //     hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
// //     const generated = hmac.digest('hex');

// //     if (generated !== razorpay_signature) {
// //       return res.status(400).json({ message: 'Invalid payment signature' });
// //     }

// //     if (amount < 100) return res.status(400).json({ message: 'Minimum amount is ₹100' });
// //     const user = await User.findById(userId);
// //     if (!user.paymentPin) return res.status(400).json({ message: 'Pehle apna Payment PIN set karein.' });
// //     const isPinValid = await bcrypt.compare(pin, user.paymentPin);
// //     if (!isPinValid) return res.status(400).json({ message: 'Invalid Payment PIN!' });

// //     const transactionId = razorpay_payment_id;
// //     const pdfBuffer = await generateInvoicePDF({ id: transactionId, amount: amount, type: 'Add Money' });

// //     try {
// //       await sendInvoiceEmail(user.email, pdfBuffer, transactionId);
// //     } catch (emailError) { console.error("Email error:", emailError); }

// //     user.walletBalance = (user.walletBalance || 0) + Number(amount);
// //     await user.save();

// //     // ✅ Save Transaction History
// //     await WalletTransaction.create({
// //       userId: user._id,
// //       amount: Number(amount),
// //       type: 'add_money',
// //       method: 'razorpay',
// //       status: 'success',
// //       balanceAfter: user.walletBalance,
// //       description: `Added money via Razorpay (${transactionId})`
// //     });

// //     res.status(200).json({ message: '✅ Payment successful, Invoice emailed!', transactionId, newBalance: user.walletBalance });
// //   } catch (error) {
// //     console.error("Add Money Error:", error);
// //     res.status(500).json({ message: 'Server Error' });
// //   }
// // });

// router.post('/add-money', auth, async (req, res) => {
//   try {
//     const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
//     // ✅ 'pin' ki zaroorat nahi — already verified via /verify-payment-pin

//     // Verify Razorpay signature
//     const crypto = require('crypto');
//     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//     hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
//     const generated = hmac.digest('hex');

//     if (generated !== razorpay_signature) {
//       return res.status(400).json({ message: 'Invalid payment signature' });
//     }

//     // Add money to wallet
//     const user = await User.findByIdAndUpdate(
//       req.userId,
//       { $inc: { walletBalance: Number(amount) } },
//       { new: true }
//     );

//     await WalletTransaction.create({
//       userId: user._id,
//       amount: Number(amount),
//       type: 'add_money',
//       method: 'razorpay',
//       status: 'success',
//       balanceAfter: user.walletBalance,
//       description: `Added money via Razorpay (${razorpay_payment_id})`,
//     });

//     res.json({
//       success: true,
//       message: 'Payment successful! Invoice sent to email.',
//       newBalance: user.walletBalance,
//     });
//   } catch (err) {
//     console.error('add-money error:', err);
//     res.status(500).json({ message: err.message });
//   }
// });

// // ✅ NEW: @route   GET /api/payment/transactions
// // @desc    Get user's transaction history
// router.get('/transactions', auth, async (req, res) => {
//   try {
//     const transactions = await WalletTransaction.find({ userId: req.userId }).sort({ createdAt: -1 });
//     res.json(transactions);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });




// // ============================================================
// // GET /api/payment/invoices — list all invoices for user
// // ============================================================
// router.get('/invoices', auth, async (req, res) => {
//   try {
//     let invoices = await Invoice.find({ userId: req.userId })
//       .sort({ createdAt: -1 })
//       .lean();

//     // ✅ Fallback: If Invoice collection is empty, use WalletTransaction
//     if (!invoices || invoices.length === 0) {
//       const txns = await WalletTransaction.find({ userId: req.userId })
//         .sort({ createdAt: -1 })
//         .lean();

//       invoices = txns.map((t) => ({
//         _id: t._id,
//         userId: t.userId,
//         amount: t.amount,
//         type: t.type,
//         method: t.method,
//         status: t.status,
//         description: t.description,
//         createdAt: t.createdAt,
//         updatedAt: t.updatedAt,
//         // no deal details — legacy record
//         buyerName: '',
//         material: '',
//       }));
//     }

//     res.json(invoices);
//   } catch (err) {
//     console.error('❌ /invoices error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });


// // backend/routes/payment.js
// const fs = require('fs');
// const path = require('path');

// // @route   GET /api/payment/invoice/:id
// // @desc    Download invoice PDF by transaction ID
// // ============================================================
// // GET /api/payment/invoice/:id — download PDF
// // ============================================================
// router.get('/invoice/:id', auth, async (req, res) => {
//   try {
//     const { id } = req.params;

//     // ✅ Try Invoice model first
//     let invoice = await Invoice.findById(id).lean();
//     let user = null;

//     if (invoice) {
//       user = await User.findById(invoice.userId).lean();
//     } else {
//       // ✅ Fallback to WalletTransaction
//       const txn = await WalletTransaction.findById(id).lean();
//       if (!txn) {
//         return res.status(404).json({ msg: 'Invoice not found' });
//       }
//       user = await User.findById(txn.userId).lean();
//       invoice = {
//         _id: txn._id,
//         userId: txn.userId,
//         amount: txn.amount,
//         type: txn.type,
//         method: txn.method,
//         status: txn.status,
//         description: txn.description,
//         createdAt: txn.createdAt,
//         buyerName: user?.name || '',
//         buyerEmail: user?.email || '',
//         material: '',
//         subtotal: Math.abs(txn.amount),
//         platformFee: 0,
//       };
//     }

//     // Verify ownership
//     const invoiceUserId = String(invoice.userId);
//     if (invoiceUserId !== String(req.userId)) {
//       // Allow admin too
//       if (req.userRole !== 'admin') {
//         return res.status(403).json({ msg: 'Not authorized' });
//       }
//     }

//     // Set headers for PDF download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `inline; filename="Invoice_${id}.pdf"`);

//     // Generate PDF and pipe to response
//     const pdfDoc = generateInvoicePDF(invoice, user || {});
//     pdfDoc.pipe(res);
//   } catch (err) {
//     console.error('❌ /invoice/:id error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// module.exports = router;




