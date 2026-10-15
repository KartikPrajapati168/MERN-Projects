// backend/utils/activityLogger.js
const ActivityLog = require('../models/ActivityLog');

/**
 * Log a user activity. Non-blocking — errors are swallowed.
 */
const logActivity = async ({
  userId = null,
  userName = '',
  userEmail = '',
  userRole = '',
  action,
  title = '',
  details = '',
  metadata = {},
  req = null,
}) => {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket?.remoteAddress || '')
      : '';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    await ActivityLog.create({
      userId,
      userName,
      userEmail,
      userRole,
      action,
      title,
      details,
      metadata,
      ipAddress,
      userAgent,
    });
    console.log(`📝 Logged: [${action}] ${userName || userEmail || userId}`);
  } catch (err) {
    console.error('⚠️ Activity log failed:', err.message);
  }
};

module.exports = { logActivity };