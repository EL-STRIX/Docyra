const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { User } = require('../src/models');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Auth Foundation API (Phase 2)', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear users before each test run
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
    }
  });

  const testUser = {
    name: 'Jane Patient',
    email: 'jane.test@docyra.app',
    password: 'Password@123',
    phone: '+91 9123456780'
  };

  it('POST /api/v1/auth/register should create an unverified user and return 201', async () => {
    if (mongoose.connection.readyState !== 1) return; // Skip if db not connected in runner

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.status).toBe('unverified');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('POST /api/v1/auth/register should reject duplicate email with 409', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('GET /api/v1/auth/verify-email should activate unverified user', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);
    const user = await User.findOne({ email: testUser.email });
    expect(user.verificationToken).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/auth/verify-email?token=${user.verificationToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('active');
  });

  it('POST /api/v1/auth/login should fail for unverified user with 401', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('POST /api/v1/auth/login should return tokens and set cookies for verified user', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);
    const user = await User.findOne({ email: testUser.email });
    await request(app).get(`/api/v1/auth/verify-email?token=${user.verificationToken}`);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/v1/auth/login should trigger lockout after 5 consecutive failed attempts', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);
    const user = await User.findOne({ email: testUser.email });
    await request(app).get(`/api/v1/auth/verify-email?token=${user.verificationToken}`);

    // Fail 4 times
    for (let i = 0; i < 4; i++) {
      const failRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123' });
      expect(failRes.statusCode).toBe(401);
      expect(failRes.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // 5th failure triggers account lockout
    const lockRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123' });
    expect(lockRes.statusCode).toBe(401);
    expect(lockRes.body.error.code).toBe('ACCOUNT_LOCKED');

    // 6th attempt with CORRECT password is still locked
    const stillLockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(stillLockedRes.statusCode).toBe(401);
    expect(stillLockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('GET /api/v1/auth/me should return authenticated user profile', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await request(app).post('/api/v1/auth/register').send(testUser);
    const user = await User.findOne({ email: testUser.email });
    await request(app).get(`/api/v1/auth/verify-email?token=${user.verificationToken}`);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testUser.email);
  });
});
