// backend/routes/deals.js
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/deals
// @desc    Buyer sends request on generator's listing
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ msg: 'Listing ID required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const buyer = await User.findById(req.userId);
    const generator = await User.findById(listing.generatorId);

    const total = listing.quantity * listing.price;
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
      buyerCommission: Math.round(total * 0.02),
      generatorCommission: Math.round(total * 0.02),
      platformRevenue: Math.round(total * 0.04),
      buyerTotalPayment: Math.round(total * 1.02),
      generatorPayout: Math.round(total * 0.98),
      status: 'requested',
      initiatedBy: 'buyer'
    });
    await deal.save();

    listing.status = 'pending';
    await listing.save();

    console.log(`✅ Buyer request created | ${buyer.name} → ${generator?.name}`);
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
    const { listingId, buyerId } = req.body;
    if (!listingId || !buyerId) return res.status(400).json({ msg: 'listingId and buyerId required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    // Verify this listing belongs to the caller
    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'You can only offer your own listings' });
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ msg: 'Buyer not found' });

    const generator = await User.findById(req.userId);

    const total = listing.quantity * listing.price;
    const deal = new Deal({
      listingId: listing._id,
      generatorId: req.userId,
      generatorName: generator.name,
      buyerId: buyerId,
      buyerName: buyer.name,
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: listing.price,
      totalAmount: total,
      buyerCommission: Math.round(total * 0.02),
      generatorCommission: Math.round(total * 0.02),
      platformRevenue: Math.round(total * 0.04),
      buyerTotalPayment: Math.round(total * 1.02),
      generatorPayout: Math.round(total * 0.98),
      status: 'offered',
      initiatedBy: 'generator'
    });
    await deal.save();

    console.log(`✅ Generator offer created | ${generator.name} → ${buyer.name} | ₹${total}`);
    res.status(201).json(deal);
  } catch (err) {
    console.error('❌ Create offer error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/deals/:id/accept
// @desc    Accept a deal (buyer accepts offer OR generator accepts request)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    // Verify user is part of deal
    const userId = String(req.userId);
    if (userId !== String(deal.buyerId) && userId !== String(deal.generatorId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    deal.status = 'accepted';
    await deal.save();
    res.json(deal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/deals/:id/reject
// @desc    Reject a deal
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

    // Reset listing back to active
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'active' });

    res.json(deal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/deals/:id/complete
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    deal.status = 'completed';
    await deal.save();

    await Listing.findByIdAndUpdate(deal.listingId, { status: 'closed' });
    await User.findByIdAndUpdate(deal.buyerId, { $inc: { walletBalance: -deal.buyerTotalPayment } });
    await User.findByIdAndUpdate(deal.generatorId, { $inc: { walletBalance: deal.generatorPayout } });
    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

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
    const admin = await User.findById(req.userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    const deals = await Deal.find().sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;