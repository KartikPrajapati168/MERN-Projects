// backend/routes/requirements.js
const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');
const User = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');
const upload = require('../middleware/upload');              // ✅ Cloudinary-powered
const { getFileUrls } = require('../utils/fileUrl');          // ✅ Helper

/* ============================================================
   POST /api/requirements — Buyer creates requirement
   ✅ Now supports image upload to Cloudinary
============================================================ */
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const {
      material, materialSubtype, minQty, maxQty, maxPrice,
      location, locationCoordinates,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // ✅ Cloudinary image URLs
    const imageUrls = getFileUrls(req.files);

    // ✅ Parse coordinates safely
    let coords = [0, 0];
    try {
      if (Array.isArray(locationCoordinates)) coords = locationCoordinates;
      else if (typeof locationCoordinates === 'string') coords = JSON.parse(locationCoordinates);
      if (!Array.isArray(coords) || coords.length !== 2) coords = [0, 0];
    } catch (_) {
      coords = [0, 0];
    }

    const reqItem = new Requirement({
      buyerId: req.userId,
      buyerName: user.name,
      material,
      materialSubtype: materialSubtype || '',
      minQty: Number(minQty),
      maxQty: Number(maxQty),
      maxPrice: Number(maxPrice),
      location,
      locationCoordinates: { type: 'Point', coordinates: coords },
      images: imageUrls,                       // ✅ Cloudinary URLs
      status: 'open',
    });

    await reqItem.save();
    console.log(`✅ Requirement created | ${imageUrls.length} image(s)`);
    res.status(201).json(reqItem);
  } catch (err) {
    console.error('❌ Create requirement error:', err);
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/requirements — ALL open requirements
============================================================ */
router.get('/', auth, async (req, res) => {
  try {
    const requirements = await Requirement.find({ status: 'open' }).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   GET /api/requirements/user — My own requirements
============================================================ */
router.get('/user', auth, async (req, res) => {
  try {
    const requirements = await Requirement.find({ buyerId: req.userId }).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   PUT /api/requirements/:id — Update requirement
============================================================ */
router.put('/:id', auth, async (req, res) => {
  try {
    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(requirement);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ============================================================
   DELETE /api/requirements/:id
============================================================ */
router.delete('/:id', auth, async (req, res) => {
  try {
    await Requirement.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Requirement deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;





















// const express = require('express');
// const router = express.Router();
// const Requirement = require('../models/Requirement');
// const User = require('../models/User');
// const auth = require('../middleware/auth');

// router.post('/', auth, async (req, res) => {
//   try {
//     const { material, minQty, maxQty, maxPrice, location } = req.body;
//     const user = await User.findById(req.userId);
//     const reqItem = new Requirement({
//       buyerId: req.userId,
//       buyerName: user.name,
//       material, minQty, maxQty, maxPrice, location
//     });
//     await reqItem.save();
//     res.status(201).json(reqItem);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.get('/user', auth, async (req, res) => {
//   try {
//     const requirements = await Requirement.find({ buyerId: req.userId });
//     res.json(requirements);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// module.exports = router;