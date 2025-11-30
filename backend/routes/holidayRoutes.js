const express = require('express');
const { getHolidays, toggleHoliday, checkHoliday, getHolidayMultiplier, checkHolidayPricing } = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/check-pricing', checkHolidayPricing);
router.get('/check/:date', checkHoliday);
router.get('/multiplier/:date', getHolidayMultiplier);

// Admin routes
router.get('/', protect, authorize('admin'), getHolidays);
router.post('/toggle', protect, authorize('admin'), toggleHoliday);

module.exports = router;