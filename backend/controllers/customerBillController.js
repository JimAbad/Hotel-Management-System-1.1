const asyncHandler = require('../middleware/async');
const Billing = require('../models/Billing');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');

exports.getAllCustomerBills = asyncHandler(async (req, res) => {
  // Enrich bills with booking details needed by admin UI
  const docs = await Billing.find({})
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status'
    })
    .lean();
  // Exclude bills tied to bookings whose check-out date has passed and unpaid pending bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeBills = (docs || []).filter((d) => {
    const co = d?.booking?.checkOut ? new Date(d.booking.checkOut) : null;
    // Exclude if missing or past check-out
    if (!co || isNaN(co)) return false;
    // Exclude unpaid pending bookings, but show paid pending bookings
    if (d?.booking?.status === 'pending' && d?.booking?.paymentStatus === 'pending') return false;
    return co >= today;
  });
  // Sort by most recent check-out first
  activeBills.sort((a, b) => {
    const aDate = a?.booking?.checkOut ? new Date(a.booking.checkOut) : null;
    const bDate = b?.booking?.checkOut ? new Date(b.booking.checkOut) : null;
    const aTs = aDate && !isNaN(aDate) ? aDate.getTime() : -Infinity;
    const bTs = bDate && !isNaN(bDate) ? bDate.getTime() : -Infinity;
    return bTs - aTs;
  });
  res.status(200).json({ success: true, count: activeBills.length, bills: activeBills });
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

  // Fetch booking with room details
  const booking = await Booking.findById(bookingId).populate('room').lean();
  if (!booking) {
    return res.status(404).json({ success: true, message: 'Booking not found' });
  }

  // Fetch all billing records for this booking
  const billingRecords = await Billing.find({ booking: bookingId }).lean();

  // Calculate room charges
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const diffMs = checkOut - checkIn;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Get room price (handle Economy room special pricing)
  const roomPrice = booking.room?.roomType === 'Economy' ? 59.523 : (booking.room?.price || 0);
  const roomSubtotal = hours * roomPrice;

  // Separate food charges from billing records
  const foodItems = billingRecords.filter(b =>
    b.description && !b.description.includes('Room booking charge')
  );
  const foodSubtotal = foodItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Extension charges (placeholder for future feature)
  const extensionSubtotal = 0;

  // Calculate total
  const totalAmount = roomSubtotal + foodSubtotal + extensionSubtotal;

  // Build response
  const breakdown = {
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
        items: foodItems.map(item => ({
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

  res.status(200).json({ success: true, data: breakdown });
});