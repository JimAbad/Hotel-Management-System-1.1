const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const BookingActivity = require('../models/bookingActivityModel');
const CancelledBooking = require('../models/cancelledBookingModel');
const Billing = require('../models/Billing');
const Holiday = require('../models/holidayModel');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { triggerExpiredBookingCheck } = require('../utils/bookingExpirationUpdater');

// @desc    Get all bookings with optional status and search filters
// @route   GET /api/bookings
// @access  Admin
const getAllBookings = asyncHandler(async (req, res) => {
  const { status, search, includePendingPayment } = req.query;
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

  // For admin view, show all bookings regardless of payment status
  // This ensures admins can see all bookings including unpaid pending ones
  if (!includePendingPayment || String(includePendingPayment).toLowerCase() !== 'true') {
    // Show all bookings except cancelled/completed ones
    query.status = { $nin: ['cancelled', 'completed'] };
  } else {
    // When including pending payments, show all bookings
    // No additional filtering needed - show everything
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
    roomType, // accept roomType
    checkIn,
    checkOut,
    adults,
    children,
    guestName,
    specialRequests
  } = req.body;

  // Check booking limit (3 bookings per user) - exclude pending bookings
  const userActiveBookings = await Booking.countDocuments({
    $and: [
      {
        $or: [
          { customerEmail: customerEmail },
          { user: req.user.id }
        ]
      },
      {
        status: { $nin: ['pending', 'cancelled', 'completed'] }
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

  // SKIP ROOM lookup, and instead use requested type

  // Calculate number of hours
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const numberOfHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const numberOfGuests = adults + children;

  // Calculate total amount based on room price (per hour)
  // Economy: 3 hours = ₱200 total (₱59.523/hour) for ₱20 downpayment (10%)
  let basePrice;
  if (roomType === 'Economy') basePrice = 59.523;
  else if (roomType === 'Deluxe') basePrice = 100.00; // set correct price
  else if (roomType === 'Suite') basePrice = 150.00; // etc
  // ...set up price table or fetch from Room model defaults if needed
  // Then calculate total as before
  let subtotal = numberOfHours * basePrice;

  // Check if check-in date is a holiday and apply holiday pricing
  const checkInDateOnly = new Date(checkInDate);
  checkInDateOnly.setHours(0, 0, 0, 0);

  const holiday = await Holiday.findOne({
    date: checkInDateOnly,
    isActive: true
  });

  if (holiday) {
    // Apply holiday multiplier to subtotal
    subtotal = subtotal * holiday.priceMultiplier;
    console.log(`Holiday pricing applied: ${holiday.name} - ${holiday.priceMultiplier * 100}% of regular price`);
  }

  const taxesAndFees = subtotal * 0.12; // Assuming 12% tax
  const totalAmount = subtotal + taxesAndFees;

  // Rest of the logic – Do not assign room or roomNumber! Always set to null at booking creation.
  const bookingData = {
    room: null,
    user: req.user.id,
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
    roomNumber: null,
    numberOfGuests,
    totalAmount,
    status: 'pending',
    paymentStatus: 'pending'
  };

  console.log('Booking data before creation:', bookingData);

  const booking = await Booking.create(bookingData);
  console.log('Created booking:', booking);

  if (booking) {
    // Create booking activity
    await BookingActivity.create({
      booking: booking._id,
      activity: 'Booking created: needs room assignment',
      status: 'pending'
    });

    // Create billing record for the room booking
    const roomBilling = await Billing.create({
      booking: booking._id,
      user: req.user.id,
      roomNumber: null, // Billing roomNumber is also null
      amount: totalAmount,
      description: `Room booking charge for ${null} (${numberOfHours} hours)`, // Description uses null
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
  const { status, bookingStatus, checkOutDate, roomNumber } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const oldStatus = booking.status;
  booking.status = bookingStatus || status || booking.status;

  if (checkOutDate != null) {
    const d = new Date(checkOutDate);
    if (!isNaN(d)) booking.checkOut = d;
  }

  const prevRoomNumber = booking.roomNumber;
  if (roomNumber != null && roomNumber !== '') {
    booking.roomNumber = roomNumber;
    const room = await Room.findOne({ roomNumber });
    if (room) booking.room = room._id;

    // Always set status to 'occupied' when a room is assigned
    // unless explicitly setting to another status
    if (!bookingStatus && !status) {
      booking.status = 'occupied';
    } else if ((bookingStatus || status) && (bookingStatus === 'pending' || status === 'pending')) {
      // If trying to set to pending but room is assigned, override to occupied
      booking.status = 'occupied';
    }

    try {
      const Billing = require('../models/Billing');
      const BookingActivity = require('../models/bookingActivityModel');
      const billings = await Billing.find({ booking: booking._id });
      for (const b of billings) {
        const needsUpdate = String(b.roomNumber || '') === String(prevRoomNumber || '') || (b.description || '').includes('Room booking charge');
        if (needsUpdate) {
          b.roomNumber = roomNumber;
          if ((b.description || '').includes('Room booking charge')) {
            const hours = booking.checkIn && booking.checkOut
              ? Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60))
              : null;
            b.description = hours != null
              ? `Room booking charge for ${roomNumber} (${hours} hours)`
              : `Room booking charge for ${roomNumber}`;
          }
          await b.save();
        }
      }

      // Log activity for notifications
      const prevRn = prevRoomNumber ? String(prevRoomNumber) : '';
      const newRn = String(roomNumber);
      const isReassign = prevRn && prevRn !== newRn;
      const activityText = isReassign
        ? `Room reassigned: ${prevRn} → ${newRn}`
        : `Room assigned: ${newRn}`;
      await BookingActivity.create({ booking: booking._id, activity: activityText, status: 'pending' });
    } catch (e) {
      console.warn('Room/billing sync or activity log failed:', e?.message);
    }
  }
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
        paymentStatus: { $in: ['paid', 'partial'] } // Only consider paid bookings
      });

      if (!otherActiveBooking) {
        room.status = 'available';
        await room.save();
        console.log(`Room ${room.roomNumber} status updated to available after booking completion`);
      }
    }
  }

  // Create booking activity
  let activityText = `Booking ${booking.status}`;
  if (roomNumber != null && roomNumber !== '') {
    activityText = prevRoomNumber && prevRoomNumber !== roomNumber
      ? `Room reassigned: ${prevRoomNumber} → ${roomNumber}`
      : `Room assigned: ${roomNumber}`;
  }
  const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  const normalizedStatus = allowedStatuses.includes(String(booking.status || '').toLowerCase())
    ? String(booking.status).toLowerCase()
    : 'pending';
  await BookingActivity.create({
    booking: booking._id,
    activity: activityText,
    status: normalizedStatus
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
        $or: [
          // Show non-pending bookings (confirmed, occupied, etc.)
          { status: { $nin: ['pending'] } },
          // Show pending bookings that have been paid (partial or full)
          {
            $and: [
              { status: 'pending' },
              { paymentStatus: { $in: ['paid', 'partial'] } }
            ]
          }
        ]
      }
    ]
  })
    .populate({ path: 'room', select: 'roomType roomNumber' })
    .sort({ createdAt: -1 });
  console.log('Backend: Bookings found (excluding past bookings):', bookings);

  res.json(bookings);
});

