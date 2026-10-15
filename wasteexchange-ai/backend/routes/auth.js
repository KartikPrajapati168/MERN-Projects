// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const AdminProfile = require('../models/AdminProfile');   // ✅ NEW
// const { authMiddleware, adminOnly } = require('../middleware/auth');
// const auth = authMiddleware;
// const upload = require('../middleware/upload');

// // ✅ Fixed admin credentials
// const FIXED_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wasteexchange.ai';
// const FIXED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WasteExchange@2026';
// const FIXED_ADMIN_ID = 'admin-fixed-001';
// const FIXED_ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

// const isFixedAdmin = (req) => req.user?.id === FIXED_ADMIN_ID || req.user?.role === 'admin';

// // ✅ Helper: get admin profile (from DB, fallback to .env defaults)
// const getAdminProfile = async () => {
//   try {
//     let profile = await AdminProfile.findById(FIXED_ADMIN_ID);
//     if (!profile) {
//       // Auto-create if missing
//       profile = await AdminProfile.create({
//         _id: FIXED_ADMIN_ID,
//         name: FIXED_ADMIN_NAME,
//         email: FIXED_ADMIN_EMAIL,
//       });
//     }
//     return profile;
//   } catch (err) {
//     console.error('AdminProfile fetch failed:', err.message);
//     // Fallback to .env defaults
//     return {
//       _id: FIXED_ADMIN_ID,
//       id: FIXED_ADMIN_ID,
//       name: FIXED_ADMIN_NAME,
//       email: FIXED_ADMIN_EMAIL,
//       phone: '',
//       profilePhoto: '',
//       role: 'admin',
//       isCompanyVerified: true,
//       isCompanyRegistered: true,
//       walletBalance: 0,
//     };
//   }
// };

// // ✅ Helper: format admin profile for frontend
// const formatAdminProfile = (profile) => ({
//   _id: FIXED_ADMIN_ID,
//   id: FIXED_ADMIN_ID,
//   name: profile.name || FIXED_ADMIN_NAME,
//   email: profile.email || FIXED_ADMIN_EMAIL,
//   phone: profile.phone || '',
//   profilePhoto: profile.profilePhoto || '',
//   role: 'admin',
//   isCompanyVerified: true,
//   isCompanyRegistered: true,
//   walletBalance: 0,
// });

// // ============================================================
// // @route   POST /api/auth/signup
// // ============================================================
// router.post('/signup', async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;

//     if (role === 'admin') {
//       return res.status(403).json({ msg: 'Admin accounts cannot be created via signup.' });
//     }
//     if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) {
//       return res.status(403).json({ msg: 'This email is reserved.' });
//     }
//     if (!['buyer', 'generator'].includes(role)) {
//       return res.status(400).json({ msg: 'Invalid role selected.' });
//     }
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, msg: 'Please provide name, email and password' });
//     }
//     if (password.length < 6) {
//       return res.status(400).json({ success: false, msg: 'Password must be at least 6 characters' });
//     }

//     const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
//     if (existingUser) {
//       return res.status(400).json({ success: false, msg: 'User already exists with this email' });
//     }

//     const user = new User({
//       name: name.trim(),
//       email: email.toLowerCase().trim(),
//       password,
//       role: role || 'buyer',
//     });
//     await user.save();

//     const token = jwt.sign(
//       { user: { id: user._id, role: user.role } },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(201).json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         walletBalance: user.walletBalance || 0,
//         isCompanyRegistered: user.isCompanyRegistered || false,
//         isCompanyVerified: user.isCompanyVerified || false,
//       },
//     });
//   } catch (err) {
//     console.error('❌ Signup error:', err);
//     res.status(500).json({ success: false, msg: 'Server error during signup' });
//   }
// });

// // ============================================================
// // @route   POST /api/auth/login
// // ============================================================
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ success: false, msg: 'Please provide email and password' });
//     }

//     // 🔐 FIXED ADMIN LOGIN — password from .env, profile from DB
//     if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) {
//       if (password !== FIXED_ADMIN_PASSWORD) {
//         return res.status(401).json({ msg: 'Invalid admin credentials.' });
//       }

//       const adminProfile = await getAdminProfile();

//       const token = jwt.sign(
//         { id: FIXED_ADMIN_ID, role: 'admin', email: FIXED_ADMIN_EMAIL, name: FIXED_ADMIN_NAME },
//         process.env.JWT_SECRET,
//         { expiresIn: '7d' }
//       );

