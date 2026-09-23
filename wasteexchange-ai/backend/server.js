require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path'); // ✅ ADD THIS

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ✅ ADD THIS - Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/requirements', require('./routes/requirements'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api/ai', require('./routes/ai'));          // ✅ Add
app.use('/api/wallet', require('./routes/wallet'));  // ✅ Add
app.use('/api/messages', require('./routes/messages')); // ✅ Add

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));