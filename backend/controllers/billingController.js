const Billing = require('../models/Billing');
const Booking = require('../models/bookingModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Room = require('../models/roomModel');
const mongoose = require('mongoose');

// @desc    Create a new billing record
// @route   POST /api/billings
// @access  Private
exports.createBilling = asyncHandler(async (req, res, next) => {
  const { booking: bookingId, roomNumber, amount, description, status, paymentMethod } = req.body;

  // Create billing record
  const billing = await Billing.create({
    booking: bookingId,
    user: req.user.id,
    roomNumber,
    amount,
    description,
    status,
    paymentMethod
  });

  try {
    if (bookingId) {
      const BookingActivity = require('../models/bookingActivityModel');
      const msg = description && description.includes('Room booking charge')
        ? `Room booking charge created for ${roomNumber}`
        : `New order: ${description} (${Number(amount || 0).toLocaleString('en-US')})`;
      await BookingActivity.create({
        booking: bookingId,
        activity: msg,
        status: 'pending'
      });
    }
  } catch (e) {
    console.warn('Failed to log billing activity:', e?.message);
  }

  res.status(201).json({
    success: true,
    data: billing
  });
});

// @desc    Get all billings for logged in user (includes food orders, room charges, services)
//          Now based on ACTIVE BOOKINGS, even when room/roomNumber is not yet assigned.
//          ALSO includes bills from OTHER USERS with the same roomNumber (shared room billing)
// @route   GET /api/billings
// @access  Private
exports.getBillings = asyncHandler(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Find all active bookings for this user (paid or partial, not cancelled/completed)
  const activeBookings = await Booking.find({
    user: req.user.id,
    paymentStatus: { $in: ['paid', 'partial'] },
    checkOut: { $gte: today },
    status: { $nin: ['cancelled', 'completed'] }
  })
    .select('roomNumber room _id referenceNumber checkIn checkOut')
    .populate('room', 'roomNumber roomType price');

  if (!activeBookings || activeBookings.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  const bookingIdSet = activeBookings.map((b) => b._id);

  // 2. Extract all roomNumbers from user's active bookings
  const roomNumbers = activeBookings
    .map((b) => b.roomNumber || b.room?.roomNumber)
    .filter(Boolean)
    .map(String);

  // 3. Fetch ALL billing records from database:
  //    - Bills tied to user's booking IDs, OR
  //    - Bills with matching roomNumber (includes bills from other users on same room)
  const billings = await Billing.find({
    $or: [
      { booking: { $in: bookingIdSet } },
      { roomNumber: { $in: roomNumbers } }
    ]
  })
    .populate({
      path: 'booking',
      select: 'roomNumber room referenceNumber checkIn checkOut paymentStatus status user',
      populate: { path: 'room', select: 'roomNumber roomType price' }
    })
    .populate({
      path: 'user',
      select: 'name email'
    })
    .lean();

  // 4. Build a map of user's booking roomNumbers for display grouping
  const userBookingMap = {};
  activeBookings.forEach((b) => {
    const rn = String(b.roomNumber || b.room?.roomNumber || '');
    if (rn) {
      userBookingMap[rn] = {
        bookingId: b._id,
        referenceNumber: b.referenceNumber,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        room: b.room
      };
    }
  });

  // 5. Enrich each billing with display properties
  //    - roomNumber for display uses the CURRENT booking's roomNumber (handles reassignment)
  //    - Individual bills retain their original data for audit trail
  //    - Handle both 'amount' and 'totalPrice' fields for food orders
  const enriched = billings.map((b) => {
    // Determine the display roomNumber
    let displayRoomNumber = b.roomNumber;

    // If this bill is tied to a booking, use the booking's current roomNumber
    const booking = b.booking || {};
    if (booking.roomNumber) {
      displayRoomNumber = booking.roomNumber;
    } else if (booking.room?.roomNumber) {
      displayRoomNumber = booking.room.roomNumber;
    }

    // Fallback for bills without room assignment
    if (!displayRoomNumber) {
      const ref = booking.referenceNumber || String(booking._id || b._id || '').slice(-6);
      displayRoomNumber = `To be assigned - ${ref}`;
    }

    // Use amount if present, otherwise fall back to totalPrice (for food orders)
    const amount = b.amount ?? b.totalPrice ?? 0;

    // Generate description if missing (for food orders that may not have one)
    let description = b.description;
    if (!description && b.items && b.items.length > 0) {
      description = `Food order (${b.items.length} items)`;
    } else if (!description) {
      description = b.billType === 'food_order' ? 'Food order' : 'Bill';
    }

    // Indicate if this bill is from another user (for transparency)
    const isFromOtherUser = b.user && String(b.user._id || b.user) !== String(req.user.id);

    return {
      ...b,
      roomNumber: displayRoomNumber,
      originalRoomNumber: b.roomNumber,
      amount,
      description,
      isFromOtherUser,
      otherUserName: isFromOtherUser ? b.user?.name : null
    };
  });

  res.status(200).json({
    success: true,
    count: enriched.length,
    data: enriched
  });
});

// @desc    Get all billings for a specific booking
// @route   GET /api/billings/booking/:bookingId
// @access  Private
exports.getBookingBillings = asyncHandler(async (req, res, next) => {
  // Check if the booking exists first and has valid payment status
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return next(new ErrorResponse(`Booking not found or has been cancelled`, 404));
  }

  // Only show billings for bookings that have been paid or have partial payment
  // This prevents unpaid bookings from appearing in billing details
  if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'partial') {
    return next(new ErrorResponse(`No billing records found for unpaid bookings`, 404));
  }

  const billings = await Billing.find({
    booking: req.params.bookingId,
    user: req.user.id
  });

  if (!billings || billings.length === 0) {
    return next(new ErrorResponse(`No billing records found for this booking`, 404));
  }

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});

