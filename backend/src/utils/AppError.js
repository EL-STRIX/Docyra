const { ERROR_CODES } = require('../config/constants');

class AppError extends Error {
  constructor(code = ERROR_CODES.INTERNAL_SERVER_ERROR, httpStatus = 500, message = 'Internal server error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code = ERROR_CODES.BAD_REQUEST, message = 'Bad request') {
    return new AppError(code, 400, message);
  }

  static unauthorized(code = ERROR_CODES.UNAUTHORIZED, message = 'Unauthorized') {
    return new AppError(code, 401, message);
  }

  static forbidden(code = ERROR_CODES.FORBIDDEN, message = 'Forbidden') {
    return new AppError(code, 403, message);
  }

  static notFound(code = ERROR_CODES.NOT_FOUND, message = 'Resource not found') {
    return new AppError(code, 404, message);
  }

  static conflict(code = ERROR_CODES.CONFLICT, message = 'Resource conflict') {
    return new AppError(code, 409, message);
  }

  static unprocessable(code = ERROR_CODES.UNPROCESSABLE_ENTITY, message = 'Unprocessable entity') {
    return new AppError(code, 422, message);
  }

  static rateLimit(code = ERROR_CODES.RATE_LIMIT_EXCEEDED, message = 'Too many requests') {
    return new AppError(code, 429, message);
  }

  static internal(code = ERROR_CODES.INTERNAL_SERVER_ERROR, message = 'Internal server error') {
    return new AppError(code, 500, message);
  }
}

module.exports = AppError;
