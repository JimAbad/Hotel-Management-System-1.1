const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const Billing = require('../models/Billing');
const BookingActivity = require('../models/bookingActivityModel');

/**
 * Checks for bookings past checkout time and updates their status to 'time to check-out'
 * The booking will only be marked as 'completed' when admin manually checks out the guest
 * Room status remains occupied until admin performs the checkout
 */
const processExpiredBookings = async () => {
  try {
    console.log('Starting checkout time check...');

    const currentDateTime = new Date();

    // Find all active bookings where checkout date/time has passed (excluding already marked ones)
    const bookingsPastCheckout = await Booking.find({
      status: { $nin: ['cancelled', 'completed', 'time to check-out'] },
      checkOut: { $lt: currentDateTime }
    }).populate('room');

    console.log(`Found ${bookingsPastCheckout.length} bookings past checkout time to process`);

    let processedCount = 0;

    for (const booking of bookingsPastCheckout) {
      try {
        // Update booking status to 'time to check-out' instead of 'completed'
        // Admin will manually check out the guest when they leave
        booking.status = 'time to check-out';
        await booking.save();

        // Create booking activity record
        await BookingActivity.create({
          booking: booking._id,
          activity: 'Checkout time has passed - awaiting admin checkout',
          status: 'pending'
        });

        // DO NOT update billing status or room status here
        // These will be updated when admin manually checks out the booking

        processedCount++;
        console.log(`Updated booking ${booking.referenceNumber} to 'time to check-out' for room ${booking.roomNumber}`);

      } catch (error) {
        console.error(`Error processing booking ${booking.referenceNumber}:`, error);
      }
    }

    console.log(`Checkout time check completed. Updated ${processedCount} bookings to 'time to check-out'.`);
    return { processedBookings: processedCount, updatedRooms: 0 };

  } catch (error) {
    console.error('Error processing bookings past checkout:', error);
    throw error;
  }
};

/**
 * Scheduled job to run expired booking checks periodically
 */
const startBookingExpirationUpdater = () => {
  // Run every 30 minutes
  const INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

  console.log('Starting booking expiration updater service...');

  // Run immediately on startup
  processExpiredBookings().catch(console.error);

  // Schedule periodic updates
  setInterval(() => {
    processExpiredBookings().catch(console.error);
  }, INTERVAL);

  console.log(`Booking expiration updater scheduled to run every ${INTERVAL / (60 * 1000)} minutes`);
};

/**
 * Manual trigger for expired booking processing (for admin use)
 */
const triggerExpiredBookingCheck = async () => {
  console.log('Manual trigger for expired booking check initiated...');
  return await processExpiredBookings();
};

module.exports = {
  processExpiredBookings,
  startBookingExpirationUpdater,
  triggerExpiredBookingCheck
};