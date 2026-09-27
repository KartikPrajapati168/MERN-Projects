// backend/routes/listings.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Listing = require('../models/Listing');
const { authMiddleware } = require('../middleware/auth');
const auth = authMiddleware;   // alias — dono kaam karenge
const User = require('../models/User');
const { materialClassifier } = require('../services/aiService');

// ✅ Safe parsing function - top pe add karo (router ke baad)
const parseCoordinates = (coords) => {
  if (!coords) return [0, 0];
  // Agar already array hai
  if (Array.isArray(coords)) return coords;
  try {
    // Try JSON parse first
    const parsed = JSON.parse(coords);
    if (Array.isArray(parsed)) return parsed;
    return [0, 0];
  } catch {
    // Fallback: comma-separated string
    if (typeof coords === 'string') {
      const parts = coords.split(',').map(n => parseFloat(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts;
      }
    }
    return [0, 0];
  }
};

// ✅ Ensure upload folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'listings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Multer setup for listing images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, JPG, WEBP allowed'), false);
  }
});

/**
 * @route   POST /api/listings
 * @desc    Create listing with images + AI classification
 * @access  Private (Generator)
 */
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const {
      material, materialSubtype, quantity, price, location,
      locationCoordinates, description, biddingEnabled, minBidPrice, biddingEndsAt
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // ✅ AI Classification
    const textForAI = `${material} ${materialSubtype || ''} ${description || ''}`;
    const aiResult = materialClassifier.classify(textForAI);

    // ✅ Safe coordinates parse
    const coords = parseCoordinates(locationCoordinates);

    // ✅ Safe bidding parse (FormData sends strings)
    const isBiddingEnabled = biddingEnabled === 'true' || biddingEnabled === true;

    const imageUrls = req.files 
      ? req.files.map(f => `${req.protocol}://${req.get('host')}/uploads/listings/${f.filename}`)
      : [];

    const listing = new Listing({
      generatorId: req.userId,
      generatorName: user.name,
      material,
      materialSubtype: materialSubtype || '',
      quantity: Number(quantity),
      price: Number(price),
      location,
      locationCoordinates: { type: 'Point', coordinates: coords }, // ✅ Proper format
      description: description || '',
      images: imageUrls,
      aiCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      status: 'active',
      biddingEnabled: isBiddingEnabled,
      minBidPrice: isBiddingEnabled && minBidPrice ? Number(minBidPrice) : undefined,
      biddingEndsAt: isBiddingEnabled && biddingEndsAt ? new Date(biddingEndsAt) : undefined,
    });

    await listing.save();
    console.log(`✅ Listing created | AI: ${aiResult.category} (${aiResult.confidence}%)`);
    res.status(201).json(listing);
  } catch (err) {
    console.error('❌ Create listing error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// Get all active listings
// @route   GET /api/listings (all active + pending, excluding ended biddings)
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const listings = await Listing.find({
      status: { $in: ['active', 'pending'] },
      // ✅ Exclude listings whose bidding has ENDED
      // (biddingEnabled=true AND biddingEndsAt <= now)
      $or: [
        { biddingEnabled: { $ne: true } },        // no bidding
        { biddingEndsAt: null },                  // no end date
        { biddingEndsAt: { $gt: now } },          // bidding still running
      ],
    }).sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// My listings
router.get('/user', auth, async (req, res) => {
  try {
    const listings = await Listing.find({ generatorId: req.userId });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Bids received
router.get('/bids-received', auth, async (req, res) => {
  try {
    const Deal = require('../models/Deal');
    
    // ✅ Include ALL bidding-enabled listings (even without bids)
    const listings = await Listing.find({ 
      generatorId: req.userId,
      biddingEnabled: true
    }).sort({ createdAt: -1 });
    
    // Fetch all deals on these listings
    const listingIds = listings.map(l => l._id);
    const deals = await Deal.find({ listingId: { $in: listingIds } }).sort({ createdAt: -1 });
    
    // Attach direct requests to each listing
    const result = listings.map(l => {
      const listingDeals = deals.filter(d => String(d.listingId) === String(l._id));
      return {
        ...l.toObject(),
        bids: l.bids || [],
        requests: listingDeals.map(d => ({
          _id: d._id,
          buyerId: d.buyerId,
          buyerName: d.buyerName,
          amount: d.pricePerUnit,
          quantity: d.quantity,
          totalAmount: d.totalAmount,
          status: d.status,
          createdAt: d.createdAt,
          initiatedBy: d.initiatedBy
        }))
      };
    });
    
    res.json(result);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Buyer places a bid
router.post('/:id/bids', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });
    if (!listing.biddingEnabled) return res.status(400).json({ msg: 'Bidding not enabled' });

    // ✅ Block if bidding time ended
    if (listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now()) {
      return res.status(400).json({ msg: 'Bidding has ended. Cannot place new bids.' });
    }

    // ✅ Block if listing closed/sold
    if (listing.status === 'sold' || listing.status === 'closed') {
      return res.status(400).json({ msg: 'This listing is closed.' });
    }

    // ✅ Block if bidding time ended
if (listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now()) {
  return res.status(400).json({ msg: 'Bidding has ended. Cannot place new bids.' });
}

// ✅ Block if listing is closed
if (listing.status === 'closed' || listing.status === 'sold') {
  return res.status(400).json({ msg: 'This listing is closed.' });
}

if (Number(amount) < listing.minBidPrice) {
  return res.status(400).json({ msg: `Minimum bid is ₹${listing.minBidPrice}/kg` });
}

    const buyer = await User.findById(req.userId);
    const newBid = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      buyerId: req.userId,
      buyerName: buyer.name,
      amount: Number(amount),
      status: 'pending',
      createdAt: new Date()
    };
    listing.bids.push(newBid);
    await listing.save();
    res.status(201).json({ msg: 'Bid placed successfully', bid: newBid });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Accept bid
router.post('/:id/bids/:bidId/accept', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    const bid = listing.bids.find(b => b.id === req.params.bidId);
    if (!bid) return res.status(404).json({ msg: 'Bid not found' });

    bid.status = 'accepted';
    listing.status = 'closed';   // ✅ Always 'closed' when assigned
    await listing.save();

    const Deal = require('../models/Deal');
    const total = listing.quantity * bid.amount;
    const deal = new Deal({
      listingId: listing._id,
      generatorId: listing.generatorId,
      buyerId: bid.buyerId,
      buyerName: bid.buyerName,
      generatorName: listing.generatorName,
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: bid.amount,
      totalAmount: total,
      buyerCommission: Math.round(total * 0.02),
      generatorCommission: Math.round(total * 0.02),
      platformRevenue: Math.round(total * 0.04),
      buyerTotalPayment: Math.round(total * 1.02),
      generatorPayout: Math.round(total * 0.98),
      status: 'accepted'
    });
    await deal.save();
    res.json({ msg: 'Bid accepted', deal });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Reject bid
router.post('/:id/bids/:bidId/reject', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    const bid = listing.bids.find(b => b.id === req.params.bidId);
    if (bid) bid.status = 'rejected';
    await listing.save();
    res.json({ msg: 'Bid rejected' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});


// @route   GET /api/listings/:id/my-bid
// @desc    Get current user's bid status on this listing
router.get('/:id/my-bid', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const allBids = listing.bids || [];
    const sortedBids = [...allBids].filter(b => b.status !== 'rejected').sort((a, b) => b.amount - a.amount);
    const myBid = allBids.find(b => String(b.buyerId) === String(req.userId));
    const rank = myBid ? sortedBids.findIndex(b => b.id === myBid.id) + 1 : null;
    const topBid = sortedBids[0] || null;

    res.json({
      myBid: myBid || null,
      rank: rank || null,
      topBid: topBid,
      totalBids: sortedBids.length,
      isEnded: listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now(),
      hasBidding: !!listing.biddingEnabled,
      minBidPrice: listing.minBidPrice
    });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// @route   PUT /api/listings/:id/bids/:bidId
// @desc    Update/increment your bid amount
router.put('/:id/bids/:bidId', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ msg: 'Invalid amount' });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });
    if (!listing.biddingEnabled) return res.status(400).json({ msg: 'Bidding not enabled' });

    const isEnded = listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now();
    if (isEnded) return res.status(400).json({ msg: 'Bidding has already ended' });

    if (listing.status === 'sold' || listing.status === 'closed') {
      return res.status(400).json({ msg: 'Listing is closed' });
    }

    const bid = listing.bids.find(b => b.id === req.params.bidId);
    if (!bid) return res.status(404).json({ msg: 'Bid not found' });
    if (String(bid.buyerId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'Not authorized to modify this bid' });
    }

    const newAmount = Number(amount);
    if (newAmount < listing.minBidPrice) {
      return res.status(400).json({ msg: `Minimum bid is ₹${listing.minBidPrice}/kg` });
    }

    // Must be higher than current top bid (excluding own)
    const otherBids = listing.bids
      .filter(b => b.id !== bid.id && b.status !== 'rejected')
      .sort((a, b) => b.amount - a.amount);
    const topOther = otherBids[0];

    if (topOther && newAmount <= topOther.amount) {
      return res.status(400).json({
        msg: `Your new bid must be higher than the current highest bid of ₹${topOther.amount}/kg`
      });
    }

    bid.amount = newAmount;
    bid.createdAt = new Date();
    await listing.save();

    console.log(`📈 Bid updated | ${bid.buyerName} | ${listing.material} | ₹${newAmount}/kg`);
    res.json({ msg: 'Bid updated successfully', bid });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// @route   POST /api/listings/:id/bids/auto-award
// @desc    Award listing to highest bidder after bidding ends
router.post('/:id/bids/auto-award', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'Only the owner can award' });
    }

    if (!listing.biddingEnabled) return res.status(400).json({ msg: 'Bidding not enabled' });

    const isEnded = listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now();
    if (!isEnded) return res.status(400).json({ msg: 'Bidding has not ended yet. Please wait.' });

    if (listing.status === 'sold' || listing.status === 'closed') {
      return res.status(400).json({ msg: 'Listing already awarded' });
    }

    const validBids = (listing.bids || [])
      .filter(b => b.status !== 'rejected')
      .sort((a, b) => b.amount - a.amount);
    const winningBid = validBids[0];

    if (!winningBid) return res.status(400).json({ msg: 'No bids to award' });

    // Mark winner + reject others
    winningBid.status = 'accepted';
    listing.bids.forEach(b => {
      if (b.id !== winningBid.id && b.status === 'pending') b.status = 'rejected';
    });
    listing.status = 'closed';   // ✅
    await listing.save();

    // Create deal
    const Deal = require('../models/Deal');
    const User = require('../models/User');
    const total = listing.quantity * winningBid.amount;
    const buyer = await User.findById(winningBid.buyerId);

    const deal = new Deal({
      listingId: listing._id,
      generatorId: listing.generatorId,
      generatorName: listing.generatorName,
      buyerId: winningBid.buyerId,
      buyerName: winningBid.buyerName || buyer?.name || 'Buyer',
      material: listing.material,
      quantity: listing.quantity,
      pricePerUnit: winningBid.amount,
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

    console.log(`🏆 Auto-award | ${listing.material} | Winner: ${winningBid.buyerName} | ₹${winningBid.amount}/kg`);
    res.json({ msg: `Awarded to ${winningBid.buyerName} (₹${winningBid.amount}/kg)`, deal });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;






































// // backend/routes/listings.js
// const express = require('express');
// const router = express.Router();
// const Listing = require('../models/Listing');
// const auth = require('../middleware/auth');
// const User = require('../models/User'); // ✅ imported

// // @route   POST /api/listings
// router.post('/', auth, async (req, res) => {
//   try {
//     const {
//       material,
//       materialSubtype,
//       quantity,
//       price,
//       location,
//       locationCoordinates,
//       description,
//     } = req.body;

//     // Get user details
//     const user = await User.findById(req.userId);
//     if (!user) {
//       return res.status(404).json({ msg: 'User not found' });
//     }

//     // ✅ Use correct field name: generatorId (not generaterId)
//     const listing = new Listing({
//       generatorId: req.userId,          // ✅ correct
//       generatorName: user.name,
//       material,
//       materialSubtype: materialSubtype || '',
//       quantity,
//       price,
//       location,
//       locationCoordinates: locationCoordinates || [0, 0],
//       description: description || '',
//       status: 'active',                // default, but explicit
//     });

//     await listing.save();
//     res.status(201).json(listing);
//   } catch (err) {
//     console.error('❌ Create listing error:', err.message);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   GET /api/listings (all active)
// router.get('/', async (req, res) => {
//   try {
//     const listings = await Listing.find({ status: 'active' });
//     res.json(listings);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   GET /api/listings/user (my listings)
// router.get('/user', auth, async (req, res) => {
//   try {
//     // ✅ Use correct field name
//     const listings = await Listing.find({ generatorId: req.userId });
//     res.json(listings);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   PUT /api/listings/:id
// router.put('/:id', auth, async (req, res) => {
//   try {
//     const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.json(listing);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // @route   DELETE /api/listings/:id (optional, but you already have it)
// router.delete('/:id', auth, async (req, res) => {
//   try {
//     await Listing.findByIdAndDelete(req.params.id);
//     res.json({ msg: 'Listing deleted' });
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });


// // Bids received by generator
// router.get('/bids-received', auth, async (req, res) => {
//   try {
//     const listings = await Listing.find({ generatorId: req.userId, 'bids.0': { $exists: true } });
//     res.json(listings);
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // Accept a bid
// router.post('/:id/bids/:bidId/accept', auth, async (req, res) => {
//   try {
//     const listing = await Listing.findById(req.params.id);
//     const bid = listing.bids.find(b => b.id === req.params.bidId);
//     if (!bid) return res.status(404).json({ msg: 'Bid not found' });
    
//     bid.status = 'accepted';
//     listing.status = 'sold';
//     await listing.save();

//     // Create a Deal automatically
//     const Deal = require('../models/Deal');
//     const total = listing.quantity * bid.amount;
//     const deal = new Deal({
//       listingId: listing._id,
//       generatorId: listing.generatorId,
//       buyerId: bid.buyerId,
//       material: listing.material,
//       quantity: listing.quantity,
//       pricePerUnit: bid.amount,
//       totalAmount: total,
//       buyerCommission: Math.round(total * 0.02),
//       generatorCommission: Math.round(total * 0.02),
//       platformRevenue: Math.round(total * 0.04),
//       buyerTotalPayment: Math.round(total * 1.02),
//       generatorPayout: Math.round(total * 0.98),
//       status: 'accepted'
//     });
//     await deal.save();
//     res.json({ msg: 'Bid accepted', deal });
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });

// // Reject a bid
// router.post('/:id/bids/:bidId/reject', auth, async (req, res) => {
//   try {
//     const listing = await Listing.findById(req.params.id);
//     const bid = listing.bids.find(b => b.id === req.params.bidId);
//     if (bid) bid.status = 'rejected';
//     await listing.save();
//     res.json({ msg: 'Bid rejected' });
//   } catch (err) { res.status(500).json({ msg: err.message }); }
// });


// module.exports = router;