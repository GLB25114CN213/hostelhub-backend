const express = require('express');
const hostelController = require('../controllers/hostelController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner'), hostelController.createHostel);
router.get('/', authorize('owner', 'warden', 'accountant', 'student'), hostelController.listHostels);
router.get('/:id', authorize('owner', 'warden', 'accountant', 'student'), hostelController.getHostel);
router.patch('/:id', authorize('owner'), hostelController.updateHostel);
router.delete('/:id', authorize('owner'), hostelController.deleteHostel);

module.exports = router;
