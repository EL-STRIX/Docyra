const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');

/**
 * Higher-order middleware to validate req.body, req.query, or req.params against a Zod schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    // Replace with parsed/sanitized data if schema defines them
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, messages));
    }
    next(error);
  }
};

module.exports = validate;
