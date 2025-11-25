const CleaningRequest = require('../models/cleaningRequestModel');
const Booking = require('../models/bookingModel');

const createCleaningRequest = async (req, res) => {
  try {
    const { bookingId, scheduledAt, description } = req.body || {};
    if (!bookingId || !scheduledAt) return res.status(400).json({ message: 'bookingId and scheduledAt are required' });
    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!req.user || String(booking.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not authorized' });
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid scheduledAt' });
    const existing = await CleaningRequest.findOne({ user: req.user._id, booking: booking._id, status: 'submitted' });
    if (existing) return res.status(409).json({ message: 'Cleaning request already exists for this booking' });
    const rn = booking.roomNumber || (booking.room && booking.room.roomNumber) || null;
    const doc = await CleaningRequest.create({ user: req.user._id, booking: booking._id, roomNumber: rn, scheduledAt: when, description: description || '' });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getMyCleaningRequests = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const list = await CleaningRequest.find({ user: req.user._id, status: 'submitted' }).populate('booking').sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const getCleaningRequestsAdmin = async (req, res) => {
  try {
    const list = await CleaningRequest.find({ status: 'submitted' }).populate('booking').sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

module.exports = { createCleaningRequest, getCleaningRequestsAdmin, getMyCleaningRequests };
