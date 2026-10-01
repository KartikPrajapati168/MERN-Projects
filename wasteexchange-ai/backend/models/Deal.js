// // backend/models/Deal.js
// const mongoose = require('mongoose');

// const DealSchema = new mongoose.Schema({
//   listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
//   requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', default: null }, // ✅ NEW
//   generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   generatorName: { type: String, default: '' },
//   buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   buyerName: { type: String, default: '' },
//   material: { type: String, required: true },
//   quantity: { type: Number, required: true },
//   pricePerUnit: { type: Number, required: true },
//   totalAmount: { type: Number, required: true },
//   buyerCommission: { type: Number, default: 0 },
//   generatorCommission: { type: Number, default: 0 },
//   platformRevenue: { type: Number, default: 0 },
//   buyerTotalPayment: { type: Number, default: 0 },
//   generatorPayout: { type: Number, default: 0 },
//   status: {
//     type: String,
//     enum: ['requested', 'offered', 'accepted', 'rejected', 'completed', 'cancelled'],
//     default: 'requested'
//   },
//   otp: { type: String },
//   otpExpires: { type: Date },
//   paymentMethod: { type: String, enum: ['wallet', 'razorpay'], default: 'wallet' },
//   razorpayPaymentId: { type: String, default: '' },
//   initiatedBy: { type: String, enum: ['buyer', 'generator'], default: 'buyer' }
// }, { timestamps: true });

// module.exports = mongoose.model('Deal', DealSchema);


// backend/models/Deal.js
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement' },

  generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatorName: { type: String },

  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String },

  material: { type: String },
  quantity: { type: Number },
  pricePerUnit: { type: Number },
  totalAmount: { type: Number },

  // Commission Fields
  buyerCommission: { type: Number },
  generatorCommission: { type: Number },
  platformRevenue: { type: Number },
  buyerTotalPayment: { type: Number },
  generatorPayout: { type: Number },

  // ✅ FIX: Added 'otp_sent' to the status enum
  status: {
    type: String,
    enum: [
      'requested',
      'offered',
      'otp_sent',       // ✅ NEW — needed by /request-otp route
      'accepted',
      'otp_verified',   // NEW
      'paid',           // NEW
      'completed',
      'rejected'
    ],
    default: 'requested'
  },

  initiatedBy: { type: String },
  paymentMethod: { type: String },
  razorpayPaymentId: { type: String },

  // ✅ NEW: OTP fields for deal acceptance
  otp: { type: String },
  otpExpires: { type: Date },
  otpVerified: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('Deal', dealSchema);