require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const config = require('./config/keys');

const app = express();

// Cached DB connection for serverless
let isConnected = false;
const connectDBOnce = async () => {
  if (isConnected) return;
  try {
    await connectDB();
    isConnected = true;
  } catch (err) {
    console.error('DB connection error:', err.message);
  }
};

connectDBOnce();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database not connected' });
  }
  next();
});

// Static files (served by Vercel's @vercel/static build)
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

// SPA fallback (only for non-API routes)
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Export for Vercel serverless
module.exports = app;

// Local dev only
if (require.main === module) {
  const PORT = config.port;
  app.listen(PORT, () => console.log(`Hub Stay server running on port ${PORT}`));
}