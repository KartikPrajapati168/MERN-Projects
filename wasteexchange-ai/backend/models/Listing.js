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
  images: [{ type: String }], // ✅ Add this
  aiCategory: { type: String, default: 'Other' },       // ✅ AI predicted
  aiConfidence: { type: Number, default: 0 },           // ✅ AI confidence
  aiCategory: { type: String, default: 'Other' },
  status: { type: String, enum: ['active', 'pending', 'closed', 'sold'], default: 'active' },
  
  // ✅ Add Bidding fields
  biddingEnabled: { type: Boolean, default: false },
  minBidPrice: { type: Number },
  biddingEndsAt: { type: Date },
  bids: [{
    id: { type: String },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    buyerName: { type: String },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);