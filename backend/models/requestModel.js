const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  taskId: { type: String, default: '' },
  roomNumber: { type: String, default: null },
  jobType: { type: String, enum: ['cleaning', 'maintenance', 'misc'], default: 'cleaning' },
  date: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], required: true },
  assignedTo: { type: String, default: '' },
  status: { type: String, enum: ['new', 'assigned', 'started', 'completed', 'cancelled'], default: 'assigned' },
  description: { type: String, default: '' },
  contactMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactMessage', default: null }
}, { timestamps: true });

// Generate taskId before saving
requestSchema.pre('save', async function (next) {
  if (!this.taskId || this.taskId === '') {
    this.taskId = 'T' + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

// Create unique index on taskId
requestSchema.index({ taskId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Request', requestSchema);