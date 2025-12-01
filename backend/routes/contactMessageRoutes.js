const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getContactMessagesAdmin, createTaskFromContactMessage, updateContactMessageStatus, deleteContactMessage } = require('../controllers/contactMessageController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getContactMessagesAdmin);
router.post('/:id/create-task', authorize('admin'), createTaskFromContactMessage);
router.put('/:id/status', authorize('admin'), updateContactMessageStatus);
router.delete('/:id', authorize('admin'), deleteContactMessage);

module.exports = router;
