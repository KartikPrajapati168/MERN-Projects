// backend/routes/listings.js
const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const auth = authMiddleware;
const upload = require('../middleware/upload');             // ✅ Cloudinary-powered
const { materialClassifier } = require('../services/aiService');
const { getFileUrls } = require('../utils/fileUrl');         // ✅ Helper

/* ============================================================
   ✅ Safe coordinate parser
============================================================ */
const parseCoordinates = (coords) => {
  if (!coords) return [0, 0];
  if (Array.isArray(coords)) return coords;
  try {
    const parsed = JSON.parse(coords);
    if (Array.isArray(parsed)) return parsed;
    return [0, 0];
  } catch {
    if (typeof coords === 'string') {
      const parts = coords.split(',').map((n) => parseFloat(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
    }
    return [0, 0];
  }
};

/* ============================================================
   POST /api/listings — Create listing (with Cloudinary images)
   Access: Private (Generator)
============================================================ */
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const {
      material, materialSubtype, quantity, price, location,
      locationCoordinates, description, biddingEnabled,
      minBidPrice, biddingEndsAt,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // ✅ Cloudinary image URLs
    const imageUrls = getFileUrls(req.files);

    // ✅ AI classification
    const textForAI = `${material} ${materialSubtype || ''} ${description || ''}`;
    const aiResult = materialClassifier.classify(textForAI);

    // ✅ Safe coordinates
    const coords = parseCoordinates(locationCoordinates);

    // ✅ Safe bidding parse
    const isBiddingEnabled = biddingEnabled === 'true' || biddingEnabled === true;

    const listing = new Listing({
      generatorId: req.userId,
      generatorName: user.name,
      material,
      materialSubtype: materialSubtype || '',
      quantity: Number(quantity),
      price: Number(price),
      location,
      locationCoordinates: { type: 'Point', coordinates: coords },
      description: description || '',
      images: imageUrls,                       // ✅ Cloudinary URLs
      aiCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      status: 'active',
      biddingEnabled: isBiddingEnabled,
      minBidPrice: isBiddingEnabled && minBidPrice ? Number(minBidPrice) : undefined,
      biddingEndsAt: isBiddingEnabled && biddingEndsAt ? new Date(biddingEndsAt) : undefined,
    });

    await listing.save();
    console.log(`✅ Listing created | ${imageUrls.length} image(s) | AI: ${aiResult.category} (${aiResult.confidence}%)`);
    res.status(201).json(listing);
  } catch (err) {
    console.error('❌ Create listing error:', err);
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/listings — All active + pending (excluding ended bidding)
============================================================ */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const listings = await Listing.find({
      status: { $in: ['active', 'pending'] },
      $or: [
        { biddingEnabled: { $ne: true } },
        { biddingEndsAt: null },
        { biddingEndsAt: { $gt: now } },
      ],
    }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/listings/user — My listings
============================================================ */
router.get('/user', auth, async (req, res) => {
  try {
    const listings = await Listing.find({ generatorId: req.userId }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   PUT /api/listings/:id — Update listing (with new images)
============================================================ */
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    if (String(listing.generatorId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const {
      material, materialSubtype, quantity, price, location,
      locationCoordinates, description,
    } = req.body;

    if (material !== undefined) listing.material = material;
    if (materialSubtype !== undefined) listing.materialSubtype = materialSubtype;
    if (quantity !== undefined) listing.quantity = Number(quantity);
    if (price !== undefined) listing.price = Number(price);
    if (location !== undefined) listing.location = location;
    if (description !== undefined) listing.description = description;

    if (locationCoordinates) {
      try {
        const coords = JSON.parse(locationCoordinates);
        if (coords.length === 2) {
          listing.locationCoordinates = { type: 'Point', coordinates: coords };
        }
      } catch (_) {}
    }

    // ✅ New images → Cloudinary URLs
    if (req.files && req.files.length > 0) {
      const newUrls = getFileUrls(req.files);
      listing.images = [...(listing.images || []), ...newUrls];
    }

    await listing.save();
    res.json(listing);
  } catch (err) {
    console.error('❌ Update listing error:', err);
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   DELETE /api/listings/:id
============================================================ */
router.delete('/:id', auth, async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/listings/bids-received
============================================================ */
router.get('/bids-received', auth, async (req, res) => {
  try {
    const Deal = require('../models/Deal');

    const listings = await Listing.find({
      generatorId: req.userId,
      biddingEnabled: true,
    }).sort({ createdAt: -1 });

    const listingIds = listings.map((l) => l._id);
    const deals = await Deal.find({ listingId: { $in: listingIds } }).sort({ createdAt: -1 });

    const result = listings.map((l) => {
      const listingDeals = deals.filter((d) => String(d.listingId) === String(l._id));
      return {
        ...l.toObject(),
        bids: l.bids || [],
        requests: listingDeals.map((d) => ({
          _id: d._id,
          buyerId: d.buyerId,
          buyerName: d.buyerName,
          amount: d.pricePerUnit,
          quantity: d.quantity,
          totalAmount: d.totalAmount,
          status: d.status,
          createdAt: d.createdAt,
          initiatedBy: d.initiatedBy,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   POST /api/listings/:id/bids — Buyer places a bid
============================================================ */
router.post('/:id/bids', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });
    if (!listing.biddingEnabled) return res.status(400).json({ msg: 'Bidding not enabled' });

    if (listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now()) {
      return res.status(400).json({ msg: 'Bidding has ended. Cannot place new bids.' });
    }
    if (listing.status === 'sold' || listing.status === 'closed') {
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
      createdAt: new Date(),
    };
    listing.bids.push(newBid);
    await listing.save();
    res.status(201).json({ msg: 'Bid placed successfully', bid: newBid });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   POST /api/listings/:id/bids/:bidId/accept
============================================================ */
router.post('/:id/bids/:bidId/accept', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    const bid = listing.bids.find((b) => b.id === req.params.bidId);
    if (!bid) return res.status(404).json({ msg: 'Bid not found' });

    bid.status = 'accepted';
    listing.status = 'closed';
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
      status: 'accepted',
    });
    await deal.save();
    res.json({ msg: 'Bid accepted', deal });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   POST /api/listings/:id/bids/:bidId/reject
============================================================ */
router.post('/:id/bids/:bidId/reject', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    const bid = listing.bids.find((b) => b.id === req.params.bidId);
    if (bid) bid.status = 'rejected';
    await listing.save();
    res.json({ msg: 'Bid rejected' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/listings/:id/my-bid
============================================================ */
router.get('/:id/my-bid', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const allBids = listing.bids || [];
    const sortedBids = [...allBids]
      .filter((b) => b.status !== 'rejected')
      .sort((a, b) => b.amount - a.amount);
    const myBid = allBids.find((b) => String(b.buyerId) === String(req.userId));
    const rank = myBid ? sortedBids.findIndex((b) => b.id === myBid.id) + 1 : null;
    const topBid = sortedBids[0] || null;

    res.json({
      myBid: myBid || null,
      rank: rank || null,
      topBid: topBid,
      totalBids: sortedBids.length,
      isEnded: listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now(),
      hasBidding: !!listing.biddingEnabled,
      minBidPrice: listing.minBidPrice,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   PUT /api/listings/:id/bids/:bidId — Update bid amount
============================================================ */
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

    const bid = listing.bids.find((b) => b.id === req.params.bidId);
    if (!bid) return res.status(404).json({ msg: 'Bid not found' });
    if (String(bid.buyerId) !== String(req.userId)) {
      return res.status(403).json({ msg: 'Not authorized to modify this bid' });
    }

    const newAmount = Number(amount);
    if (newAmount < listing.minBidPrice) {
      return res.status(400).json({ msg: `Minimum bid is ₹${listing.minBidPrice}/kg` });
    }

    const otherBids = listing.bids
      .filter((b) => b.id !== bid.id && b.status !== 'rejected')
      .sort((a, b) => b.amount - a.amount);
    const topOther = otherBids[0];

    if (topOther && newAmount <= topOther.amount) {
      return res.status(400).json({
        msg: `Your new bid must be higher than the current highest bid of ₹${topOther.amount}/kg`,
      });
    }

    bid.amount = newAmount;
    bid.createdAt = new Date();
    await listing.save();

    res.json({ msg: 'Bid updated successfully', bid });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   POST /api/listings/:id/bids/auto-award
============================================================ */
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
      .filter((b) => b.status !== 'rejected')
      .sort((a, b) => b.amount - a.amount);
    const winningBid = validBids[0];
    if (!winningBid) return res.status(400).json({ msg: 'No bids to award' });

    winningBid.status = 'accepted';
    listing.bids.forEach((b) => {
      if (b.id !== winningBid.id && b.status === 'pending') b.status = 'rejected';
    });
    listing.status = 'closed';
    await listing.save();

    const Deal = require('../models/Deal');
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
      initiatedBy: 'generator',
    });
    await deal.save();

    res.json({ msg: `Awarded to ${winningBid.buyerName} (₹${winningBid.amount}/kg)`, deal });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
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