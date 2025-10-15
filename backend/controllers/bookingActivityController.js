const BookingActivity = require('../models/bookingActivityModel');
const Booking = require('../models/bookingModel');

// Create a new booking activity
const createBookingActivity = async (bookingId, action, details, performedBy) => {
  try {
    const newActivity = new BookingActivity({
      booking: bookingId,
      action,
      details,
      performedBy
    });
    
    await newActivity.save();
    return newActivity;
  } catch (error) {
    console.error('Error creating booking activity:', error);
    throw error;
  }
};

// Get all activities for a specific booking
const getBookingActivities = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const activities = await BookingActivity.find({ booking: bookingId })
      .sort({ timestamp: -1 });
    
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching booking activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all booking activities (for admin dashboard)
const getAllBookingActivities = async (req, res) => {
  try {
    const activities = await BookingActivity.find()
      .populate({
        path: 'booking',
        select: 'roomNumber customerName bookingStatus'
      })
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching all booking activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createBookingActivity,
  getBookingActivities,
  getAllBookingActivities
};