const express = require('express');
const router = express.Router();

// Simple debug route
router.get('/test', (req, res) => {
  console.log('DEBUG ROUTE CALLED - This should appear in logs');
  res.json({ message: 'Debug route working', timestamp: new Date() });
});

// Test email route
router.post('/test-email', async (req, res) => {
  console.log('EMAIL DEBUG ROUTE CALLED');
  console.log('Request body:', req.body);
  
  const { sendEmail } = require('../utils/email');
  try {
    console.log('About to call sendEmail with hardcoded values');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    });
    console.log('Email sent successfully');
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADDED: admin-only seeding of one booking + two billing rows (in pesos)
const auth = require('../middleware/authMiddleware');
const protect = auth.protect || auth.authProtect;
const requireAdmin = typeof auth.authorize === 'function' ? auth.authorize(['admin']) : auth.admin;

const Room = require('../models/roomModel');
const Booking = require('../models/bookingModel');
const Billing = require('../models/Billing');
const User = require('../models/User');

router.post('/seed/sample-billing', protect, requireAdmin, async (req, res) => {
  try {
    // Ensure a user
    let user = await User.findOne({ email: /juan\.sample\./i });
    if (!user) {
      user = await User.create({
        name: 'Juan Dela Cruz',
        email: `juan.sample.${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user',
        verified: true
      });
    }

    // Ensure a room
    const roomNumber = '101';
    let room = await Room.findOne({ roomNumber });
    if (!room) {
      room = await Room.create({
        roomNumber,
        roomType: 'Deluxe',
        floor: 1,
        price: 2500,
        status: 'available'
      });
    }

    // Create or reuse a confirmed booking (future checkout)
    let booking = await Booking.findOne({ user: user._id, roomNumber, status: 'confirmed' });
    if (!booking) {
      booking = await Booking.create({
        user: user._id,
        guestName: user.name,
        contactNumber: '09171234567',
        email: user.email,
        roomNumber,
        roomType: room.roomType,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        adults: 2,
        children: 0,
        status: 'confirmed'
      });
    }

    // Add two billing rows if none exist yet for this booking
    const existing = await Billing.find({ booking: booking._id });
    if (existing.length === 0) {
      await Billing.create([
        {
          user: user._id,
          booking: booking._id,
          roomNumber,
          description: 'Room booking charge - Deluxe',
          amount: 2500, // pesos
          status: 'unpaid'
        },
        {
          user: user._id,
          booking: booking._id,
          roomNumber,
          description: 'Mini-bar charge',
          amount: 350, // pesos
          status: 'unpaid'
        }
      ]);
    }

    const bills = await Billing.find({ booking: booking._id }).lean();
    res.json({ message: 'Sample billing seeded', booking, bills });
  } catch (err) {
    console.error('Seed sample billing error:', err);
    res.status(500).json({ error: 'Failed to seed sample billing', details: String(err?.message || err) });
  }
});

module.exports = router;