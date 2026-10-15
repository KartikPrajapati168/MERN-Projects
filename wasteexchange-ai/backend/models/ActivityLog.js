// backend/models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  userRole: { type: String, default: '' },
  action: {
    type: String,
    required: true,
    enum: [
      'signup',
      'login',
      'logout',
      'register_company',
      'company_verified',
      'company_rejected',
      'deal_created',
      'deal_accepted',
      'deal_accepted_razorpay',
      'deal_rejected',
      'deal_completed',
      'offer_sent',
      'wallet_topup',
      'payment_failed',
    ],
  },
  title: { type: String, default: '' },
  details: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);