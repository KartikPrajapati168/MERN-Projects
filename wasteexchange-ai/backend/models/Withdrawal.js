// backend/models/Withdrawal.js
const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['bank', 'upi'], default: 'bank' },
  bankAccount: {
    accountHolder: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  upiId: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending'
  },
  razorpayPayoutId: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  processedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);