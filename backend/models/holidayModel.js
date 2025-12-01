const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    default: 'Holiday'
  },
  priceMultiplier: {
    type: Number,
    required: true,
    default: 1.05 // 5% increase for holidays
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Holiday', holidaySchema);
