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

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe
};
