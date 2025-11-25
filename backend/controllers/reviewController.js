const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
  const { booking, customer, roomNumber, overallRating, serviceQuality, roomQuality, detailedFeedback } = req.body;

  const review = new Review({
    booking,
    customer,
    roomNumber,
    overallRating,
    serviceQuality,
    roomQuality,
    detailedFeedback,
  });

  const createdReview = await review.save();
  res.status(201).json(createdReview);
});

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Private
const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({}).populate('booking').populate('customer');
  res.json(reviews);
});

// @desc    Get reviews for the logged-in user
// @route   GET /api/reviews/myreviews
// @access  Private
const getMyReviews = asyncHandler(async (req, res) => {
  console.log('req.user in getMyReviews:', req.user);
  console.log('req.user._id in getMyReviews:', req.user._id);
  const reviews = await Review.find({ customer: req.user._id })
    .populate('booking')
    .populate('customer');
  res.json(reviews);
});

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Private
const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate('booking').populate('customer');

  if (review) {
    res.json(review);
  } else {
    res.status(404);
    throw new Error('Review not found');
  }
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
  const { overallRating, serviceQuality, roomQuality, detailedFeedback } = req.body;

  const review = await Review.findById(req.params.id);

  if (review) {
    review.overallRating = overallRating || review.overallRating;
    review.serviceQuality = serviceQuality || review.serviceQuality;
    review.roomQuality = roomQuality || review.roomQuality;
    review.detailedFeedback = detailedFeedback || review.detailedFeedback;

    const updatedReview = await review.save();
    res.json(updatedReview);
  } else {
    res.status(404);
    throw new Error('Review not found');
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (review) {
    await review.deleteOne();
    res.json({ message: 'Review removed' });
  } else {
    res.status(404);
    throw new Error('Review not found');
  }
});

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getMyReviews, // Export the new function
};