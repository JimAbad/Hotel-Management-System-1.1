const express = require('express');
const router = express.Router();

const bills = require('../controllers/customerBillController');
const auth = require('../middleware/authMiddleware');

// middlewares (support either authorize('admin') or admin)
const protect = auth.protect || auth.authProtect;
const requireAdmin = typeof auth.authorize === 'function' ? auth.authorize(['admin']) : auth.admin;

if (!protect) throw new Error('protect/authProtect middleware is missing in authMiddleware.js');
if (!requireAdmin) throw new Error('authorize(["admin"]) or admin middleware is missing in authMiddleware.js');

// list all customer bills
router.get('/', protect, requireAdmin, bills.getAllCustomerBills);

// get single bill by bookingId
router.get('/:bookingId', protect, requireAdmin, bills.getCustomerBill);

module.exports = router;