import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import { User } from '../src/models/index.js';
import { USER_STATUS } from '../src/config/constants.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Phase 2: Auth Foundation API Tests', () => {
  const validUserPayload = {
    name: 'Alice Patient',
    email: 'alice@example.com',
    password: 'Password123',
    phone: '+91 9876543210',
    acceptedTerms: true,
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new patient successfully and return unverified user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.status).toBe(USER_STATUS.UNVERIFIED);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.verificationToken).toBeDefined();

      const dbUser = await User.findOne({ email: 'alice@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.status).toBe(USER_STATUS.UNVERIFIED);
    });

    it('should reject registration if email already exists (409 Conflict)', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      expect(duplicateRes.statusCode).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration if terms are not accepted', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserPayload, acceptedTerms: false });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if password is weak', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserPayload, password: 'weak' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should activate user account with valid token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      const token = regRes.body.data.verificationToken;

      const verifyRes = await request(app)
        .get(`/api/v1/auth/verify-email?token=${token}`);

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.status).toBe(USER_STATUS.ACTIVE);

      const updatedUser = await User.findOne({ email: 'alice@example.com' });
      expect(updatedUser.status).toBe(USER_STATUS.ACTIVE);
      expect(updatedUser.emailVerifiedAt).toBeDefined();
    });

    it('should reject invalid verification token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify-email?token=invalid_token_123');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/login & Lockout Protection', () => {
    beforeEach(async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      await request(app).get(`/api/v1/auth/verify-email?token=${reg.body.data.verificationToken}`);
    });

    it('should successfully log in active user and set cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'WrongPassword123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

      const user = await User.findOne({ email: 'alice@example.com' });
      expect(user.failedLoginCount).toBe(1);
    });

    it('should lock account after 5 consecutive failed login attempts', async () => {
      for (let i = 1; i <= 4; i++) {
        const attempt = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'alice@example.com', password: 'WrongPassword123' });
        expect(attempt.statusCode).toBe(401);
      }

      // 5th attempt triggers lockout
      const fifthAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'WrongPassword123' });

      expect(fifthAttempt.statusCode).toBe(423);
      expect(fifthAttempt.body.error.code).toBe('ACCOUNT_LOCKED');

      const lockedUser = await User.findOne({ email: 'alice@example.com' });
      expect(lockedUser.failedLoginCount).toBe(5);
      expect(lockedUser.lockedUntil).toBeDefined();
      expect(lockedUser.lockedUntil > new Date()).toBe(true);

      // Even with correct password, locked account is rejected
      const lockedLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123' });

      expect(lockedLogin.statusCode).toBe(423);
      expect(lockedLogin.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /api/v1/auth/refresh & /logout', () => {
    it('should rotate tokens on valid refresh request', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      await request(app).get(`/api/v1/auth/verify-email?token=${reg.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123' });

      const refreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
    });

    it('should clear cookies on logout', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      await request(app).get(`/api/v1/auth/verify-email?token=${reg.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123' });

      const accessToken = loginRes.body.data.accessToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.statusCode).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });
  });

  describe('Password Recovery (/forgot-password & /reset-password)', () => {
    it('should handle complete password recovery flow', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      await request(app).get(`/api/v1/auth/verify-email?token=${reg.body.data.verificationToken}`);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'alice@example.com' });

      expect(forgotRes.statusCode).toBe(200);
      expect(forgotRes.body.data.resetToken).toBeDefined();

      const resetToken = forgotRes.body.data.resetToken;

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: 'NewPassword999' });

      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login with new password
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'NewPassword999' });

      expect(newLoginRes.statusCode).toBe(200);
      expect(newLoginRes.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me (Protected Route with Auth Middleware)', () => {
    it('should return current authenticated user data from token', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      await request(app).get(`/api/v1/auth/verify-email?token=${reg.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123' });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.statusCode).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('alice@example.com');
      expect(meRes.body.data.user.role).toBe('patient');
    });

    it('should reject unauthenticated access (401 Unauthorized)', async () => {
      const meRes = await request(app).get('/api/v1/auth/me');

      expect(meRes.statusCode).toBe(401);
      expect(meRes.body.success).toBe(false);
      expect(meRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
