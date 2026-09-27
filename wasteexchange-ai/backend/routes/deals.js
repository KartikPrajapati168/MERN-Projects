// backend/routes/deals.js
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');

// Helper: Calculate all commissions
const calcCommissions = (total) => ({
  buyerCommission: Math.round(total * 0.02),
  generatorCommission: Math.round(total * 0.02),
  platformRevenue: Math.round(total * 0.04),
  buyerTotalPayment: Math.round(total * 1.02),
  generatorPayout: Math.round(total * 0.98)
});

// @route   POST /api/deals
// @desc    Buyer sends request on generator's listing
// @access  Private (Buyer)
router.post('/', auth, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ msg: 'Listing ID required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const buyer = await User.findById(req.userId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    const generator = await User.findById(listing.generatorId);

    const total = listing.quantity * listing.price;
    const comm = calcCommissions(total);

    // ✅ CHECK: Buyer must have enough wallet
    if ((buyer.walletBalance || 0) < comm.buyerTotalPayment) {
      return res.status(400).json({
        msg: `Insufficient wallet balance. Need ₹${comm.buyerTotalPayment}, you have ₹${buyer.walletBalance || 0}. Please add money first.`,
        code: 'INSUFFICIENT_BALANCE',
        required: comm.buyerTotalPayment,
        current: buyer.walletBalance || 0
      });
    }

    const deal = new Deal({
      listingId: listing._id,
      generatorId: listing.generatorId,
      generatorName: generator?.name || listing.generatorName || 'Unknown',
      buyerId: req.userId,
      buyerName: buyer.name,
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: listing.price,
      totalAmount: total,
      ...comm,
      status: 'requested',
      initiatedBy: 'buyer'
    });
    await deal.save();

    // ✅ Don't change listing status yet - only mark when accepted
    // (prevents listing from disappearing while request is pending)

    console.log(`✅ Buyer request | ${buyer.name} → ${generator?.name} | Total ₹${total} (buyer pays ₹${comm.buyerTotalPayment})`);
    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create deal error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/deals/offer
// @desc    Generator sends offer to a specific buyer
// @access  Private (Generator)
router.post('/offer', auth, async (req, res) => {
  try {
    const { listingId, buyerId, requirementId } = req.body;
    if (!listingId || !buyerId) return res.status(400).json({ msg: 'listingId and buyerId required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'You can only offer your own listings' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    const generator = await User.findById(req.userId);

    const total = listing.quantity * listing.price;
    const comm = calcCommissions(total);

    const deal = new Deal({
      listingId: listing._id,
      requirementId: requirementId || null, // ✅ NEW
      generatorId: req.userId,
      generatorName: generator.name,
      buyerId: buyerId,
      buyerName: buyer.name,
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: listing.price,
      totalAmount: total,
      ...comm,
      status: 'offered',
      initiatedBy: 'generator'
    });
    await deal.save();

    console.log(`✅ Generator offer | ${generator.name} → ${buyer.name} | ₹${total}`);
    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create offer error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/deals/:id/accept
// @desc    Accept deal — MONEY TRANSFER HAPPENS HERE
// @access  Private
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (deal.status !== 'requested' && deal.status !== 'offered') {
      return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
    }

    // ✅ FRESH FETCH buyer
    const buyer = await User.findById(deal.buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    // ✅ WALLET CHECK
    if ((buyer.walletBalance || 0) < deal.buyerTotalPayment) {
      return res.status(400).json({
        msg: `Buyer has insufficient balance. Need ₹${deal.buyerTotalPayment}, but has ₹${buyer.walletBalance || 0}.`,
        code: 'INSUFFICIENT_BALANCE',
        required: deal.buyerTotalPayment,
        current: buyer.walletBalance || 0
      });
    }

    // 💰 DEDUCT FROM BUYER
    buyer.walletBalance -= deal.buyerTotalPayment;
    await buyer.save();

    // 💰 CREDIT TO GENERATOR
    await User.findByIdAndUpdate(deal.generatorId, {
      $inc: { walletBalance: deal.generatorPayout }
    });

    // 💰 CREDIT TO ADMIN
    await User.findOneAndUpdate(
      { role: 'admin' },
      { $inc: { walletBalance: deal.platformRevenue } }
    );

    deal.status = 'accepted';
    await deal.save();

    // Close listing
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'closed' });

    console.log(`💰 DEAL ACCEPTED | Buyer paid ₹${deal.buyerTotalPayment} | Generator got ₹${deal.generatorPayout} | Admin got ₹${deal.platformRevenue}`);

    res.json(deal);
  } catch (err) {
    console.error('❌ Accept deal error:', err);
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
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });
    res.json(deal);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// @route   PUT /api/deals/:id/complete
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (deal.status !== 'accepted') {
      return res.status(400).json({ msg: 'Only accepted deals can be completed' });
    }

    deal.status = 'completed';
    await deal.save();

    // ✅ Mark the associated requirement as fulfilled
    if (deal.requirementId) {
      const Requirement = require('../models/Requirement');
      await Requirement.findByIdAndUpdate(deal.requirementId, { status: 'fulfilled' });
      console.log(`✅ Requirement ${deal.requirementId} marked as fulfilled`);
    }

    console.log(`✅ Deal completed | ${deal.material} | ${deal.quantity}kg`);
    res.json(deal);
  } catch (err) { res.status(500).json({ msg: err.message }); }
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

// @route   PUT /api/deals/:id/accept-razorpay
// @desc    Accept deal via Razorpay payment
router.put('/:id/accept-razorpay', auth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: 'Missing Razorpay fields' });
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated = hmac.digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ msg: 'Invalid payment signature' });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });
    if (String(deal.buyerId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'Only buyer can pay via Razorpay' });
    }
    if (deal.status !== 'offered' && deal.status !== 'requested') {
      return res.status(400).json({ msg: `Cannot accept deal with status "${deal.status}"` });
    }

    // Accept deal WITHOUT deducting from buyer's wallet
    deal.status = 'accepted';
    deal.paymentMethod = 'razorpay';
    deal.razorpayPaymentId = razorpay_payment_id;
    await deal.save();

    // ✅ Credit generator + admin (buyer already paid via Razorpay to platform account)
    await User.findByIdAndUpdate(deal.generatorId, { $inc: { walletBalance: deal.generatorPayout } });
    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'closed' });

    console.log(`✅ Deal accepted via Razorpay | ${deal.material} | ₹${deal.buyerTotalPayment}`);
    res.json(deal);
  } catch (err) {
    console.error('❌ Accept via Razorpay error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/wallet/razorpay-add
// @desc    Add money to wallet via verified Razorpay payment
router.post('/razorpay-add', auth, async (req, res) => {
  try {
    const crypto = require('crypto');
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

    console.log(`💰 Wallet topup via Razorpay | ${user.name} | +₹${amount}`);
    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) {
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


