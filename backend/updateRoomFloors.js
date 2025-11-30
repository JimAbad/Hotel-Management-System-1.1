require('dotenv').config();
const connectDB = require('./config/db');
const Room = require('./models/roomModel');

const updateRoomFloors = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Update Deluxe rooms from floor 2 to floor 4 (200s to 400s)
    const deluxeRooms = await Room.find({ roomType: 'Deluxe', floor: 2 });
    console.log(`Found ${deluxeRooms.length} Deluxe rooms on floor 2 to update`);
    
    for (const room of deluxeRooms) {
      const oldRoomNumber = room.roomNumber;
      const roomIndex = oldRoomNumber.toString().slice(-2); // Get last 2 digits
      const newRoomNumber = `4${roomIndex}`; // Change to floor 4
      
      await Room.findByIdAndUpdate(room._id, {
        roomNumber: newRoomNumber,
        floor: 4
      });
      
      console.log(`Updated Deluxe room ${oldRoomNumber} to ${newRoomNumber} (floor 4)`);
    }

    // Update Economy rooms from floor 4 to floor 2 (400s to 200s)
    const economyRooms = await Room.find({ roomType: 'Economy', floor: 4 });
    console.log(`Found ${economyRooms.length} Economy rooms on floor 4 to update`);
    
    for (const room of economyRooms) {
      const oldRoomNumber = room.roomNumber;
      const roomIndex = oldRoomNumber.toString().slice(-2); // Get last 2 digits
      const newRoomNumber = `2${roomIndex}`; // Change to floor 2
      
      await Room.findByIdAndUpdate(room._id, {
        roomNumber: newRoomNumber,
        floor: 2
      });
      
      console.log(`Updated Economy room ${oldRoomNumber} to ${newRoomNumber} (floor 2)`);
    }

    console.log('Room floor updates completed successfully!');
    
    // Verify the updates
    const deluxeCount = await Room.countDocuments({ roomType: 'Deluxe', floor: 4 });
    const economyCount = await Room.countDocuments({ roomType: 'Economy', floor: 2 });
    
    console.log(`\nVerification:`);
    console.log(`Deluxe rooms on floor 4: ${deluxeCount}`);
    console.log(`Economy rooms on floor 2: ${economyCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating room floors:', error);
    process.exit(1);
  }
};

updateRoomFloors();