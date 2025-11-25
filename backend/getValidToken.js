const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

const getValidToken = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find a user
    const user = await User.findOne({});
    if (!user) {
      console.log('No users found in database');
      return;
    }
    
    console.log('Found user:', user.username, user._id.toString());
    
    // Generate a token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    
    console.log('Generated token:', token);
    console.log('User ID:', user._id.toString());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

getValidToken();