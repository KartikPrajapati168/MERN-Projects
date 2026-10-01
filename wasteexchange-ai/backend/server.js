// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// ═══════════════════════════════════════════════
// ✅ MIDDLEWARE — Order matters!
// ═══════════════════════════════════════════════

// Body parsers — MUST be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Request logger (helps debugging)
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`📥 ${req.method} ${req.path}`, {
      hasBody: !!req.body,
      contentType: req.headers['content-type']
    });
  }
  next();
});

// ═══════════════════════════════════════════════
// ✅ DATABASE CONNECTION
// ═══════════════════════════════════════════════
connectDB();

// ═══════════════════════════════════════════════
// ✅ ROUTES
// ═══════════════════════════════════════════════
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/requirements', require('./routes/requirements'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/contact', require('./routes/contact'));

// ═══════════════════════════════════════════════
// ✅ HEALTH CHECK
// ═══════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WasteExchange AI Server is running',
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════
// ✅ ERROR HANDLERS (must be last)
// ═══════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  res.status(404).json({ msg: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ msg: 'File too large. Max 10MB allowed.' });
  }
  
  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ msg: 'Invalid JSON in request body' });
  }
  
  res.status(err.status || 500).json({
    msg: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ═══════════════════════════════════════════════
// ✅ START SERVER
// ═══════════════════════════════════════════════
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  🚀 Server running on port ${PORT}        ║`);
  console.log(`║  🌐 http://localhost:${PORT}              ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});