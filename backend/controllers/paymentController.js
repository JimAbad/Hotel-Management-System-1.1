const Booking = require('../models/bookingModel');

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId, paymentDetails } = req.body;

    // Find the booking and update its payment status
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.paymentStatus = 'paid'; // Assuming a paymentStatus field in Booking model
    booking.paymentDetails = paymentDetails; // Save payment details
    await booking.save();

    res.status(200).json({ message: 'Payment confirmed successfully', booking });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllBillings = async (req, res) => {
  console.log('getAllBillings function reached');
  try {
    const billings = await Booking.find({ user: req.user.id, paymentStatus: 'paid' }).populate('room');
    res.status(200).json(billings);
  } catch (error) {
    console.error('Error fetching billings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};