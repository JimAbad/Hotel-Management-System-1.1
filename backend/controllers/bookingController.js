const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const BookingActivity = require('../models/bookingActivityModel');
const CancelledBooking = require('../models/cancelledBookingModel');
const Billing = require('../models/Billing');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { triggerExpiredBookingCheck } = require('../utils/bookingExpirationUpdater');

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

  // Check booking limit (3 bookings per user)
  const userActiveBookings = await Booking.countDocuments({
    $and: [
      {
        $or: [
          { customerEmail: customerEmail },
          { user: req.user.id }
        ]
      },
      {
        status: { $nin: ['cancelled', 'completed'] }
      },
      {
        checkOut: { $gte: new Date() }
      }
    ]
  });

  if (userActiveBookings >= 3) {
    res.status(400);
    throw new Error('Booking limit reached. You can only have a maximum of 3 active bookings at a time.');
  }

  // Generate reference number
  const referenceNumber = 'BK' + Date.now().toString().slice(-8);

  const room = await Room.findOne({ roomNumber });
  console.log('Found room:', room); // Log the found room
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Calculate number of hours
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const numberOfHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const numberOfGuests = adults + children;

  // Calculate total amount based on room price (per hour)
  const roomPrice = room.price;
  console.log('Room price:', roomPrice, 'Type:', typeof roomPrice); // Log room price and type
  if (typeof roomPrice !== 'number' || isNaN(roomPrice)) {
    res.status(500);
    throw new Error('Room price is not a valid number.');
  }
  const subtotal = numberOfHours * roomPrice;
  const taxesAndFees = subtotal * 0.12; // Assuming 12% tax
  let totalAmount = subtotal + taxesAndFees;

  // Test pricing override: Economy room for exactly 3 hours totals ₱10
  // Also set downpayment of ₱1 to be charged via PayMongo
  let initialPaymentDetails = {};
  if (room.roomType === 'Economy' && numberOfHours === 3) {
    totalAmount = 10;
    initialPaymentDetails.downpaymentAmount = 1;
  }

  // Find an available room on the same floor if the requested room is not available
  let selectedRoom = room;

  console.log('Initial room status:', room.status);
  // Check if the room is occupied but has no active booking
  if (room.status === 'occupied') {
    const activeBooking = await Booking.findOne({
      room: room._id,
      status: { $nin: ['cancelled', 'completed'] },
      checkOut: { $gte: new Date() },
    });

    if (!activeBooking) {
      console.log(`Room ${room.roomNumber} was occupied but no active booking found. Setting status to available.`);
      room.status = 'available';
      await room.save();
      console.log(`Room ${room.roomNumber} status after save: ${room.status}`);
    } else {
      console.log(`Room ${room.roomNumber} is occupied and has an active booking.`);
    }
  }
  console.log('Room status before availability check:', room.status);

  if (room.status !== 'available') {
    // Find another available room on the same floor
    const availableRoom = await Room.findOne({ 
      floor: room.floor, 
      status: 'available',
      roomType: room.roomType // Use room.roomType instead of room.type
    });
    
    if (availableRoom) {
      selectedRoom = availableRoom;
      console.log(`Room ${roomNumber} not available, assigned room ${selectedRoom.roomNumber} instead`);
    } else {
      res.status(400);
      throw new Error(`Room ${roomNumber} is not available and no alternative rooms found on floor ${room.floor}`);
    }
  }
  console.log('Selected room before saving:', selectedRoom); // Log selected room before saving

  // Do NOT change room status here. Rooms should only be marked as
  // occupied after a successful payment (handled via webhook).

    const bookingData = {
      room: selectedRoom._id,
      user: req.user.id, // Ensure user ID is included
      referenceNumber,
      customerName,
      customerEmail,
      checkIn,
      checkOut,
      adults,
      children,
      guestName,
      contactNumber,
      specialRequests,
      roomNumber: selectedRoom.roomNumber,
      numberOfGuests,
      totalAmount,
      paymentDetails: initialPaymentDetails
    };

    console.log('Booking data before creation:', bookingData);

    const booking = await Booking.create(bookingData);
    console.log('Created booking:', booking);

  if (booking) {
    // Create booking activity
    await BookingActivity.create({
      booking: booking._id,
      activity: 'Booking created',
      status: 'pending'
    });

    // Create billing record for the room booking
    const roomBilling = await Billing.create({
      booking: booking._id,
      user: req.user.id,
      roomNumber: selectedRoom.roomNumber,
      amount: totalAmount,
      description: `Room booking charge for ${selectedRoom.roomNumber} (${numberOfHours} hours)`,
      status: 'pending',
      paymentMethod: 'online payment'
    });

    console.log('Created room billing record:', roomBilling);

    res.status(201).json({
      ...booking.toObject(),
      billingRecord: roomBilling
    });
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
  
  const oldStatus = booking.status;
  booking.status = status;
  const updatedBooking = await booking.save();
  
  // If booking status changed to 'completed', update room status
  if (status === 'completed' && oldStatus !== 'completed') {
    const room = await Room.findById(booking.room);
    if (room) {
      // Check if there are any other active bookings for this room
      const otherActiveBooking = await Booking.findOne({
        room: room._id,
        _id: { $ne: booking._id }, // Exclude current booking
        status: { $nin: ['cancelled', 'completed'] },
        checkOut: { $gte: new Date() },
      });
      
      if (!otherActiveBooking) {
        room.status = 'available';
        await room.save();
        console.log(`Room ${room.roomNumber} status updated to available after booking completion`);
      }
    }
  }
  
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

// @desc    Get user's bookings (only paid)
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  console.log('Backend: Fetching bookings for email:', req.user.email);
  console.log('Backend: Fetching bookings for userId:', req.user._id);
  
  // Get current date at start of day to compare with checkout dates
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const bookings = await Booking.find({
    $and: [
      {
        $or: [
          { customerEmail: req.user.email },
          { user: req.user._id }
        ]
      },
      {
        // Only include bookings where checkout date is today or in the future
        checkOut: { $gte: currentDate }
      },
      {
        // Include bookings with successful full or partial payment
        paymentStatus: { $in: ['paid', 'partial'] }
      }
    ]
  }).sort({ createdAt: -1 });
  console.log('Backend: Bookings found (excluding past bookings):', bookings);
  
  res.json(bookings);
});

