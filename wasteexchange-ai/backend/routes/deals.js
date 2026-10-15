// backend/routes/deals.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');
const WalletTransaction = require('../models/WalletTransaction');
const Requirement = require('../models/Requirement');

const {
  sendOtpEmail,
  sendDealConfirmationEmail,
  sendPaymentReceivedEmail,
  sendOfferReceivedEmail,
  sendDealCompletedEmail,
} = require('../utils/emailService');
const { logActivity } = require('../utils/activityLogger');

let Invoice = null;
try { Invoice = require('../models/Invoice'); } catch (e) { console.warn('⚠️ Invoice model missing'); }

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const calcCommissions = (total) => ({
  buyerCommission: Math.round(total * 0.02),
  generatorCommission: Math.round(total * 0.02),
  platformRevenue: Math.round(total * 0.04),
  buyerTotalPayment: Math.round(total * 1.02),
  generatorPayout: Math.round(total * 0.98),
});

const createInvoice = async ({ user, amount, type, method, description, dealId, transactionId, deal = null, generator = null }) => {
  if (!Invoice) return null;
  try {
    return await Invoice.create({
      userId: user._id,
      amount,
      type,
      method,
      status: 'success',
      description,
      dealId: dealId || undefined,
      transactionId: transactionId || undefined,
      buyerName: user.name || '',
      buyerEmail: user.email || '',
      generatorName: generator?.name || deal?.generatorName || '',
      generatorEmail: generator?.email || '',
      material: deal?.material || '',
      materialSubtype: deal?.materialSubtype || '',
      quantity: deal?.quantity || 0,
      pricePerUnit: deal?.pricePerUnit || 0,
      subtotal: deal?.totalAmount || 0,
      platformFee: deal?.buyerCommission || 0,
      location: deal?.location || '',
      razorpayPaymentId: deal?.razorpayPaymentId || '',
    });
  } catch (err) {
    console.error('⚠️ Invoice creation failed:', err.message);
    return null;
  }
};