//       return res.json({
//         success: true,
//         token,
//         user: formatAdminProfile(adminProfile),
//       });
//     }

//     const user = await User.findOne({ email: email.toLowerCase().trim() });
//     if (!user) return res.status(400).json({ success: false, msg: 'Invalid credentials' });

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) return res.status(400).json({ success: false, msg: 'Invalid credentials' });

//     const token = jwt.sign(
//       { user: { id: user._id, role: user.role } },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     const userData = {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       walletBalance: user.walletBalance || 0,
//       trustScore: user.trustScore || 0,
//       profilePhoto: user.profilePhoto || '',
//       isCompanyRegistered: user.isCompanyRegistered || false,
//       isCompanyVerified: user.isCompanyVerified || false,
//       companyName: user.companyName || '',
//       companyRegistrationNo: user.companyRegistrationNo || '',
//       companyAddress: user.companyAddress || '',
//       companyCity: user.companyCity || '',
//       companyState: user.companyState || '',
//       companyPincode: user.companyPincode || '',
//       gstNumber: user.gstNumber || '',
//       panNumber: user.panNumber || '',
//       companyType: user.companyType || 'private',
//       contactPerson: user.contactPerson || '',
//       contactPhone: user.contactPhone || '',
//       contactEmail: user.contactEmail || '',
//       latitude: user.latitude || '',
//       longitude: user.longitude || '',
//     };

//     res.json({ success: true, token, user: userData });
//   } catch (err) {
//     console.error('❌ Login error:', err);
//     res.status(500).json({ success: false, msg: 'Server error during login' });
//   }
// });

// // ============================================================
// // @route   POST /api/auth/admin-login
// // @desc    Admin-only login
// // ============================================================
// router.post('/admin-login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         msg: 'Please provide admin email and password'
//       });
//     }

//     // Admin email must match the configured admin email
//     if (email.trim().toLowerCase() !== FIXED_ADMIN_EMAIL.toLowerCase()) {
//       return res.status(401).json({
//         success: false,
//         msg: 'Invalid admin credentials.'
//       });
//     }

//     // Admin password must match configured admin password
//     if (password !== FIXED_ADMIN_PASSWORD) {
//       return res.status(401).json({
//         success: false,
//         msg: 'Invalid admin credentials.'
//       });
//     }

//     // Get/create admin profile
//     const adminProfile = await getAdminProfile();

