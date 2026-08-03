const express = require('express');
const visitorController = require('../controllers/visitorController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/check-in', authorize('owner', 'warden'), visitorController.checkIn);
router.patch('/:id/check-out', authorize('owner', 'warden'), visitorController.checkOut);
router.get('/', authorize('owner', 'warden'), visitorController.listVisitors);

module.exports = router;
