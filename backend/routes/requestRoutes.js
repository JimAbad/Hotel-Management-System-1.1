const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createCleaningRequest, getCleaningRequestsAdmin, getMyCleaningRequests } = require('../controllers/requestController');

const router = express.Router();

router.use(protect);

router.post('/cleaning', createCleaningRequest);
router.get('/cleaning', authorize('admin'), getCleaningRequestsAdmin);
router.get('/cleaning/my', getMyCleaningRequests);

module.exports = router;
