const asyncHandler = require('../middleware/async');
const Billing = require('../models/Billing');

exports.getAllCustomerBills = asyncHandler(async (req, res) => {
  // Enrich bills with booking details needed by admin UI
  const docs = await Billing.find({})
    .populate({
      path: 'booking',
      select: 'referenceNumber customerName checkOut roomNumber status'
    })
    .lean();
  // Exclude bills tied to bookings whose check-out date has passed and draft bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeBills = (docs || []).filter((d) => {
    const co = d?.booking?.checkOut ? new Date(d.booking.checkOut) : null;
    // Exclude if missing or past check-out, or if booking is draft
    if (!co || isNaN(co) || d?.booking?.status === 'draft') return false;
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
  
  // Don't return bills for draft bookings
  if (bill.booking?.status === 'draft') {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }
  
  res.status(200).json({ success: true, bill });
});