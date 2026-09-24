import { ERROR_CODES } from '../config/constants.js';

export class AppError extends Error {
  constructor(code = ERROR_CODES.INTERNAL_SERVER_ERROR, statusCode = 500, message = 'An unexpected error occurred') {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(ERROR_CODES.VALIDATION_ERROR, 400, message);
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = ERROR_CODES.VALIDATION_ERROR) {
    super(code, 400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = ERROR_CODES.NOT_FOUND) {
    super(code, 404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = ERROR_CODES.UNAUTHORIZED) {
    super(code, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = ERROR_CODES.FORBIDDEN) {
    super(code, 403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict detected', code = ERROR_CODES.CONFLICT) {
    super(code, 409, message);
  }
}

export default AppError;
