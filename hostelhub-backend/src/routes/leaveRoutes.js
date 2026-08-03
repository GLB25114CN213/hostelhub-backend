const express = require('express');
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('student'), leaveController.createLeave);
router.get('/', authorize('owner', 'warden', 'student'), leaveController.listLeaves);
router.patch('/:id/review', authorize('owner', 'warden'), leaveController.reviewLeave);
router.patch('/:id/cancel', authorize('student'), leaveController.cancelLeave);

module.exports = router;
