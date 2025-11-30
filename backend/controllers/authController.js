const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const VerificationCode = require('../models/VerificationCode');

exports.registerUser = async (req, res) => {
  const { fullName, email, username, password, role, jobTitle, contactNumber } = req.body;

  try {
    // Validate required fields
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields: fullName, email, username, password' });
    }

    // Check if username or email already exists
    let existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ msg: 'Username already exists' });
    }

    existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: 'Email already exists' });
    }

    const isAdmin = (role || 'user') === 'admin';
    let codeDoc = null;

    // Enforce pre-verification for non-admin accounts
    if (!isAdmin) {
      codeDoc = await VerificationCode.findOne({
        email,
        purpose: 'signup',
        verified: true,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!codeDoc) {
        return res.status(403).json({ msg: 'Please verify your email with the code sent before creating an account.' });
      }
    }

    // Create new user
    const user = new User({
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

    // Set emailVerified for admins or pre-verified users
    if (isAdmin) {
      user.emailVerified = true;
    } else {
      user.emailVerified = true; // pre-verified required, so mark as verified
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    await user.save();

    // Mark the verification code as used
    if (codeDoc) {
      codeDoc.used = true;
      await codeDoc.save();
    }

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      contactNumber: user.contactNumber,
      token,
      message: 'Registration successful.'
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    if (error.code === 11000) {
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

    // Require email verification for non-admin accounts
    if (user.role !== 'admin' && !user.emailVerified) {
      return res.status(403).json({ msg: 'Email not verified. Please check your inbox.' });
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
  console.log('=== CHECKUSER FUNCTION CALLED ===');
  console.log('Query params:', req.query);
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

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    if (!token) {
      return res.status(400).json({ msg: 'Missing token' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).json({ msg: 'Email verified successfully' });
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

// New: request signup verification code via email
exports.requestSignupVerificationCode = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim());
    if (!valid) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    // Disallow requesting code for existing accounts
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ msg: 'Email already exists' });
    }

    // Generate 6-digit code securely
    const code = (crypto.randomInt ? crypto.randomInt(100000, 1000000) : Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Optionally invalidate previous codes for this email
    await VerificationCode.updateMany({ email, purpose: 'signup', used: false }, { $set: { used: true } });

    await VerificationCode.create({ email, code, expiresAt, purpose: 'signup' });

    const subject = 'Your Lumine verification code';
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Lumine Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</div>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `;

    let delivery = 'smtp';
    try {
      await sendEmail({ to: email, subject, html, text: `Your verification code is ${code}. Expires in 10 minutes.` });
    } catch (sendErr) {
      console.warn('Email send failed, using mock fallback:', sendErr?.message);
      delivery = 'mock';
    }
    const includeCode = process.env.ALLOW_CODE_IN_RESPONSE === 'true';
    const payload = { msg: 'Verification code sent', delivery };
    if (includeCode) payload.debugCode = code;
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error in requestSignupVerificationCode:', error);
    if (error.message && error.message.includes('SENDGRID_API_KEY')) {
      return res.status(500).json({ msg: 'Email service not configured' });
    }
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

// New: verify signup verification code
exports.verifySignupCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    if (!email || !code) {
      return res.status(400).json({ msg: 'Email and code are required' });
    }

    // Get latest non-used code for this email
    const doc = await VerificationCode.findOne({ email, purpose: 'signup', used: false }).sort({ createdAt: -1 });
    if (!doc) {
      return res.status(400).json({ msg: 'No verification code found. Request a new code.' });
    }
    if (doc.expiresAt <= new Date()) {
      return res.status(400).json({ msg: 'Verification code expired. Request a new code.' });
    }
    if (doc.code !== code) {
      // Increment attempts for monitoring
      doc.attempts += 1;
      await doc.save();
      return res.status(400).json({ msg: 'Invalid verification code' });
    }

    // Mark verified (not used yet until registration succeeds)
    doc.verified = true;
    await doc.save();

    return res.status(200).json({ msg: 'Email verified. You may proceed with signup.' });
  } catch (error) {
    console.error('Error in verifySignupCode:', error);
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

// Forgot password: Step 1 - Send reset code
exports.forgotPassword = async (req, res) => {
  console.log('=== FORGOT PASSWORD FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  const rawEmail = req.body?.email ?? req.body?.to ?? req.query?.email ?? (typeof req.body === 'string' ? req.body : undefined);
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  console.log('forgotPassword called with email:', email);
  
  // DEBUG: Return debugging info in response
  const debugInfo = {
    functionCalled: true,
    requestBody: req.body,
    extractedEmail: email,
    rawEmail,
    emailType: typeof rawEmail,
    emailValue: email
  };
  
  try {
    if (!email) {
      return res.status(400).json({ msg: 'Email is required', debug: debugInfo });
    }

    // Basic email format validation
    const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!isValidEmail) {
      return res.status(400).json({ msg: 'Invalid email format', debug: debugInfo });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) {
      return res.status(404).json({ msg: 'No account found with this email address' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create verification code document
    const verificationCode = new VerificationCode({
      email,
      code,
      purpose: 'password-reset',
      expiresAt,
    });

    await verificationCode.save();

    // Send email with reset code
    const emailSubject = `${user.fullName} Verification`;
    const emailText = `Your verification code is:\n\n${code}\n\nThis code expires in 15 minutes.\n\nYour username is: ${user.username}\n\nIf you did not request this, you can ignore this email.`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center; margin-bottom: 30px;">${user.fullName} Verification</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 25px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 25px 0; border-radius: 8px; border: 2px solid #e0e0e0;">
          ${code}
        </div>
        <p style="font-size: 16px; margin: 20px 0;">This code expires in 15 minutes.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;"><strong>Your username is:</strong> ${user.username}</p>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">If you did not request this, you can ignore this email.</p>
      </div>
    `;

    console.log('Sending email with params:', { 
      to: email, 
      subject: emailSubject, 
      text: emailText ? 'Text content present' : 'No text content', 
      html: emailHtml ? 'HTML content present' : 'No HTML content' 
    });
    
    // DEBUG: Add email parameters to debug info
    debugInfo.emailParams = {
      to: email,
      subject: emailSubject,
      textPresent: !!emailText,
      htmlPresent: !!emailHtml
    };
    
    let delivery = 'smtp';
    try {
      await sendEmail({ to: email, subject: emailSubject, text: emailText, html: emailHtml });
    } catch (sendErr) {
      console.warn('Email send failed, using mock fallback:', sendErr?.message);
      delivery = 'mock';
    }
    const includeCode = process.env.ALLOW_CODE_IN_RESPONSE === 'true';
    const payload = { msg: 'Password reset code sent to your email', debug: debugInfo, delivery };
    if (includeCode) payload.debugCode = code;
    res.status(200).json(payload);
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    debugInfo.error = {
      message: error.message,
      stack: error.stack
    };
    res.status(500).json({ 
      msg: 'Internal Server Error', 
      error: error.message,
      debug: debugInfo 
    });
  }
};

// Forgot password: Step 2 - Verify reset code
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;
  
  try {
    if (!email || !code) {
      return res.status(400).json({ msg: 'Email and code are required' });
    }

    // Find the latest non-used code for this email
    const verificationCode = await VerificationCode.findOne({
      email,
      purpose: 'password-reset',
      used: false
    }).sort({ createdAt: -1 });

    if (!verificationCode) {
      return res.status(400).json({ msg: 'No reset code found. Please request a new one.' });
    }

    if (verificationCode.expiresAt <= new Date()) {
      return res.status(400).json({ msg: 'Reset code expired. Please request a new one.' });
    }

    if (verificationCode.code !== code) {
      // Increment attempts for monitoring
      verificationCode.attempts += 1;
      await verificationCode.save();
      return res.status(400).json({ msg: 'Invalid reset code' });
    }

    // Mark as verified (not used yet until password is actually reset)
    verificationCode.verified = true;
    await verificationCode.save();

    res.status(200).json({ msg: 'Reset code verified. You can now set a new password.' });
  } catch (error) {
    console.error('Error in verifyResetCode:', error);
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};

// Forgot password: Step 3 - Reset password
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  try {
    if (!email || !code || !newPassword) {
      return res.status(400).json({ msg: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }

    // Find the verified code
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      purpose: 'password-reset',
      verified: true,
      used: false
    }).sort({ createdAt: -1 });

    if (!verificationCode) {
      return res.status(400).json({ msg: 'Invalid or expired reset code. Please start the process again.' });
    }

    if (verificationCode.expiresAt <= new Date()) {
      return res.status(400).json({ msg: 'Reset code expired. Please request a new one.' });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Mark the verification code as used
    verificationCode.used = true;
    await verificationCode.save();

    res.status(200).json({ msg: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ msg: 'Internal Server Error', error: error.message });
  }
};
