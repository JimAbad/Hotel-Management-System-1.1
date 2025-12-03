const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false  // Changed to false to support non-booking bills
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomNumber: {
    type: String,
    required: false, // allow null while room is not yet assigned
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'partial'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit card', 'bank transfer', 'online payment'],
    default: 'cash'
  },
  // Fields for supporting bills from other subsystems
  billType: {
    type: String,
    enum: ['room_charge', 'food_order', 'service_charge', 'other'],
    default: 'room_charge'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false  // For food orders or other service orders
  },
  items: [{
    name: String,
    img: String,
    category: String,
    price: Number,
    quantity: Number,
    addedAt: Date
  }],
  comboContents: [{
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    img: String,
    category: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Billing', billingSchema);