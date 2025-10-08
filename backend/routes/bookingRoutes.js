const express = require('express');
const { createBooking, getAllBookings, getBookingById, updateBookingStatus, updatePaymentStatus, generatePaymentQrCode, getMyBookings, cancelBooking, deleteCancelledBookings } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Public routes
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.delete('/user-cancel/:id', cancelBooking);

// Admin routes
router.get('/', authorize(['admin']), getAllBookings);
router.get('/:id', authorize(['admin']), getBookingById);
router.put('/:id', authorize(['admin']), updateBookingStatus);
router.put('/:id/payment-status', authorize(['admin']), updatePaymentStatus);
router.post('/generate-qr', authorize(['admin']), generatePaymentQrCode);
router.delete('/:id', authorize(['admin']), cancelBooking);
router.delete('/cancelled', authorize(['admin']), deleteCancelledBookings);

module.exports = router;