// @desc    Get a single billing
// @route   GET /api/billings/:id
// @access  Private
exports.getBilling = asyncHandler(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id)
    .populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut'
    });

  if (!billing) {
    return next(new ErrorResponse(`Billing not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the billing
  if (billing.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to access this billing`, 401));
  }

  res.status(200).json({
    success: true,
    data: billing
  });
});

// @desc    Update billing
// @route   PUT /api/billings/:id
// @access  Private
exports.updateBilling = asyncHandler(async (req, res, next) => {
  let billing = await Billing.findById(req.params.id);

  if (!billing) {
    return next(new ErrorResponse(`Billing not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the billing or is admin
  if (billing.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this billing`, 401));
  }

  billing = await Billing.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: billing
  });
});



// @desc    Get all billings for a specific booking
// @route   GET /api/billings/booking/:bookingId
// @access  Private
exports.getBookingBillings = asyncHandler(async (req, res, next) => {
  // Check if the booking exists first and has valid payment status
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return next(new ErrorResponse(`Booking not found or has been cancelled`, 404));
  }

  // Only show billings for bookings that have been paid or have partial payment
  // This prevents unpaid bookings from appearing in billing details
  if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'partial') {
    return next(new ErrorResponse(`No billing records found for unpaid bookings`, 404));
  }

  const billings = await Billing.find({
    booking: req.params.bookingId,
    user: req.user.id
  });

  if (!billings || billings.length === 0) {
    return next(new ErrorResponse(`No billing records found for this booking`, 404));
  }

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});

// @desc    Get a single billing
// @route   GET /api/billings/:id
// @access  Private
exports.getBilling = asyncHandler(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id)
    .populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut'
    });

  if (!billing) {
    return next(new ErrorResponse(`Billing not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the billing
  if (billing.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to access this billing`, 401));
  }

  res.status(200).json({
    success: true,
    data: billing
  });
});

// @desc    Update billing
// @route   PUT /api/billings/:id
// @access  Private
exports.updateBilling = asyncHandler(async (req, res, next) => {
  let billing = await Billing.findById(req.params.id);

  if (!billing) {
    return next(new ErrorResponse(`Billing not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the billing or is admin
  if (billing.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this billing`, 401));
  }

  billing = await Billing.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: billing
  });
});

// @desc    Delete billing
// @route   DELETE /api/billings/:id
// @access  Private
exports.deleteBilling = asyncHandler(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id);

  if (!billing) {
    return next(new ErrorResponse(`Billing not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the billing or is admin
  if (billing.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to delete this billing`, 401));
  }

  await billing.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get user billing summary
// @route   GET /api/billings/summary
// @access  Private
exports.getUserBillingSummary = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find({ user: req.user.id });

  const summary = {
    totalBillings: billings.length,
    totalAmount: billings.reduce((sum, b) => sum + (b.amount || 0), 0),
    pendingAmount: billings
      .filter((b) => b.status === 'pending')
      .reduce((sum, b) => sum + (b.amount || 0), 0),
    paidAmount: billings
      .filter((b) => b.status === 'paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0)
  };

  res.status(200).json({
    success: true,
    data: summary
  });
});

// @desc    Get all billings (admin)
// @route   GET /api/billings/admin
// @access  Private/Admin
exports.getAdminBillings = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find({})
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status paymentStatus'
    })
    .populate({
      path: 'user',
      select: 'name email'
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});

// @desc    Get billings for a specific room
// @route   GET /api/billings/room/:roomNumber
// @access  Private
exports.getRoomBillings = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find({
    roomNumber: req.params.roomNumber,
    user: req.user.id
  }).populate({
    path: 'booking',
    select: 'roomNumber checkIn checkOut'
  });

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});
