const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const EmailVerification = require('../models/EmailVerification');
const sendEmail = require('../utils/sendEmail');

// Helper to create and store a verification code
exports.sendVerificationCode = async (req, res) => {
  const { email, username, purpose = 'register' } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    // Prevent sending code if email/username already taken for register purpose
    if (purpose === 'register') {
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return res.status(400).json({ msg: 'Email already exists' });
      }
      if (username) {
        const existingByUsername = await User.findOne({ username });
        if (existingByUsername) {
          return res.status(400).json({ msg: 'Username already exists' });
        }
      }
    }

    // Generate a 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert record for this email/purpose
    await EmailVerification.findOneAndUpdate(
      { email, purpose },
      { email, purpose, codeHash, expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send email with the code (gracefully skip in dev if disabled)
    const emailDisabled = process.env.DISABLE_EMAIL_SEND === 'true';
    if (!emailDisabled) {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;padding:16px;color:#333">
            <h2 style="color:#b99a00;margin-bottom:8px">Your Verification Code</h2>
            <p>Use the following code to complete your signup:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:2px">${code}</p>
            <p>This code expires in 10 minutes.</p>
            <p style="margin-top:16px;color:#666">If you didn't request this, you can ignore this email.</p>
          </div>`;
        await sendEmail({
          to: email,
          subject: 'Lumine Hotel - Verify your email',
          text: `Your verification code is ${code}. It expires in 10 minutes.`,
          html,
        });
      } catch (mailError) {
        console.error('Email send failed:', mailError);
        // Always allow verification flow to continue even if email delivery fails
        console.warn('Proceeding without email delivery. Ensure email provider credentials are configured.');
      }
    } else {
      console.warn(`[EmailVerification] Email sending disabled. Code for ${email}: ${code}`);
    }

    console.log(`[EmailVerification] Code for ${email}: ${code}`);
    const payload = { msg: 'Verification code sent' };
    if (emailDisabled) payload.mailDisabled = true;
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error in sendVerificationCode:', error);
    return res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

exports.registerUser = async (req, res) => {
  const { fullName, email, username, password, role, jobTitle, contactNumber, code } = req.body;

  try {
    // Validate required fields
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields: fullName, email, username, password' });
    }
    if (!code) {
      return res.status(400).json({ msg: 'Verification code is required' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Username already exists' });
    }

    user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Email already exists' });
    }
    // Validate verification code
    const record = await EmailVerification.findOne({ email, purpose: 'register' });
    if (!record) {
      return res.status(400).json({ msg: 'No verification code found. Please request a new code.' });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ msg: 'Verification code has expired. Please request a new code.' });
    }
    const attempts = (record.attempts || 0) + 1;
    const isMatchCode = await bcrypt.compare(code.toString(), record.codeHash);
    if (!isMatchCode) {
      await EmailVerification.updateOne({ _id: record._id }, { attempts });
      return res.status(400).json({ msg: 'Invalid verification code' });
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

    // Clean up verification record on success
    await EmailVerification.deleteMany({ email, purpose: 'register' });

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