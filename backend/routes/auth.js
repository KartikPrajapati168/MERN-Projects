const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload'); // <-- Multer config

// ==================== PUBLIC ROUTES ====================

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, password, role });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, role, walletBalance: user.walletBalance } });
  } catch (err) {
    console.error('❌ Signup Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role, walletBalance: user.walletBalance } });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ==================== PROTECTED ROUTES (require auth) ====================

// @route   POST /api/auth/register-company
router.post('/register-company', auth, async (req, res) => {
  try {
    const {
      companyName,
      companyRegistrationNo,
      companyAddress,
      companyCity,
      companyState,
      companyPincode,
      gstNumber,
      companyType
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.companyName = companyName;
    user.companyRegistrationNo = companyRegistrationNo;
    user.companyAddress = companyAddress;
    user.companyCity = companyCity;
    user.companyState = companyState;
    user.companyPincode = companyPincode;
    user.gstNumber = gstNumber || '';
    user.companyType = companyType || 'private';
    user.isCompanyRegistered = true;
    user.isCompanyVerified = false;

    await user.save();
    res.json({ msg: 'Company registered successfully! Awaiting admin verification.', user });
  } catch (err) {
    console.error('❌ Register Company Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/auth/verify-company/:userId
router.put('/verify-company/:userId', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.isCompanyVerified = true;
    await user.save();
    res.json({ msg: 'Company verified successfully!', user });
  } catch (err) {
    console.error('❌ Verify Company Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/auth/unverified-companies
router.get('/unverified-companies', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const users = await User.find({
      isCompanyRegistered: true,
      isCompanyVerified: false,
      role: { $in: ['buyer', 'generator'] }
    }).select('-password');
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch Unverified Companies Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/auth/profile-picture
router.put('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.profilePicture = req.file.path;
    await user.save();
    res.json({ msg: 'Profile picture updated!', profilePicture: req.file.path });
  } catch (err) {
    console.error('❌ Profile Picture Upload Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;