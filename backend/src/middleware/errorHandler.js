const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Log error
  if (!error.isOperational) {
    logger.error('Unhandled System Error:', error);
  } else {
    logger.warn(`Operational Error [${error.code || 'UNKNOWN'}]: ${error.message}`);
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, message);
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    error = AppError.notFound(ERROR_CODES.NOT_FOUND, `Invalid resource identifier format`);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    error = AppError.conflict(ERROR_CODES.CONFLICT, `Duplicate entry for ${field}`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = AppError.unauthorized(ERROR_CODES.TOKEN_INVALID, 'Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    error = AppError.unauthorized(ERROR_CODES.TOKEN_EXPIRED, 'Authentication token has expired');
  }

  const httpStatus = error.httpStatus || 500;
  const errorCode = error.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const errorMessage = httpStatus === 500 && env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : (error.message || 'Internal Server Error');

  return res.status(httpStatus).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
};

module.exports = errorHandler;
