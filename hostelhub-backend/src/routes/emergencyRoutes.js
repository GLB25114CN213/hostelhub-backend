const express = require('express');
const emergencyController = require('../controllers/emergencyController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/trigger', authorize('student'), emergencyController.triggerAlert);
router.get('/', authorize('owner', 'warden'), emergencyController.listAlerts);
router.patch('/:id/acknowledge', authorize('owner', 'warden'), emergencyController.acknowledgeAlert);
router.patch('/:id/resolve', authorize('owner', 'warden'), emergencyController.resolveAlert);

module.exports = router;
