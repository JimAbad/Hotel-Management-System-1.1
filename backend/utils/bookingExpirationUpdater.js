const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const Billing = require('../models/Billing');
const BookingActivity = require('../models/bookingActivityModel');

/**
 * Checks for expired bookings and updates their status to completed
 * Also updates room status from occupied to available for expired bookings
 */
const processExpiredBookings = async () => {
  try {
    console.log('Starting expired bookings check...');
    
    const currentDateTime = new Date();
    
    // Find all active bookings where checkout date/time has passed
    const expiredBookings = await Booking.find({
      status: { $nin: ['cancelled', 'completed'] },
      checkOut: { $lt: currentDateTime }
    }).populate('room');
    
    console.log(`Found ${expiredBookings.length} expired bookings to process`);
    
    let processedCount = 0;
    let roomsUpdated = 0;
    
    for (const booking of expiredBookings) {
      try {
        // Update booking status to completed
        booking.status = 'completed';
        await booking.save();
        
        // Create booking activity record
        await BookingActivity.create({
          booking: booking._id,
          activity: 'Booking automatically completed - checkout time passed',
          status: 'completed'
        });
        
        // Update billing status to completed if it's still pending
        await Billing.updateMany(
          { 
            booking: booking._id,
            status: { $in: ['pending', 'partial'] }
          },
          { 
            status: 'paid',
            updatedAt: new Date()
          }
        );
        
        // Update room status to available if no other active PAID bookings exist
        if (booking.room) {
          const otherActiveBookings = await Booking.findOne({
            room: booking.room._id,
            _id: { $ne: booking._id },
            status: { $nin: ['cancelled', 'completed'] },
            checkOut: { $gte: currentDateTime },
            paymentStatus: { $in: ['paid', 'partial'] } // Only consider paid bookings
          });
          
          if (!otherActiveBookings) {
            const room = await Room.findById(booking.room._id);
            if (room && room.status === 'occupied') {
              room.status = 'available';
              await room.save();
              roomsUpdated++;
              console.log(`Updated room ${room.roomNumber} status from occupied to available`);
            }
          }
        }
        
        processedCount++;
        console.log(`Processed expired booking ${booking.referenceNumber} for room ${booking.roomNumber}`);
        
      } catch (error) {
        console.error(`Error processing expired booking ${booking.referenceNumber}:`, error);
      }
    }
    
    console.log(`Expired bookings processing completed. Processed ${processedCount} bookings, updated ${roomsUpdated} rooms.`);
    return { processedBookings: processedCount, updatedRooms: roomsUpdated };
    
  } catch (error) {
    console.error('Error processing expired bookings:', error);
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