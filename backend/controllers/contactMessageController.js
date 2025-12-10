const ContactMessage = require('../models/contactMessageModel');
const Request = require('../models/requestModel');
const Task = require('../models/taskModel');

const getContactMessagesAdmin = async (req, res) => {
  try {
    const list = await ContactMessage.find({}).sort({ createdAt: -1 }).lean();

    // Lookup request status and priority for each contact message by contactMessage reference
    const enrichedList = await Promise.all(
      list.map(async (msg) => {
        if (msg.taskId) {
          // Find the request associated with this contact message
          const request = await Request.findOne({ contactMessage: msg._id })
            .select('status priority')
            .lean();

          if (request) {
            return {
              ...msg,
              requestStatus: request.status || null,
              requestPriority: request.priority || null
            };
          }
        }
        return { ...msg, requestStatus: null, requestPriority: null };
      })
    );

    res.json({ success: true, data: enrichedList });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const createTaskFromContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, category, priority } = req.body || {};
    const msg = await ContactMessage.findById(id);
    if (!msg) return res.status(404).json({ message: 'Contact message not found' });
    const when = new Date(scheduledAt || Date.now());
    if (isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid scheduledAt' });

    // Validate priority is provided
    if (!priority || !['low', 'medium', 'high'].includes(String(priority))) {
      return res.status(400).json({ message: 'Priority is required and must be low, medium, or high' });
    }

    // Determine request type based on category
    const requestCategory = category || 'cleaning';
    const requestType = requestCategory === 'misc' ? 'miscellaneous' : requestCategory;

    // Create a request that matches the existing collection structure
    const request = await Request.create({
      roomNumber: msg.roomNumber || null,
      jobType: requestCategory, // This will be 'cleaning', 'maintenance', or 'misc'
      date: when,
      priority: String(priority),
      status: 'assigned',
      description: `Contact request (${requestType}): ${msg.message || ''}`,
      contactMessage: msg._id
    });

    msg.status = 'assigned';
    msg.taskId = request._id;
    await msg.save();
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const updateContactMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'assigned', 'handled', 'complied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const msg = await ContactMessage.findById(id);
    if (!msg) return res.status(404).json({ message: 'Contact message not found' });

    msg.status = status;
    await msg.save();

    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await ContactMessage.findById(id);
    if (!msg) return res.status(404).json({ message: 'Contact message not found' });

    await ContactMessage.findByIdAndDelete(id);
    res.json({ success: true, message: 'Contact message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = { getContactMessagesAdmin, createTaskFromContactMessage, updateContactMessageStatus, deleteContactMessage };
