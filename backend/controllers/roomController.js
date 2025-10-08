const Room = require('../models/roomModel');

exports.getAllRooms = async (req, res) => {
  try {
    const { page = 1, limit = 8, rating, roomType, date, availableOnly } = req.query;
    const query = {};

    if (rating) {
      query.rating = { $gte: parseInt(rating) };
    }
    if (roomType) {
      query.roomType = roomType;
    }
    if (availableOnly === 'true') {
      query.isBooked = false;
    }
    if (date) {
      // Assuming 'date' filter is for availability, needs more complex logic
      // For now, we'll just ignore it or add a placeholder
    }

    const skip = (page - 1) * limit;
    const rooms = await Room.find(query).skip(skip).limit(parseInt(limit));
    const totalRooms = await Room.countDocuments(query);

    res.status(200).json({ rooms, totalRooms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRoom = async (req, res) => {
  const room = new Room({
    roomNumber: req.body.roomNumber,
    type: req.body.type,
    price: req.body.price,
  });
  try {
    const newRoom = await room.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createMultipleRooms = async (req, res) => {
  try {
    const roomsData = req.body;
    if (!Array.isArray(roomsData)) {
      return res.status(400).json({ message: "Request body must be an array of room objects." });
    }
    const newRooms = await Room.insertMany(roomsData);
    res.status(201).json(newRooms);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (req.body.roomNumber != null) {
      room.roomNumber = req.body.roomNumber;
    }
    if (req.body.roomType != null) { // Changed from type to roomType
      room.roomType = req.body.roomType;
    }
    if (req.body.price != null) {
      room.price = req.body.price;
    }
    if (req.body.isBooked != null) {
      room.isBooked = req.body.isBooked;
    }
    if (req.body.amenities != null) {
      room.amenities = req.body.amenities;
    }
    if (req.body.description != null) {
      room.description = req.body.description;
    }
    const updatedRoom = await room.save();
    res.status(200).json(updatedRoom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    await room.deleteOne(); // Changed from remove() to deleteOne()
    res.status(200).json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAllRooms = async (req, res) => {
  try {
    await Room.deleteMany({});
    res.status(200).json({ message: 'All rooms deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// New: Room type availability summary
exports.getRoomTypeSummary = async (req, res) => {
  try {
    const summary = await Room.aggregate([
      {
        $group: {
          _id: "$roomType",
          total: { $sum: 1 },
          available: { $sum: { $cond: ["$isBooked", 0, 1] } },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          total: 1,
          available: 1,
        },
      },
    ]);
    return res.json({ summary });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getRoomDetailsByType = async (req, res) => {
  try {
    const { roomType } = req.params;
    const room = await Room.findOne({ type: roomType }); // Find one room by roomType
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};