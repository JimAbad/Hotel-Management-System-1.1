const express = require('express');
const { getBookingActivities, getAllBookingActivities } = require('../controllers/bookingActivityController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Get activities for a specific booking
router.get('/:bookingId', protect, getBookingActivities);

// Get all booking activities (admin only)
router.get('/', protect, authorize(['admin']), getAllBookingActivities);

module.exports = router;