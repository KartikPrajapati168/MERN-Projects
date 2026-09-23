const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload'); // ✅ ADD THIS

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    console.log('📝 Signup request received');
    console.log('Request body:', { ...req.body, password: '***' });

    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        msg: 'Please provide name, email and password' 
      });
    }

    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        success: false,
        msg: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        success: false,
        msg: 'User already exists with this email' 
      });
    }

    // Create new user WITHOUT hashing password here - let the pre-save hook handle it
    console.log('✅ Creating new user...');
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // This will be hashed in pre-save hook
      role: role || 'buyer'
    });

    // Save user to database with try-catch specifically for this operation
    try {
      await user.save();
      console.log('✅ User saved successfully:', user._id);
    } catch (saveError) {
      console.error('❌ Error saving user:', saveError);
      // Check if it's a validation error
      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          msg: 'Validation error',
          errors: errors
        });
      }
      throw saveError; // re-throw for outer catch
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };

    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    console.log('✅ Token generated successfully');

    // Return response
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
      }
    });

  } catch (err) {
    console.error('❌ Signup error:', err);
    console.error('Error stack:', err.stack);
    
    // Send detailed error in development
    res.status(500).json({ 
      success: false,
      msg: 'Server error during signup',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received');
    console.log('Email:', req.body.email);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        msg: 'Please provide email and password' 
      });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid credentials' 
      });
    }

    // Check password using comparePassword method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid credentials' 
      });
    }

    console.log('✅ User authenticated:', user._id);

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    // Return user data
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

    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: 'User not found' 
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error' 
    });
  }
});

// @route   POST /api/auth/register-company
// @desc    Register company for user
// @access  Private
router.post('/register-company', auth, async (req, res) => {
  try {
    console.log('🏢 Company registration request');
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: 'User not found' 
      });
    }

    const {
      companyName,
      companyRegistrationNo,
      gstNumber,
      panNumber,
      companyType,
      website,
      yearEstablished,
      businessDescription,
      companyAddress,
      companyCity,
      companyState,
      companyPincode,
      country,
      latitude,
      longitude,
      contactPerson,
      contactPhone,
      contactEmail
    } = req.body;

    // Validate required fields
    if (!companyName || !companyRegistrationNo || !gstNumber || !panNumber) {
      return res.status(400).json({ 
        success: false,
        msg: 'Please provide all required company information' 
      });
    }

    // Update user with company details
    user.companyName = companyName;
    user.companyRegistrationNo = companyRegistrationNo;
    user.gstNumber = gstNumber;
    user.panNumber = panNumber;
    user.companyType = companyType || 'private';
    user.website = website || '';
    user.yearEstablished = yearEstablished ? parseInt(yearEstablished) : null;
    user.businessDescription = businessDescription || '';
    user.companyAddress = companyAddress;
    user.companyCity = companyCity;
    user.companyState = companyState;
    user.companyPincode = companyPincode;
    user.companyCountry = country || 'India';
    user.latitude = latitude || '';
    user.longitude = longitude || '';
    user.contactPerson = contactPerson || '';
    user.contactPhone = contactPhone || '';
    user.contactEmail = contactEmail || '';

    // Set location for geospatial queries
    if (latitude && longitude) {
      user.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    user.isCompanyRegistered = true;
    user.isCompanyVerified = false;

    await user.save();
    console.log('✅ Company registered for user:', user._id);

    res.json({
      success: true,
      msg: 'Company registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isCompanyRegistered: user.isCompanyRegistered,
        isCompanyVerified: user.isCompanyVerified,
        companyName: user.companyName,
        companyRegistrationNo: user.companyRegistrationNo,
        gstNumber: user.gstNumber,
        panNumber: user.panNumber,
        companyType: user.companyType,
        companyAddress: user.companyAddress,
        companyCity: user.companyCity,
        companyState: user.companyState,
        companyPincode: user.companyPincode,
        companyCountry: user.companyCountry,
        latitude: user.latitude,
        longitude: user.longitude,
        contactPerson: user.contactPerson,
        contactPhone: user.contactPhone,
        contactEmail: user.contactEmail,
        walletBalance: user.walletBalance,
        profilePicture: user.profilePicture
      }
    });

  } catch (err) {
    console.error('❌ Company registration error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error during company registration',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// routes/auth.js me add karo (Admin Verification)
router.get('/unverified-companies', auth, async (req, res) => {
  try {
    const companies = await User.find({ isCompanyRegistered: true, isCompanyVerified: false });
    console.log(`📋 Found ${companies.length} pending verifications`);
    res.json(companies);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/verify-company/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isCompanyVerified: true }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/reject-company/:id', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isCompanyRegistered: false, isCompanyVerified: false });
    res.json({ success: true, msg: 'Rejected' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});


// @route   PUT /api/auth/profile-photo
// @desc    Upload/Update profile photo
// @access  Private
router.put('/profile-photo', auth, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    
    // const photoUrl = `/uploads/profile/${req.file.filename}`;
    // ✅ Full URL banao (http://localhost:5000/uploads/profile/xxx.jpg)
    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/profile/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePhoto: photoUrl },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    console.log(`✅ Profile photo updated for user: ${user._id}`);
    res.json({ success: true, profilePhoto: photoUrl, user });
  } catch (err) {
    console.error('❌ Profile photo update error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update name/email
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, email, phone },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;