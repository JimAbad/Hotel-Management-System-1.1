const mongoose = require('mongoose');

const cleaningRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  roomNumber: { type: String, default: null },
  scheduledAt: { type: Date, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'handled', 'cancelled'], default: 'submitted' }
}, { timestamps: true });

module.exports = mongoose.model('CleaningRequest', cleaningRequestSchema);
