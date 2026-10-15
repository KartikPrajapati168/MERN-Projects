// backend/routes/chatbot.js
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Listing = require('../models/Listing');
const Deal = require('../models/Deal');
const Requirement = require('../models/Requirement');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { askGemini } = require('../utils/gemini');

/* ============================================================
   Helper: Gather live stats from MongoDB
============================================================ */
const gatherStats = async () => {
  try {
    const [
      totalUsers,
      totalBuyers,
      totalGenerators,
      verifiedUsers,
      pendingVerifications,
      totalListings,
      activeListings,
      totalRequirements,
      openRequirements,
      totalDeals,
      completedDeals,
      pendingDeals,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['buyer', 'generator'] } }),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'generator' }),
      User.countDocuments({ isCompanyVerified: true, role: { $in: ['buyer', 'generator'] } }),
      User.countDocuments({ isCompanyRegistered: true, isCompanyVerified: false }),
      Listing.countDocuments({}),
      Listing.countDocuments({ status: 'active' }),
      Requirement.countDocuments({}),
      Requirement.countDocuments({ status: 'open' }),
      Deal.countDocuments({}),
      Deal.countDocuments({ status: 'completed' }),
      Deal.countDocuments({ status: { $in: ['requested', 'offered', 'accepted', 'paid'] } }),
      Deal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, commission: { $sum: '$platformRevenue' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const platformCommission = revenueAgg[0]?.commission || 0;

    // Top 5 materials by listing count
    const topMaterials = await Listing.aggregate([
      { $group: { _id: '$material', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Recent signups (last 5)
    const recentUsers = await User.find({ role: { $in: ['buyer', 'generator'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt isCompanyVerified');

    const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

    let context = `MARKETPLACE OVERVIEW:
- Total users (buyers + generators): ${totalUsers}
- Total buyers: ${totalBuyers}
- Total generators: ${totalGenerators}
- Verified users: ${verifiedUsers}
- Pending company verifications: ${pendingVerifications}

LISTINGS & REQUIREMENTS:
- Total listings: ${totalListings}
- Active listings: ${activeListings}
- Total requirements: ${totalRequirements}
- Open requirements: ${openRequirements}

DEALS & REVENUE:
- Total deals: ${totalDeals}
- Completed deals: ${completedDeals}
- Pending/in-progress deals: ${pendingDeals}
- Total deal revenue: ${fmtINR(totalRevenue)}
- Platform commission (4%): ${fmtINR(platformCommission)}

TOP MATERIALS (by listing count):
${topMaterials.map((m) => `- ${m._id || 'Other'}: ${m.count} listings`).join('\n') || '- No listings yet'}

RECENT SIGNUPS (last 5):
${recentUsers.map((u) => `- ${u.name} (${u.role}${u.isCompanyVerified ? ', verified' : ', pending'})`).join('\n') || '- No users yet'}`;

    return context;
  } catch (err) {
    console.error('❌ gatherStats error:', err.message);
    return 'Live data temporarily unavailable.';
  }
};

/* ============================================================
   POST /api/chatbot/ask
   Body: { question }
   Access: Admin only
============================================================ */
router.post('/ask', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, msg: 'Question is required' });
    }

    // Fetch fresh stats
    const context = await gatherStats();

    // Ask Gemini
    const answer = await askGemini(String(question).trim(), context);

    res.json({ success: true, answer });
  } catch (err) {
    console.error('❌ Chatbot error:', err.message);
    res.status(500).json({
      success: false,
      msg: err.message || 'Chatbot is unavailable. Please try again.',
    });
  }
});

module.exports = router;