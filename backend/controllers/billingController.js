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

// @desc    Get all billings for logged in user
// @route   GET /api/billings
// @access  Private
exports.getBillings = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find({ user: req.user.id })
    .populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut'
    });

  // Filter out billings that reference non-existent bookings (cancelled bookings)
  const validBillings = billings.filter(billing => billing.booking !== null);

  res.status(200).json({
    success: true,
    count: validBillings.length,
    data: validBillings
  });
});

// @desc    Get all billings for a specific booking
// @route   GET /api/billings/booking/:bookingId
// @access  Private
exports.getBookingBillings = asyncHandler(async (req, res, next) => {
  // Check if the booking exists first
  const booking = await Booking.findById(req.params.bookingId);
  
  if (!booking) {
    return next(new ErrorResponse(`Booking not found or has been cancelled`, 404));
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

// @desc    Get all billings (admin only)
// @route   GET /api/billings/admin
// @access  Private/Admin
exports.getAdminBillings = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find()
    .populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut'
    })
    .populate({
      path: 'user',
      select: 'name email'
    });

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});

// @desc    Get billings by room number for the CURRENT active booking only
// @route   GET /api/billings/room/:roomNumber
// @access  Private
exports.getRoomBillings = asyncHandler(async (req, res, next) => {
  const { roomNumber } = req.params;

  // Ensure we only show bills for active (ongoing or upcoming) bookings
  // Active = checkOut >= today AND status not in ['cancelled','completed']
  const today = new Date();

  // If we don't have a user context, we cannot safely scope bills — return empty
  if (!req.user || !req.user.id) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      roomNumber,
      totalRoomCharges: 0,
      totalExtraCharges: 0,
      remainingBalance: 0,
      paidAmount: 0
    });
  }

  // Resolve room by number so we can match bookings even when booking.roomNumber is null
  const roomDoc = await Room.findOne({ roomNumber }).select('_id roomNumber');

  // Find active bookings for this user and room
  let activeBookings = [];
  if (roomDoc) {
    activeBookings = await Booking.find({
      user: req.user.id,
      room: roomDoc._id,
      status: { $nin: ['cancelled', 'completed'] },
      checkOut: { $gte: today },
      paymentStatus: { $in: ['paid', 'partial'] }
    }).select('_id checkIn checkOut totalAmount');
  }
  // Fallback to booking.roomNumber match
  if (!activeBookings || activeBookings.length === 0) {
    activeBookings = await Booking.find({
      user: req.user.id,
      roomNumber,
      status: { $nin: ['cancelled', 'completed'] },
      checkOut: { $gte: today },
      paymentStatus: { $in: ['paid', 'partial'] }
    }).select('_id checkIn checkOut totalAmount');
  }

  // If there are no active bookings, there should be no current bill
  if (!activeBookings || activeBookings.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      roomNumber,
      totalRoomCharges: 0,
      totalExtraCharges: 0,
      remainingBalance: 0,
      paidAmount: 0
    });
  }

  // Optionally scope to the most recent active booking (in case of multiple)
  // We pick the booking with the latest checkIn date
  const mostRecentActiveBooking = activeBookings.sort(
    (a, b) => new Date(b.checkIn) - new Date(a.checkIn)
  )[0];

  // Fetch billing items tied ONLY to this active booking
  const billings = await Billing.find({
    booking: mostRecentActiveBooking._id,
    user: req.user.id
  })
    .populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut totalAmount'
    })
    .sort({ createdAt: -1 });

  // Recompute room charge using hourly pricing for this room (as before)
  const pricePerHour = roomDoc ? Number(roomDoc.price) : 0;

  // Normalize billing items
  const mergedBillings = [];
  billings.forEach((billing) => {
    const hours = billing?.booking
      ? Math.ceil(
          (new Date(billing.booking.checkOut) - new Date(billing.booking.checkIn)) /
            (1000 * 60 * 60)
        )
      : null;
    const recomputedAmount =
      hours != null && pricePerHour > 0
        ? (() => {
            const subtotal = hours * pricePerHour;
            const taxesAndFees = subtotal * 0.12;
            return subtotal + taxesAndFees;
          })()
        : billing.amount || 0;

    mergedBillings.push({
      _id: billing._id,
      roomNumber: billing.roomNumber || roomNumber,
      description:
        billing.description && billing.description.includes('Room booking charge')
          ? `Room booking charge for ${roomNumber} (${hours ?? 0} hours)`
          : billing.description || 'Room charge',
      amount:
        billing.description && billing.description.includes('Room booking charge')
          ? recomputedAmount
          : billing.amount || 0,
      status: billing.status || 'pending',
      date: billing.createdAt || new Date(),
      type: 'room_charge',
      bookingData: billing.booking || null
    });
  });

  // Sort by date (newest first)
  mergedBillings.sort((a, b) => new Date(b.date) - new Date(a.date));

  // If no items, return empty response scoped to the room
  if (mergedBillings.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      roomNumber,
      totalRoomCharges: 0,
      totalExtraCharges: 0,
      remainingBalance: 0,
      paidAmount: 0
    });
  }

  // Totals
  let totalRoomCharges = 0;
  let totalExtraCharges = 0;
  let paidAmount = 0;

  mergedBillings.forEach((billing) => {
    if (
      billing &&
      billing.type === 'room_charge' &&
      billing.description &&
      billing.description.includes('Room booking charge')
    ) {
      totalRoomCharges += billing.amount || 0;
    } else if (billing) {
      totalExtraCharges += billing.amount || 0;
    }

    if (billing && (billing.status === 'paid' || billing.status === 'completed')) {
      paidAmount += billing.amount || 0;
    }
  });

  const remainingBalance = Math.max(
    0,
    totalRoomCharges * 0.9 + totalExtraCharges - paidAmount
  );

  return res.status(200).json({
    success: true,
    count: mergedBillings.length,
    data: mergedBillings,
    roomNumber,
    totalRoomCharges,
    totalExtraCharges,
    remainingBalance,
    paidAmount
  });
});

// @desc    Get all rooms with their billing summary for the logged-in user
// @route   GET /api/billings/summary
// @access  Private
exports.getUserBillingSummary = asyncHandler(async (req, res, next) => {
  // Get unique room numbers from user's bookings
  const userBookings = await Booking.find({ user: req.user.id })
    .select('roomNumber totalAmount')
    .distinct('roomNumber');

  const roomSummaries = [];

  for (const roomNumber of userBookings) {
    const roomBillings = await Billing.find({ 
      roomNumber: roomNumber,
      user: req.user.id 
    }).populate({
      path: 'booking',
      select: 'checkIn checkOut totalAmount'
    });

    if (roomBillings.length > 0) {
      let totalRoomCharges = 0;
      let totalExtraCharges = 0;
      let paidAmount = 0;

      roomBillings.forEach(billing => {
        if (billing.description && billing.description.includes('Room booking charge')) {
          totalRoomCharges += billing.amount;
        } else {
          totalExtraCharges += billing.amount;
        }
        
        if (billing.status === 'paid') {
          paidAmount += billing.amount;
        }
      });

      const remainingBalance = Math.max(0, (totalRoomCharges * 0.9) + totalExtraCharges - paidAmount);

      roomSummaries.push({
        roomNumber: roomNumber,
        totalRoomCharges: totalRoomCharges,
        totalExtraCharges: totalExtraCharges,
        paidAmount: paidAmount,
        remainingBalance: remainingBalance,
        billings: roomBillings
      });
    }
  }

  res.status(200).json({
    success: true,
    count: roomSummaries.length,
    data: roomSummaries
  });
});
