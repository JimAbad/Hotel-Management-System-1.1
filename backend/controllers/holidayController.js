const Holiday = require('../models/holidayModel');
const asyncHandler = require('express-async-handler');

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Admin
const getHolidays = asyncHandler(async (req, res) => {
  const holidays = await Holiday.find({}).sort({ date: 1 });
  res.json(holidays);
});

// @desc    Toggle holiday status for a specific date
// @route   POST /api/holidays/toggle
// @access  Admin
const toggleHoliday = asyncHandler(async (req, res) => {
  const { date } = req.body;
  
  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  // Check if holiday already exists for this date
  const existingHoliday = await Holiday.findOne({ date: targetDate });

  if (existingHoliday) {
    // Remove the holiday
    await Holiday.deleteOne({ _id: existingHoliday._id });
    res.json({
      message: 'Holiday removed successfully',
      isHoliday: false,
      date: targetDate
    });
  } else {
    // Create new holiday
    const newHoliday = await Holiday.create({
      date: targetDate,
      name: 'Custom Holiday',
      priceMultiplier: 1.05, // 5% increase
      isActive: true
    });
    res.json({
      message: 'Holiday added successfully',
      isHoliday: true,
      date: targetDate,
      holiday: newHoliday
    });
  }
});

// @desc    Check if a date is a holiday
// @route   GET /api/holidays/check/:date
// @access  Public
const checkHoliday = asyncHandler(async (req, res) => {
  const { date } = req.params;
  
  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const holiday = await Holiday.findOne({ 
    date: targetDate, 
    isActive: true 
  });

  res.json({
    isHoliday: !!holiday,
    date: targetDate,
    holiday: holiday || null
  });
});

// @desc    Get holiday pricing multiplier for a date
// @route   GET /api/holidays/multiplier/:date
// @access  Public
const getHolidayMultiplier = asyncHandler(async (req, res) => {
  const { date } = req.params;
  
  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const holiday = await Holiday.findOne({ 
    date: targetDate, 
    isActive: true 
  });

  res.json({
    multiplier: holiday ? holiday.priceMultiplier : 1,
    date: targetDate,
    isHoliday: !!holiday
  });
});

// @desc    Check if today has holiday pricing
// @route   GET /api/holidays/check-pricing
// @access  Public
const checkHolidayPricing = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const holiday = await Holiday.findOne({ 
    date: today, 
    isActive: true 
  });

  res.json({
    isHoliday: !!holiday,
    priceMultiplier: holiday ? holiday.priceMultiplier : 1,
    date: today,
    holidayName: holiday ? holiday.name : null
  });
});

module.exports = {
  getHolidays,
  toggleHoliday,
  checkHoliday,
  getHolidayMultiplier,
  checkHolidayPricing
};