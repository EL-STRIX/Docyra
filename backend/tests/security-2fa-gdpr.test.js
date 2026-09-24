import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import speakeasy from 'speakeasy';
import app from '../src/app.js';
import { User, Dependent, Review, AuditLog } from '../src/models/index.js';
import { ROLES } from '../src/config/constants.js';


let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const getCsrfTokenAndCookie = async () => {
  const res = await request(app).get('/api/v1/auth/csrf-token');
  const cookie = res.headers['set-cookie']?.find((c) => c.startsWith('csrfToken='));
  const token = res.body.data.csrfToken;
  return { token, cookie };
};

describe('Phase 9: 2FA, GDPR & Security Hardening Suite', () => {
  describe('2FA Enrollment & Verification Flow', () => {
    it('should generate 2FA secret and QR code for authenticated user', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      // Register and verify user
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Dr. Jane Smith',
          email: 'jane.smith@example.com',
          password: 'Password123!',
          role: ROLES.DOCTOR,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'jane.smith@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      // Setup 2FA
      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken);

      expect(setupRes.status).toBe(200);
      expect(setupRes.body.success).toBe(true);
      expect(setupRes.body.data.secret).toBeDefined();
      expect(setupRes.body.data.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      expect(setupRes.body.data.otpauthUrl).toContain('otpauth://totp/Docyra');
    });

    it('should verify TOTP and enable 2FA on account', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Admin User',
          email: 'admin.user@example.com',
          password: 'Password123!',
          role: ROLES.PATIENT,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'admin.user@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken);

      const secret = setupRes.body.data.secret;

      // Generate valid TOTP token
      const validCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      // Verify and enable
      const verifyRes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          code: validCode,
          secret,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.twoFactorEnabled).toBe(true);

      const userInDb = await User.findOne({ email: 'admin.user@example.com' }).select('+twoFactorSecret');
      expect(userInDb.twoFactorEnabled).toBe(true);
      expect(userInDb.twoFactorSecret).toBe(secret);
    });

    it('should reject invalid 2FA verification code', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Test User',
          email: 'test.user@example.com',
          password: 'Password123!',
          role: ROLES.PATIENT,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'test.user@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken);

      const secret = setupRes.body.data.secret;

      const verifyRes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          code: '000000',
          secret,
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
    });
  });

  describe('Login with 2FA Challenge & Verification', () => {
    it('should require 2FA challenge when logging in with 2FA enabled', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Dr. Secure',
          email: 'dr.secure@example.com',
          password: 'Password123!',
          role: ROLES.DOCTOR,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes1 = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'dr.secure@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes1.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken);

      const secret = setupRes.body.data.secret;
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });

      await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ code: validCode, secret });

      // Now attempt password login
      const loginRes2 = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'dr.secure@example.com',
          password: 'Password123!',
        });

      expect(loginRes2.status).toBe(200);
      expect(loginRes2.body.data.requires2FA).toBe(true);
      expect(loginRes2.body.data.tempToken).toBeDefined();

      const tempToken = loginRes2.body.data.tempToken;

      // Complete 2FA login with code
      const totpCode = speakeasy.totp({ secret, encoding: 'base32' });
      const verifyLoginRes = await request(app)
        .post('/api/v1/auth/2fa/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          tempToken,
          code: totpCode,
        });

      expect(verifyLoginRes.status).toBe(200);
      expect(verifyLoginRes.body.success).toBe(true);
      expect(verifyLoginRes.body.data.accessToken).toBeDefined();
      expect(verifyLoginRes.headers['set-cookie']?.some((c) => c.startsWith('accessToken='))).toBe(true);
    });

    it('should allow disabling 2FA with valid TOTP code', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Patient User',
          email: 'patient.user@example.com',
          password: 'Password123!',
          role: ROLES.PATIENT,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'patient.user@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken);

      const secret = setupRes.body.data.secret;
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });

      await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ code: validCode, secret });

      // Disable 2FA
      const disableCode = speakeasy.totp({ secret, encoding: 'base32' });
      const disableRes = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ code: disableCode });

      expect(disableRes.status).toBe(200);
      expect(disableRes.body.success).toBe(true);
      expect(disableRes.body.data.user.twoFactorEnabled).toBe(false);

      const user = await User.findOne({ email: 'patient.user@example.com' }).select('+twoFactorSecret');
      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeNull();
    });
  });

  describe('GDPR Data Portability & Consent Flow', () => {
    it('should export all user data under GDPR Article 20', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'GDPR Patient',
          email: 'gdpr.patient@example.com',
          password: 'Password123!',
          role: ROLES.PATIENT,
          acceptedTerms: true,
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'gdpr.patient@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));
      const userId = loginRes.body.data.user._id;

      // Seed dependent, appointment, review, waitlist, audit log
      await Dependent.create({
        patientId: userId,
        name: 'Little Timmy',
        relationship: 'child',
        dateOfBirth: new Date('2015-05-15'),
      });

      await Review.create({
        patientId: userId,
        doctorId: new mongoose.Types.ObjectId(),
        appointmentId: new mongoose.Types.ObjectId(),
        rating: 5,
        comment: 'Great healthcare service!',
        status: 'published',
      });

      await AuditLog.create({
        actorId: userId,
        actorRole: 'patient',
        action: 'auth:login',
        resourceType: 'User',
        resourceId: userId.toString(),
        ipAddress: '127.0.0.1',
      });

      // Export user data
      const exportRes = await request(app)
        .get('/api/v1/users/me/export')
        .set('Cookie', [csrfCookie, authCookie]);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.success).toBe(true);
      expect(exportRes.body.data.platform).toBe('Docyra');
      expect(exportRes.body.data.user.email).toBe('gdpr.patient@example.com');
      expect(exportRes.body.data.user.passwordHash).toBeUndefined();
      expect(exportRes.body.data.user.twoFactorSecret).toBeUndefined();
      expect(exportRes.body.data.dependents.length).toBe(1);
      expect(exportRes.body.data.dependents[0].name).toBe('Little Timmy');
      expect(exportRes.body.data.reviews.length).toBe(1);
      expect(exportRes.body.data.auditLogs.length).toBe(1);
    });

    it('should update user consent version and timestamp', async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenAndCookie();

      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Consent User',
          email: 'consent.user@example.com',
          password: 'Password123!',
          role: ROLES.PATIENT,
          acceptedTerms: true,
          termsVersion: '1.0',
        });

      await request(app).get(`/api/v1/auth/verify-email?token=${regRes.body.data.verificationToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'consent.user@example.com',
          password: 'Password123!',
        });

      const authCookie = loginRes.headers['set-cookie']?.find((c) => c.startsWith('accessToken='));

      const consentRes = await request(app)
        .patch('/api/v1/users/me/consent')
        .set('Cookie', [csrfCookie, authCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          termsVersion: '2.0',
        });

      expect(consentRes.status).toBe(200);
      expect(consentRes.body.success).toBe(true);
      expect(consentRes.body.data.user.acceptedTermsVersion).toBe('2.0');
      expect(consentRes.body.data.user.acceptedTermsAt).toBeDefined();
    });
  });

  describe('Security Headers & CSP Verification', () => {
    it('should return strict CSP and security headers on responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
