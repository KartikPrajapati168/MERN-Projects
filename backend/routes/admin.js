const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const totalRevenue = await Deal.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$platformRevenue' } } }
    ]);

    const totalDeals = await Deal.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();
    const totalGenerators = await User.countDocuments({ role: 'generator' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalDeals,
      totalUsers,
      totalGenerators,
      totalBuyers
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;