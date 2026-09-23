const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/add-money', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Invalid amount' });
    
    const user = await User.findByIdAndUpdate(
      req.userId, 
      { $inc: { walletBalance: amount } }, 
      { new: true }
    );
    res.json({ success: true, newBalance: user.walletBalance });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;