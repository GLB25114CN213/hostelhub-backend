const express = require('express');
const roomController = require('../controllers/roomController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner'), roomController.createRoom);
router.get('/', authorize('owner', 'warden', 'accountant', 'student'), roomController.listRooms);
router.get('/:id', authorize('owner', 'warden', 'accountant', 'student'), roomController.getRoom);
router.patch('/:id', authorize('owner'), roomController.updateRoom);
router.delete('/:id', authorize('owner'), roomController.deleteRoom);

router.patch('/:roomId/beds/:bedId', authorize('owner', 'warden'), roomController.updateBed);

module.exports = router;
