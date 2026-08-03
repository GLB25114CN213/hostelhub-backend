const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const issueTokenPair = async (user, deviceInfo = 'unknown') => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, jti } = generateRefreshToken(user);

  user.refreshTokens.push({
    token: jti,
    deviceInfo,
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE),
  });
  // Cap stored sessions per user to avoid unbounded growth
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(-10);
  }
  await user.save();

  return { accessToken, refreshToken };
};

/**
 * POST /api/v1/auth/register
 * Registers a new user. Role defaults to 'student' unless created by an owner
 * (owner-created warden/accountant accounts go through a separate admin-only route).
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) throw ApiError.conflict('An account with this email or phone already exists');

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: password,
      role: 'student',
      status: 'pending_verification',
    });

    // In production: trigger OTP send here (email/phone) before marking verified.
    const tokens = await issueTokenPair(user, req.headers['user-agent']);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your phone/email.',
      user: user.toSafeJSON(),
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 * Email/phone + password login.
 */
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }, { name: identifier }],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid credentials');
    if (user.status === 'suspended') throw ApiError.forbidden('Account has been suspended');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw ApiError.unauthorized('Invalid credentials');

    user.lastLoginAt = new Date();
    const tokens = await issueTokenPair(user, req.headers['user-agent']);

    res.json({ success: true, user: user.toSafeJSON(), ...tokens });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Exchanges a valid refresh token for a new access token (rotation).
 */
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User no longer exists');

    const sessionExists = user.refreshTokens.some((rt) => rt.token === payload.jti);
    if (!sessionExists) throw ApiError.unauthorized('Session has been revoked');

    // Rotate: remove old, issue new
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== payload.jti);
    const tokens = await issueTokenPair(user, req.headers['user-agent']);

    res.json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 * Revokes the provided refresh token (single-device logout).
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(payload.sub, {
          $pull: { refreshTokens: { token: payload.jti } },
        });
      } catch {
        // token already invalid/expired — nothing to revoke, treat as success
      }
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON ? req.user.toSafeJSON() : req.user });
};
