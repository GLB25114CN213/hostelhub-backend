const express = require('express');
const feeController = require('../controllers/feeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner', 'accountant'), feeController.createInvoice);
router.post('/:id/pay', authorize('owner', 'accountant'), feeController.recordPayment);
router.get('/summary', authorize('owner'), feeController.feeSummary);
router.get('/', authorize('owner', 'accountant', 'student'), feeController.listFees);

module.exports = router;
