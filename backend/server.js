const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({
  extended: false,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Define Routes
console.log('Loading routes...');
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
console.log('Loading payment routes...');
app.use('/api/payment', require('./routes/paymentRoutes'));
console.log('Payment routes loaded');
app.use('/api/billings', require('./routes/billingRoutes'));
app.use('/api/test', require('./routes/testRoutes'));

app.use('/api/reviews', require('./routes/reviewRoutes'));

app.use('/api/booking-activities', require('./routes/bookingActivityRoutes'));

app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.use('/webhooks', require('./routes/webhookRoutes'));

const customerBillRoutes = require('./routes/customerBillRoutes');
app.use('/api/customer-bills', customerBillRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));