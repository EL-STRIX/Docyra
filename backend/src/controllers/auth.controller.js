import { authService } from '../services/authService.js';
import { auditService } from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const getCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: maxAgeMs,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, termsVersion } = req.body;

  const result = await authService.register({
    name,
    email,
    password,
    phone,
    role,
    termsVersion,
  });

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      message: 'Registration successful. Please check your email to verify your account.',
      ...(env.NODE_ENV === 'test' ? { verificationToken: result.verificationToken } : {}),
    },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  const result = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      message: result.alreadyVerified
        ? 'Email is already verified. You can log in.'
        : 'Email verified successfully. You can now log in.',
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  if (result.requires2FA) {
    return res.status(200).json({
      success: true,
      data: {
        requires2FA: true,
        tempToken: result.tempToken,
        user: result.user,
      },
    });
  }

  // Set HTTP-only cookies
  res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  // Non-blocking security audit log
  auditService.log({
    actorId: result.user?._id || result.user?.id,
    actorEmail: result.user?.email,
    actorRole: result.user?.role || 'user',
    action: 'USER_LOGIN',
    resourceType: 'Auth',
    resourceId: (result.user?._id || result.user?.id || '').toString(),
    ipAddress: (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().replace('::ffff:', ''),
    userAgent: req.headers['user-agent'] || 'Docyra-Client',
    metadata: {
      email: result.user?.email,
      role: result.user?.role,
      loginMethod: 'password',
    },
  });

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

  const result = await authService.refreshTokens(refreshToken);

  // Set rotated cookies
  res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('accessToken', getCookieOptions(0));
  res.clearCookie('refreshToken', getCookieOptions(0));

  if (req.user) {
    auditService.log({
      actorId: req.user.id || req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role || 'user',
      action: 'USER_LOGOUT',
      resourceType: 'Auth',
      resourceId: (req.user.id || req.user._id || '').toString(),
      ipAddress: (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().replace('::ffff:', ''),
      userAgent: req.headers['user-agent'] || 'Docyra-Client',
      metadata: { email: req.user.email },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword({ token, password });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export const setup2FA = asyncHandler(async (req, res) => {
  const result = await authService.generate2FASetup(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const verify2FA = asyncHandler(async (req, res) => {
  const { code, secret } = req.body;
  const result = await authService.verify2FAAndEnable(req.user._id, { code, secret });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const login2FA = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;
  const result = await authService.loginWith2FA({ tempToken, code });

  // Set HTTP-only cookies
  res.cookie('accessToken', result.accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  // Non-blocking security audit log
  auditService.log({
    actorId: result.user?._id || result.user?.id,
    actorEmail: result.user?.email,
    actorRole: result.user?.role || 'user',
    action: 'USER_LOGIN',
    resourceType: 'Auth',
    resourceId: (result.user?._id || result.user?.id || '').toString(),
    ipAddress: (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().replace('::ffff:', ''),
    userAgent: req.headers['user-agent'] || 'Docyra-Client',
    metadata: {
      email: result.user?.email,
      role: result.user?.role,
      loginMethod: 'password',
    },
  });

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const disable2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const result = await authService.disable2FA(req.user._id, code);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  setup2FA,
  verify2FA,
  login2FA,
  disable2FA,
};

