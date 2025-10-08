const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  adults: {
    type: Number,
    required: true
  },
  children: {
    type: Number,
    required: true
  },
  guestName: {
    type: String,
    required: true
  },
  numberOfGuests: {
    type: Number,
    required: true
  },
  specialRequests: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);