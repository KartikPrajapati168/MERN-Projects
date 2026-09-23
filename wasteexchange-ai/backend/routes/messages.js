const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/user', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { receiverName, content } = req.body;
    const sender = await User.findById(req.userId);
    const receiver = await User.findOne({ name: receiverName });
    if (!receiver) return res.status(404).json({ msg: 'Receiver not found' });

    const message = new Message({
      senderId: req.userId,
      senderName: sender.name,
      receiverId: receiver._id,
      receiverName: receiver.name,
      content
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router; // ✅ YE LINE ZAROORI HAI