const express = require('express');
const router = express.Router();
const { createReview, getReviews, getReviewById, updateReview, deleteReview, getMyReviews, getPublicReviews, getBookingsToReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createReview)
  .get(protect, getReviews);

router.get('/myreviews', protect, getMyReviews); // User's submitted reviews
router.get('/pending', protect, getBookingsToReview); // Checked-out bookings awaiting review

// Public reviews (read-only)
router.get('/public', getPublicReviews);

router.route('/:id')
  .get(protect, getReviewById)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;
