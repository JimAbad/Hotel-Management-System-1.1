const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Booking = require('../models/bookingModel');

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

// @desc    Get all reviews (public view)
// @route   GET /api/reviews/public
// @access  Public
const getPublicReviews = asyncHandler(async (req, res) => {
  const list = await Review.find({}).populate('customer', 'name fullName');
  const mapped = list.map((r) => ({
    _id: r._id,
    customerName: (r.customer && (r.customer.fullName || r.customer.name)) || 'Anonymous',
    createdAt: r.createdAt,
    overallRating: r.overallRating,
    serviceQuality: r.serviceQuality,
    roomQuality: r.roomQuality,
    detailedFeedback: r.detailedFeedback || '',
  }));
  res.json({ success: true, data: mapped });
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

// @desc    Get checked-out bookings that haven't been reviewed yet
// @route   GET /api/reviews/pending
// @access  Private
const getBookingsToReview = asyncHandler(async (req, res) => {
  // 1. Find all completed bookings for this user
  const completedBookings = await Booking.find({
    user: req.user._id,
    status: 'completed'
  }).populate('room');

  // 2. Find all reviews by this user to know which bookings were already reviewed
  const existingReviews = await Review.find({ customer: req.user._id });
  const reviewedBookingIds = existingReviews.map(r => String(r.booking));

  // 3. Filter out bookings that already have reviews
  const pendingBookings = completedBookings.filter(
    b => !reviewedBookingIds.includes(String(b._id))
  );

  // 4. Return bookings with relevant info for the review form
  const result = pendingBookings.map(b => ({
    _id: b._id,
    referenceNumber: b.referenceNumber,
    roomNumber: b.roomNumber,
    roomType: b.roomType || b.room?.roomType || '-',
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    customerName: b.customerName,
    createdAt: b.createdAt
  }));

  res.json(result);
});

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getMyReviews,
  getPublicReviews,
  getBookingsToReview,
};
