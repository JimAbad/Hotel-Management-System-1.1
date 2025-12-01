const mongoose = require('mongoose');
const path = require('path');

// Force load ONLY backend/.env
const envPath = path.join(__dirname, '../.env');
console.log('[DB] Loading env from', envPath);
require('dotenv').config({ path: envPath });

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  console.log('[DB] Effective MONGO_URI:', uri);

  if (!uri) {
    throw new Error('MONGO_URI is not set. Add it to backend/.env');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err && err.message);
    console.error('[MongoDB] MONGO_URI used:', uri);
    console.error(
      '[MongoDB] Ensure your MongoDB Atlas URI is correct and your IP is allowed in Network Access.'
    );
    throw err;
  }
};

module.exports = connectDB;
