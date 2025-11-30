const ContactMessage = require('../models/contactMessageModel');
const Task = require('../models/taskModel');

const getContactMessagesAdmin = async (req, res) => {
  try {
    const list = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const createTaskFromContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, priority } = req.body || {};
    const msg = await ContactMessage.findById(id);
    if (!msg) return res.status(404).json({ message: 'Contact message not found' });
    const when = new Date(scheduledAt || Date.now());
    if (isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid scheduledAt' });
    const pr = priority && ['low','medium','high'].includes(String(priority)) ? String(priority) : 'low';
    const task = await Task.create({
      type: 'request',
      source: 'contact',
      contactMessage: msg._id,
      roomNumber: msg.roomNumber || null,
      scheduledAt: when,
      priority: pr,
      description: msg.message || ''
    });
    msg.status = 'assigned';
    msg.taskId = task._id;
    await msg.save();
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = { getContactMessagesAdmin, createTaskFromContactMessage };
