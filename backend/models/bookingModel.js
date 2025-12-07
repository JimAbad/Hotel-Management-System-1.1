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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,        // room will be assigned later by admin
    required: false
  },
  roomNumber: {
    type: String,
    default: null
  },
  // Logical room type for this booking (e.g., Economy, Deluxe)
  roomType: {
    type: String,
    default: null
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
    enum: ['draft', 'pending', 'confirmed', 'occupied', 'cancelled', 'completed', 'time to check-out'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  // PayMongo-specific fields
  paymongoSourceId: {
    type: String,
    default: null
  },
  paymongoPaymentId: {
    type: String,
    default: null
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  // Flexible payment details blob (e.g., Xendit info)
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
