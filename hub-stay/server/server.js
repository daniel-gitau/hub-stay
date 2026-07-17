require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const config = require('./config/keys');

const app = express();

// Cached DB connection for serverless
let cachedDb = null;
const connectDBOnce = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  try {
    const conn = await connectDB();
    cachedDb = conn;
    return conn;
  } catch (err) {
    console.error('DB connection error:', err.message);
    throw err;
  }
};

// Connect on cold start
connectDBOnce();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB check middleware
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    try {
      await connectDBOnce();
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: 'Database not connected' });
      }
    } catch (err) {
      return res.status(503).json({ message: 'Database connection failed' });
    }
  }
  next();
});

// Static files
app.use('/client', express.static(path.join(__dirname, '..', 'client'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/food', require('./routes/foodPoints'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));

// SPA fallback - must be LAST
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Export for Vercel
module.exports = app;

// Local dev
if (require.main === module) {
  const PORT = config.port;
  app.listen(PORT, () => console.log(`Hub Stay server running on port ${PORT}`));
}