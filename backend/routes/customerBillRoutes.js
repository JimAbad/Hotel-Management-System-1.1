const express = require('express');
const router = express.Router();

const { getCustomerBill } = require('../controllers/customerBillController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/customer-bills/:bookingId  (admin only)
router.get('/:bookingId', protect, authorize(['admin']), getCustomerBill);

module.exports = router;