//     // Create admin token
//     const token = jwt.sign(
//       {
//         id: FIXED_ADMIN_ID,
//         role: 'admin',
//         email: FIXED_ADMIN_EMAIL,
//         name: FIXED_ADMIN_NAME
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     return res.json({
//       success: true,
//       token,
//       user: formatAdminProfile(adminProfile)
//     });

//   } catch (err) {
//     console.error('❌ Admin login error:', err);

//     res.status(500).json({
//       success: false,
//       msg: 'Server error during admin login'
//     });
//   }
// });

// // ============================================================
// // @route   GET /api/auth/me
// // ============================================================
// router.get('/me', authMiddleware, async (req, res) => {
//   try {
//     if (isFixedAdmin(req)) {
//       const profile = await getAdminProfile();
//       return res.json({ success: true, user: formatAdminProfile(profile) });
//     }

//     const user = await User.findById(req.user.id).select('-password');
//     if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

//     // ✅ Convert to plain object and add computed boolean
//     const userObj = user.toObject();
//     userObj.paymentPin = Boolean(user.paymentPin); // ✅ NEW

//     // ✅ Remove hashed PIN from response (security)
//     delete userObj.paymentPin;                         // ✅ NEW

//     res.json({ success: true, user });
//   } catch (err) {
//     console.error('❌ /me error:', err);
//     res.status(500).json({ success: false, msg: 'Server error' });
//   }
// });

// // backend/routes/auth.js

// router.put('/set-payment-pin', auth, async (req, res) => {
//   try {
//     const { pin } = req.body;
//     if (!pin || !/^\d{4}$/.test(String(pin))) {
//       return res.status(400).json({ msg: 'PIN must be 4 digits' });
//     }

//     const user = await User.findByIdAndUpdate(
//       req.userId,
//       { paymentPin: String(pin) },
//       { new: true }
//     ).select('-password');

//     res.json({
//       success: true,
//       hasPaymentPin: true,
//       user: { ...user.toObject(), hasPaymentPin: true, paymentPin: undefined }
//     });
//   } catch (err) {
//     console.error('set-payment-pin error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // ============================================================
// // @route   POST /api/auth/register-company
// // ============================================================
// router.post('/register-company', authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

//     const {
//       companyName, companyRegistrationNo, gstNumber, panNumber, companyType,
//       website, yearEstablished, businessDescription, companyAddress,
//       companyCity, companyState, companyPincode, country, latitude, longitude,
//       contactPerson, contactPhone, contactEmail,
//     } = req.body;

//     if (!companyName || !companyRegistrationNo || !gstNumber || !panNumber) {
//       return res.status(400).json({ success: false, msg: 'Please provide all required company information' });
//     }

//     Object.assign(user, {
//       companyName, companyRegistrationNo, gstNumber, panNumber,
//       companyType: companyType || 'private',
//       website: website || '',
//       yearEstablished: yearEstablished ? parseInt(yearEstablished) : null,
//       businessDescription: businessDescription || '',
//       companyAddress, companyCity, companyState, companyPincode,
//       companyCountry: country || 'India',
//       latitude: latitude || '',
//       longitude: longitude || '',
//       contactPerson: contactPerson || '',
//       contactPhone: contactPhone || '',
//       contactEmail: contactEmail || '',
//       isCompanyRegistered: true,
//       isCompanyVerified: false,
//     });

//     if (latitude && longitude) {
//       user.location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
//     }

//     await user.save();
//     res.json({ success: true, msg: 'Company registered successfully', user });
//   } catch (err) {
//     console.error('❌ Company registration error:', err);
//     res.status(500).json({ success: false, msg: 'Server error' });
//   }
// });

// // ============================================================
// // ADMIN: Unverified companies
// // ============================================================
// router.get('/unverified-companies', authMiddleware, adminOnly, async (req, res) => {
//   try {
//     const companies = await User.find({ isCompanyRegistered: true, isCompanyVerified: false });
//     res.json(companies);
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.put('/verify-company/:id', authMiddleware, adminOnly, async (req, res) => {
//   try {
//     const user = await User.findByIdAndUpdate(req.params.id, { isCompanyVerified: true }, { new: true });
//     res.json({ success: true, user });
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.post('/reject-company/:id', authMiddleware, adminOnly, async (req, res) => {
//   try {
//     await User.findByIdAndUpdate(req.params.id, { isCompanyRegistered: false, isCompanyVerified: false });
//     res.json({ success: true, msg: 'Rejected' });
//   } catch (err) {
//     res.status(500).json({ msg: err.message });
//   }
// });

// // ============================================================
// // ✅ PUT /api/auth/profile-photo
// // 🔧 FIXED: Admin profile stored in AdminProfile collection (persists!)
// // ============================================================
// router.put('/profile-photo', authMiddleware, upload.single('profilePhoto'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

//     const photoUrl = `${req.protocol}://${req.get('host')}/uploads/profile/${req.file.filename}`;

//     // ✅ ADMIN: Save to AdminProfile collection
//     if (isFixedAdmin(req)) {
//       const updated = await AdminProfile.findByIdAndUpdate(
//         FIXED_ADMIN_ID,
//         { profilePhoto: photoUrl },
//         { new: true, upsert: true, setDefaultsOnInsert: true }
//       );
//       console.log(`📸 Admin photo saved to DB: ${photoUrl}`);
//       return res.json({
//         success: true,
//         profilePhoto: photoUrl,
//         user: formatAdminProfile(updated),
//       });
//     }

//     // Regular user
//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       { profilePhoto: photoUrl },
//       { new: true }
//     ).select('-password');

//     if (!user) return res.status(404).json({ msg: 'User not found' });
//     res.json({ success: true, profilePhoto: photoUrl, user });
//   } catch (err) {
//     console.error('❌ Profile photo update error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // ============================================================
// // ✅ PUT /api/auth/profile
// // 🔧 FIXED: Admin profile stored in AdminProfile collection
// // ============================================================
// router.put('/profile', authMiddleware, async (req, res) => {
//   try {
//     // Admin case
//     if (isFixedAdmin(req)) {
//       const { name, email, phone } = req.body;
//       const updated = await AdminProfile.findByIdAndUpdate(
//         FIXED_ADMIN_ID,
//         {
//           ...(name && { name }),
//           ...(email && { email }),
//           ...(phone !== undefined && { phone }),
//         },
//         { new: true, upsert: true, setDefaultsOnInsert: true }
//       );
//       return res.json(formatAdminProfile(updated));
//     }

//     // Regular user
//     const {
//       name, email, phone,
//       password,   // ✅ Accept password
//       companyName, companyRegistrationNo, companyAddress, companyCity,
//       companyState, companyPincode, companyCountry, gstNumber, panNumber,
//       companyType, website, yearEstablished, businessDescription,
//       contactPerson, contactPhone, contactEmail, latitude, longitude,
//     } = req.body;

//     // ✅ findById (not findByIdAndUpdate) → triggers pre-save hook
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ msg: 'User not found' });

//     // Email conflict check
//     if (email && email.toLowerCase().trim() !== user.email) {
//       const existing = await User.findOne({ email: email.toLowerCase().trim() });
//       if (existing && String(existing._id) !== String(user._id)) {
//         return res.status(400).json({ msg: 'Email already in use' });
//       }
//     }

//     // Update all non-password fields
//     if (name !== undefined) user.name = name;
//     if (email !== undefined) user.email = email.toLowerCase().trim();
//     if (phone !== undefined) user.phone = phone;
//     if (companyName !== undefined) user.companyName = companyName;
//     if (companyRegistrationNo !== undefined) user.companyRegistrationNo = companyRegistrationNo;
//     if (companyAddress !== undefined) user.companyAddress = companyAddress;
//     if (companyCity !== undefined) user.companyCity = companyCity;
//     if (companyState !== undefined) user.companyState = companyState;
//     if (companyPincode !== undefined) user.companyPincode = companyPincode;
//     if (companyCountry !== undefined) user.companyCountry = companyCountry || 'India';
//     if (gstNumber !== undefined) user.gstNumber = gstNumber;
//     if (panNumber !== undefined) user.panNumber = panNumber;
//     if (companyType !== undefined) user.companyType = companyType;
//     if (website !== undefined) user.website = website;
//     if (yearEstablished !== undefined) user.yearEstablished = yearEstablished ? parseInt(yearEstablished) : null;
//     if (businessDescription !== undefined) user.businessDescription = businessDescription;
//     if (contactPerson !== undefined) user.contactPerson = contactPerson;
//     if (contactPhone !== undefined) user.contactPhone = contactPhone;
//     if (contactEmail !== undefined) user.contactEmail = contactEmail;
//     if (latitude !== undefined) user.latitude = latitude;
//     if (longitude !== undefined) user.longitude = longitude;

//     if (latitude && longitude) {
//       user.location = {
//         type: 'Point',
//         coordinates: [parseFloat(longitude), parseFloat(latitude)],
//       };
//     }

//     // ✅ PASSWORD CHANGE — CRITICAL
//     if (password && password.trim().length > 0) {
//       if (password.length < 6) {
//         return res.status(400).json({ msg: 'Password must be at least 6 characters' });
//       }
//       user.password = password;   // ← Hook will hash
//       console.log(`🔑 Password change for: ${user.email}`);
//     }

//     // ✅ save() triggers pre-save hook → password gets hashed
//     await user.save();

//     console.log(`✅ Profile saved: ${user.email}${password ? ' (password changed)' : ''}`);

//     const updated = await User.findById(user._id).select('-password');
//     res.json(updated);
//   } catch (err) {
//     console.error('❌ Profile update error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // ============================================================
// // ✅ GET /api/auth/profile
// // 🔧 FIXED: reads from AdminProfile collection
// // ============================================================
// router.get('/profile', authMiddleware, async (req, res) => {
//   try {
//     if (isFixedAdmin(req)) {
//       const profile = await getAdminProfile();
//       return res.json(formatAdminProfile(profile));
//     }

//     const user = await User.findById(req.user.id).select('-password');
//     if (!user) return res.status(404).json({ msg: 'User not found' });
//     res.json(user);
//   } catch (err) {
//     console.error('❌ /profile error:', err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// module.exports = router;


// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const AdminProfile = require('../models/AdminProfile');
const OTP = require('../models/OTP');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const auth = authMiddleware;
const upload = require('../middleware/upload');

const {
  sendWelcomeEmail,
  sendAdminNewSignupEmail,
  sendAdminCompanyRegistrationEmail,
  sendCompanyVerifiedEmail,
  sendCompanyRejectedEmail,
} = require('../utils/emailService');
const {
  sendSignupOTPEmail,
  sendPasswordResetOTPEmail,
} = require('../utils/mailer');
const { logActivity } = require('../utils/activityLogger');

const FIXED_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wasteexchange.ai';
const FIXED_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'WasteExchange@2026';
const FIXED_ADMIN_ID = 'admin-fixed-001';
const FIXED_ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

const isFixedAdmin = (req) => req.user?.id === FIXED_ADMIN_ID || req.user?.role === 'admin';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- OTP helpers ----------
const OTP_EXPIRY_MIN = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();
const hashOTP = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

// ---------- Rate limiters ----------
const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, msg: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { success: false, msg: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------- Admin helpers ----------
const getAdminProfile = async () => {
  try {
    let profile = await AdminProfile.findById(FIXED_ADMIN_ID);
    if (!profile) {
      profile = await AdminProfile.create({
        _id: FIXED_ADMIN_ID,
        name: FIXED_ADMIN_NAME,
        email: FIXED_ADMIN_EMAIL,
      });
    }
    return profile;
  } catch (err) {
    console.error('AdminProfile fetch failed:', err.message);
    return {
      _id: FIXED_ADMIN_ID, id: FIXED_ADMIN_ID,
      name: FIXED_ADMIN_NAME, email: FIXED_ADMIN_EMAIL,
      phone: '', profilePhoto: '', role: 'admin',
      isCompanyVerified: true, isCompanyRegistered: true, walletBalance: 0,
    };
  }
};

const formatAdminProfile = (profile) => ({
  _id: FIXED_ADMIN_ID, id: FIXED_ADMIN_ID,
  name: profile.name || FIXED_ADMIN_NAME,
  email: profile.email || FIXED_ADMIN_EMAIL,
  phone: profile.phone || '',
  profilePhoto: profile.profilePhoto || '',
  role: 'admin', isCompanyVerified: true, isCompanyRegistered: true, walletBalance: 0,
});

const buildUserPayload = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  obj.id = obj._id;
  obj.hasPaymentPin = Boolean(obj.paymentPin);
  delete obj.paymentPin;
  delete obj.password;
  return obj;
};

// ============================================================
// ✅ 1. SIGNUP — STEP 1: send OTP (email verification)
// POST /auth/send-signup-otp
// Body: { name, email, password, role }
// ============================================================
router.post('/send-signup-otp', otpSendLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (role === 'admin') {
      return res.status(403).json({ success: false, msg: 'Admin accounts cannot be created via signup.' });
    }
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, msg: 'Name must be at least 2 characters' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, msg: 'A valid email is required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, msg: 'Password must be at least 6 characters' });
    }
    if (!['buyer', 'generator'].includes(role)) {
      return res.status(400).json({ success: false, msg: 'Role must be buyer or generator' });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (cleanEmail === FIXED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ success: false, msg: 'This email is reserved.' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, msg: 'This email is already registered. Please log in.' });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    // ✅ FIX: Store PLAIN password in payload — User model hashes it ONCE on save
    await OTP.findOneAndUpdate(
      { email: cleanEmail, purpose: 'signup' },
      {
        email: cleanEmail,
        otpHash,
        purpose: 'signup',
        payload: {
          name: String(name).trim(),
          plainPassword: String(password),   // ✅ plain, not hashed
          role,
        },
        attempts: 0,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email
    try {
      await sendSignupOTPEmail(cleanEmail, name, otp);
    } catch (mailErr) {
      console.error('❌ Signup OTP email failed:', mailErr.message);
      return res.status(500).json({ success: false, msg: 'Could not send verification email. Please try again.' });
    }

    return res.json({
      success: true,
      msg: 'Verification OTP sent to your email.',
      email: cleanEmail,
      expiresInMinutes: OTP_EXPIRY_MIN,
    });
  } catch (err) {
    console.error('send-signup-otp error:', err);
    res.status(500).json({ success: false, msg: 'Server error. Please try again.' });
  }
});

// ============================================================
// ✅ 2. SIGNUP — STEP 2: verify OTP & create user
// POST /auth/verify-signup-otp
// Body: { email, otp }
// ============================================================
router.post('/verify-signup-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!isEmail(email) || !otp) {
      return res.status(400).json({ success: false, msg: 'Email and OTP are required' });
    }
    if (String(otp).length !== 6) {
      return res.status(400).json({ success: false, msg: 'OTP must be 6 digits' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const record = await OTP.findOne({ email: cleanEmail, purpose: 'signup' });
    if (!record) {
      return res.status(400).json({ success: false, msg: 'No pending verification found. Please sign up again.' });
    }

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, msg: 'OTP expired. Please sign up again.' });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(429).json({ success: false, msg: 'Too many failed attempts. Please sign up again.' });
    }

    const incomingHash = hashOTP(otp);
    if (incomingHash !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        msg: 'Incorrect OTP. Please try again.',
        attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - record.attempts),
      });
    }

    // ✅ OTP correct → create the user
    const payload = record.payload || {};
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(409).json({ success: false, msg: 'This email is already registered. Please log in.' });
    }

    // ✅ FIX: Pass PLAIN password — User model pre-save hook hashes it ONCE
    const user = new User({
      name: payload.name,
      email: cleanEmail,
      password: payload.plainPassword,   // ✅ plain → hashed once by model
      role: payload.role,
    });
    await user.save();

    await OTP.deleteOne({ _id: record._id });

    await logActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'signup',
      title: `New ${user.role} signed up`,
      details: `${user.name} registered as ${user.role} (email verified)`,
      metadata: { email: user.email, role: user.role },
      req,
    });

    try { await sendWelcomeEmail(user.email, user.name, user.role); }
    catch (e) { console.error('⚠️  Welcome email failed:', e.message); }

    await delay(1200);
    try { await sendAdminNewSignupEmail(FIXED_ADMIN_EMAIL, user); }
    catch (e) { console.error('⚠️  Admin notification failed:', e.message); }

    const token = jwt.sign(
      { user: { id: user._id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      msg: 'Account verified & created successfully!',
      token,
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error('verify-signup-otp error:', err);
    res.status(500).json({ success: false, msg: 'Server error. Please try again.' });
  }
});

