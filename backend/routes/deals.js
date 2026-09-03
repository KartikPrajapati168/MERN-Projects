const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create deal (Buyer requests)
router.post('/', auth, async (req, res) => {
  try {
    const { listingId } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const total = listing.quantity * listing.price;
    const deal = new Deal({
      listingId: listing._id,
      generatorId: listing.generatorId,
      buyerId: req.userId,
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: listing.price,
      totalAmount: total,
      buyerCommission: Math.round(total * 0.02),
      generatorCommission: Math.round(total * 0.02),
      platformRevenue: Math.round(total * 0.04),
      buyerTotalPayment: Math.round(total * 1.02),
      generatorPayout: Math.round(total * 0.98),
      status: 'requested'
    });
    await deal.save();

    // Update listing status
    listing.status = 'pending';
    await listing.save();

    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Accept deal (Generator)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Complete deal (Update wallets + revenue)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ msg: 'Deal not found' });

    deal.status = 'completed';
    await deal.save();

    // Update listing status to closed
    await Listing.findByIdAndUpdate(deal.listingId, { status: 'closed' });

    // Update user wallets
    await User.findByIdAndUpdate(deal.buyerId, { $inc: { walletBalance: -deal.buyerTotalPayment } });
    await User.findByIdAndUpdate(deal.generatorId, { $inc: { walletBalance: deal.generatorPayout } });
    // Admin wallet update (if admin exists)
    await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: deal.platformRevenue } });

    res.json(deal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get user's deals
router.get('/user', auth, async (req, res) => {
  try {
    const deals = await Deal.find({ $or: [{ buyerId: req.userId }, { generatorId: req.userId }] });
    res.json(deals);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;