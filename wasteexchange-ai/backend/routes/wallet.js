// backend/routes/wallet.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const WalletTransaction = require('../models/WalletTransaction');
const { authMiddleware: auth } = require('../middleware/auth');

// ============================================================
// POST /api/wallet/add-money
// ============================================================
router.post('/add-money', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ msg: 'Invalid amount' });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { walletBalance: amt } },
      { new: true }
    );

    await WalletTransaction.create({
      userId: req.userId,
      type: 'add_money',
      amount: amt,
      balanceAfter: user.walletBalance,
      status: 'success',
      method: 'manual',
      description: 'Money added to wallet (test mode)',
    });

    console.log(`💰 Money added | ${user.name} | +₹${amt} | Balance: ₹${user.walletBalance}`);
    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) {
    console.error('❌ add-money error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// POST /api/wallet/razorpay-add
// ============================================================
router.post('/razorpay-add', auth, async (req, res) => {
  try {
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Missing fields' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');
    if (generated !== razorpay_signature) {
      return res.status(400).json({ msg: 'Invalid signature' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { walletBalance: Number(amount) } },
      { new: true }
    );

    await WalletTransaction.create({
      userId: req.userId,
      type: 'add_money',
      amount: Number(amount),
      balanceAfter: user.walletBalance,
      status: 'success',
      method: 'razorpay',
      description: 'Added via Razorpay',
      referenceId: razorpay_payment_id,
      metadata: { razorpay_order_id, razorpay_payment_id },
    });

    console.log(`💰 Wallet topup | ${user.name} | +₹${amount}`);
    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) {
    console.error('❌ razorpay-add error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// POST /api/wallet/withdraw
// ============================================================
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, method, bankAccount, upiId } = req.body;

    if (!amount || Number(amount) < 100) {
      return res.status(400).json({ msg: 'Minimum withdrawal amount is ₹100' });
    }
    const amt = Number(amount);

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if ((user.walletBalance || 0) < amt) {
      return res.status(400).json({
        msg: `Insufficient balance. Available: ₹${user.walletBalance}`,
        code: 'INSUFFICIENT_BALANCE',
        required: amt,
        current: user.walletBalance || 0,
      });
    }

    if (method === 'bank') {
      if (!bankAccount?.accountHolder || !bankAccount?.accountNumber || !bankAccount?.ifscCode) {
        return res.status(400).json({ msg: 'Please fill all bank details' });
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test((bankAccount.ifscCode || '').toUpperCase())) {
        return res.status(400).json({ msg: 'Invalid IFSC code format' });
      }
    } else if (method === 'upi') {
      if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
        return res.status(400).json({ msg: 'Invalid UPI ID format' });
      }
    } else {
      return res.status(400).json({ msg: 'Invalid payment method' });
    }

    user.walletBalance -= amt;
    await user.save();

    const withdrawal = new Withdrawal({
      userId: req.userId,
      userName: user.name,
      userRole: user.role,
      amount: amt,
      method,
      bankAccount: method === 'bank' ? bankAccount : undefined,
      upiId: method === 'upi' ? upiId : '',
      status: 'pending',
    });
    await withdrawal.save();

    await WalletTransaction.create({
      userId: req.userId,
      type: 'withdraw',
      amount: -amt,
      balanceAfter: user.walletBalance,
      status: 'pending',
      method: method,
      description: `Withdrawal via ${method.toUpperCase()}`,
      referenceId: withdrawal._id.toString(),
    });

    console.log(`💸 Withdrawal | ${user.name} | ₹${amt} | ${method}`);
    res.status(201).json({
      success: true,
      withdrawal,
      newBalance: user.walletBalance,
      msg: `Withdrawal of ₹${amt} requested.`,
    });
  } catch (err) {
    console.error('❌ Withdrawal error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// GET /api/wallet/withdrawals
// ============================================================
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// GET /api/wallet/transactions
// ============================================================
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await WalletTransaction
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    console.log(`📊 Wallet tx for user ${req.userId}: ${transactions.length}`);
    res.json(transactions);
  } catch (err) {
    console.error('❌ /transactions error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;