// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const User = require('../models/User');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const totalRevenueAgg = await Deal.aggregate([
      { $match: { status: { $in: ['accepted', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$platformRevenue' } } },
    ]);
    const totalDeals = await Deal.countDocuments({ status: { $in: ['accepted', 'completed'] } });
    const completedDeals = await Deal.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();
    const totalGenerators = await User.countDocuments({ role: 'generator' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });

    res.json({
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      totalDeals, completedDeals, totalUsers, totalGenerators, totalBuyers,
    });
  } catch (err) {
    console.error('❌ /admin/stats error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    // ✅ Exclude admin role from user list (admin is fixed, not a real user)
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('❌ /admin/users error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;