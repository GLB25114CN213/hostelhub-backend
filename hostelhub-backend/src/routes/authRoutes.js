const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { registerValidator, loginValidator, refreshValidator } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Tighter limiter specifically on auth endpoints to blunt credential-stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new student account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: student@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', authLimiter, registerValidator, validate, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email/phone + password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or phone number
 *                 example: owner@hostelhub.demo
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, loginValidator, validate, authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh', refreshValidator, validate, authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and revoke session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
