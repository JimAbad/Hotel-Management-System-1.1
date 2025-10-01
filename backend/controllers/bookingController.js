const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const BookingActivity = require('../models/bookingActivityModel');
const asyncHandler = require('express-async-handler');

// @desc    Get all bookings with optional status and search filters
// @route   GET /api/bookings
// @access  Admin
const getAllBookings = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let query = {};

  // Add status filter if provided
  if (status && status !== 'all') {
    query.status = status;
  }

  // Add search filter if provided
  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { referenceNumber: { $regex: search, $options: 'i' } },
      { roomNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 });

  res.json(bookings);
});

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Admin
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  res.json(booking);
});

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  console.log('Received booking request body:', req.body);
  const {
    customerName,
    customerEmail,
    contactNumber,
    roomNumber,
    checkIn,
    checkOut,
    adults,
    children,
    guestName,
    specialRequests
  } = req.body;

  // Generate reference number
  const referenceNumber = 'BK' + Date.now().toString().slice(-8);

  const room = await Room.findOne({ roomNumber });
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Calculate number of nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const numberOfGuests = adults + children;

  // Calculate total amount based on room price and number of nights
  const roomPrice = room.price;
  if (typeof roomPrice !== 'number' || isNaN(roomPrice)) {
    res.status(500);
    throw new Error('Room price is not a valid number.');
  }
  const subtotal = numberOfNights * roomPrice;
  const taxesAndFees = subtotal * 0.12; // Assuming 12% tax
  const totalAmount = subtotal + taxesAndFees;

  const booking = await Booking.create({
    referenceNumber,
    customerName,
    customerEmail,
    contactNumber,
    roomNumber,
    checkIn,
    checkOut,
    adults,
    children,
    guestName,
    numberOfGuests,
    specialRequests,
    status: 'pending',
    paymentStatus: 'pending',
    totalAmount,
  });

  console.log('Booking object created:', booking);

  if (booking) {
    // Create booking activity
    await BookingActivity.create({
      booking: booking._id,
      activity: 'Booking created',
      status: 'pending'
    });

    res.status(201).json(booking);
  }
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Admin
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  booking.status = status;
  const updatedBooking = await booking.save();
  
  // Create booking activity
  await BookingActivity.create({
    booking: booking._id,
    activity: `Booking ${status}`,
    status
  });
  
  res.json(updatedBooking);
});

// @desc    Update payment status
// @route   PUT /api/bookings/:id/payment-status
// @access  Admin
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  booking.paymentStatus = paymentStatus;
  const updatedBooking = await booking.save();
  
  // Create booking activity
  await BookingActivity.create({
    booking: booking._id,
    activity: `Payment ${paymentStatus}`,
    status: booking.status
  });
  
  res.json(updatedBooking);
});

// @desc    Generate payment QR code
// @route   POST /api/bookings/generate-qr
// @access  Admin
const generatePaymentQrCode = asyncHandler(async (req, res) => {
  // Implementation for QR code generation
  res.json({ qrCode: 'QR code data' });
});

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 });
  
  res.json(bookings);
});

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Admin
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  booking.status = 'cancelled';
  await booking.save();
  
  // Create booking activity
  await BookingActivity.create({
    booking: booking._id,
    activity: 'Booking cancelled',
    status: 'cancelled'
  });
  
  res.json({ message: 'Booking cancelled' });
});
  
// @desc    Delete cancelled bookings
// @route   DELETE /api/bookings/cancelled
// @access  Admin
const deleteCancelledBookings = asyncHandler(async (req, res) => {
  await Booking.deleteMany({ status: 'cancelled' });
  res.json({ message: 'Cancelled bookings deleted' });
});
  
module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updatePaymentStatus,
  generatePaymentQrCode,
  getMyBookings,
  cancelBooking,
  deleteCancelledBookings
};