// ============================================================
// ✅ 3. FORGOT PASSWORD — STEP 1: send reset OTP
// POST /auth/forgot-password
// Body: { email }
// ============================================================
router.post('/forgot-password', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, msg: 'A valid email is required' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.json({
        success: true,
        msg: 'If that email exists, a reset OTP has been sent.',
        email: cleanEmail,
      });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    await OTP.findOneAndUpdate(
      { email: cleanEmail, purpose: 'password-reset' },
      { email: cleanEmail, otpHash, purpose: 'password-reset', payload: null, attempts: 0, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendPasswordResetOTPEmail(cleanEmail, user.name, otp);
    } catch (mailErr) {
      console.error('❌ Reset OTP email failed:', mailErr.message);
      return res.status(500).json({ success: false, msg: 'Could not send reset email. Please try again.' });
    }

    return res.json({
      success: true,
      msg: 'Reset OTP sent to your email.',
      email: cleanEmail,
      expiresInMinutes: OTP_EXPIRY_MIN,
    });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ success: false, msg: 'Server error. Please try again.' });
  }
});

// ============================================================
// ✅ 4. FORGOT PASSWORD — STEP 2: verify OTP & set new password
// POST /auth/reset-password
// Body: { email, otp, newPassword }
// ============================================================
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ success: false, msg: 'A valid email is required' });
    if (!otp || String(otp).length !== 6) return res.status(400).json({ success: false, msg: 'OTP must be 6 digits' });
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, msg: 'New password must be at least 6 characters' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const record = await OTP.findOne({ email: cleanEmail, purpose: 'password-reset' });
    if (!record) {
      return res.status(400).json({ success: false, msg: 'No active reset request. Please request a new OTP.' });
    }

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, msg: 'OTP expired. Please request a new one.' });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(429).json({ success: false, msg: 'Too many failed attempts. Please request a new OTP.' });
    }

    const incomingHash = hashOTP(otp);
    if (incomingHash !== record.otpHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        msg: 'Incorrect OTP. Please try again.',
        attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - record.attempts),
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ success: false, msg: 'User not found.' });

    // ✅ Plain password — pre-save hook hashes it
    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: record._id });

    await logActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'password_reset',
      title: 'Password reset completed',
      details: `${user.name} reset their password via OTP`,
      req,
    });

    return res.json({ success: true, msg: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ success: false, msg: 'Server error. Please try again.' });
  }
});

