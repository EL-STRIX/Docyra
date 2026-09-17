const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: {
      message: 'Registration successful! Please check your email to verify your account.',
      user
    }
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token;
  const user = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    data: {
      message: 'Email address verified successfully. You may now log in.',
      user
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  if (result.requires2FA) {
    return res.status(200).json({
      success: true,
      data: {
        requires2FA: true,
        tempToken: result.tempToken,
        user: result.user
      }
    });
  }

  // Set HTTP-only cookies
  res.cookie('accessToken', result.accessToken, authService.getCookieOptions(false));
  res.cookie('refreshToken', result.refreshToken, authService.getCookieOptions(true));

  res.status(200).json({
    success: true,
    data: {
      requires2FA: false,
      user: result.user,
      accessToken: result.accessToken // Also send in body for mobile/header clients
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const result = await authService.refreshTokens(token);

  res.cookie('accessToken', result.accessToken, authService.getCookieOptions(false));
  res.cookie('refreshToken', result.refreshToken, authService.getCookieOptions(true));

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('accessToken', authService.getCookieOptions(false));
  res.clearCookie('refreshToken', authService.getCookieOptions(true));

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);

  res.status(200).json({
    success: true,
    data: {
      message: 'If an account exists with this email, a password reset link has been dispatched.'
    }
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await authService.resetPassword(token, newPassword);

  res.status(200).json({
    success: true,
    data: {
      message: 'Password reset successful. Please log in with your new password.',
      user
    }
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});

const setup2FA = asyncHandler(async (req, res) => {
  const result = await authService.setup2FA(req.user._id);
  res.status(200).json({
    success: true,
    data: result
  });
});

const verify2FA = asyncHandler(async (req, res) => {
  const { token, tempToken } = req.body;
  let userId = req.user ? req.user._id : null;

  if (!userId && !tempToken) {
    let headerToken = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      headerToken = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      headerToken = req.cookies.accessToken;
    }

    if (headerToken) {
      try {
        const decoded = require('jsonwebtoken').verify(headerToken, require('../config/env').JWT_ACCESS_SECRET);
        userId = decoded.sub;
      } catch (err) {
        // Leave userId null to let authService throw UNAUTHORIZED
      }
    }
  }

  const result = await authService.verify2FA({
    userId,
    tempToken,
    token
  });

  res.cookie('accessToken', result.accessToken, authService.getCookieOptions(false));
  res.cookie('refreshToken', result.refreshToken, authService.getCookieOptions(true));

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken
    }
  });
});

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  setup2FA,
  verify2FA
};
