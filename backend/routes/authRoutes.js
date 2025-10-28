const express = require('express');
const { registerUser, loginUser, checkUser, verifyEmail, requestSignupVerificationCode, verifySignupCode, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/checkuser', checkUser);
router.get('/verify-email', verifyEmail);

// Pre-signup verification code endpoints
router.post('/request-verification-code', requestSignupVerificationCode);
router.post('/verify-code', verifySignupCode);

// Forgot password endpoints
router.post('/forgot-password', (req, res, next) => {
  console.log('Route /forgot-password called with body:', req.body);
  next();
}, forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Test route for debugging
router.get('/test-debug', (req, res) => {
  console.log('TEST DEBUG ROUTE CALLED');
  res.json({ message: 'Debug test successful' });
});

// Test email sending
router.post('/test-email', async (req, res) => {
  const { sendEmail } = require('../utils/email');
  try {
    console.log('Testing email send with undefined to parameter');
    await sendEmail({
      to: undefined,
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    });
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;