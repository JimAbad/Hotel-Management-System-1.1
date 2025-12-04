const asyncHandler = require('../middleware/async');
const Billing = require('../models/Billing');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');

// Shared helper: build the same detailed breakdown used by the View Bill popup
const buildBookingBreakdown = async (bookingId) => {
  if (!bookingId) return null;

  // Fetch booking with room details
  const booking = await Booking.findById(bookingId).populate('room').lean();
  if (!booking) return null;

  // Fetch all billing records for this booking
  const billingRecords = await Billing.find({ booking: bookingId }).lean();

  // Calculate room charges
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const diffMs = checkOut - checkIn;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Get room price (handle Economy room special pricing)
  const roomPrice =
    booking.room?.roomType === 'Economy' ? 59.523 : (booking.room?.price || 0);
  const roomSubtotal = hours * roomPrice;

  // Separate food charges from billing records
  const foodItems = billingRecords.filter(
    (b) => b.description && !b.description.includes('Room booking charge')
  );
  const foodSubtotal = foodItems.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  // Extension charges (placeholder for future feature)
  const extensionSubtotal = 0;

  // Calculate total
  const totalAmount = roomSubtotal + foodSubtotal + extensionSubtotal;

  return {
    referenceNumber: booking.referenceNumber,
    customerName: booking.customerName,
    roomNumber: booking.roomNumber || booking.room?.roomNumber || '',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    paymentStatus: booking.paymentStatus || 'pending',
    breakdown: {
      roomCharges: {
        hours,
        pricePerHour: roomPrice,
        subtotal: roomSubtotal,
        description: `Room booking charge for ${booking.roomNumber || booking.room?.roomNumber} (${hours} hours)`
      },
      foodCharges: {
        items: foodItems.map((item) => ({
          description: item.description,
          amount: item.amount,
          createdAt: item.createdAt
        })),
        subtotal: foodSubtotal
      },
      extensionCharges: {
        hours: 0,
        subtotal: extensionSubtotal,
        description: 'No extensions'
      },
      totalAmount
    }
  };
};

// Admin list of customer bills, using the SAME computation as the detailed breakdown
exports.getAllCustomerBills = asyncHandler(async (req, res) => {
  // Enrich bills with booking details needed by admin UI
  const docs = await Billing.find({})
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status paymentStatus'
    })
    .lean();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect unique active booking IDs
  const activeBookingIds = new Set();
  (docs || []).forEach((d) => {
    const booking = d.booking;
    if (!booking) return;
    const co = booking.checkOut ? new Date(booking.checkOut) : null;
    if (!co || isNaN(co) || co < today) return;
    // Exclude unpaid pending bookings, but show paid pending bookings
    if (
      booking.status === 'pending' &&
      booking.paymentStatus === 'pending'
    ) {
      return;
    }
    activeBookingIds.add(String(booking._id));
  });

  const summaries = [];

  for (const bookingId of activeBookingIds) {
    const breakdown = await buildBookingBreakdown(bookingId);
    if (!breakdown) continue;

    summaries.push({
      _id: bookingId,
      bookingId,
      referenceNumber: breakdown.referenceNumber,
      customerName: breakdown.customerName,
      roomNumber: breakdown.roomNumber,
      checkOutDate: breakdown.checkOut,
      paymentStatus: breakdown.paymentStatus,
      totalAmount: breakdown.breakdown.totalAmount,
      breakdown
    });
  }

  // Sort by most recent check-out first
  summaries.sort((a, b) => {
    const aDate = a.checkOutDate ? new Date(a.checkOutDate) : null;
    const bDate = b.checkOutDate ? new Date(b.checkOutDate) : null;
    const aTs = aDate && !isNaN(aDate) ? aDate.getTime() : -Infinity;
    const bTs = bDate && !isNaN(bDate) ? bDate.getTime() : -Infinity;
    return bTs - aTs;
  });

  res
    .status(200)
    .json({ success: true, count: summaries.length, bills: summaries });
});

exports.getCustomerBill = asyncHandler(async (req, res) => {
  const bill = await Billing.findOne({ bookingId: req.params.bookingId })
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status'
    })
    .lean();
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  // Don't return bills for unpaid draft bookings, but show paid draft bookings
  if (bill.booking?.status === 'draft' && bill.booking?.paymentStatus === 'pending') {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  res.status(200).json({ success: true, bill });
});

// New endpoint for detailed bill breakdown
exports.getDetailedBillBreakdown = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const breakdown = await buildBookingBreakdown(bookingId);
  if (!breakdown) {
    return res
      .status(404)
      .json({ success: true, message: 'Booking not found' });
  }

  res.status(200).json({ success: true, data: breakdown });
});

// New endpoint for listing all bills with additional details
exports.getAllBillsWithDetails = asyncHandler(async (req, res) => {
  const bills = await Billing.find({})
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status paymentStatus'
    })
    .lean();

  const result = bills.map((billing) => ({
    bookingId: billing.bookingId,
    totalAmount: billing.totalAmount,
    description: billing.description,
    // NOTE: there is also a "billingId" field here:
    billingId: billing._id,
    paymentStatus: billing.paymentStatus || "Unpaid",
  }));

  res.status(200).json({ success: true, data: result });
});