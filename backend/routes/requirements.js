const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { material, minQty, maxQty, maxPrice, location } = req.body;
    const user = await User.findById(req.userId);
    const reqItem = new Requirement({
      buyerId: req.userId,
      buyerName: user.name,
      material, minQty, maxQty, maxPrice, location
    });
    await reqItem.save();
    res.status(201).json(reqItem);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/user', auth, async (req, res) => {
  try {
    const requirements = await Requirement.find({ buyerId: req.userId });
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;