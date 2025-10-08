const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/summary', roomController.getRoomTypeSummary);
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', roomController.createRoom);
router.post('/bulk', roomController.createMultipleRooms);
router.patch('/:id', roomController.updateRoom);
router.delete('/', roomController.deleteAllRooms);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;