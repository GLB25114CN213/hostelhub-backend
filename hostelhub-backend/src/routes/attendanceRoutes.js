const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/mark', authorize('owner', 'warden'), attendanceController.markAttendance);
router.post('/qr-scan', authorize('owner', 'warden'), attendanceController.qrScanAttendance);
router.get('/', authorize('owner', 'warden', 'accountant', 'student'), attendanceController.listAttendance);
router.get('/report', authorize('owner', 'warden'), attendanceController.attendanceReport);

module.exports = router;
