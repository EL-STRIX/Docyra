import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Log error
  if (!error.isOperational) {
    logger.error(`Unhandled Error: ${error.message}`, { stack: error.stack });
  } else {
    logger.warn(`Operational Error: [${error.code}] ${error.message}`);
  }

  // Handle Mongoose / MongoDB errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    error = new AppError(ERROR_CODES.VALIDATION_ERROR, 400, message);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    error = new AppError(ERROR_CODES.CONFLICT, 409, `Duplicate value for field: ${field}`);
  } else if (err.name === 'CastError') {
    error = new AppError(ERROR_CODES.BAD_REQUEST, 400, `Invalid ${err.path}: ${err.value}`);
  } else if (err.name === 'JsonWebTokenError') {
    error = new AppError(ERROR_CODES.INVALID_TOKEN, 401, 'Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError(ERROR_CODES.TOKEN_EXPIRED, 401, 'Authentication token expired');
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = error.isOperational
    ? error.message
    : 'An internal server error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};

export default errorHandler;
