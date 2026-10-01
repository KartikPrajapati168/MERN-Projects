// backend/routes/deals.js
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');
const WalletTransaction = require('../models/WalletTransaction');
const { sendOtpEmail, sendDealConfirmationEmail } = require('../utils/emailService');

// Helper: Calculate all commissions
const calcCommissions = (total) => ({
  buyerCommission: Math.round(total * 0.02),
  generatorCommission: Math.round(total * 0.02),
  platformRevenue: Math.round(total * 0.04),
  buyerTotalPayment: Math.round(total * 1.02),
  generatorPayout: Math.round(total * 0.98)
});

// ✅ 1. Request OTP
router.post('/request-otp', auth, async (req, res) => {
  console.log("🔥 OTP Request aayi hai:", req.body);
  try {
    const { dealId } = req.body || {};   // ✅ SAFE
    const buyerId = req.userId;

    if (!dealId) return res.status(400).json({ message: 'dealId required' });

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });
    if (deal.status === 'accepted' || deal.status === 'otp_verified' || deal.status === 'paid') {
      return res.status(400).json({ message: 'Deal already processed or OTP already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    deal.otp = otp;
    deal.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    deal.status = 'otp_sent';
    await deal.save();

    const buyer = await User.findById(buyerId);
    try {
      await sendOtpEmail(buyer.email, otp);
    } catch (emailError) {
      console.error("OTP Email error:", emailError);
      return res.status(500).json({ message: 'Email bhejne me error aayi. Check backend console.' });
    }
    res.status(200).json({ message: '✅ OTP sent to your email!' });
  } catch (error) {
    console.error("Request OTP Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ✅ 2. Verify OTP
router.post('/verify-otp', auth, async (req, res) => {
  try {
    const { dealId, otp } = req.body || {};   // ✅ SAFE
    const buyerId = req.userId;

    if (!dealId || !otp) return res.status(400).json({ message: 'dealId and otp required' });

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    if (String(deal.buyerId) !== String(buyerId)) return res.status(403).json({ message: 'Unauthorized' });

    if (deal.otp !== otp) return res.status(400).json({ message: 'Invalid OTP!' });
    if (new Date() > deal.otpExpires) return res.status(400).json({ message: 'OTP has expired!' });

    deal.status = 'otp_verified';
    deal.otpVerified = true;
    deal.otp = undefined;
    deal.otpExpires = undefined;
    await deal.save();

    res.status(200).json({ message: '✅ OTP Verified! Please proceed to payment.' });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ✅ 3. Accept via Wallet — FIXED
router.put('/:id/accept', auth, async (req, res) => {
  try {
    // ✅ FIXED: Use `body` variable (req.body was undefined on empty PUT)
    const body = req.body || {};
    const { requirementId } = body;

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (!['requested', 'offered', 'otp_verified'].includes(deal.status)) {
      return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
    }

    const buyer = await User.findById(deal.buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    if ((buyer.walletBalance || 0) < deal.buyerTotalPayment) {
      return res.status(400).json({
        msg: `Insufficient wallet balance. Need ₹${deal.buyerTotalPayment}, have ₹${buyer.walletBalance || 0}`,
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    buyer.walletBalance -= deal.buyerTotalPayment;
    await buyer.save();

    await WalletTransaction.create({
      userId: buyer._id,
      amount: -deal.buyerTotalPayment,
      type: 'deal_payment',
      method: 'wallet',
      status: 'success',
      balanceAfter: buyer.walletBalance,
      description: `Payment for deal ${deal._id} (${deal.material})`
    });

    const generator = await User.findByIdAndUpdate(
      deal.generatorId,
      { $inc: { walletBalance: deal.generatorPayout } },
      { new: true }
    );

    await WalletTransaction.create({
      userId: generator._id,
      amount: deal.generatorPayout,
      type: 'deal_receive',
      method: 'wallet',
      status: 'success',
      balanceAfter: generator.walletBalance,
      description: `Received payment for deal ${deal._id} (${deal.material})`
    });

    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

    deal.status = 'paid';
    if (requirementId) deal.requirementId = requirementId;
    await deal.save();

    try { await sendDealConfirmationEmail(buyer.email, deal._id); } catch (emailError) { console.error("Email error:", emailError); }

    res.json(deal);
  } catch (err) {
    console.error('❌ /accept error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ✅ 4. Accept via Razorpay — FIXED
router.put('/:id/accept-razorpay', auth, async (req, res) => {
  try {
    const body = req.body || {};   // ✅ SAFE
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, requirementId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Payment verification fields required' });
    }

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');

    if (generated !== razorpay_signature) return res.status(400).json({ msg: 'Invalid payment signature' });

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });
    if (String(deal.buyerId) !== String(req.userId)) return res.status(403).json({ msg: 'Only buyer can pay' });

    if (!['requested', 'offered', 'otp_verified'].includes(deal.status)) {
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

    await WalletTransaction.create({
      userId: generator._id,
      amount: deal.generatorPayout,
      type: 'deal_receive',
      method: 'razorpay',
      status: 'success',
      balanceAfter: generator.walletBalance,
      description: `Received payment for deal ${deal._id} (${deal.material}) via Razorpay`
    });

    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

    const buyer = await User.findById(deal.buyerId);
    try { await sendDealConfirmationEmail(buyer.email, deal._id); } catch (emailError) { console.error("Email error:", emailError); }

    res.json(deal);
  } catch (err) {
    console.error('❌ /accept-razorpay error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/deals/:id/reject
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

    // ✅ Reset listing to active so it can be requested again
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

    res.json(deal);
  } catch (err) {
    console.error('❌ /reject error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.put('/:id/complete', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (!['accepted', 'paid'].includes(deal.status)) {
      return res.status(400).json({ msg: `Cannot complete deal with status "${deal.status}"` });
    }

    deal.status = 'completed';
    await deal.save();

    if (deal.requirementId) {
      const Requirement = require('../models/Requirement');
      await Requirement.findByIdAndUpdate(deal.requirementId, { status: 'fulfilled' });
    }

    // ✅ NEW: Listing ko wapas active karo taaki naye buyers request kar sakein
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

    console.log(`✅ Deal ${deal._id} completed → Listing ${deal.listingId} set to active`);
    res.json(deal);
  } catch (err) {
    console.error('❌ /complete error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/deals/user
router.get('/user', auth, async (req, res) => {
  try {
    const deals = await Deal.find({
      $or: [{ buyerId: req.userId }, { generatorId: req.userId }]
    }).sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// @route   GET /api/deals/all
router.get('/all', auth, async (req, res) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// @route   POST /api/deals/razorpay-add
router.post('/razorpay-add', auth, async (req, res) => {
  try {
    const body = req.body || {};   // ✅ SAFE
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Missing fields' });
    }

    const crypto = require('crypto');
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
      userId: user._id,
      amount: Number(amount),
      type: 'add_money',
      method: 'razorpay',
      status: 'success',
      balanceAfter: user.walletBalance,
      description: `Added money via Razorpay (${razorpay_payment_id})`
    });

    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) {
    console.error('❌ /razorpay-add error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/deals — Buyer creates direct request
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};   // ✅ SAFE
    const { listingId, requirementId, requestedQuantity, requestedPrice } = body;

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
        current: buyer.walletBalance || 0
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
      quantity: finalQuantity,
      pricePerUnit: finalPrice,
      listingQuantity: listing.quantity,
      location: listing.location,
      totalAmount: total,
      ...comm,
      status: 'requested',
      initiatedBy: 'buyer'
    });
    await deal.save();

    console.log(`✅ Request sent | ${buyer.name} → ${generator?.name} | ${finalQuantity}kg @ ₹${finalPrice}/kg`);
    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create deal error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/deals/offer — Generator sends offer to buyer
router.post('/offer', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const { listingId, buyerId, requirementId, quantity, pricePerUnit } = body;
    
    if (!listingId || !buyerId) {
      return res.status(400).json({ msg: 'listingId and buyerId required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'You can only offer your own listings' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    // ✅ Use provided quantity/price, fallback to listing values
    const finalQty = Number(quantity) || listing.quantity;
    const finalPrice = Number(pricePerUnit) || listing.price;

    if (finalQty <= 0 || finalPrice <= 0) {
      return res.status(400).json({ msg: 'Invalid quantity or price' });
    }
    if (finalQty > listing.quantity) {
      return res.status(400).json({ msg: `Quantity exceeds listing stock (${listing.quantity} kg)` });
    }

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
      quantity: finalQty,           // ✅ Custom quantity
      pricePerUnit: finalPrice,     // ✅ Custom price
      listingQuantity: listing.quantity,  // Keep original for reference
      location: listing.location,
      totalAmount: total,
      ...comm,
      status: 'offered',
      initiatedBy: 'generator'
    });
    await deal.save();

    console.log(`✅ Offer sent: ${generator.name} → ${buyer.name} | ${finalQty}kg @ ₹${finalPrice}/kg`);
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


