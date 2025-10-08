const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
    unique: true
  },
  floor: {
    type: Number,
    required: true
  },
  roomType: {
    type: String,
    required: true,
    enum: ['Presidential', 'Deluxe', 'Suite', 'Economy']
  },
  price: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  amenities: [{
    type: String
  }],
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);