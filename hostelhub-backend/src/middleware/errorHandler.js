const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Converts unknown errors (Mongoose, JWT, etc.) into ApiError shape
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(error.errors).map((e) => e.message).join(', ');
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for field "${error.path}"`;
    } else if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0];
      message = `Duplicate value for field "${field}"`;
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
    }

    error = new ApiError(statusCode, message, false, err.details || null);
  }
  next(error);
};

// Sends the final JSON error response
const errorHandler = (err, req, res, next) => {
  const { statusCode = 500, message, details } = err;

  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    logger.error(`Unhandled error: ${err.stack}`);
  } else {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};

module.exports = { errorConverter, errorHandler };
