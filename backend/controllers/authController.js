const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

exports.registerUser = async (req, res) => {
  const { fullName, email, username, password, role, jobTitle, contactNumber } = req.body;

  try {
    // Validate required fields
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields: fullName, email, username, password' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Username already exists' });
    }

    user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Email already exists' });
    }

    user = new User({
      fullName,
      email,
      username,
      password,
      role: role || 'user',
      jobTitle: jobTitle || '',
      contactNumber: contactNumber || '',
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      contactNumber: user.contactNumber,
      token,
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    
    if (error.code === 11000) {
      // Duplicate key error (e.g., unique email constraint)
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ msg: `${field} already exists` });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ msg: messages.join(', ') });
    }
    
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });

    if (!user) {
      // If not found by username, try finding by email
      user = await User.findOne({ email: username });
    }

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      contactNumber: user.contactNumber,
      token,
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.checkUser = async (req, res) => {
  const { email, username } = req.query;

  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    }
    if (!user && username) {
      user = await User.findOne({ username });
    }

    if (user) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error in checkUser:', error);
    res.status(500).send('Internal Server Error');
  }
};