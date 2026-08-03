const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('owner', 'warden'), inventoryController.createItem);
router.get('/maintenance-due', authorize('owner', 'warden'), inventoryController.maintenanceDue);
router.get('/', authorize('owner', 'warden'), inventoryController.listItems);
router.patch('/:id', authorize('owner', 'warden'), inventoryController.updateItem);
router.delete('/:id', authorize('owner'), inventoryController.deleteItem);

module.exports = router;
