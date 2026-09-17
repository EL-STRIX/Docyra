const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES, USER_STATUS } = require('../config/constants');

const auth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first per TRD Section 6
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Fallback to Authorization Header (e.g. for API clients/testing)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(AppError.unauthorized(ERROR_CODES.UNAUTHORIZED, 'Authentication token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.is2FAPending) {
      return next(AppError.unauthorized(ERROR_CODES.TWO_FACTOR_REQUIRED, '2FA verification pending'));
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(AppError.unauthorized(ERROR_CODES.USER_NOT_FOUND, 'User account no longer exists'));
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      return next(AppError.forbidden(ERROR_CODES.ACCOUNT_DEACTIVATED, 'User account is deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized(ERROR_CODES.TOKEN_EXPIRED, 'Session expired. Please log in again.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized(ERROR_CODES.TOKEN_INVALID, 'Invalid authentication token'));
    }
    next(error);
  }
};

module.exports = auth;
