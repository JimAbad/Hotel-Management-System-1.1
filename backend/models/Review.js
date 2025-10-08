const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  serviceQuality: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  roomQuality: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  detailedFeedback: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Review', reviewSchema);