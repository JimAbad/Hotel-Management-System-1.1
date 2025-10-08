const express = require('express');
const { registerUser, loginUser, checkUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/checkuser', checkUser);

module.exports = router;