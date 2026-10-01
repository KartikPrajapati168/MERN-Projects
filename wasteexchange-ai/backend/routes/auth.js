const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminProfile = require('../models/AdminProfile');   // ✅ NEW
const { authMiddleware, adminOnly } = require('../middleware/auth');
const auth = authMiddleware;
const upload = require('../middleware/upload');

// ✅ Fixed admin credentials
const FIXED_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wasteexchange.ai';
const FIXED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WasteExchange@2026';
const FIXED_ADMIN_ID = 'admin-fixed-001';
const FIXED_ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

const isFixedAdmin = (req) => req.user?.id === FIXED_ADMIN_ID || req.user?.role === 'admin';

// ✅ Helper: get admin profile (from DB, fallback to .env defaults)
const getAdminProfile = async () => {
  try {
    let profile = await AdminProfile.findById(FIXED_ADMIN_ID);
    if (!profile) {
      // Auto-create if missing
      profile = await AdminProfile.create({
        _id: FIXED_ADMIN_ID,
        name: FIXED_ADMIN_NAME,
        email: FIXED_ADMIN_EMAIL,
      });
    }
    return profile;
  } catch (err) {
    console.error('AdminProfile fetch failed:', err.message);
    // Fallback to .env defaults
    return {
      _id: FIXED_ADMIN_ID,
      id: FIXED_ADMIN_ID,
      name: FIXED_ADMIN_NAME,
      email: FIXED_ADMIN_EMAIL,
      phone: '',
      profilePhoto: '',
      role: 'admin',
      isCompanyVerified: true,
      isCompanyRegistered: true,
      walletBalance: 0,
    };
  }
};

// ✅ Helper: format admin profile for frontend
const formatAdminProfile = (profile) => ({
  _id: FIXED_ADMIN_ID,
  id: FIXED_ADMIN_ID,
  name: profile.name || FIXED_ADMIN_NAME,
  email: profile.email || FIXED_ADMIN_EMAIL,
  phone: profile.phone || '',
  profilePhoto: profile.profilePhoto || '',
  role: 'admin',
  isCompanyVerified: true,
  isCompanyRegistered: true,
  walletBalance: 0,
});

// ============================================================
// @route   POST /api/auth/signup
// ============================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ msg: 'Admin accounts cannot be created via signup.' });
    }
    if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ msg: 'This email is reserved.' });
    }
    if (!['buyer', 'generator'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role selected.' });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, msg: 'Please provide name, email and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, msg: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: 'User already exists with this email' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'buyer',
    });
    await user.save();

    const token = jwt.sign(
      { user: { id: user._id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance || 0,
        isCompanyRegistered: user.isCompanyRegistered || false,
        isCompanyVerified: user.isCompanyVerified || false,
      },
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ success: false, msg: 'Server error during signup' });
  }
});

// ============================================================
// @route   POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, msg: 'Please provide email and password' });
    }

    // 🔐 FIXED ADMIN LOGIN — password from .env, profile from DB
    if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) {
      if (password !== FIXED_ADMIN_PASSWORD) {
        return res.status(401).json({ msg: 'Invalid admin credentials.' });
      }

      const adminProfile = await getAdminProfile();

      const token = jwt.sign(
        { id: FIXED_ADMIN_ID, role: 'admin', email: FIXED_ADMIN_EMAIL, name: FIXED_ADMIN_NAME },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: formatAdminProfile(adminProfile),
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ success: false, msg: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, msg: 'Invalid credentials' });

    const token = jwt.sign(
      { user: { id: user._id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance || 0,
      trustScore: user.trustScore || 0,
      profilePhoto: user.profilePhoto || '',
      isCompanyRegistered: user.isCompanyRegistered || false,
      isCompanyVerified: user.isCompanyVerified || false,
      companyName: user.companyName || '',
      companyRegistrationNo: user.companyRegistrationNo || '',
      companyAddress: user.companyAddress || '',
      companyCity: user.companyCity || '',
      companyState: user.companyState || '',
      companyPincode: user.companyPincode || '',
      gstNumber: user.gstNumber || '',
      panNumber: user.panNumber || '',
      companyType: user.companyType || 'private',
      contactPerson: user.contactPerson || '',
      contactPhone: user.contactPhone || '',
      contactEmail: user.contactEmail || '',
      latitude: user.latitude || '',
      longitude: user.longitude || '',
    };

    res.json({ success: true, token, user: userData });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, msg: 'Server error during login' });
  }
});

// ============================================================
// @route   POST /api/auth/admin-login
// @desc    Admin-only login
// ============================================================
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide admin email and password'
      });
    }

    // Admin email must match the configured admin email
    if (email.trim().toLowerCase() !== FIXED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid admin credentials.'
      });
    }

    // Admin password must match configured admin password
    if (password !== FIXED_ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid admin credentials.'
      });
    }

    // Get/create admin profile
    const adminProfile = await getAdminProfile();

    // Create admin token
    const token = jwt.sign(
      {
        id: FIXED_ADMIN_ID,
        role: 'admin',
        email: FIXED_ADMIN_EMAIL,
        name: FIXED_ADMIN_NAME
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: formatAdminProfile(adminProfile)
    });

  } catch (err) {
    console.error('❌ Admin login error:', err);

    res.status(500).json({
      success: false,
      msg: 'Server error during admin login'
    });
  }
});

