// backend/routes/contact.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ============================================================
// @route   POST /api/contact
// @desc    Submit a contact form (public, no auth needed)
// @access  Public
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    // ✅ Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, msg: 'Full name is required' });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, msg: 'Valid email is required' });
    }
    if (!subject) {
      return res.status(400).json({ success: false, msg: 'Please select a subject' });
    }
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ success: false, msg: 'Message must be at least 5 characters' });
    }

    // ✅ Rate limit: same email can submit max 3 times per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await Contact.countDocuments({
      email: email.toLowerCase().trim(),
      createdAt: { $gte: oneHourAgo },
    });
    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        msg: 'Too many submissions from this email. Please try again later.',
      });
    }

    // ✅ Save to DB
    const contact = await Contact.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      subject,
      message: message.trim(),
    });

    console.log(`📬 Contact form submitted | ${contact.email} | ${contact.subject}`);

    res.status(201).json({
      success: true,
      msg: 'Thank you! We will get back to you within 24 hours.',
      contactId: contact._id,
    });
  } catch (err) {
    console.error('❌ Contact submit error:', err);
    res.status(500).json({ success: false, msg: 'Failed to submit. Please try again.' });
  }
});

// ============================================================
// @route   GET /api/contact
// @desc    Get all contact submissions (admin only)
// @access  Private/Admin
// ============================================================
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    console.log(`📋 /contact → ${contacts.length} submissions returned`);
    res.json(contacts);
  } catch (err) {
    console.error('❌ /contact fetch error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// @route   GET /api/contact/stats
// @desc    Contact stats (admin only)
// @access  Private/Admin
// ============================================================
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const total = await Contact.countDocuments();
    const newCount = await Contact.countDocuments({ status: 'new' });
    const readCount = await Contact.countDocuments({ status: 'read' });
    const repliedCount = await Contact.countDocuments({ status: 'replied' });
    const archivedCount = await Contact.countDocuments({ status: 'archived' });

    res.json({ total, new: newCount, read: readCount, replied: repliedCount, archived: archivedCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// @route   PUT /api/contact/:id/status
// @desc    Update contact status (admin only)
// @access  Private/Admin
// ============================================================
router.put('/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) return res.status(404).json({ msg: 'Contact not found' });
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================================
// @route   DELETE /api/contact/:id
// @desc    Delete contact submission (admin only)
// @access  Private/Admin
// ============================================================
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ msg: 'Contact not found' });
    res.json({ success: true, msg: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;