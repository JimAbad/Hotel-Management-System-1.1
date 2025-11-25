const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Test endpoint to verify auth middleware
router.get('/test-auth', protect, (req, res) => {
  console.log('Test endpoint - req.user:', req.user);
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Auth middleware is working!' 
  });
});

module.exports = router;