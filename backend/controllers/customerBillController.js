const asyncHandler = require('express-async-handler');
const Booking = require('../models/bookingModel');

// @desc    Get customer bill by booking ID
// @route   GET /api/customer-bills/:bookingId
// @access  Private/Admin
const getCustomerBill = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate('room');

  if (booking) {
    res.json({
      _id: booking._id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      room: booking.room ? booking.room.roomNumber : 'N/A',
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      specialId: booking.specialId,
      // Add more bill-related details as needed
    });
  } else {
    res.status(404);
    throw new Error('Booking not found');
  }
});

module.exports = { getCustomerBill };