// ============================================================
// SIGNUP (legacy) — direct signup without OTP
// ============================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role === 'admin') return res.status(403).json({ msg: 'Admin accounts cannot be created via signup.' });
    if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) return res.status(403).json({ msg: 'This email is reserved.' });
    if (!['buyer', 'generator'].includes(role)) return res.status(400).json({ msg: 'Invalid role selected.' });
    if (!name || !email || !password) return res.status(400).json({ success: false, msg: 'Please provide name, email and password' });
    if (password.length < 6) return res.status(400).json({ success: false, msg: 'Password must be at least 6 characters' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ success: false, msg: 'User already exists with this email' });

    // ✅ Plain password — pre-save hook hashes it
    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password, role: role || 'buyer' });
    await user.save();

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      action: 'signup', title: `New ${user.role} signed up`,
      details: `${user.name} registered as ${user.role}`,
      metadata: { email: user.email, role: user.role }, req,
    });

    try { await sendWelcomeEmail(user.email, user.name, user.role); }
    catch (e) { console.error('⚠️  Welcome email failed:', e.message); }

    await delay(1500);
    try { await sendAdminNewSignupEmail(FIXED_ADMIN_EMAIL, user); }
    catch (e) { console.error('⚠️  Admin notification failed:', e.message); }

    const token = jwt.sign({ user: { id: user._id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ success: false, msg: 'Server error during signup' });
  }
});

