const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['add_money', 'withdraw', 'deal_payment', 'deal_receive', 'refund'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'processing'],
    default: 'success',
  },
  method: {
    type: String,
    default: '',   // 'razorpay', 'upi', 'bank', 'wallet', etc.
  },
  description: {
    type: String,
    default: '',
  },
  // Razorpay / reference IDs
  referenceId: {
    type: String,
    default: '',
  },
  metadata: {
    type: Object,
    default: {},
  },
}, {
  timestamps: true,
});

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);