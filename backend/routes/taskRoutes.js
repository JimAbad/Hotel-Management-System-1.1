const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createTaskFromCleaningRequest, getTasksAdmin, updateTaskStatus } = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

router.post('/from-cleaning-request/:id', authorize('admin'), createTaskFromCleaningRequest);
router.get('/', authorize('admin'), getTasksAdmin);
router.put('/:id/status', authorize('admin'), updateTaskStatus);

module.exports = router;