// ============================================================
// LOGIN
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, msg: 'Please provide email and password' });

    if (email.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase()) {
      if (password !== FIXED_ADMIN_PASSWORD) return res.status(401).json({ msg: 'Invalid admin credentials.' });
      const adminProfile = await getAdminProfile();
      const token = jwt.sign(
        { id: FIXED_ADMIN_ID, role: 'admin', email: FIXED_ADMIN_EMAIL, name: FIXED_ADMIN_NAME },
        process.env.JWT_SECRET, { expiresIn: '7d' }
      );
      await logActivity({
        userId: FIXED_ADMIN_ID, userName: FIXED_ADMIN_NAME, userEmail: FIXED_ADMIN_EMAIL, userRole: 'admin',
        action: 'login', title: 'Admin logged in', details: 'Admin accessed dashboard', req,
      });
      return res.json({ success: true, token, user: formatAdminProfile(adminProfile) });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, msg: 'Invalid credentials' });

    const token = jwt.sign({ user: { id: user._id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      action: 'login', title: `${user.role} logged in`, details: `${user.name} signed in`, req,
    });

    res.json({ success: true, token, user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, msg: 'Server error during login' });
  }
});

// ============================================================
// ADMIN LOGIN
// ============================================================
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, msg: 'Please provide admin email and password' });
    if (email.trim().toLowerCase() !== FIXED_ADMIN_EMAIL.toLowerCase()) return res.status(401).json({ success: false, msg: 'Invalid admin credentials.' });
    if (password !== FIXED_ADMIN_PASSWORD) return res.status(401).json({ success: false, msg: 'Invalid admin credentials.' });

    const adminProfile = await getAdminProfile();
    const token = jwt.sign(
      { id: FIXED_ADMIN_ID, role: 'admin', email: FIXED_ADMIN_EMAIL, name: FIXED_ADMIN_NAME },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    await logActivity({
      userId: FIXED_ADMIN_ID, userName: FIXED_ADMIN_NAME, userEmail: FIXED_ADMIN_EMAIL, userRole: 'admin',
      action: 'login', title: 'Admin login', details: 'Admin accessed via admin-login endpoint', req,
    });
    return res.json({ success: true, token, user: formatAdminProfile(adminProfile) });
  } catch (err) {
    console.error('❌ Admin login error:', err);
    res.status(500).json({ success: false, msg: 'Server error during admin login' });
  }
});

