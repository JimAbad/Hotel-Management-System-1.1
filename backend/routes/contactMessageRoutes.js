const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getContactMessagesAdmin, createTaskFromContactMessage } = require('../controllers/contactMessageController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getContactMessagesAdmin);
router.post('/:id/create-task', authorize('admin'), createTaskFromContactMessage);

module.exports = router;