// @desc    Update room status based on active bookings
// @route   PUT /api/bookings/update-room-status/:roomId
// @access  Admin
const updateRoomStatus = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  // Find active PAID bookings for this room
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: { $nin: ['cancelled', 'completed'] },
    checkOut: { $gte: new Date() },
    paymentStatus: { $in: ['paid', 'partial'] } // Only consider paid bookings
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
  let { cancellationReasons, cancellationElaboration } = req.body || {};

  // Validate that at least one cancellation reason is provided
  const isAdmin = req.user && req.user.role === 'admin';
  if (!cancellationReasons || !Array.isArray(cancellationReasons) || cancellationReasons.length === 0) {
    if (isAdmin) {
      cancellationReasons = ['Admin deletion'];
    } else {
      res.status(400);
      throw new Error('At least one cancellation reason must be selected');
    }
  }

  // Calculate cancellation fee (10% of total amount)
  const total = Number(booking.totalAmount || 0);
  const cancellationFee = Number((total * 0.10).toFixed(2));
  const refundAmount = Number((total - cancellationFee).toFixed(2));

  // Store cancelled booking data
  const cancelledBookingData = {
    originalBookingId: booking._id,
    room: booking.room ? booking.room._id : null,
    user: booking.user ? booking.user._id : (req.user ? req.user._id : null),
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
    cancelledBy: req.user && req.user.role === 'admin' ? 'admin' : 'user'
  };

  // Create cancelled booking record (best-effort)
  try {
    await CancelledBooking.create(cancelledBookingData);
  } catch (e) {
    console.warn('CancelledBooking create failed, proceeding with deletion:', e && e.message);
  }

  // Get the room ID before deleting the booking
  const roomId = booking.room ? booking.room._id : null;

  // Create booking activity before deletion
  await BookingActivity.create({
    booking: booking._id,
    activity: `Booking cancelled by user. Reasons: ${cancellationReasons.join(', ')}${cancellationElaboration ? `. Additional details: ${cancellationElaboration}` : ''}`,
    status: 'cancelled'
  });

  // Delete associated billing records before deleting the booking
  if (isAdmin) {
    await Billing.deleteMany({ booking: booking._id });
  }

  // Permanently delete the booking
  if (isAdmin) {
    await Booking.findByIdAndDelete(req.params.id);
  } else {
    booking.status = 'cancelled';
    await booking.save();
  }

  // Update room status after cancellation - only consider paid bookings
  const activeBooking = roomId ? await Booking.findOne({
    room: roomId,
    status: { $nin: ['cancelled', 'completed'] },
    checkOut: { $gte: new Date() },
    paymentStatus: { $in: ['paid', 'partial'] }
  }) : null;

  const room = roomId ? await Room.findById(roomId) : null;
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

  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can delete cancelled bookings.' });
  }

  if (req.originalUrl === '/api/bookings/user-cancelled') {
    return res.status(403).json({ success: false, message: 'Users cannot delete cancelled bookings.' });
  }

  console.log("Attempting to delete all cancelled bookings (admin request).");
  const result = await Booking.deleteMany({ status: 'cancelled' });
  console.log("Admin deletion result:", result);
  if (result.deletedCount === 0) {
    res.status(404).json({ success: false, message: 'No cancelled bookings found.' });
    return;
  }
  res.status(200).json({ success: true, message: 'All cancelled bookings deleted successfully.' });
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
