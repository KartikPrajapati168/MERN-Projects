const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  material: { type: String, required: true },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  buyerCommission: { type: Number, default: 0 },
  generatorCommission: { type: Number, default: 0 },
  platformRevenue: { type: Number, default: 0 },
  buyerTotalPayment: { type: Number, default: 0 },
  generatorPayout: { type: Number, default: 0 },
  status: { type: String, enum: ['requested', 'accepted', 'completed', 'cancelled'], default: 'requested' }
}, { timestamps: true });

module.exports = mongoose.model('Deal', DealSchema);