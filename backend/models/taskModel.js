const mongoose = require('mongoose');
const ContactMessage = require('./contactMessageModel');

const taskSchema = new mongoose.Schema({
  type: { type: String, default: 'cleaning' },
  source: { type: String, enum: ['cleaning', 'contact'], default: 'cleaning' },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'CleaningRequest', default: null },
  contactMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactMessage', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  roomNumber: { type: String, default: null },
  scheduledAt: { type: Date, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' }
}, { timestamps: true });

// Export after hooks are registered

// When a task sourced from a contact message is completed, remove the contact message
taskSchema.post('save', async function(doc) {
  try {
    if (doc && doc.status === 'completed' && String(doc.source) === 'contact' && doc.contactMessage) {
      await ContactMessage.deleteOne({ _id: doc.contactMessage });
    }
  } catch (e) {
    console.warn('Task post-save hook failed to delete contact message:', e && e.message);
  }
});

taskSchema.post('findOneAndUpdate', async function(res) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc && doc.status === 'completed' && String(doc.source) === 'contact' && doc.contactMessage) {
      await ContactMessage.deleteOne({ _id: doc.contactMessage });
    }
  } catch (e) {
    console.warn('Task post-update hook failed to delete contact message:', e && e.message);
  }
});

module.exports = mongoose.model('Task', taskSchema);
