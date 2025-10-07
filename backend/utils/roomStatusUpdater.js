const Room = require('../models/roomModel');
const Booking = require('../models/bookingModel');

/**
 * Updates room status based on active bookings
 * This function checks all rooms marked as 'occupied' and updates their status
 * to 'available' if they have no active bookings
 */
const updateRoomStatuses = async () => {
  try {
    console.log('Starting room status update...');
    
    // Find all rooms marked as occupied
    const occupiedRooms = await Room.find({ status: 'occupied' });
    console.log(`Found ${occupiedRooms.length} rooms marked as occupied`);
    
    let updatedCount = 0;
    
    for (const room of occupiedRooms) {
      // Check for active bookings
      const activeBooking = await Booking.findOne({
        room: room._id,
        status: { $nin: ['cancelled', 'completed'] },
        checkOut: { $gte: new Date() },
      });
      
      if (!activeBooking) {
        // No active booking found, update status to available
        room.status = 'available';
        await room.save();
        updatedCount++;
        console.log(`Updated room ${room.roomNumber} status from occupied to available`);
      }
    }
    
    console.log(`Room status update completed. Updated ${updatedCount} rooms.`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating room statuses:', error);
    throw error;
  }
};

/**
 * Scheduled job to run room status updates periodically
 */
const startRoomStatusUpdater = () => {
  // Run every hour
  const INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  console.log('Starting room status updater service...');
  
  // Run immediately on startup
  updateRoomStatuses().catch(console.error);
  
  // Schedule periodic updates
  setInterval(() => {
    updateRoomStatuses().catch(console.error);
  }, INTERVAL);
  
  console.log(`Room status updater scheduled to run every ${INTERVAL / (60 * 1000)} minutes`);
};

module.exports = {
  updateRoomStatuses,
  startRoomStatusUpdater
};