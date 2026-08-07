const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const issueTokenPair = async (user, deviceInfo = 'unknown') => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, jti } = generateRefreshToken(user);

  user.refreshTokens.push({ token: jti, deviceInfo, expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE) });
  if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
  await user.save();

  return { accessToken, refreshToken };
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.findOne({ $or: [{ email }, { phone }] })) throw ApiError.conflict('Account already exists');

  const user = await User.create({ name, email, phone, passwordHash: password, role: 'student', status: 'pending_verification' });
  const tokens = await issueTokenPair(user, req.headers['user-agent']);

  res.status(201).json({ success: true, message: 'Account created', user: user.toSafeJSON(), ...tokens });
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }, { name: identifier }] }).select('+passwordHash');

  if (!user?.passwordHash || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid credentials');
  if (user.status === 'suspended') throw ApiError.forbidden('Account has been suspended');

  user.lastLoginAt = new Date();
  const tokens = await issueTokenPair(user, req.headers['user-agent']);
  res.json({ success: true, user: user.toSafeJSON(), ...tokens });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let payload;
  try { payload = verifyRefreshToken(refreshToken); } catch { throw ApiError.unauthorized('Invalid refresh token'); }

  const user = await User.findById(payload.sub);
  if (!user?.refreshTokens.some((rt) => rt.token === payload.jti)) throw ApiError.unauthorized('Session revoked');

  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== payload.jti);
  const tokens = await issueTokenPair(user, req.headers['user-agent']);
  res.json({ success: true, ...tokens });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.body.refreshToken) {
    try {
      const payload = verifyRefreshToken(req.body.refreshToken);
      await User.findByIdAndUpdate(payload.sub, { $pull: { refreshTokens: { token: payload.jti } } });
    } catch {}
  }
  res.json({ success: true, message: 'Logged out' });
});

exports.me = (req, res) => res.json({ success: true, user: req.user.toSafeJSON ? req.user.toSafeJSON() : req.user });