// ============================================================
// @route   GET /api/auth/me
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (isFixedAdmin(req)) {
      const profile = await getAdminProfile();
      return res.json({ success: true, user: formatAdminProfile(profile) });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('❌ /me error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ============================================================
// @route   POST /api/auth/register-company
// ============================================================
router.post('/register-company', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    const {
      companyName, companyRegistrationNo, gstNumber, panNumber, companyType,
      website, yearEstablished, businessDescription, companyAddress,
      companyCity, companyState, companyPincode, country, latitude, longitude,
      contactPerson, contactPhone, contactEmail,
    } = req.body;

    if (!companyName || !companyRegistrationNo || !gstNumber || !panNumber) {
      return res.status(400).json({ success: false, msg: 'Please provide all required company information' });
    }

    Object.assign(user, {
      companyName, companyRegistrationNo, gstNumber, panNumber,
      companyType: companyType || 'private',
      website: website || '',
      yearEstablished: yearEstablished ? parseInt(yearEstablished) : null,
      businessDescription: businessDescription || '',
      companyAddress, companyCity, companyState, companyPincode,
      companyCountry: country || 'India',
      latitude: latitude || '',
      longitude: longitude || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      isCompanyRegistered: true,
      isCompanyVerified: false,
    });

    if (latitude && longitude) {
      user.location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    }

    await user.save();
    res.json({ success: true, msg: 'Company registered successfully', user });
  } catch (err) {
    console.error('❌ Company registration error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ============================================================
// ADMIN: Unverified companies
// ============================================================
router.get('/unverified-companies', authMiddleware, adminOnly, async (req, res) => {
  try {
    const companies = await User.find({ isCompanyRegistered: true, isCompanyVerified: false });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put('/verify-company/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isCompanyVerified: true }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/reject-company/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isCompanyRegistered: false, isCompanyVerified: false });
    res.json({ success: true, msg: 'Rejected' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// ✅ PUT /api/auth/profile-photo
// 🔧 FIXED: Admin profile stored in AdminProfile collection (persists!)
// ============================================================
router.put('/profile-photo', authMiddleware, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/profile/${req.file.filename}`;

    // ✅ ADMIN: Save to AdminProfile collection
    if (isFixedAdmin(req)) {
      const updated = await AdminProfile.findByIdAndUpdate(
        FIXED_ADMIN_ID,
        { profilePhoto: photoUrl },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      console.log(`📸 Admin photo saved to DB: ${photoUrl}`);
      return res.json({
        success: true,
        profilePhoto: photoUrl,
        user: formatAdminProfile(updated),
      });
    }

    // Regular user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: photoUrl },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ success: true, profilePhoto: photoUrl, user });
  } catch (err) {
    console.error('❌ Profile photo update error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// ✅ PUT /api/auth/profile
// 🔧 FIXED: Admin profile stored in AdminProfile collection
// ============================================================
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    // Admin case
    if (isFixedAdmin(req)) {
      const { name, email, phone } = req.body;
      const updated = await AdminProfile.findByIdAndUpdate(
        FIXED_ADMIN_ID,
        {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json(formatAdminProfile(updated));
    }

    // Regular user
    const {
      name, email, phone,
      password,   // ✅ Accept password
      companyName, companyRegistrationNo, companyAddress, companyCity,
      companyState, companyPincode, companyCountry, gstNumber, panNumber,
      companyType, website, yearEstablished, businessDescription,
      contactPerson, contactPhone, contactEmail, latitude, longitude,
    } = req.body;

    // ✅ findById (not findByIdAndUpdate) → triggers pre-save hook
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Email conflict check
    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing && String(existing._id) !== String(user._id)) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
    }

    // Update all non-password fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone;
    if (companyName !== undefined) user.companyName = companyName;
    if (companyRegistrationNo !== undefined) user.companyRegistrationNo = companyRegistrationNo;
    if (companyAddress !== undefined) user.companyAddress = companyAddress;
    if (companyCity !== undefined) user.companyCity = companyCity;
    if (companyState !== undefined) user.companyState = companyState;
    if (companyPincode !== undefined) user.companyPincode = companyPincode;
    if (companyCountry !== undefined) user.companyCountry = companyCountry || 'India';
    if (gstNumber !== undefined) user.gstNumber = gstNumber;
    if (panNumber !== undefined) user.panNumber = panNumber;
    if (companyType !== undefined) user.companyType = companyType;
    if (website !== undefined) user.website = website;
    if (yearEstablished !== undefined) user.yearEstablished = yearEstablished ? parseInt(yearEstablished) : null;
    if (businessDescription !== undefined) user.businessDescription = businessDescription;
    if (contactPerson !== undefined) user.contactPerson = contactPerson;
    if (contactPhone !== undefined) user.contactPhone = contactPhone;
    if (contactEmail !== undefined) user.contactEmail = contactEmail;
    if (latitude !== undefined) user.latitude = latitude;
    if (longitude !== undefined) user.longitude = longitude;

    if (latitude && longitude) {
      user.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    // ✅ PASSWORD CHANGE — CRITICAL
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
      }
      user.password = password;   // ← Hook will hash
      console.log(`🔑 Password change for: ${user.email}`);
    }

    // ✅ save() triggers pre-save hook → password gets hashed
    await user.save();

    console.log(`✅ Profile saved: ${user.email}${password ? ' (password changed)' : ''}`);

    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (err) {
    console.error('❌ Profile update error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// ✅ GET /api/auth/profile
// 🔧 FIXED: reads from AdminProfile collection
// ============================================================
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (isFixedAdmin(req)) {
      const profile = await getAdminProfile();
      return res.json(formatAdminProfile(profile));
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('❌ /profile error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;