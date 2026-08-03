const express = require('express');
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Owner + Warden can add students. Accountant/Student cannot.
router.post('/', authorize('owner', 'warden'), studentController.createStudent);

// Owner, Warden, Accountant can list (accountant view is field-restricted in controller).
router.get('/', authorize('owner', 'warden', 'accountant'), studentController.listStudents);

// Owner, Warden, Accountant, and the student themself can view a single profile
// (self-access check happens inside the controller for the student role).
router.get('/:id', authorize('owner', 'warden', 'accountant', 'student'), studentController.getStudent);

// Owner: full edit. Warden: limited fields (enforced in controller).
router.patch('/:id', authorize('owner', 'warden'), studentController.updateStudent);

// Delete (soft) — owner only, per spec ("Warden cannot delete students").
router.delete('/:id', authorize('owner'), studentController.deleteStudent);

module.exports = router;
