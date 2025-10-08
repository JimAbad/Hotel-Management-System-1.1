const express = require('express');
const router = express.Router();
const { createReview, getReviews, getReviewById, updateReview, deleteReview, getMyReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createReview)
  .get(protect, getReviews);

router.get('/myreviews', protect, getMyReviews); // New route for user-specific reviews

router.route('/:id')
  .get(protect, getReviewById)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;