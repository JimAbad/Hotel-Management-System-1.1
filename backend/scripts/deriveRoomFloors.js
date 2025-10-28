const connectDB = require('../config/db');
const Room = require('../models/roomModel');

const deriveFloorFromRoomNumber = (rn) => {
  if (!rn) return null;
  const num = parseInt(String(rn), 10);
  if (isNaN(num)) return null;
  const floor = Math.floor(num / 100);
  return floor > 0 ? floor : null;
};

(async () => {
  try {
    await connectDB();
    const rooms = await Room.find({});
    let updated = 0;
    let skipped = 0;

    for (const room of rooms) {
      const derived = deriveFloorFromRoomNumber(room.roomNumber);
      if (derived != null && room.floor !== derived) {
        room.floor = derived;
        await room.save();
        updated++;
        console.log(`Updated room ${room.roomNumber}: floor -> ${derived}`);
      } else {
        skipped++;
      }
    }

    console.log(`Done. Updated ${updated} rooms, skipped ${skipped}.`);
    process.exit(0);
  } catch (err) {
    console.error('Error deriving floors:', err);
    process.exit(1);
  }
})();