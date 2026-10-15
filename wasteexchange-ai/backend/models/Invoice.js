// backend/models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, required: true }, // 'deal_payment', 'deal_receive', 'add_money', etc.
  method: { type: String, default: '' },  // 'wallet', 'razorpay'
  status: { type: String, default: 'success' },
  description: { type: String, default: '' },

  // Deal specific
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction', default: null },

  // Buyer / Generator / Material details for PDF
  buyerName: { type: String, default: '' },
  buyerEmail: { type: String, default: '' },
  generatorName: { type: String, default: '' },
  generatorEmail: { type: String, default: '' },
  material: { type: String, default: '' },
  materialSubtype: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  location: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
}, { timestamps: true });

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);