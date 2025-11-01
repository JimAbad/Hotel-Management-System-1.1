const express = require('express');
const router = express.Router();
const { handlePaymongoWebhook } = require('../controllers/paymongoWebhookController');

// PayMongo webhook endpoint
router.post('/webhook', handlePaymongoWebhook);

module.exports = router;