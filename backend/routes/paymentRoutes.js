const express = require('express');
const router = express.Router();
const { confirmPayment, getAllBillings } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/confirm', confirmPayment);
router.get('/my-billings', protect, getAllBillings);

module.exports = router;