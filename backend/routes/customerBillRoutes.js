const express = require('express');
const router = express.Router();
const { getCustomerBill } = require('../controllers/customerBillController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/:bookingId').get(protect, authorize(['admin']), getCustomerBill);

module.exports = router;