const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../config/constants');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');

class AuthService {
  /**
   * Register a new user
   */
  async register({ name, email, password, phone, role = ROLES.PATIENT, timezone = 'UTC', acceptedTermsVersion = '1.0' }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.EMAIL_ALREADY_EXISTS, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role,
      timezone,
      status: USER_STATUS.UNVERIFIED,
      verificationToken,
      acceptedTermsVersion,
      acceptedTermsAt: new Date()
    });

    // Send verification email
    await notificationService.sendVerificationEmail(user, verificationToken);

    return user;
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token) {
    if (!token) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Verification token is required');
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      throw AppError.badRequest(ERROR_CODES.TOKEN_INVALID, 'Invalid or expired verification token');
    }

    user.status = USER_STATUS.ACTIVE;
    user.emailVerifiedAt = new Date();
    user.verificationToken = null;
    await user.save();

    return user;
  }

  /**
   * Authenticate user with credentials
   */
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw AppError.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check Lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil - new Date()) / (60 * 1000));
      throw AppError.unauthorized(
        ERROR_CODES.ACCOUNT_LOCKED,
        `Account is locked due to consecutive failed login attempts. Try again in ${remainingMinutes} minute(s).`
      );
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        user.failedLoginCount = 0;
        await user.save();
        throw AppError.unauthorized(
          ERROR_CODES.ACCOUNT_LOCKED,
          'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
        );
      }
      await user.save();
      throw AppError.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Reset failed counter
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();

    // Check account status
    if (user.status === USER_STATUS.UNVERIFIED) {
      throw AppError.unauthorized(
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        'Please verify your email address before logging in. Check your inbox for the verification link.'
      );
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      throw AppError.forbidden(ERROR_CODES.ACCOUNT_DEACTIVATED, 'This account has been deactivated.');
    }

    // If 2FA is enabled
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { sub: user._id, role: user.role, is2FAPending: true },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      return {
        requires2FA: true,
        tempToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    }

    const tokens = this.generateTokenPair(user);
    return {
      requires2FA: false,
      user,
      ...tokens
    };
  }

  /**
   * Rotate access & refresh token pair
   */
  async refreshTokens(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized(ERROR_CODES.UNAUTHORIZED, 'Refresh token required');
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.sub);

      if (!user || user.status === USER_STATUS.DEACTIVATED) {
        throw AppError.unauthorized(ERROR_CODES.TOKEN_INVALID, 'User not found or deactivated');
      }

      const tokens = this.generateTokenPair(user);
      return {
        user,
        ...tokens
      };
    } catch (err) {
      throw AppError.unauthorized(ERROR_CODES.TOKEN_EXPIRED, 'Refresh token is invalid or expired');
    }
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return true to prevent email enumeration
      return true;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await notificationService.sendPasswordResetEmail(user, resetToken);
    return true;
  }

  /**
   * Reset password with valid token
   */
  async resetPassword(token, newPassword) {
    if (!token) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Reset token is required');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw AppError.badRequest(ERROR_CODES.TOKEN_INVALID, 'Password reset token is invalid or has expired');
    }

    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();

    return user;
  }

  /**
   * Generate signed JWT Access and Refresh tokens
   */
  generateTokenPair(user) {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      clinicId: user.clinicId ? user.clinicId.toString() : null,
      email: user.email
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY
    });

    const refreshToken = jwt.sign({ sub: user._id.toString() }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY
    });

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Standard cookie options per TRD Section 7
   */
  getCookieOptions(isRefreshToken = false) {
    const isProd = env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: isRefreshToken
        ? 7 * 24 * 60 * 60 * 1000 // 7 days
        : 15 * 60 * 1000          // 15 mins
    };
  }
}

module.exports = new AuthService();
