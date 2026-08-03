const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Verifies the JWT access token and attaches the authenticated user to req.user.
 * Also enforces that the user's account is active (not suspended).
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided');
    }
    const token = header.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      throw ApiError.unauthorized(
        err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token'
      );
    }

    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status === 'suspended') throw ApiError.forbidden('Account has been suspended');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control. Usage: authorize('owner', 'warden')
 * Owners implicitly pass any role check scoped to their own hostel via req.user.role === 'owner'
 * unless explicitly excluded by the route.
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Role "${req.user.role}" cannot access this resource`));
  }
  next();
};

/**
 * Ensures the requested resource belongs to the same hostel as the requesting user,
 * unless the user is an owner of that hostel. Expects req.params.hostelId or
 * a resolved req.resourceHostelId to be set by an earlier handler.
 */
const enforceHostelScope = (req, res, next) => {
  const targetHostelId = req.params.hostelId || req.resourceHostelId;
  if (!targetHostelId) return next();

  const userHostelId = req.user.hostel ? req.user.hostel.toString() : null;
  const isOwnerOfHostel =
    req.user.role === 'owner' && req.user.ownedHostels?.some((h) => h.toString() === targetHostelId);

  if (userHostelId === targetHostelId || isOwnerOfHostel) {
    return next();
  }
  return next(ApiError.forbidden('You do not have access to this hostel\'s data'));
};

module.exports = { authenticate, authorize, enforceHostelScope };
