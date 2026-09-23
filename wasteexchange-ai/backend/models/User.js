const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { 
    type: String, 
    enum: ['buyer', 'generator', 'admin'], 
    default: 'buyer' 
  },
  walletBalance: { 
    type: Number, 
    default: 0 
  },
  trustScore: { 
    type: Number, 
    default: 0 
  },
  profilePhoto: { 
    type: String, 
    default: '' 
  },
  // Company details
  companyName: { type: String, default: '' },
  companyRegistrationNo: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyCity: { type: String, default: '' },
  companyState: { type: String, default: '' },
  companyPincode: { type: String, default: '' },
  companyCountry: { type: String, default: 'India' },
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  companyType: { 
    type: String, 
    enum: ['private', 'public', 'partnership', 'sole', 'llp', 'other'], 
    default: 'private' 
  },
  website: { type: String, default: '' },
  yearEstablished: { type: Number, default: null },
  businessDescription: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  latitude: { type: String, default: '' },
  longitude: { type: String, default: '' },
  isCompanyRegistered: { type: Boolean, default: false },
  isCompanyVerified: { type: Boolean, default: false },
  // Geospatial location (optional)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, { 
  timestamps: true 
});

// ✅ Fixed pre-save hook – use async function WITHOUT next parameter
// Mongoose will automatically wait for this promise to resolve.
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    throw error; // This will cause the save to fail and bubble up
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Optional: geospatial index (if you need it later)
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);