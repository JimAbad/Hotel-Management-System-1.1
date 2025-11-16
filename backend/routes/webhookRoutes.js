const express = require('express');
const router = express.Router();
const { handleXenditWebhook, handlePayMongoWebhook } = require('../controllers/webhookController');

// Xendit webhook endpoint
router.post('/xendit', handleXenditWebhook);

// PayMongo webhook endpoint (used for QRPh and other sources)
router.post('/paymongo', handlePayMongoWebhook);

module.exports = router;