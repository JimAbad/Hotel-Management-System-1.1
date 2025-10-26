const express = require('express');
const router = express.Router();

// Simple debug route
router.get('/test', (req, res) => {
  console.log('DEBUG ROUTE CALLED - This should appear in logs');
  res.json({ message: 'Debug route working', timestamp: new Date() });
});

// Test email route
router.post('/test-email', async (req, res) => {
  console.log('EMAIL DEBUG ROUTE CALLED');
  console.log('Request body:', req.body);
  
  const { sendEmail } = require('../utils/email');
  try {
    console.log('About to call sendEmail with hardcoded values');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    });
    console.log('Email sent successfully');
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;