const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  roomNumber: { type: String, default: null },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'assigned', 'handled'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null }
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
