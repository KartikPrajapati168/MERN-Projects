// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: 'No token, authorization denied',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Flatten nested `user` object
    // - Regular: { user: { id, role } } → { id, role }
    // - Admin:   { id, role, email }    → { id, role, email }
    req.user = decoded.user || decoded;

    // ✅ Backward compat: also expose req.userId (many routes use it)
    req.userId = req.user.id || req.user._id;

    // Safety fallback
    if (!req.user.id && req.user._id) {
      req.user.id = req.user._id;
    }

    // 🔇 Removed success log — was spamming terminal on every API call
    // (Frontend polls every 15-30s and hits ~7 endpoints → 7 logs each time)

    next();
  } catch (err) {
    // ✅ Only log on FAILURE so debugging invalid tokens is still possible
    console.error('❌ Auth FAILED:', err.message);
    return res.status(401).json({
      success: false,
      msg: 'Token is not valid',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      msg: 'Access denied. Admin only.',
    });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };