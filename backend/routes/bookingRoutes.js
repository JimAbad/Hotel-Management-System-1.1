const express = require('express');
const { createBooking, getAllBookings, getBookingById, updateBookingStatus, updatePaymentStatus, generatePaymentQrCode, getMyBookings, cancelBooking, deleteCancelledBookings, checkExpiredBookings } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();


// Protect all routes after this point
router.use(protect);

// User routes
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.delete('/user-cancelled', authorize(['user']), deleteCancelledBookings);
router.post('/user-cancel/:id', cancelBooking);

// Admin routes
router.delete('/cancelled', authorize(['admin']), deleteCancelledBookings);
router.post('/check-expired', authorize(['admin']), checkExpiredBookings);
router.get('/', authorize(['admin']), getAllBookings);
router.get('/:id', authorize(['admin']), getBookingById);
router.put('/:id', authorize(['admin']), updateBookingStatus);
router.put('/:id/payment-status', authorize(['admin']), updatePaymentStatus);
router.post('/generate-qr', authorize(['admin']), generatePaymentQrCode);
router.delete('/:id', authorize(['admin']), cancelBooking);

module.exports = router;