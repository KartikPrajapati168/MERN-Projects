// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Requirement = require('../models/Requirement');
const auth = require('../middleware/auth');
const { materialClassifier, recommendationEngine } = require('../services/aiService');

/**
 * @route   POST /api/ai/recommend
 * @desc    AI-powered recommendations (Netflix-style)
 * @access  Private
 */
router.post('/recommend', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const role = user.role;

    // ✅ FIXED: Include both active and pending
    const allListings = await Listing.find({ 
      status: { $in: ['active', 'pending'] } 
    });
    const allRequirements = await Requirement.find({ status: 'open' });

    console.log(`🤖 AI Match: role=${role} | listings=${allListings.length} | requirements=${allRequirements.length}`);

    let results = [];

    if (role === 'buyer') {
      const myReqs = allRequirements.filter(r => 
        String(r.buyerId) === String(req.userId)
      );
      
      console.log(`   Buyer has ${myReqs.length} open requirements`);

      if (myReqs.length === 0) {
        return res.json([]);
      }

      const allMatches = [];
      myReqs.forEach(requirement => {
        const matches = recommendationEngine.recommend(requirement, allListings, 10);
        console.log(`   Requirement "${requirement.material}" → ${matches.length} matches`);
        matches.forEach(m => {
          allMatches.push({
            ...m,
            matchedRequirementId: requirement._id,
            matchedRequirementMaterial: requirement.material
          });
        });
      });

      const uniqueMap = new Map();
      allMatches.forEach(m => {
        const existing = uniqueMap.get(m._id.toString());
        if (!existing || existing.matchScore < m.matchScore) {
          uniqueMap.set(m._id.toString(), m);
        }
      });
      results = Array.from(uniqueMap.values());

    } else if (role === 'generator') {
      const myListings = allListings.filter(l => 
        String(l.generatorId) === String(req.userId)
      );
      
      console.log(`   Generator has ${myListings.length} active listings`);

      if (myListings.length === 0) {
        return res.json([]);
      }

      const allMatches = [];
      myListings.forEach(listing => {
        const matches = recommendationEngine.recommendBuyers(listing, allRequirements, 10);
        matches.forEach(m => {
          allMatches.push({
            ...m,
            matchedListingId: listing._id,
            matchedListingMaterial: listing.material
          });
        });
      });

      const uniqueMap = new Map();
      allMatches.forEach(m => {
        const existing = uniqueMap.get(m._id.toString());
        if (!existing || existing.matchScore < m.matchScore) {
          uniqueMap.set(m._id.toString(), m);
        }
      });
      results = Array.from(uniqueMap.values());
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    console.log(`   ✅ Total unique matches: ${results.length}`);
    res.json(results.slice(0, 20));

  } catch (err) {
    console.error('AI recommend error:', err);
    res.status(500).json({ msg: err.message });
  }
});

/**
 * @route   POST /api/ai/classify
 * @desc    AI text classification - description se category predict karo
 * @access  Private
 */
router.post('/classify', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ msg: 'Text required' });

    const result = materialClassifier.classify(text);
    res.json({
      success: true,
      category: result.category,
      confidence: result.confidence,
      allScores: result.scores,
      explanation: `AI analyzed your text and predicted "${result.category}" with ${result.confidence}% confidence.`
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/**
 * @route   POST /api/ai/similar-listings/:id
 * @desc    "You may also like" - Netflix-style
 * @access  Private
 */
router.post('/similar-listings/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });

    const allListings = await Listing.find({ 
      status: 'active',
      _id: { $ne: listing._id }
    });

    // Same material ke saath TF-IDF similarity
    const results = recommendationEngine.recommend(
      { 
        material: listing.material,
        minQty: 0,
        maxQty: 999999,
        maxPrice: 999999,
        location: listing.location
      }, 
      allListings, 
      5
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

const User = require('../models/User');
module.exports = router;





































// const express = require('express');
// const router = express.Router();
// const Listing = require('../models/Listing');
// const Requirement = require('../models/Requirement');
// const auth = require('../middleware/auth');

// // Ye function frontend se copy kiya hai
// const calculateMatch = (listing, req) => {
//   const text1 = (listing.material + ' ' + (listing.description || '')).toLowerCase();
//   const text2 = req.material.toLowerCase();
//   const words1 = text1.split(/\s+/);
//   const words2 = text2.split(/\s+/);
//   const common = words1.filter(w => words2.includes(w) && w.length > 2);
//   const textSim = Math.min(100, (common.length / Math.max(1, words2.length)) * 100);
//   const qty = listing.quantity;
//   let qtyScore = 0;
//   if (qty >= req.minQty && qty <= req.maxQty) qtyScore = 100;
//   else if (qty > req.maxQty) qtyScore = Math.max(0, 100 - ((qty - req.maxQty) / req.maxQty) * 50);
//   else qtyScore = Math.max(0, 100 - ((req.minQty - qty) / req.minQty) * 50);
//   const priceScore = listing.price <= req.maxPrice ? 100 : Math.max(0, 100 - ((listing.price - req.maxPrice) / req.maxPrice) * 100);
//   const locScore = listing.location.toLowerCase() === req.location.toLowerCase() ? 100 : 50;
//   const condScore = listing.description?.toLowerCase().includes('good') ? 100 : 70;
//   const weights = { text: 0.30, qty: 0.25, price: 0.20, loc: 0.15, cond: 0.10 };
//   return Math.round((textSim * weights.text) + (qtyScore * weights.qty) + (priceScore * weights.price) + (locScore * weights.loc) + (condScore * weights.cond));
// };

// router.post('/recommend', auth, async (req, res) => {
//   try {
//     const { role } = req.body;
//     const listings = await Listing.find({ status: 'active' });
//     const requirements = await Requirement.find({ status: 'open' });
//     const results = [];

//     if (role === 'buyer') {
//       const myReqs = requirements.filter(r => r.buyerId.toString() === req.userId);
//       myReqs.forEach(reqItem => {
//         listings.forEach(listing => {
//           const score = calculateMatch(listing, reqItem);
//           if (score > 30) results.push({ ...listing.toObject(), reqId: reqItem._id, matchScore: score });
//         });
//       });
//     } else {
//       const myListings = listings.filter(l => l.generatorId.toString() === req.userId);
//       myListings.forEach(listing => {
//         requirements.forEach(reqItem => {
//           const score = calculateMatch(listing, reqItem);
//           if (score > 30) results.push({ ...reqItem.toObject(), listingId: listing._id, matchScore: score });
//         });
//       });
//     }
//     // Sort by highest match
//     results.sort((a, b) => b.matchScore - a.matchScore);
//     res.json(results);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// module.exports = router;