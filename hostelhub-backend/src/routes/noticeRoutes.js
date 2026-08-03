const express = require('express');
const noticeController = require('../controllers/noticeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner', 'warden'), noticeController.createNotice);
router.get('/', authorize('owner', 'warden', 'accountant', 'student'), noticeController.listNotices);
router.delete('/:id', authorize('owner', 'warden'), noticeController.deleteNotice);

module.exports = router;
