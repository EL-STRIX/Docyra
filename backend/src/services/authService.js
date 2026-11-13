import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { ROLES, USER_STATUS, ERROR_CODES } from '../config/constants.js';
import { User, DoctorProfile, Specialization } from '../models/index.js';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/AppError.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

class AuthService {
  /**
   * Helper: Generate JWT access and refresh tokens
   */
  generateTokens(user) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      clinicId: user.clinicId ? user.clinicId.toString() : null,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user._id.toString() }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Helper: Generate verification token (24 hours)
   */
  generateVerificationToken(user) {
    return jwt.sign(
      { id: user._id.toString(), email: user.email, purpose: 'email_verification' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Helper: Generate password reset token (15 minutes)
   */
  generatePasswordResetToken(user) {
    return jwt.sign(
      { id: user._id.toString(), email: user.email, purpose: 'password_reset' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  }

  /**
   * Helper: Strip sensitive fields from user object
   */
  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.passwordHash;
    delete userObj.twoFactorSecret;
    delete userObj.__v;
    return userObj;
  }

  /**
   * Register a new user
   */
  async register({ name, email, password, phone, role = ROLES.PATIENT, termsVersion = '1.0' }) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const isDev = env.NODE_ENV === 'development';
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      role,
      status: isDev ? USER_STATUS.ACTIVE : USER_STATUS.UNVERIFIED,
      emailVerifiedAt: isDev ? new Date() : null,
      acceptedTermsVersion: termsVersion,
      acceptedTermsAt: new Date(),
    });

    // If registering as doctor, create preliminary unapproved profile
    if (role === ROLES.DOCTOR) {
      // Find a default or first specialization
      let defaultSpec = await Specialization.findOne();
      if (!defaultSpec) {
        defaultSpec = await Specialization.create({ name: 'General Medicine' });
      }

      await DoctorProfile.create({
        userId: user._id,
        specializationId: defaultSpec._id,
        isApproved: false,
        consultationFee: 500,
      });
    }

    // Send verification email
    const verificationToken = this.generateVerificationToken(user);
    await notificationService.sendVerificationEmail(user.email, user.name, verificationToken);

    logger.info(`User registered: ${user.email} (${user.role})`);

    return {
      user: this.sanitizeUser(user),
      verificationToken,
    };
  }

  /**
   * Verify email via token
   */
  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      if (decoded.purpose !== 'email_verification') {
        throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid verification token purpose');
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
      }

      if (user.status === USER_STATUS.ACTIVE) {
        return { user: this.sanitizeUser(user), alreadyVerified: true };
      }

      user.status = USER_STATUS.ACTIVE;
      user.emailVerifiedAt = new Date();
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);
      return { user: this.sanitizeUser(user), alreadyVerified: false };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError(ERROR_CODES.TOKEN_EXPIRED, 400, 'Verification link has expired. Please request a new one.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid verification token');
      }
      throw err;
    }
  }

  /**
   * Login user with credential checking and lockout protection
   */
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +twoFactorSecret');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil - new Date()) / (60 * 1000));
      throw new AppError(
        ERROR_CODES.ACCOUNT_LOCKED,
        423,
        `Account is temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;

      // Lock after 5 failed attempts for 15 minutes
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        logger.warn(`User locked out: ${user.email} after ${user.failedLoginCount} failed attempts`);
        throw new AppError(
          ERROR_CODES.ACCOUNT_LOCKED,
          423,
          'Too many failed attempts. Account locked for 15 minutes.'
        );
      }

      await user.save();
      throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Reset lockout counters on successful password match
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();

    // Check account status
    if (user.status === USER_STATUS.UNVERIFIED) {
      throw new AppError(
        ERROR_CODES.ACCOUNT_UNVERIFIED,
        403,
        'Please verify your email address before logging in.'
      );
    }

    if (user.status === USER_STATUS.DEACTIVATED || user.status === USER_STATUS.SUSPENDED) {
      throw new AppError(
        ERROR_CODES.ACCOUNT_DEACTIVATED,
        403,
        'Your account has been suspended or deactivated. Please contact support.'
      );
    }

    // Check 2FA requirement
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id.toString(), purpose: '2fa_verification' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      return {
        requires2FA: true,
        tempToken,
        user: { id: user._id, email: user.email, role: user.role },
      };
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return {
      requires2FA: false,
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh JWT token pair
   */
  async refreshTokens(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required', ERROR_CODES.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new UnauthorizedError('User session expired or inactive', ERROR_CODES.UNAUTHORIZED);
      }

      const tokens = this.generateTokens(user);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token', ERROR_CODES.UNAUTHORIZED);
    }
  }

  /**
   * Forgot password request
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with success to prevent user enumeration
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const resetToken = this.generatePasswordResetToken(user);
    await notificationService.sendPasswordResetEmail(user.email, user.name, resetToken);

    logger.info(`Password reset token generated for: ${user.email}`);

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      resetToken: env.NODE_ENV === 'test' ? resetToken : undefined,
    };
  }

  /**
   * Reset password with valid token
   */
  async resetPassword({ token, password }) {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      if (decoded.purpose !== 'password_reset') {
        throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid reset token purpose');
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
      }

      const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
      user.passwordHash = passwordHash;
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      await user.save();

      logger.info(`Password successfully reset for: ${user.email}`);

      return { message: 'Password has been reset successfully. You can now log in.' };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError(ERROR_CODES.TOKEN_EXPIRED, 400, 'Password reset link has expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid password reset token');
      }
      throw err;
    }
  }

  /**
   * Generate 2FA secret and QR code for enrollment
   */
  async generate2FASetup(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Docyra (${user.email})`,
      issuer: 'Docyra',
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl,
    };
  }

  /**
   * Verify TOTP code and enable 2FA on account
   */
  async verify2FAAndEnable(userId, { code, secret }) {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    const secretToVerify = secret || user.twoFactorSecret;
    if (!secretToVerify) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 400, '2FA secret is required for verification');
    }

    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid two-factor authentication code');
    }

    user.twoFactorEnabled = true;
    user.twoFactorSecret = secretToVerify;
    await user.save();

    logger.info(`2FA enabled for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully',
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Complete login using 2FA tempToken and TOTP code
   */
  async loginWith2FA({ tempToken, code }) {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
      if (decoded.purpose !== '2fa_verification') {
        throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid 2FA verification session');
      }
    } catch (err) {
      throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid or expired 2FA session token');
    }

    const user = await User.findById(decoded.id).select('+passwordHash +twoFactorSecret');
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedError('User session invalid or inactive', ERROR_CODES.UNAUTHORIZED);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 400, '2FA is not enabled for this account');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedError('Invalid two-factor authentication code', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    logger.info(`User successfully completed 2FA login: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Disable 2FA on account
   */
  async disable2FA(userId, code) {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 400, '2FA is not currently enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new AppError(ERROR_CODES.INVALID_TOKEN, 400, 'Invalid two-factor authentication code');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    logger.info(`2FA disabled for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully',
      user: this.sanitizeUser(user),
    };
  }
}

export const authService = new AuthService();
export default authService;

