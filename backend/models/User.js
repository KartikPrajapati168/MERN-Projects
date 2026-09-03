const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'generator', 'admin'], default: 'buyer' },
  walletBalance: { type: Number, default: 0 },
  trustScore: { type: Number, default: 0 },
  profilePicture: { type: String, default: '' },

  // Company details (for both buyer and generator)
  companyName: { type: String, default: '' },
  companyRegistrationNo: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyCity: { type: String, default: '' },
  companyState: { type: String, default: '' },
  companyPincode: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  companyType: { type: String, enum: ['private', 'public', 'partnership', 'sole', 'other'], default: 'private' },

  // Verification status
  isCompanyRegistered: { type: Boolean, default: false }, // user filled the form
  isCompanyVerified: { type: Boolean, default: false },   // admin verified

  // Location (for map)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  }
}, { timestamps: true });

// Hash password before saving (Mongoose 6+ style - no next needed)
UserSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model('User', UserSchema);