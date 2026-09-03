const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  material: { type: String, required: true },
  materialSubtype: { type: String, default: '' },
  minQty: { type: Number, required: true },
  maxQty: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  location: { type: String, required: true },
  locationCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  status: { type: String, enum: ['open', 'fulfilled'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Requirement', RequirementSchema);