// backend/models/WalletTransaction.js
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // Positive for credit, negative for debit
  type: { 
    type: String, 
    enum: ['add_money', 'deal_payment', 'deal_receive', 'withdraw', 'refund'], 
    required: true 
  },
  method: { type: String, default: 'razorpay' }, // razorpay, wallet
  status: { type: String, default: 'success' },
  balanceAfter: { type: Number, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);