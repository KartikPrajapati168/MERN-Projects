const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ 
      success: false,
      msg: 'No token, authorization denied' 
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    req.userId = decoded.user.id; // ✅ YE LINE ADD KARO (Root Cause Fix)
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false,
      msg: 'Token is not valid' 
    });
  }
};