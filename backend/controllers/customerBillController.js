const asyncHandler = require('../middleware/async');
const Billing = require('../models/Billing');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');

// Shared helper: build the detailed breakdown from BILLINGS COLLECTION ONLY
// Fetches by BOTH booking ID AND roomNumber to include food orders
const buildBookingBreakdown = async (bookingId) => {
  if (!bookingId) return null;

  // Fetch booking with room details (for display info only)
  const booking = await Booking.findById(bookingId).populate('room').lean();
  if (!booking) return null;

  // Get the roomNumber from the booking
  const roomNumber = booking.roomNumber || booking.room?.roomNumber;

  // Fetch ALL billing records by BOTH booking ID AND roomNumber
  // This includes food orders that may not have a booking association
  const billingRecords = await Billing.find({
    $or: [
      { booking: bookingId },
      ...(roomNumber ? [{ roomNumber: String(roomNumber) }] : [])
    ]
  }).lean();

  // If no billing records exist, return null (no bills to show)
  if (!billingRecords || billingRecords.length === 0) {
    return null;
  }

  // Separate room charges from food/other charges based on billing records
  // Handle both 'amount' and 'totalPrice' fields
  const roomChargeRecords = billingRecords.filter(
    (b) => b.description && b.description.includes('Room booking charge')
  );
  const foodItems = billingRecords.filter(
    (b) => !b.description || !b.description.includes('Room booking charge')
  );

  // Calculate subtotals from actual billing records (handle both amount and totalPrice)
  const roomSubtotal = roomChargeRecords.reduce(
    (sum, item) => sum + (item.amount ?? item.totalPrice ?? 0),
    0
  );
  const foodSubtotal = foodItems.reduce(
    (sum, item) => sum + (item.amount ?? item.totalPrice ?? 0),
    0
  );

  // Get hours from booking for display purposes
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const diffMs = checkOut - checkIn;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Extension charges (placeholder for future feature)
  const extensionSubtotal = 0;

  // Calculate total from actual billing records
  const totalAmount = roomSubtotal + foodSubtotal + extensionSubtotal;

  return {
    referenceNumber: booking.referenceNumber,
    customerName: booking.customerName,
    roomNumber: roomNumber || '',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    paymentStatus: booking.paymentStatus || 'pending',
    breakdown: {
      roomCharges: {
        hours,
        pricePerHour: roomSubtotal > 0 ? roomSubtotal / hours : 0,
        subtotal: roomSubtotal,
        description: roomChargeRecords.length > 0
          ? roomChargeRecords[0].description
          : `Room booking charge for ${roomNumber} (${hours} hours)`
      },
      foodCharges: {
        items: foodItems.map((item) => ({
          description: item.description || (item.items?.length > 0 ? `Food order (${item.items.length} items)` : 'Food order'),
          amount: item.amount ?? item.totalPrice ?? 0,
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

  // Collect unique booking IDs (exclude completed/checked-out bookings)
  const activeBookingIds = new Set();
  (docs || []).forEach((d) => {
    const booking = d.booking;
    if (!booking) return;

    // Exclude completed bookings (checked-out bookings)
    if (booking.status === 'completed') return;

    const co = booking.checkOut ? new Date(booking.checkOut) : null;
    // Only show bills if checkout date is in the future or today
    if (co && !isNaN(co) && co < today) return;

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