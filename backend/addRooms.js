const connectDB = require('./config/db');
const Room = require('./models/roomModel');

const TYPES = [
  {
    type: 'Presidential',
    price: 500,
    amenities: ['Restaurant', 'Swimming Pool', 'Fitness Center', 'Parking', 'Garden', 'Playground'],
    description: 'Grand presidential suite with premium amenities.',
  },
  {
    type: 'Deluxe',
    price: 300,
    amenities: ['Restaurant', 'Swimming Pool', 'Fitness Center', 'Parking', 'Garden', 'Playground'],
    description: 'Spacious deluxe room with balcony.',
  },
  {
    type: 'Suite',
    price: 250,
    amenities: ['Restaurant', 'Swimming Pool', 'Fitness Center', 'Parking', 'Garden', 'Playground'],
    description: 'Luxurious suite with jacuzzi.',
  },
  {
    type: 'Economy',
    price: 120,
    amenities: ['Restaurant', 'Swimming Pool', 'Fitness Center', 'Parking', 'Garden', 'Playground'],
    description: 'Cozy economy room.',
  },
];

const roomsData = [];
let roomCounter = {};

for (const t of TYPES) {
  let floor;
  switch (t.type) {
    case 'Presidential':
      floor = 1;
      break;
    case 'Deluxe':
      floor = 2;
      break;
    case 'Suite':
      floor = 3;
      break;
    case 'Economy':
      floor = 4;
      break;
    default:
      floor = 1; // Default floor
  }

  roomCounter[t.type] = 0;
  for (let i = 1; i <= 6; i++) {
    roomCounter[t.type]++;
    const roomNumber = parseInt(`${floor}${String(roomCounter[t.type]).padStart(2, '0')}`);
    roomsData.push({
      roomNumber: roomNumber,
      roomType: t.type,
      price: t.price,
      amenities: t.amenities,
      description: t.description,
      floor: floor,
      capacity: t.type === 'Presidential' ? 4 : t.type === 'Deluxe' ? 3 : t.type === 'Suite' ? 2 : 1,
    });
  }
}

const addRooms = async () => {
  await connectDB();

  // Delete all existing rooms before adding new ones
  await Room.deleteMany({});
  console.log("All existing rooms deleted.");

  for (const room of roomsData) {
    try {
      const existingRoom = await Room.findOne({ roomNumber: room.roomNumber, floor: room.floor });
      if (!existingRoom) {
        await Room.create(room);
        console.log(`Room ${room.roomNumber} (Floor: ${room.floor}) added.`);
      } else {
        console.log(`Room ${room.roomNumber} (Floor: ${room.floor}) already exists, skipping.`);
      }
    } catch (error) {
      console.error(`Error adding room ${room.roomNumber} (Floor: ${room.floor}):`, error.message);
    }
  }
  console.log('All rooms processed.');
  process.exit(0);
};

addRooms();