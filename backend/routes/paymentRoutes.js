const express = require('express');
const router = express.Router();
const { confirmPayment, getAllBillings, createPaymentIntent, getPayMongoPaymentDetails, createPaymentMethod, createEWalletPaymentSource } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-payment-intent', createPaymentIntent);
router.post('/create-payment-method', protect, createPaymentMethod);
router.post('/create-ewallet-payment-source', protect, createEWalletPaymentSource);
router.post('/confirm', confirmPayment);
router.get('/my-billings', protect, getAllBillings);
router.get('/paymongo-details/:bookingId', protect, getPayMongoPaymentDetails);

module.exports = router;