// ============================================================
// ✅ 1. Request OTP
// ============================================================
router.post('/request-otp', auth, async (req, res) => {
  try {
    const { dealId } = req.body || {};
    const buyerId = req.userId;
    if (!dealId) return res.status(400).json({ message: 'dealId required' });

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });
    if (['accepted', 'otp_verified', 'paid'].includes(deal.status)) {
      return res.status(400).json({ message: 'Deal already processed or OTP already verified' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    if (!buyer.email) return res.status(400).json({ message: 'Buyer email not set' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    try {
      await sendOtpEmail(buyer.email, otp, buyer.name);
    } catch (emailError) {
      console.error('❌ OTP Email error:', emailError);
      return res.status(500).json({ message: 'Failed to send OTP email: ' + (emailError.message || 'unknown') });
    }

    deal.otp = otp;
    deal.otpExpires = otpExpires;
    deal.status = 'otp_sent';
    await deal.save();

    // ✅ Log activity
    await logActivity({
      userId: buyer._id,
      userName: buyer.name,
      userEmail: buyer.email,
      userRole: buyer.role,
      action: 'otp_requested',
      title: `OTP requested for deal — ${deal.material}`,
      details: `${buyer.name} requested OTP for ${deal.material} (${deal.quantity}kg)`,
      metadata: { dealId: deal._id, material: deal.material, quantity: deal.quantity },
      req,
    });

    res.status(200).json({ message: '✅ OTP sent to your email!' });
  } catch (error) {
    console.error('❌ Request OTP Error:', error);
    res.status(500).json({ message: 'Server Error: ' + (error.message || 'unknown') });
  }
});

// ============================================================
// ✅ 2. Verify OTP
// ============================================================
router.post('/verify-otp', auth, async (req, res) => {
  try {
    const { dealId, otp } = req.body || {};
    const buyerId = req.userId;
    if (!dealId || !otp) return res.status(400).json({ message: 'dealId and otp required' });

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });
    if (deal.otp !== otp) return res.status(400).json({ message: 'Invalid OTP!' });
    if (deal.otpExpires && new Date() > deal.otpExpires) return res.status(400).json({ message: 'OTP has expired!' });

    deal.status = 'otp_verified';
    deal.otpVerified = true;
    deal.otp = undefined;
    deal.otpExpires = undefined;
    await deal.save();

    const buyer = await User.findById(buyerId);
    await logActivity({
      userId: buyer._id,
      userName: buyer.name,
      userEmail: buyer.email,
      userRole: buyer.role,
      action: 'otp_verified',
      title: `OTP verified — ${deal.material}`,
      details: `${buyer.name} verified OTP for deal ${deal._id}`,
      metadata: { dealId: deal._id, material: deal.material },
      req,
    });

    res.status(200).json({ message: '✅ OTP Verified! Please proceed to payment.' });
  } catch (error) {
    console.error('❌ Verify OTP Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ============================================================
// ✅ 3. Accept via Wallet — + emails + logs
// ============================================================
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const { requirementId } = req.body || {};
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (!['requested', 'offered', 'otp_sent', 'otp_verified'].includes(deal.status)) {
      return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
    }

    const buyer = await User.findById(deal.buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });
    if ((buyer.walletBalance || 0) < deal.buyerTotalPayment) {
      return res.status(400).json({
        msg: `Insufficient wallet balance. Need ₹${deal.buyerTotalPayment}, have ₹${buyer.walletBalance || 0}`,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    buyer.walletBalance -= deal.buyerTotalPayment;
    await buyer.save();

    const buyerTxn = await WalletTransaction.create({
      userId: buyer._id,
      amount: -deal.buyerTotalPayment,
      type: 'deal_payment',
      method: 'wallet',
      status: 'success',
      balanceAfter: buyer.walletBalance,
      description: `Payment for deal ${deal._id} (${deal.material})`,
    });

    const generator = await User.findByIdAndUpdate(
      deal.generatorId,
      { $inc: { walletBalance: deal.generatorPayout } },
      { new: true }
    );

    const genTxn = await WalletTransaction.create({
      userId: generator._id,
      amount: deal.generatorPayout,
      type: 'deal_receive',
      method: 'wallet',
      status: 'success',
      balanceAfter: generator.walletBalance,
      description: `Received payment for deal ${deal._id} (${deal.material})`,
    });

    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

    deal.status = 'paid';
    deal.paymentMethod = 'wallet';
    if (requirementId) deal.requirementId = requirementId;
    await deal.save();

    // Invoices
    await createInvoice({
      user: buyer, amount: -deal.buyerTotalPayment, type: 'deal_payment', method: 'wallet',
      description: `Payment for deal ${deal._id}`, dealId: deal._id, transactionId: buyerTxn._id,
      deal, generator,
    });
    await createInvoice({
      user: generator, amount: deal.generatorPayout, type: 'deal_receive', method: 'wallet',
      description: `Received payment for deal ${deal._id}`, dealId: deal._id, transactionId: genTxn._id,
      deal, generator,
    });

    // ✅ Log: Payment accepted
    await logActivity({
      userId: buyer._id,
      userName: buyer.name,
      userEmail: buyer.email,
      userRole: buyer.role,
      action: 'deal_accepted',
      title: `Payment accepted (Wallet) — ${deal.material}`,
      details: `${buyer.name} paid ₹${deal.buyerTotalPayment.toLocaleString('en-IN')} for ${deal.material} (${deal.quantity}kg)`,
      metadata: {
        dealId: deal._id, material: deal.material, quantity: deal.quantity,
        amount: deal.buyerTotalPayment, method: 'wallet',
      },
      req,
    });

    // ✅ Emails (with delays to avoid rate limit)
    try { await sendDealConfirmationEmail(buyer.email, deal._id, deal); } catch (e) { console.error('Buyer email:', e.message); }
    await delay(1500);
    if (generator?.email) {
      try { await sendPaymentReceivedEmail(generator.email, deal); } catch (e) { console.error('Generator email:', e.message); }
    }

    res.json(deal);
  } catch (err) {
    console.error('❌ /accept error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// ✅ 4. Accept via Razorpay — + emails + logs
// ============================================================
router.put('/:id/accept-razorpay', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, requirementId } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Payment verification fields required' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');
    if (generated !== razorpay_signature) return res.status(400).json({ msg: 'Invalid payment signature' });

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });
    if (String(deal.buyerId) !== String(req.userId)) return res.status(403).json({ msg: 'Only buyer can pay' });
    if (!['requested', 'offered', 'otp_sent', 'otp_verified'].includes(deal.status)) {
      return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
    }

    deal.status = 'paid';
    deal.paymentMethod = 'razorpay';
    deal.razorpayPaymentId = razorpay_payment_id;
    if (requirementId) deal.requirementId = requirementId;
    await deal.save();

    const generator = await User.findByIdAndUpdate(
      deal.generatorId,
      { $inc: { walletBalance: deal.generatorPayout } },
      { new: true }
    );

    const genTxn = await WalletTransaction.create({
      userId: generator._id,
      amount: deal.generatorPayout,
      type: 'deal_receive',
      method: 'razorpay',
      status: 'success',
      balanceAfter: generator.walletBalance,
      description: `Received payment for deal ${deal._id} via Razorpay`,
    });

    const buyer = await User.findById(deal.buyerId);
    const buyerTxn = await WalletTransaction.create({
      userId: buyer._id,
      amount: -deal.buyerTotalPayment,
      type: 'deal_payment',
      method: 'razorpay',
      status: 'success',
      balanceAfter: buyer.walletBalance || 0,
      description: `Payment for deal ${deal._id} via Razorpay`,
    });

    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

    await createInvoice({
      user: buyer, amount: -deal.buyerTotalPayment, type: 'deal_payment', method: 'razorpay',
      description: `Payment for deal ${deal._id} via Razorpay`, dealId: deal._id, transactionId: buyerTxn._id,
      deal, generator,
    });
    await createInvoice({
      user: generator, amount: deal.generatorPayout, type: 'deal_receive', method: 'razorpay',
      description: `Received payment via Razorpay`, dealId: deal._id, transactionId: genTxn._id,
      deal, generator,
    });

    // ✅ Log: Razorpay payment
    await logActivity({
      userId: buyer._id,
      userName: buyer.name,
      userEmail: buyer.email,
      userRole: buyer.role,
      action: 'deal_accepted_razorpay',
      title: `Payment accepted (Razorpay) — ${deal.material}`,
      details: `${buyer.name} paid ₹${deal.buyerTotalPayment.toLocaleString('en-IN')} via Razorpay for ${deal.material}`,
      metadata: {
        dealId: deal._id, material: deal.material, quantity: deal.quantity,
        amount: deal.buyerTotalPayment, method: 'razorpay',
        razorpayPaymentId: razorpay_payment_id,
      },
      req,
    });

    // ✅ Emails
    try { await sendDealConfirmationEmail(buyer.email, deal._id, deal); } catch (e) { console.error('Buyer email:', e.message); }
    await delay(1500);
    if (generator?.email) {
      try { await sendPaymentReceivedEmail(generator.email, deal); } catch (e) { console.error('Generator email:', e.message); }
    }

    res.json(deal);
  } catch (err) {
    console.error('❌ /accept-razorpay error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// REJECT
// ============================================================
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    deal.status = 'rejected';
    await deal.save();
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

    const actingUser = await User.findById(req.userId);
    if (actingUser) {
      await logActivity({
        userId: actingUser._id,
        userName: actingUser.name,
        userEmail: actingUser.email,
        userRole: actingUser.role,
        action: 'deal_rejected',
        title: `Deal rejected — ${deal.material}`,
        details: `${actingUser.name} rejected deal ${deal._id}`,
        metadata: { dealId: deal._id, material: deal.material },
        req,
      });
    }

    res.json(deal);
  } catch (err) {
    console.error('❌ /reject error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// // ============================================================
// // COMPLETE — + logs + emails to both
// // ============================================================
// router.put('/:id/complete', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     if (!['accepted', 'paid'].includes(deal.status)) {
//       return res.status(400).json({ msg: `Cannot complete deal with status "${deal.status}"` });
//     }

//     deal.status = 'completed';
//     await deal.save();

//     if (deal.requirementId) {
//       const Requirement = require('../models/Requirement');
//       await Requirement.findByIdAndUpdate(deal.requirementId, { status: 'fulfilled' });
//     }

//     await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

//     const buyer = await User.findById(deal.buyerId);
//     const generator = await User.findById(deal.generatorId);
//     const actingUser = await User.findById(req.userId);

//     // ✅ Log: Deal completed
//     await logActivity({
//       userId: actingUser?._id || deal.buyerId,
//       userName: actingUser?.name || deal.buyerName,
//       userEmail: actingUser?.email || '',
//       userRole: actingUser?.role || 'buyer',
//       action: 'deal_completed',
//       title: `Deal completed — ${deal.material}`,
//       details: `${actingUser?.name || deal.buyerName} marked deal ${deal._id} as completed`,
//       metadata: {
//         dealId: deal._id, material: deal.material, quantity: deal.quantity,
//         totalAmount: deal.totalAmount,
//       },
//       req,
//     });

//     // ✅ Emails to both parties
//     try {
//       if (buyer?.email) await sendDealCompletedEmail(buyer.email, deal, 'buyer');
//     } catch (e) { console.error('Buyer email:', e.message); }
//     await delay(1500);
//     try {
//       if (generator?.email) await sendDealCompletedEmail(generator.email, deal, 'generator');
//     } catch (e) { console.error('Generator email:', e.message); }

//     res.json(deal);
//   } catch (err) {
//     console.error('❌ /complete error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

/* =========================================================
   PUT /api/deals/:id/complete
   ✅ Fast response — heavy work in background
========================================================= */
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('buyerId', 'name email')
      .populate('generatorId', 'name email walletBalance');

    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    // Ownership check — file me req.userId use hota hai (authMiddleware se)
    const uid = String(req.userId);
    const isBuyer = String(deal.buyerId?._id || deal.buyerId) === uid;
    const isGenerator = String(deal.generatorId?._id || deal.generatorId) === uid;
    const isAdmin = req.user?.role === 'admin';

    if (!isBuyer && !isGenerator && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Idempotent — agar already completed hai, seedha return
    if (deal.status === 'completed') {
      return res.json(deal);
    }

    if (deal.status !== 'paid' && deal.status !== 'accepted') {
      return res.status(400).json({
        msg: `Cannot complete a deal with status "${deal.status}". Must be paid or accepted first.`,
      });
    }

    // ============ FAST PATH — ek shot me sab update ============
    const now = new Date();

    // 1. Deal ko completed mark karo
    deal.status = 'completed';
    deal.completedAt = now;
    deal.completedBy = req.userId;
    await deal.save();

    // 2. Requirement ko fulfilled karo (background — non-blocking)
    const reqId = deal.requirementId?._id || deal.requirementId;
    if (reqId) {
      Requirement.findByIdAndUpdate(reqId, { status: 'fulfilled' }, { new: true })
        .catch(e => console.warn('Requirement update failed:', e.message));
    }

    // 3. Listing ko wapas active karo (background)
    if (deal.listingId) {
      Listing.findByIdAndUpdate(deal.listingId, { status: 'active' })
        .catch(e => console.warn('Listing update failed:', e.message));
    }

    // ============ 🚀 RESPOND IMMEDIATELY ============
    const populatedDeal = await Deal.findById(deal._id)
      .populate('buyerId', 'name email')
      .populate('generatorId', 'name email');

    res.json(populatedDeal);

    // ============ ⚡ BACKGROUND WORK (no await, non-blocking) ============

    // 4. Activity log (fire & forget)
    logActivity({
      userId: req.userId,
      userName: deal.buyerId?.name || 'User',
      userEmail: deal.buyerId?.email || '',
      userRole: 'buyer',
      action: 'deal_completed',
      title: `Deal completed — ${deal.material}`,
      details: `${deal.quantity}kg ${deal.material} deal marked complete`,
      metadata: {
        dealId: deal._id,
        buyer: deal.buyerId?.name,
        generator: deal.generatorId?.name,
      },
      req,
    }).catch(e => console.warn('Activity log failed:', e.message));

    // 5. Emails (fire & forget) — signature: (email, deal, role)
    if (deal.buyerId?.email) {
      sendDealCompletedEmail(deal.buyerId.email, deal, 'buyer')
        .catch(e => console.warn('Buyer email failed:', e.message));
    }
    if (deal.generatorId?.email) {
      sendDealCompletedEmail(deal.generatorId.email, deal, 'generator')
        .catch(e => console.warn('Generator email failed:', e.message));
    }

  } catch (err) {
    console.error('❌ Deal complete error:', err);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
});

// ============================================================
// GET /api/deals/user
// ============================================================
router.get('/user', auth, async (req, res) => {
  try {
    const deals = await Deal.find({
      $or: [{ buyerId: req.userId }, { generatorId: req.userId }],
    }).sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ============================================================
// GET /api/deals/all
// ============================================================
router.get('/all', auth, async (req, res) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ============================================================
// POST /api/deals/razorpay-add — Wallet top-up
// ============================================================
router.post('/razorpay-add', auth, async (req, res) => {
  try {
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Missing fields' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');
    if (generated !== razorpay_signature) return res.status(400).json({ msg: 'Invalid signature' });

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

    await createInvoice({
      user, amount: Number(amount), type: 'add_money', method: 'razorpay',
      description: `Added money via Razorpay`, dealId: null, transactionId: txn._id,
    });

    // ✅ Log: Wallet top-up
    await logActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'wallet_topup',
      title: `Wallet top-up ₹${Number(amount).toLocaleString('en-IN')}`,
      details: `${user.name} added ₹${Number(amount).toLocaleString('en-IN')} to wallet via Razorpay`,
      metadata: {
        amount: Number(amount), razorpayPaymentId: razorpay_payment_id,
        newBalance: user.walletBalance,
      },
      req,
    });

    // ✅ Email: Wallet top-up confirmation
    try {
      const { sendWalletTopupEmail } = require('../utils/emailService');
      await sendWalletTopupEmail(user.email, user.name, Number(amount), user.walletBalance);
    } catch (e) { console.error('Wallet topup email:', e.message); }

    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) {
    console.error('❌ /razorpay-add error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// POST /api/deals — Buyer creates request
// ============================================================
router.post('/', auth, async (req, res) => {
  try {
    const { listingId, requirementId, requestedQuantity, requestedPrice } = req.body || {};
    if (!listingId) return res.status(400).json({ msg: 'Listing ID required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const buyer = await User.findById(req.userId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    const generator = await User.findById(listing.generatorId);

    const finalQuantity = requestedQuantity ? Number(requestedQuantity) : listing.quantity;
    const finalPrice = requestedPrice ? Number(requestedPrice) : listing.price;
    const total = finalQuantity * finalPrice;
    const comm = calcCommissions(total);

    if ((buyer.walletBalance || 0) < comm.buyerTotalPayment) {
      return res.status(400).json({
        msg: `Insufficient wallet balance. Need ₹${comm.buyerTotalPayment}, you have ₹${buyer.walletBalance || 0}.`,
        code: 'INSUFFICIENT_BALANCE',
        required: comm.buyerTotalPayment,
        current: buyer.walletBalance || 0,
      });
    }

    const deal = new Deal({
      listingId: listing._id,
      requirementId: requirementId || null,
      generatorId: listing.generatorId,
      generatorName: generator?.name || listing.generatorName || 'Unknown',
      buyerId: req.userId,
      buyerName: buyer.name,
      material: listing.material,
      materialSubtype: listing.materialSubtype || '',
      quantity: finalQuantity,
      pricePerUnit: finalPrice,
      listingQuantity: listing.quantity,
      location: listing.location,
      totalAmount: total,
      ...comm,
      status: 'requested',
      initiatedBy: 'buyer',
    });
    await deal.save();

    // ✅ Log: Deal created
    await logActivity({
      userId: buyer._id,
      userName: buyer.name,
      userEmail: buyer.email,
      userRole: buyer.role,
      action: 'deal_created',
      title: `Request sent — ${listing.material}`,
      details: `${buyer.name} requested ${finalQuantity}kg ${listing.material} @ ₹${finalPrice}/kg`,
      metadata: {
        dealId: deal._id, listingId: listing._id, material: listing.material,
        quantity: finalQuantity, pricePerUnit: finalPrice, total,
        generatorId: listing.generatorId,
      },
      req,
    });

    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create deal error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// POST /api/deals/offer — Generator sends offer
// ============================================================
router.post('/offer', auth, async (req, res) => {
  try {
    const { listingId, buyerId, requirementId, quantity, pricePerUnit } = req.body || {};
    if (!listingId || !buyerId) return res.status(400).json({ msg: 'listingId and buyerId required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });
    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'You can only offer your own listings' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    const finalQty = Number(quantity) || listing.quantity;
    const finalPrice = Number(pricePerUnit) || listing.price;
    if (finalQty <= 0 || finalPrice <= 0) return res.status(400).json({ msg: 'Invalid quantity or price' });
    if (finalQty > listing.quantity) return res.status(400).json({ msg: `Quantity exceeds listing stock (${listing.quantity} kg)` });

    const generator = await User.findById(req.userId);
    const total = finalQty * finalPrice;
    const comm = calcCommissions(total);

    const deal = new Deal({
      listingId: listing._id,
      requirementId: requirementId || null,
      generatorId: req.userId,
      generatorName: generator.name,
      buyerId: buyerId,
      buyerName: buyer.name,
      material: listing.material,
      materialSubtype: listing.materialSubtype || '',
      quantity: finalQty,
      pricePerUnit: finalPrice,
      listingQuantity: listing.quantity,
      location: listing.location,
      totalAmount: total,
      ...comm,
      status: 'offered',
      initiatedBy: 'generator',
    });
    await deal.save();

    // ✅ Log: Offer sent
    await logActivity({
      userId: generator._id,
      userName: generator.name,
      userEmail: generator.email,
      userRole: generator.role,
      action: 'offer_sent',
      title: `Offer sent — ${listing.material}`,
      details: `${generator.name} sent offer to ${buyer.name} for ${finalQty}kg @ ₹${finalPrice}/kg`,
      metadata: {
        dealId: deal._id, buyerId, listingId: listing._id,
        material: listing.material, quantity: finalQty, pricePerUnit: finalPrice, total,
      },
      req,
    });

    // ✅ Email: Notify buyer
    try {
      if (buyer?.email) await sendOfferReceivedEmail(buyer.email, deal, generator.name);
    } catch (e) { console.error('Offer email:', e.message); }

    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create offer error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;




























































// // backend/routes/deals.js
// const express = require('express');
// const router = express.Router();
// const Deal = require('../models/Deal');
// const Listing = require('../models/Listing');
// const User = require('../models/User');
// const { authMiddleware: auth } = require('../middleware/auth');
// const WalletTransaction = require('../models/WalletTransaction');
// const { sendOtpEmail, sendDealConfirmationEmail } = require('../utils/emailService');

// // Helper: Calculate all commissions
// const calcCommissions = (total) => ({
//   buyerCommission: Math.round(total * 0.02),
//   generatorCommission: Math.round(total * 0.02),
//   platformRevenue: Math.round(total * 0.04),
//   buyerTotalPayment: Math.round(total * 1.02),
//   generatorPayout: Math.round(total * 0.98)
// });

// // ✅ 1. Request OTP
// router.post('/request-otp', auth, async (req, res) => {
//   console.log("🔥 OTP Request aayi hai:", req.body);
//   try {
//     const { dealId } = req.body || {};   // ✅ SAFE
//     const buyerId = req.userId;

//     if (!dealId) return res.status(400).json({ message: 'dealId required' });

//     const deal = await Deal.findById(dealId);
//     if (!deal) return res.status(404).json({ message: 'Deal not found' });
//     if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });
//     if (deal.status === 'accepted' || deal.status === 'otp_verified' || deal.status === 'paid') {
//       return res.status(400).json({ message: 'Deal already processed or OTP already verified' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     deal.otp = otp;
//     deal.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//     deal.status = 'otp_sent';
//     await deal.save();

//     const buyer = await User.findById(buyerId);
//     try {
//       await sendOtpEmail(buyer.email, otp);
//     } catch (emailError) {
//       console.error("OTP Email error:", emailError);
//       return res.status(500).json({ message: 'Email bhejne me error aayi. Check backend console.' });
//     }
//     res.status(200).json({ message: '✅ OTP sent to your email!' });
//   } catch (error) {
//     console.error("Request OTP Error:", error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

// // ✅ 2. Verify OTP
// router.post('/verify-otp', auth, async (req, res) => {
//   try {
//     const { dealId, otp } = req.body || {};   // ✅ SAFE
//     const buyerId = req.userId;

//     if (!dealId || !otp) return res.status(400).json({ message: 'dealId and otp required' });

//     const deal = await Deal.findById(dealId);
//     if (!deal) return res.status(404).json({ message: 'Deal not found' });
//     if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });

//     if (deal.otp !== otp) return res.status(400).json({ message: 'Invalid OTP!' });
//     if (new Date() > deal.otpExpires) return res.status(400).json({ message: 'OTP has expired!' });

//     deal.status = 'otp_verified';
//     deal.otpVerified = true;
//     deal.otp = undefined;
//     deal.otpExpires = undefined;
//     await deal.save();

//     res.status(200).json({ message: '✅ OTP Verified! Please proceed to payment.' });
//   } catch (error) {
//     console.error("Verify OTP Error:", error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

// // ✅ 3. Accept via Wallet — FIXED
// router.put('/:id/accept', auth, async (req, res) => {
//   try {
//     // ✅ FIXED: Use `body` variable (req.body was undefined on empty PUT)
//     const body = req.body || {};
//     const { requirementId } = body;

//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     if (!['requested', 'offered', 'otp_verified'].includes(deal.status)) {
//       return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
//     }

//     const buyer = await User.findById(deal.buyerId);
//     if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

//     if ((buyer.walletBalance || 0) < deal.buyerTotalPayment) {
//       return res.status(400).json({
//         msg: `Insufficient wallet balance. Need ₹${deal.buyerTotalPayment}, have ₹${buyer.walletBalance || 0}`,
//         code: 'INSUFFICIENT_BALANCE'
//       });
//     }

//     buyer.walletBalance -= deal.buyerTotalPayment;
//     await buyer.save();

//     await WalletTransaction.create({
//       userId: buyer._id,
//       amount: -deal.buyerTotalPayment,
//       type: 'deal_payment',
//       method: 'wallet',
//       status: 'success',
//       balanceAfter: buyer.walletBalance,
//       description: `Payment for deal ${deal._id} (${deal.material})`
//     });

//     const generator = await User.findByIdAndUpdate(
//       deal.generatorId,
//       { $inc: { walletBalance: deal.generatorPayout } },
//       { new: true }
//     );

//     await WalletTransaction.create({
//       userId: generator._id,
//       amount: deal.generatorPayout,
//       type: 'deal_receive',
//       method: 'wallet',
//       status: 'success',
//       balanceAfter: generator.walletBalance,
//       description: `Received payment for deal ${deal._id} (${deal.material})`
//     });

//     await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

//     deal.status = 'paid';
//     if (requirementId) deal.requirementId = requirementId;
//     await deal.save();

//     try { await sendDealConfirmationEmail(buyer.email, deal._id); } catch (emailError) { console.error("Email error:", emailError); }

//     // ✅ NEW: Create Invoice record for this deal payment
//     try {
//       const Invoice = require('../models/Invoice'); // ya jo bhi aapka model hai
//       await Invoice.create({
//         userId: buyer._id,
//         amount: -deal.buyerTotalPayment,
//         type: 'deal_payment',
//         method: 'wallet',
//         status: 'success',
//         description: `Payment for deal ${deal._id} (${deal.material})`,
//         dealId: deal._id,
//         transactionId: buyerTxn._id,
//       });
//     } catch (invoiceErr) {
//       console.error('⚠️ Invoice creation failed:', invoiceErr.message);
//       // Don't fail the whole deal if invoice fails
//     }

//     res.json(deal);
//   } catch (err) {
//     console.error('❌ /accept error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // ✅ 4. Accept via Razorpay — FIXED
// router.put('/:id/accept-razorpay', auth, async (req, res) => {
//   try {
//     const body = req.body || {};   // ✅ SAFE
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, requirementId } = body;

//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ msg: 'Payment verification fields required' });
//     }

//     const crypto = require('crypto');
//     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//     hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
//     const generated = hmac.digest('hex');

//     if (generated !== razorpay_signature) return res.status(400).json({ msg: 'Invalid payment signature' });

//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });
//     if (String(deal.buyerId) !== String(req.userId)) return res.status(403).json({ msg: 'Only buyer can pay' });

//     if (!['requested', 'offered', 'otp_verified'].includes(deal.status)) {
//       return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
//     }

//     deal.status = 'paid';
//     deal.paymentMethod = 'razorpay';
//     deal.razorpayPaymentId = razorpay_payment_id;
//     if (requirementId) deal.requirementId = requirementId;
//     await deal.save();

//     const generator = await User.findByIdAndUpdate(
//       deal.generatorId,
//       { $inc: { walletBalance: deal.generatorPayout } },
//       { new: true }
//     );

//     await WalletTransaction.create({
//       userId: generator._id,
//       amount: deal.generatorPayout,
//       type: 'deal_receive',
//       method: 'razorpay',
//       status: 'success',
//       balanceAfter: generator.walletBalance,
//       description: `Received payment for deal ${deal._id} (${deal.material}) via Razorpay`
//     });

//     await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

//     const buyer = await User.findById(deal.buyerId);
//     try { await sendDealConfirmationEmail(buyer.email, deal._id); } catch (emailError) { console.error("Email error:", emailError); }

//     res.json(deal);
//   } catch (err) {
//     console.error('❌ /accept-razorpay error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   PUT /api/deals/:id/reject
// router.put('/:id/reject', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     deal.status = 'rejected';
//     await deal.save();

//     // ✅ Reset listing to active so it can be requested again
//     await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

//     res.json(deal);
//   } catch (err) {
//     console.error('❌ /reject error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.put('/:id/complete', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     if (!['accepted', 'paid'].includes(deal.status)) {
//       return res.status(400).json({ msg: `Cannot complete deal with status "${deal.status}"` });
//     }

//     deal.status = 'completed';
//     await deal.save();

//     if (deal.requirementId) {
//       const Requirement = require('../models/Requirement');
//       await Requirement.findByIdAndUpdate(deal.requirementId, { status: 'fulfilled' });
//     }

//     // ✅ NEW: Listing ko wapas active karo taaki naye buyers request kar sakein
//     await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

//     console.log(`✅ Deal ${deal._id} completed → Listing ${deal.listingId} set to active`);
//     res.json(deal);
//   } catch (err) {
//     console.error('❌ /complete error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   GET /api/deals/user
// router.get('/user', auth, async (req, res) => {
//   try {
//     const deals = await Deal.find({
//       $or: [{ buyerId: req.userId }, { generatorId: req.userId }]
//     }).sort({ createdAt: -1 });
//     res.json(deals);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // @route   GET /api/deals/all
// router.get('/all', auth, async (req, res) => {
//   try {
//     const deals = await Deal.find().sort({ createdAt: -1 });
//     res.json(deals);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // @route   POST /api/deals/razorpay-add
// router.post('/razorpay-add', auth, async (req, res) => {
//   try {
//     const body = req.body || {};   // ✅ SAFE
//     const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

//     if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ msg: 'Missing fields' });
//     }

//     const crypto = require('crypto');
//     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//     hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
//     const generated = hmac.digest('hex');

//     if (generated !== razorpay_signature) {
//       return res.status(400).json({ msg: 'Invalid signature' });
//     }

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
//       description: `Added money via Razorpay (${razorpay_payment_id})`
//     });

//     res.json({ success: true, newBalance: user.walletBalance });
//   } catch (err) {
//     console.error('❌ /razorpay-add error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   POST /api/deals — Buyer creates direct request
// router.post('/', auth, async (req, res) => {
//   try {
//     const body = req.body || {};   // ✅ SAFE
//     const { listingId, requirementId, requestedQuantity, requestedPrice } = body;

//     if (!listingId) return res.status(400).json({ msg: 'Listing ID required' });

//     const listing = await Listing.findById(listingId);
//     if (!listing) return res.status(404).json({ msg: 'Listing not found' });

//     const buyer = await User.findById(req.userId);
//     if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

//     const generator = await User.findById(listing.generatorId);

//     const finalQuantity = requestedQuantity ? Number(requestedQuantity) : listing.quantity;
//     const finalPrice = requestedPrice ? Number(requestedPrice) : listing.price;

//     const total = finalQuantity * finalPrice;
//     const comm = calcCommissions(total);

//     if ((buyer.walletBalance || 0) < comm.buyerTotalPayment) {
//       return res.status(400).json({
//         msg: `Insufficient wallet balance. Need ₹${comm.buyerTotalPayment}, you have ₹${buyer.walletBalance || 0}.`,
//         code: 'INSUFFICIENT_BALANCE',
//         required: comm.buyerTotalPayment,
//         current: buyer.walletBalance || 0
//       });
//     }

//     const deal = new Deal({
//       listingId: listing._id,
//       requirementId: requirementId || null,
//       generatorId: listing.generatorId,
//       generatorName: generator?.name || listing.generatorName || 'Unknown',
//       buyerId: req.userId,
//       buyerName: buyer.name,
//       material: listing.material,
//       quantity: finalQuantity,
//       pricePerUnit: finalPrice,
//       listingQuantity: listing.quantity,
//       location: listing.location,
//       totalAmount: total,
//       ...comm,
//       status: 'requested',
//       initiatedBy: 'buyer'
//     });
//     await deal.save();

//     console.log(`✅ Request sent | ${buyer.name} → ${generator?.name} | ${finalQuantity}kg @ ₹${finalPrice}/kg`);
//     res.status(201).json(deal);
//   } catch (err) {
//     console.error('❌ Create deal error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   POST /api/deals/offer — Generator sends offer to buyer
// router.post('/offer', auth, async (req, res) => {
//   try {
//     const body = req.body || {};
//     const { listingId, buyerId, requirementId, quantity, pricePerUnit } = body;

//     if (!listingId || !buyerId) {
//       return res.status(400).json({ msg: 'listingId and buyerId required' });
//     }

//     const listing = await Listing.findById(listingId);
//     if (!listing) return res.status(404).json({ msg: 'Listing not found' });

//     if (String(listing.generatorId) !== String(req.userId)) {
//       return res.status(403).json({ msg: 'You can only offer your own listings' });
//     }

//     const buyer = await User.findById(buyerId);
//     if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

//     // ✅ Use provided quantity/price, fallback to listing values
//     const finalQty = Number(quantity) || listing.quantity;
//     const finalPrice = Number(pricePerUnit) || listing.price;

//     if (finalQty <= 0 || finalPrice <= 0) {
//       return res.status(400).json({ msg: 'Invalid quantity or price' });
//     }
//     if (finalQty > listing.quantity) {
//       return res.status(400).json({ msg: `Quantity exceeds listing stock (${listing.quantity} kg)` });
//     }

//     const generator = await User.findById(req.userId);
//     const total = finalQty * finalPrice;
//     const comm = calcCommissions(total);

//     const deal = new Deal({
//       listingId: listing._id,
//       requirementId: requirementId || null,
//       generatorId: req.userId,
//       generatorName: generator.name,
//       buyerId: buyerId,
//       buyerName: buyer.name,
//       material: listing.material,
//       materialSubtype: listing.materialSubtype || '',
//       quantity: finalQty,           // ✅ Custom quantity
//       pricePerUnit: finalPrice,     // ✅ Custom price
//       listingQuantity: listing.quantity,  // Keep original for reference
//       location: listing.location,
//       totalAmount: total,
//       ...comm,
//       status: 'offered',
//       initiatedBy: 'generator'
//     });
//     await deal.save();

//     console.log(`✅ Offer sent: ${generator.name} → ${buyer.name} | ${finalQty}kg @ ₹${finalPrice}/kg`);
//     res.status(201).json(deal);
//   } catch (err) {
//     console.error('❌ Create offer error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// module.exports = router;












































// // backend/routes/deals.js
// const express = require('express');
// const router = express.Router();
// const Deal = require('../models/Deal');
// const Listing = require('../models/Listing');
// const User = require('../models/User');
// const auth = require('../middleware/auth');

// // @route   POST /api/deals
// // @desc    Buyer sends request on generator's listing
// // @access  Private
// router.post('/', auth, async (req, res) => {
//   try {
//     const { listingId } = req.body;
//     if (!listingId) return res.status(400).json({ msg: 'Listing ID required' });

//     const listing = await Listing.findById(listingId);
//     if (!listing) return res.status(404).json({ msg: 'Listing not found' });

//     const buyer = await User.findById(req.userId);
//     const generator = await User.findById(listing.generatorId);

//     const total = listing.quantity * listing.price;
//     const deal = new Deal({
//       listingId: listing._id,
//       generatorId: listing.generatorId,
//       generatorName: generator?.name || listing.generatorName || 'Unknown',
//       buyerId: req.userId,
//       buyerName: buyer.name,
//       material: listing.material,
//       quantity: listing.quantity,
//       pricePerUnit: listing.price,
//       totalAmount: total,
//       buyerCommission: Math.round(total * 0.02),
//       generatorCommission: Math.round(total * 0.02),
//       platformRevenue: Math.round(total * 0.04),
//       buyerTotalPayment: Math.round(total * 1.02),
//       generatorPayout: Math.round(total * 0.98),
//       status: 'requested',
//       initiatedBy: 'buyer'
//     });
//     await deal.save();

//     listing.status = 'pending';
//     await listing.save();

//     console.log(`✅ Buyer request created | ${buyer.name} → ${generator?.name}`);
//     res.status(201).json(deal);
//   } catch (err) {
//     console.error('❌ Create deal error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   POST /api/deals/offer
// // @desc    Generator sends offer to a specific buyer
// // @access  Private (Generator)
// router.post('/offer', auth, async (req, res) => {
//   try {
//     const { listingId, buyerId } = req.body;
//     if (!listingId || !buyerId) return res.status(400).json({ msg: 'listingId and buyerId required' });

//     const listing = await Listing.findById(listingId);
//     if (!listing) return res.status(404).json({ msg: 'Listing not found' });

//     // Verify this listing belongs to the caller
//     if (String(listing.generatorId) !== String(req.userId)) {
//       return res.status(403).json({ msg: 'You can only offer your own listings' });
//     }

//     const buyer = await User.findById(buyerId);
//     if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

//     const generator = await User.findById(req.userId);

//     const total = listing.quantity * listing.price;
//     const deal = new Deal({
//       listingId: listing._id,
//       generatorId: req.userId,
//       generatorName: generator.name,
//       buyerId: buyerId,
//       buyerName: buyer.name,
//       material: listing.material,
//       quantity: listing.quantity,
//       pricePerUnit: listing.price,
//       totalAmount: total,
//       buyerCommission: Math.round(total * 0.02),
//       generatorCommission: Math.round(total * 0.02),
//       platformRevenue: Math.round(total * 0.04),
//       buyerTotalPayment: Math.round(total * 1.02),
//       generatorPayout: Math.round(total * 0.98),
//       status: 'offered',
//       initiatedBy: 'generator'
//     });
//     await deal.save();

//     console.log(`✅ Generator offer created | ${generator.name} → ${buyer.name} | ₹${total}`);
//     res.status(201).json(deal);
//   } catch (err) {
//     console.error('❌ Create offer error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   PUT /api/deals/:id/accept
// // @desc    Accept a deal (buyer accepts offer OR generator accepts request)
// router.put('/:id/accept', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     // Verify user is part of deal
//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     deal.status = 'accepted';
//     await deal.save();
//     res.json(deal);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   PUT /api/deals/:id/reject
// // @desc    Reject a deal
// router.put('/:id/reject', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     const userId = String(req.userId);
//     if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
//       return res.status(403).json({ msg: 'Not authorized' });
//     }

//     deal.status = 'rejected';
//     await deal.save();

//     // Reset listing back to active
//     await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

//     res.json(deal);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   PUT /api/deals/:id/complete
// router.put('/:id/complete', auth, async (req, res) => {
//   try {
//     const deal = await Deal.findById(req.params.id);
//     if (!deal) return res.status(404).json({ msg: 'Deal not found' });

//     deal.status = 'completed';
//     await deal.save();

//     await Listing.findByIdAndUpdate(deal.listingId, { status: 'closed' });
//     await User.findByIdAndUpdate(deal.buyerId, { $inc: { walletBalance: -deal.buyerTotalPayment } });
//     await User.findByIdAndUpdate(deal.generatorId, { $inc: { walletBalance: deal.generatorPayout } });
//     await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

//     res.json(deal);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // @route   GET /api/deals/user
// router.get('/user', auth, async (req, res) => {
//   try {
//     const deals = await Deal.find({
//       $or: [{ buyerId: req.userId }, { generatorId: req.userId }]
//     }).sort({ createdAt: -1 });
//     res.json(deals);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // @route   GET /api/deals/all
// router.get('/all', auth, async (req, res) => {
//   try {
//     const admin = await User.findById(req.userId);
//     if (!admin || admin.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
//     const deals = await Deal.find().sort({ createdAt: -1 });
//     res.json(deals);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// module.exports = router;


