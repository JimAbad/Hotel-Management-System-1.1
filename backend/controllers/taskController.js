const Task = require('../models/taskModel');
const CleaningRequest = require('../models/cleaningRequestModel');

const createTaskFromCleaningRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, priority } = req.body || {};
    const reqDoc = await CleaningRequest.findById(id).populate('booking');
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    const when = new Date(scheduledAt || reqDoc.scheduledAt);
    if (isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid scheduledAt' });
    const pr = priority && ['low','medium','high'].includes(String(priority)) ? String(priority) : 'low';
    const task = await Task.create({ request: reqDoc._id, user: reqDoc.user, booking: reqDoc.booking, roomNumber: reqDoc.roomNumber, scheduledAt: when, priority: pr, description: reqDoc.description || '' });
    reqDoc.status = 'handled';
    reqDoc.scheduledAt = when;
    await reqDoc.save();
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getTasksAdmin = async (req, res) => {
  try {
    const list = await Task.find({}).populate('booking request').sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ message: 'Missing status' });
    const allowed = ['open','in_progress','completed','cancelled'];
    if (!allowed.includes(String(status))) return res.status(400).json({ message: 'Invalid status' });
    const updated = await Task.findOneAndUpdate({ _id: id }, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = { createTaskFromCleaningRequest, getTasksAdmin, updateTaskStatus };
