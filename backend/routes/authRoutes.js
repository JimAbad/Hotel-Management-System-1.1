const express = require('express');
const { registerUser, loginUser, checkUser, sendVerificationCode } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/checkuser', checkUser);
router.post('/send-verification', sendVerificationCode);

module.exports = router;