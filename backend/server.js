const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const { startBookingExpirationUpdater } = require('./utils/bookingExpirationUpdater');
const { startPaymongoStatusRefresher } = require('./utils/paymongoStatusRefresher');
require('dotenv').config({ override: true });

const app = express();

// Init Middleware
app.use(express.json({
  extended: false,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'https://hotel-management-system-1-1.onrender.com', 'https://https-hotel-management-system-1-1.onrender.com', 'https://hotel-management-system-1-1-2ttg.onrender.com'],
  credentials: true
}));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.url}`);
  next();
});

// Define Routes
console.log('Loading routes...');
app.use('/api/rooms', require('./routes/roomRoutes'));
console.log('Loading auth routes...');
try {
  const authRoutes = require('./routes/authRoutes');
  console.log('Auth routes loaded, mounting at /api/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes mounted successfully');
} catch (error) {
  console.error('Error loading auth routes:', error);
}
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
console.log('Loading payment routes...');
app.use('/api/payment', require('./routes/paymentRoutes'));
console.log('Payment routes loaded');
app.use('/api/billings', require('./routes/billingRoutes'));
app.use('/api/test', require('./routes/testRoutes'));

// ADD THIS IMPORT BEFORE MOUNTING /api/debug
const debugRoutes = require('./routes/debugRoutes');
app.use('/api/debug', debugRoutes);

app.use('/api/reviews', require('./routes/reviewRoutes'));

app.use('/api/booking-activities', require('./routes/bookingActivityRoutes'));

app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.use('/webhooks', require('./routes/webhookRoutes'));

const customerBillRoutes = require('./routes/customerBillRoutes');
app.use('/api/customer-bills', customerBillRoutes);
app.use('/api/contact-messages', require('./routes/contactMessageRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));

// Health check endpoint
app.use('/', require('./routes/healthRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Match Vite proxy (frontend/vite.config.js proxies /api -> http://localhost:5000)
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB(); // wait for DB before starting server

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startBookingExpirationUpdater();
      startPaymongoStatusRefresher();
      (async () => {
        try {
          const Task = require('./models/taskModel');
          const idx = await Task.collection.indexes();
          if (Array.isArray(idx) && idx.some((i) => i.name === 'taskId_1')) {
            await Task.collection.dropIndex('taskId_1');
            console.log('Dropped legacy index taskId_1 on tasks collection');
          }
        } catch (e) {
          console.warn('Task index check/drop failed:', e && e.message);
        }
      })();
    });
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }
})();