// @desc    Update room status based on active bookings
// @route   PUT /api/bookings/update-room-status/:roomId
// @access  Admin
const updateRoomStatus = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  
  // Find active bookings for this room
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: { $nin: ['cancelled', 'completed'] },
    paymentStatus: 'paid',
    checkOut: { $gte: new Date() },
  });
  
  const room = await Room.findById(roomId);
  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }
  
  // Update room status based on active bookings
  if (activeBooking) {
    room.status = 'occupied';
  } else {
    room.status = 'available';
  }
  
  await room.save();
  
  res.json({
    message: 'Room status updated successfully',
    room: {
      roomNumber: room.roomNumber,
      status: room.status,
      hasActiveBooking: !!activeBooking
    }
  });
});

// @desc    Cancel booking and update room status
// @route   DELETE /api/bookings/:id
// @access  Admin
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('room user');
  
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  // Extract cancellation data from request body
  const { cancellationReasons, cancellationElaboration } = req.body;
  
  // Validate that at least one cancellation reason is provided
  if (!cancellationReasons || !Array.isArray(cancellationReasons) || cancellationReasons.length === 0) {
    res.status(400);
    throw new Error('At least one cancellation reason must be selected');
  }
  
  // Calculate cancellation fee (10% of total amount)
  const cancellationFee = booking.totalAmount * 0.10;
  const refundAmount = booking.totalAmount - cancellationFee;
  
  // Store cancelled booking data
  const cancelledBookingData = {
    originalBookingId: booking._id,
    room: booking.room._id,
    user: booking.user._id,
    referenceNumber: booking.referenceNumber,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.adults,
    children: booking.children,
    guestName: booking.guestName,
    contactNumber: booking.contactNumber,
    specialRequests: booking.specialRequests,
    roomNumber: booking.roomNumber,
    numberOfGuests: booking.numberOfGuests,
    totalAmount: booking.totalAmount,
    originalBookingDate: booking.createdAt,
    cancellationReasons,
    cancellationElaboration: cancellationElaboration || null,
    cancellationFee,
    refundAmount,
    cancelledBy: 'user'
  };
  
  // Create cancelled booking record
  await CancelledBooking.create(cancelledBookingData);
  
  // Get the room ID before deleting the booking
  const roomId = booking.room._id;
  
  // Create booking activity before deletion
  await BookingActivity.create({
    booking: booking._id,
    activity: `Booking cancelled by user. Reasons: ${cancellationReasons.join(', ')}${cancellationElaboration ? `. Additional details: ${cancellationElaboration}` : ''}`,
    status: 'cancelled'
  });
  
  // Delete associated billing records before deleting the booking
  await Billing.deleteMany({ booking: booking._id });
  
  // Permanently delete the booking
  await Booking.findByIdAndDelete(req.params.id);
  
  // Update room status after cancellation
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: { $nin: ['cancelled', 'completed'] },
    checkOut: { $gte: new Date() },
  });
  
  const room = await Room.findById(roomId);
  if (room) {
    if (activeBooking) {
      room.status = 'occupied';
    } else {
      room.status = 'available';
    }
    await room.save();
  }
  
  res.json({ 
    message: 'Booking cancelled successfully',
    cancellationFee,
    refundAmount,
    roomStatus: room ? room.status : 'unknown'
  });
});
  
