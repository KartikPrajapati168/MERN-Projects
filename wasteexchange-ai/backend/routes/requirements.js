// backend/routes/requirements.js
const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/requirements
// @desc    Buyer creates a requirement
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { material, materialSubtype, minQty, maxQty, maxPrice, location, locationCoordinates } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const reqItem = new Requirement({
      buyerId: req.userId,
      buyerName: user.name,
      material,
      materialSubtype: materialSubtype || '',
      minQty: Number(minQty),
      maxQty: Number(maxQty),
      maxPrice: Number(maxPrice),
      location,
      locationCoordinates: locationCoordinates || [0, 0],
      status: 'open'
    });
    await reqItem.save();
    res.status(201).json(reqItem);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/requirements
// @desc    Get ALL open requirements (for Generator to browse)
// @access  Private
router.get('/', auth, async (req, res) => {  // ✅ YE ROUTE ADD KARO
  try {
    const requirements = await Requirement.find({ status: 'open' }).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/requirements/user
// @desc    Get current buyer's own requirements
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const requirements = await Requirement.find({ buyerId: req.userId }).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/requirements/:id
// @desc    Update requirement
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const requirement = await Requirement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(requirement);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   DELETE /api/requirements/:id
// @desc    Delete requirement
// @access  Private
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