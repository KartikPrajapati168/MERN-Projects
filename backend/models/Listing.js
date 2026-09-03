const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  generatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  generatorName: { type: String, required: true },
  material: { type: String, required: true },
  materialSubtype: { type: String, default: '' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  locationCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  description: { type: String, default: '' },
  aiCategory: { type: String, default: 'Other' },
  status: { type: String, enum: ['active', 'pending', 'closed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);