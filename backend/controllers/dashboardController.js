const asyncHandler = require('express-async-handler');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private/Admin
const getDashboardData = asyncHandler(async (req, res) => {
  // Total Bookings
  const totalBookings = await Booking.countDocuments();

  // Available Rooms
  const availableRooms = await Room.countDocuments({ status: 'available' });
  const totalRooms = await Room.countDocuments();

  // Occupancy Rate
  const occupancyRate = totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms) * 100 : 0;

  // Pending Payments
  const pendingPayments = await Booking.countDocuments({ paymentStatus: 'pending' });

  // Booking Trend - Last 5 Weeks
  const bookingTrend = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 35)) }, // Last 5 weeks
      },
    },
    {
      $group: {
        _id: { $week: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id": 1 },
    },
  ]);

  // Occupancy by Room Type
  const occupancyByRoomType = await Room.aggregate([
    {
      $group: {
        _id: "$roomType",
        total: { $sum: 1 },
        available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        type: "$_id",
        total: 1,
        available: 1,
        occupied: { $subtract: ["$total", "$available"] },
      },
    },
  ]);

  // Reviews - this Month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  const reviewsThisMonth = await Review.find({
    createdAt: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
  });

  const totalReviewsThisMonth = reviewsThisMonth.length;
  const newFeedbacksThisMonth = reviewsThisMonth.filter(review => review.detailedFeedback && review.detailedFeedback.length > 0).length;
  const averageRatingThisMonth = totalReviewsThisMonth > 0 ? reviewsThisMonth.reduce((acc, review) => acc + review.overallRating, 0) / totalReviewsThisMonth : 0;

  res.json({
    totalBookings,
    occupancyRate: occupancyRate.toFixed(2),
    availableRooms,
    pendingPayments,
    bookingTrend,
    occupancyByRoomType,
    reviews: {
      averageRating: averageRatingThisMonth.toFixed(1),
      newReviews: totalReviewsThisMonth,
      feedbacks: newFeedbacksThisMonth,
    },
  });
});

module.exports = {
  getDashboardData,
};