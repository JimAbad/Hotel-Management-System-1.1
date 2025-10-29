const express = require('express');
const router = express.Router();

// Simple health check endpoint for Render
router.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  });
});

module.exports = router;
