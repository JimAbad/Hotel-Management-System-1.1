const mongoose = require('mongoose');

const cancelledBookingSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  referenceNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  contactNumber: { type: String, required: true },
  guestName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  adults: { type: Number, required: true },
  children: { type: Number, required: true },
  numberOfGuests: { type: Number, required: true },
  specialRequests: { type: String, default: '' },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  status: { type: String, enum: ['cancelled'], default: 'cancelled' },
  reason: { type: String, default: '' },
  cancelledAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Explicitly set the collection name to 'cancelledbookings'
module.exports = mongoose.model('CancelledBooking', cancelledBookingSchema, 'cancelledbookings');