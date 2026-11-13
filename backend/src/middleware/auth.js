import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ERROR_CODES, USER_STATUS } from '../config/constants.js';
import { User } from '../models/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization Header first (explicit application token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check HTTP-only cookie fallback
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication token required', ERROR_CODES.UNAUTHORIZED));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Access token expired', ERROR_CODES.TOKEN_EXPIRED));
      }
      return next(new UnauthorizedError('Invalid access token', ERROR_CODES.INVALID_TOKEN));
    }

    // Check user in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('User account not found', ERROR_CODES.UNAUTHORIZED));
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return next(new ForbiddenError('Account is not active', ERROR_CODES.FORBIDDEN));
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId ? user.clinicId.toString() : null,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
