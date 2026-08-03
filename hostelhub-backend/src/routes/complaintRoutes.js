const express = require('express');
const complaintController = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner', 'warden', 'student'), complaintController.createComplaint);
router.get('/', authorize('owner', 'warden', 'student'), complaintController.listComplaints);
router.patch('/:id/assign', authorize('owner', 'warden'), complaintController.assignComplaint);
router.patch('/:id/status', authorize('owner', 'warden'), complaintController.updateComplaintStatus);
router.post('/:id/comments', authorize('owner', 'warden', 'student'), complaintController.addComment);

module.exports = router;
