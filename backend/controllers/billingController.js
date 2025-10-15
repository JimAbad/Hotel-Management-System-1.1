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

  res.status(200).json({
    success: true,
    count: billings.length,
    data: billings
  });
});

// @desc    Get all billings for a specific booking
// @route   GET /api/billings/booking/:bookingId
// @access  Private
exports.getBookingBillings = asyncHandler(async (req, res, next) => {
  const billings = await Billing.find({ 
    booking: req.params.bookingId,
    user: req.user.id 
  });

  if (!billings) {
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

// @desc    Get billings by room number with remaining balance calculation
// @route   GET /api/billings/room/:roomNumber
// @access  Private
exports.getRoomBillings = asyncHandler(async (req, res, next) => {
  const { roomNumber } = req.params;
  
  // Get all billings for the specific room number
  // If user exists, filter by user, otherwise get all billings for the room
  let billings = [];
  if (req.user && req.user.id) {
    billings = await Billing.find({ 
      roomNumber: roomNumber,
      user: req.user.id 
    }).populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut totalAmount'
    }).sort({ createdAt: -1 });
  } else {
    // If no valid user, still return room billings for display purposes
    billings = await Billing.find({ 
      roomNumber: roomNumber
    }).populate({
      path: 'booking',
      select: 'roomNumber checkIn checkOut totalAmount'
    }).sort({ createdAt: -1 });
  }

  // Get additional billing data that might be stored in a different format
  // This handles the case where there are billing documents with items array
  let additionalBillings = [];
  try {
    // Use MongoDB aggregation to find documents with the roomNumber and items
    const BillingRaw = mongoose.model('Billing').collection;
    const rawResults = await BillingRaw.find({ 
      roomNumber: roomNumber,
      items: { $exists: true, $ne: [] }
    }).toArray();
    
    additionalBillings = rawResults.map(doc => ({
      roomNumber: doc.roomNumber,
      items: doc.items,
      checkedOutAt: doc.checkedOutAt,
      deliveredAt: doc.deliveredAt,
      totalPrice: doc.totalPrice,
      date: doc.deliveredAt || doc.checkedOutAt || doc.createdAt
    }));
  } catch (error) {
    console.log('No additional billing format found, using standard format only');
  }

  // Merge billing items
  const mergedBillings = [];
  
  // Add regular billings first
  billings.forEach(billing => {
    mergedBillings.push({
      _id: billing._id,
      roomNumber: billing.roomNumber || roomNumber,
      description: billing.description || 'Room charge',
      amount: billing.amount || 0,
      status: billing.status || 'pending',
      date: billing.createdAt || new Date(),
      type: 'room_charge',
      bookingData: billing.booking || null
    });
  });

  // Add additional billing items as separate entries
  additionalBillings.forEach(billing => {
    if (billing.items && billing.items.length > 0) {
      billing.items.forEach(item => {
        mergedBillings.push({
          roomNumber: billing.roomNumber,
          description: `${item.name} (quantity: ${item.quantity || 1})`,
          amount: (item.price || 0) * (item.quantity || 1),
          status: 'pending', // Changed from 'completed' to 'pending'
          date: billing.date,
          type: 'item_charge',
          bookingData: {
            checkedOutAt: billing.checkedOutAt,
            deliveredAt: billing.deliveredAt,
            totalPrice: billing.totalPrice
          }
        });
      });
    }
  });

  // Sort by date (newest first)
  mergedBillings.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (mergedBillings.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      roomNumber: roomNumber,
      totalRoomCharges: 0,
      totalExtraCharges: 0,
      remainingBalance: 0,
      paidAmount: 0
    });
  }

  // Calculate totals
  let totalRoomCharges = 0;
  let totalExtraCharges = 0;
  let paidAmount = 0;

  mergedBillings.forEach(billing => {
    if (billing && billing.type === 'room_charge' && billing.description && billing.description.includes('Room booking charge')) {
      totalRoomCharges += billing.amount || 0;
    } else if (billing) {
      totalExtraCharges += billing.amount || 0;
    }
    
    if (billing && (billing.status === 'paid' || billing.status === 'completed')) {
      paidAmount += billing.amount || 0;
    }
  });

  // Calculate remaining balance (90% of room charges + total extra charges minus what's already paid)
  const remainingBalance = Math.max(0, (totalRoomCharges * 0.9) + totalExtraCharges - paidAmount);

  res.status(200).json({
    success: true,
    count: mergedBillings.length,
    data: mergedBillings,
    roomNumber: roomNumber,
    totalRoomCharges: totalRoomCharges,
    totalExtraCharges: totalExtraCharges,
    remainingBalance: remainingBalance,
    paidAmount: paidAmount
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
