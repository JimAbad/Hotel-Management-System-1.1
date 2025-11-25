const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createTaskFromCleaningRequest, getTasksAdmin } = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

router.post('/from-cleaning-request/:id', authorize('admin'), createTaskFromCleaningRequest);
router.get('/', authorize('admin'), getTasksAdmin);

module.exports = router;
