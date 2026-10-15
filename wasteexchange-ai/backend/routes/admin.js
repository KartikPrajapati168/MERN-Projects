// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ============================================================
// GET /api/admin/logs — paginated activity logs
// ============================================================
router.get('/logs', authMiddleware, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.role) filter.userRole = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { userName: new RegExp(req.query.search, 'i') },
        { userEmail: new RegExp(req.query.search, 'i') },
        { title: new RegExp(req.query.search, 'i') },
        { details: new RegExp(req.query.search, 'i') },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('❌ /admin/logs error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ============================================================
// GET /api/admin/logs/stats — quick counters
// ============================================================
router.get('/logs/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [total, today, signups, logins, deals, offers] = await Promise.all([
      ActivityLog.countDocuments(),
      ActivityLog.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      ActivityLog.countDocuments({ action: 'signup' }),
      ActivityLog.countDocuments({ action: 'login' }),
      ActivityLog.countDocuments({ action: { $in: ['deal_accepted', 'deal_accepted_razorpay'] } }),
      ActivityLog.countDocuments({ action: 'offer_sent' }),
    ]);

    res.json({
      success: true,
      stats: { total, today, signups, logins, deals, offers },
    });
  } catch (err) {
    console.error('❌ /admin/logs/stats error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ============================================================
// GET /api/admin/users — with role filter
// ============================================================
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password -paymentPin').sort({ createdAt: -1 }).limit(500);
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;