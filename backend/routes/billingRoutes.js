const express = require('express');
const {
  createBilling,
  getBillings,
  getBilling,
  updateBilling,
  deleteBilling,
  getBookingBillings,
  getAdminBillings,
  getRoomBillings,
  getUserBillingSummary
} = require('../controllers/billingController');

const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// User routes
router.route('/')
  .get(getBillings)
  .post(createBilling);

router.route('/summary')
  .get(getUserBillingSummary);

router.route('/room/:roomNumber')
  .get(getRoomBillings);

router.route('/booking/:bookingId')
  .get(getBookingBillings);

router.route('/:id')
  .get(getBilling)
  .put(updateBilling)
  .delete(deleteBilling);

// Admin routes
router.route('/admin')
  .get(authorize('admin'), getAdminBillings);

module.exports = router;