// @desc    Delete cancelled bookings
// @route   DELETE /api/bookings/cancelled
// @access  Admin
const deleteCancelledBookings = asyncHandler(async (req, res, next) => {
  console.log("deleteCancelledBookings function called.");
  console.log("Request user:", req.user);
  
  if (req.originalUrl === '/api/bookings/user-cancelled') {
    // User-specific deletion
    const userId = new mongoose.Types.ObjectId(req.user.id);
    console.log("Attempting to delete user-specific cancelled bookings for user ID:", userId);
    console.log("Type of userId:", typeof userId);
    const query = { user: userId, status: 'cancelled' };
    console.log("Query for deleteMany:", query);

    const bookingsToFind = await Booking.find(query);
    console.log("Bookings found with query:", bookingsToFind);

    const result = await Booking.deleteMany(query);
    console.log("User-specific deletion result:", result);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'No cancelled bookings found for this user.' });
      return;
    }
    res.status(200).json({ success: true, message: 'All cancelled bookings for the user deleted successfully.' });
  } else {
    // Admin deletion (original functionality)
    console.log("Attempting to delete all cancelled bookings (admin request).");
    const result = await Booking.deleteMany({ status: 'cancelled' });
    console.log("Admin deletion result:", result);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'No cancelled bookings found.' });
      return;
    }
    res.status(200).json({ success: true, message: 'All cancelled bookings deleted successfully.' });
  }
});

// @desc    Manually trigger expired booking check
// @route   POST /api/bookings/check-expired
// @access  Admin
const checkExpiredBookings = asyncHandler(async (req, res) => {
  try {
    const result = await triggerExpiredBookingCheck();
    
    res.json({
      message: 'Expired booking check completed successfully',
      processedBookings: result.processedBookings,
      updatedRooms: result.updatedRooms
    });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to process expired bookings');
  }
});

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  updatePaymentStatus,
  generatePaymentQrCode,
  getMyBookings,
  cancelBooking,
  deleteCancelledBookings,
  updateRoomStatus,
  checkExpiredBookings,
};