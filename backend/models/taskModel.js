const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: { type: String, default: 'cleaning' },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'CleaningRequest', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  roomNumber: { type: String, default: null },
  scheduledAt: { type: Date, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
