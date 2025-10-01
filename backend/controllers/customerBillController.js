const asyncHandler = require('express-async-handler');
const Booking = require('../models/bookingModel');

// @desc    Get customer bill by booking ID
// @route   GET /api/customer-bills/:bookingId
// @access  Private/Admin
const getCustomerBill = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (booking) {
    res.json({
      _id: booking._id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      contactNumber: booking.contactNumber,
      guestName: booking.guestName,
      roomNumber: booking.roomNumber,
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      // Add more bill-related details as needed
    });
  } else {
    res.status(404);
    throw new Error('Booking not found');
  }
});

module.exports = { getCustomerBill };