// ============================================================
// ME
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (isFixedAdmin(req)) {
      const profile = await getAdminProfile();
      return res.json({ success: true, user: formatAdminProfile(profile) });
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });
    res.json({ success: true, user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ /me error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ============================================================
// PAYMENT PIN
// ============================================================
router.put('/set-payment-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ success: false, msg: 'PIN must be exactly 4 digits' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });
    user.paymentPin = String(pin);
    await user.save();
    res.json({ success: true, message: 'Payment PIN set successfully', hasPaymentPin: true, user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ set-payment-pin error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

router.post('/verify-payment-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ success: false, msg: 'PIN must be 4 digits' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });
    if (!user.paymentPin) return res.status(400).json({ success: false, msg: 'Payment PIN not set. Please set it first.' });
    if (String(user.paymentPin) !== String(pin)) return res.status(400).json({ success: false, msg: 'Incorrect PIN. Please try again.' });
    res.json({ success: true, msg: 'PIN verified successfully' });
  } catch (err) {
    console.error('❌ verify-payment-pin error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ============================================================
// REGISTER COMPANY
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
      companyType: companyType || 'private', website: website || '',
      yearEstablished: yearEstablished ? parseInt(yearEstablished) : null,
      businessDescription: businessDescription || '',
      companyAddress, companyCity, companyState, companyPincode,
      companyCountry: country || 'India',
      latitude: latitude || '', longitude: longitude || '',
      contactPerson: contactPerson || '', contactPhone: contactPhone || '', contactEmail: contactEmail || '',
      isCompanyRegistered: true, isCompanyVerified: false,
    });

    if (latitude && longitude) {
      user.location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    }
    await user.save();

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      action: 'register_company',
      title: `${user.name} registered company`,
      details: `${user.role} submitted company details for verification`,
      metadata: { companyName: user.companyName, gstNumber: user.gstNumber, panNumber: user.panNumber },
      req,
    });

    await delay(1500);
    try { await sendAdminCompanyRegistrationEmail(FIXED_ADMIN_EMAIL, user); }
    catch (e) { console.error('⚠️  Admin company-reg email failed:', e.message); }

    res.json({ success: true, msg: 'Company registered successfully', user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ Company registration error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ============================================================
// ADMIN: COMPANY VERIFICATION
// ============================================================
router.get('/unverified-companies', authMiddleware, adminOnly, async (req, res) => {
  try {
    const companies = await User.find({ isCompanyRegistered: true, isCompanyVerified: false });
    res.json(companies);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/verify-company/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isCompanyVerified: true }, { new: true });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      action: 'company_verified',
      title: `Company verified — ${user.companyName || user.name}`,
      details: `Admin verified ${user.email}'s company`,
      metadata: { userId: user._id, companyName: user.companyName }, req,
    });

    try { if (user.email) await sendCompanyVerifiedEmail(user.email, user.name, user.companyName); }
    catch (e) { console.error('Verified email:', e.message); }

    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/reject-company/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isCompanyRegistered: false, isCompanyVerified: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      action: 'company_rejected',
      title: `Company rejected — ${user.companyName || user.name}`,
      details: `Admin rejected ${user.email}'s company${reason ? `: ${reason}` : ''}`,
      metadata: { userId: user._id, reason }, req,
    });

    try { if (user.email) await sendCompanyRejectedEmail(user.email, user.name, user.companyName, reason); }
    catch (e) { console.error('Rejected email:', e.message); }

    res.json({ success: true, msg: 'Rejected' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ============================================================
// PROFILE PHOTO — ✅ Cloudinary URL fix
// ============================================================
router.put('/profile-photo', authMiddleware, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    // ✅ Cloudinary returns full URL in req.file.path
    const photoUrl = req.file.path;

    if (isFixedAdmin(req)) {
      const updated = await AdminProfile.findByIdAndUpdate(
        FIXED_ADMIN_ID,
        { profilePhoto: photoUrl },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json({ success: true, profilePhoto: photoUrl, user: formatAdminProfile(updated) });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.profilePhoto = photoUrl;
    await user.save();
    res.json({ success: true, profilePhoto: photoUrl, user: buildUserPayload(user) });
  } catch (err) {
    console.error('❌ Profile photo update error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// PROFILE UPDATE
// ============================================================
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (isFixedAdmin(req)) {
      const { name, email, phone } = req.body;
      const updated = await AdminProfile.findByIdAndUpdate(
        FIXED_ADMIN_ID,
        { ...(name && { name }), ...(email && { email }), ...(phone !== undefined && { phone }) },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json(formatAdminProfile(updated));
    }

    const {
      name, email, phone, password,
      companyName, companyRegistrationNo, companyAddress, companyCity,
      companyState, companyPincode, companyCountry, gstNumber, panNumber,
      companyType, website, yearEstablished, businessDescription,
      contactPerson, contactPhone, contactEmail, latitude, longitude,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing && String(existing._id) !== String(user._id)) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
    }

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
      user.location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    }

    if (password && password.trim().length > 0) {
      if (password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });
      user.password = password;   // ✅ plain — pre-save hook hashes
    }

    await user.save();
    res.json(buildUserPayload(user));
  } catch (err) {
    console.error('❌ Profile update error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (isFixedAdmin(req)) {
      const profile = await getAdminProfile();
      return res.json(formatAdminProfile(profile));
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(buildUserPayload(user));
  } catch (err) {
    console.error('❌ /profile error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;