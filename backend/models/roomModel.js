const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true
  },
  floor: {
    type: Number,
    required: true
  },
  roomType: {
    type: String,
    required: true,
    enum: ['Presidential', 'Deluxe', 'Suite', 'Economy']
  },
  price: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  amenities: [{
    type: String
  }],
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'checked-out'],
    default: 'available'
  }
}, {
  timestamps: true
});

// Derive floor from roomNumber automatically
const deriveFloorFromRoomNumber = (rn) => {
  if (!rn) return null;
  const num = parseInt(String(rn), 10);
  if (isNaN(num)) return null;
  const floor = Math.floor(num / 100);
  return floor > 0 ? floor : null;
};

roomSchema.pre('save', function (next) {
  const derived = deriveFloorFromRoomNumber(this.roomNumber);
  if (derived != null) {
    this.floor = derived;
  }
  next();
});

roomSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && Object.prototype.hasOwnProperty.call(update, 'roomNumber')) {
    const derived = deriveFloorFromRoomNumber(update.roomNumber);
    if (derived != null) {
      update.floor = derived;
      this.setUpdate(update);
    }
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);