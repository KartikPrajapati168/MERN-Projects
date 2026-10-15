// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// ═══════════════════════════════════════════════
// ✅ CORS — production-ready
// ═══════════════════════════════════════════════
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    // Exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow any *.vercel.app subdomain (preview + production)
    if (/^https?:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);

    // Allow any *.onrender.com (for preview/testing)
    if (/^https?:\/\/.*\.onrender\.com$/.test(origin)) return callback(null, true);

    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ═══════════════════════════════════════════════
// ✅ BODY PARSERS
// ═══════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════
// ✅ STATIC FILES (uploads — fallback only)
// ═══════════════════════════════════════════════
// Note: With Cloudinary, files won't be stored here.
// This is only for local dev fallback.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ═══════════════════════════════════════════════
// ✅ REQUEST LOGGER
// ═══════════════════════════════════════════════
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`📥 ${req.method} ${req.path}`, {
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
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
app.use('/api/chatbot', require('./routes/chatbot'));

// ═══════════════════════════════════════════════
// ✅ HEALTH CHECK
// ═══════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'WasteExchange AI Server is running',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════
// ✅ 404 HANDLER
// ═══════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({ msg: `Route not found: ${req.method} ${req.path}` });
});

// ═══════════════════════════════════════════════
// ✅ GLOBAL ERROR HANDLER (must be last)
// ═══════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ msg: 'File too large. Max 10MB allowed.' });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ msg: 'Invalid JSON in request body' });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ msg: 'CORS: Origin not allowed' });
  }

  res.status(err.status || 500).json({
    msg: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ═══════════════════════════════════════════════
// ✅ START SERVER
// ═══════════════════════════════════════════════
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  🚀 Server running on port ${PORT}`);
  console.log(`║  🌐 http://localhost:${PORT}`);
  console.log(`║  🌍 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});