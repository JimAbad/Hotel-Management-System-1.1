const asyncHandler = require('../middleware/async');
const Billing = require('../models/Billing');

exports.getAllCustomerBills = asyncHandler(async (req, res) => {
  const docs = await Billing.find({}).lean();
  res.status(200).json({ success: true, count: docs.length, bills: docs });
});

exports.getCustomerBill = asyncHandler(async (req, res) => {
  const bill = await Billing.findOne({ bookingId: req.params.bookingId }).lean();
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
  res.status(200).json({ success: true, bill });
});