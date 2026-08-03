const { body } = require('express-validator');

exports.registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Valid phone number required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body().custom((value) => {
    if (!value.email && !value.phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  }),
];

exports.loginValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
