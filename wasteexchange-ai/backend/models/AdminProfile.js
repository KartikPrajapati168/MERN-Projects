// backend/models/AdminProfile.js
const mongoose = require('mongoose');

const AdminProfileSchema = new mongoose.Schema({
  // ✅ String ID — NOT ObjectId (matches fixed admin ID)
  _id: { 
    type: String, 
    default: 'admin-fixed-001' 
  },
  name: { 
    type: String, 
    default: 'System Administrator' 
  },
  email: { 
    type: String, 
    default: 'admin@wasteexchange.ai' 
  },
  phone: { 
    type: String, 
    default: '' 
  },
  profilePhoto: { 
    type: String, 
    default: '' 
  },
  bio: { 
    type: String, 
    default: '' 
  },
}, { 
  timestamps: true,
  _id: false  // ✅ We provide our own _id
});

module.exports = mongoose.model('AdminProfile', AdminProfileSchema);