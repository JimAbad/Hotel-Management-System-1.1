const connectDB = require('./config/db');
const Room = require('./models/Room');

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
for (const t of TYPES) {
  for (let i = 1; i <= 6; i++) {
    roomsData.push({
      roomNumber: `${t.type[0]}-${100 + i}`,
      roomType: t.type,
      price: t.price,
      amenities: t.amenities,
      description: t.description,
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
      const existingRoom = await Room.findOne({ roomNumber: room.roomNumber });
      if (!existingRoom) {
        await Room.create(room);
        console.log(`Room ${room.roomNumber} added.`);
      } else {
        console.log(`Room ${room.roomNumber} already exists, skipping.`);
      }
    } catch (error) {
      console.error(`Error adding room ${room.roomNumber}:`, error.message);
    }
  }
  console.log('All rooms processed.');
  process.exit(0);
};

addRooms();