// backend/models/OTP.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, required: true, enum: ['signup', 'password-reset'] },
    // For 'signup': holds { name, hashedPassword, role } until OTP is verified
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    attempts: { type: Number, default: 0 },
    // TTL index — Mongo auto-deletes the doc once expired
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

// One active OTP per email per purpose (upsert pattern)
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('OTP', otpSchema);