const mongoose = require('mongoose');

const cancelledBookingSchema = new mongoose.Schema({
  // Original booking data
  originalBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  referenceNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
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
    default: 0
  },
  guestName: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  specialRequests: {
    type: String
  },
  roomNumber: {
    type: String,
    default: null
  },
  numberOfGuests: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  originalBookingDate: {
    type: Date,
    required: true
  },
  
  // Cancellation specific data
  cancellationReasons: [{
    type: String,
    required: true
  }],
  cancellationElaboration: {
    type: String,
    default: null
  },
  cancellationDate: {
    type: Date,
    default: Date.now
  },
  cancellationFee: {
    type: Number,
    required: true
  },
  refundAmount: {
    type: Number,
    required: true
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Index for efficient queries
cancelledBookingSchema.index({ user: 1, cancellationDate: -1 });
cancelledBookingSchema.index({ customerEmail: 1 });
cancelledBookingSchema.index({ referenceNumber: 1 });

module.exports = mongoose.model('CancelledBooking', cancelledBookingSchema);
