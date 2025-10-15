const express = require('express');
const router = express.Router();
const { handleXenditWebhook } = require('../controllers/webhookController');

router.post('/xendit', handleXenditWebhook);

module.exports = router;