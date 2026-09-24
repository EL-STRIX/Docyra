import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { env } from '../src/config/env.js';
import { ROLES } from '../src/config/constants.js';
import { requireRole, enforceClinicScope } from '../src/middleware/rbac.js';
import { csrfProtection } from '../src/middleware/csrf.js';
import { authLimiter } from '../src/middleware/rateLimit.js';
import errorHandler from '../src/middleware/errorHandler.js';

let mongoServer;
let testApp;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Build a test Express app to test middlewares in isolation and in chain
  testApp = express();
  testApp.set('trust proxy', true);
  testApp.use(express.json());
  testApp.use(cookieParser());
  testApp.use(csrfProtection);

  // Helper auth attach middleware for testing
  const mockAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        req.user = decoded;
      } catch (err) {
        // Invalid token
      }
    }
    next();
  };

  testApp.use(mockAuthMiddleware);

  // Test Route: Admin Only
  testApp.get('/test/admin-only', requireRole(ROLES.ADMIN), (req, res) => {
    res.status(200).json({ success: true, message: 'Welcome Admin' });
  });

  // Test Route: Doctor or Clinic Admin
  testApp.get('/test/staff-only', requireRole([ROLES.DOCTOR, ROLES.CLINIC_ADMIN]), (req, res) => {
    res.status(200).json({ success: true, message: 'Welcome Staff' });
  });

  // Test Route: Clinic Scoped Data Access (R6.5)
  testApp.get('/test/clinics/:clinicId/data', enforceClinicScope, (req, res) => {
    res.status(200).json({
      success: true,
      scopedClinicId: req.query.clinicId || req.params.clinicId,
      message: 'Clinic data accessed',
    });
  });

  // Test Route: Clinic Scoped Mutation (R6.5)
  testApp.post('/test/clinics/create-doctor', enforceClinicScope, (req, res) => {
    res.status(200).json({
      success: true,
      clinicIdUsed: req.body.clinicId,
    });
  });

  // Test Route: Rate limited endpoint
  testApp.post('/test/rate-limited-auth', authLimiter, (req, res) => {
    res.status(200).json({ success: true, message: 'OK' });
  });

  testApp.use(errorHandler);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Phase 3: RBAC & Middleware Chain Integration Tests', () => {
  let adminToken;
  let clinic1AdminToken;
  let patientToken;

  const clinic1Id = new mongoose.Types.ObjectId().toString();
  const clinic2Id = new mongoose.Types.ObjectId().toString();

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: 'admin@test.com', role: ROLES.ADMIN, clinicId: null },
      env.JWT_ACCESS_SECRET
    );

    clinic1AdminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: 'apollo@test.com', role: ROLES.CLINIC_ADMIN, clinicId: clinic1Id },
      env.JWT_ACCESS_SECRET
    );

    patientToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: 'patient@test.com', role: ROLES.PATIENT, clinicId: null },
      env.JWT_ACCESS_SECRET
    );
  });

  describe('RBAC Role Enforcement (requireRole)', () => {
    it('should block patient from accessing admin-only route (403 Forbidden)', async () => {
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should block clinic admin from accessing admin-only route (403 Forbidden)', async () => {
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow platform admin to access admin-only route (200 OK)', async () => {
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Welcome Admin');
    });

    it('should allow clinic admin to access staff-only route (200 OK)', async () => {
      const res = await request(testApp)
        .get('/test/staff-only')
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Clinic Scoping & Isolation (Hard Rule R6.5)', () => {
    it('should allow Clinic Admin 1 to access their own clinic data', async () => {
      const res = await request(testApp)
        .get(`/test/clinics/${clinic1Id}/data`)
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('MUST BLOCK Clinic Admin 1 when attempting to access Clinic 2 data via params (403 Forbidden)', async () => {
      const res = await request(testApp)
        .get(`/test/clinics/${clinic2Id}/data`)
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MUST FORCE clinicId from JWT when Clinic Admin submits a forged clinicId in body', async () => {
      const res = await request(testApp)
        .post('/test/clinics/create-doctor')
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .send({ name: 'Dr. Hacker', clinicId: clinic2Id }); // Attempted injection of clinic2Id

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Server-side middleware MUST override forged clinicId with JWT clinicId (clinic1Id)
      expect(res.body.clinicIdUsed).toBe(clinic1Id);
    });

    it('should allow Platform Admin to access any clinic without scoping restrictions', async () => {
      const res1 = await request(testApp)
        .get(`/test/clinics/${clinic1Id}/data`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res2 = await request(testApp)
        .get(`/test/clinics/${clinic2Id}/data`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
    });
  });

  describe('CSRF Protection (Double-Submit Cookie Pattern)', () => {
    it('should reject state-changing request if CSRF header is missing in production/dev mode', async () => {
      const res = await request(testApp)
        .post('/test/clinics/create-doctor')
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .set('Cookie', 'csrfToken=real_token_123')
        .set('x-csrf-token', 'mismatched_token_456') // Mismatch!
        .send({ name: 'Dr. Test' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CSRF_TOKEN');
    });

    it('should allow state-changing request when CSRF cookie and X-CSRF-Token header match', async () => {
      const validToken = 'my_secret_csrf_token_abcdef123456';

      const res = await request(testApp)
        .post('/test/clinics/create-doctor')
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .set('Cookie', `csrfToken=${validToken}`)
        .set('X-CSRF-Token', validToken)
        .send({ name: 'Dr. Test' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Rate Limiting (authLimiter & generalLimiter)', () => {
    it('should trigger 429 Too Many Requests when rate limit threshold is exceeded', async () => {
      const ip = '192.168.1.50';

      // 5 allowed requests
      for (let i = 1; i <= 5; i++) {
        const attempt = await request(testApp)
          .post('/test/rate-limited-auth')
          .set('x-test-ratelimit', 'true')
          .set('X-Forwarded-For', ip)
          .send({});
        expect(attempt.statusCode).toBe(200);
      }

      // 6th request is rate limited
      const blockedAttempt = await request(testApp)
        .post('/test/rate-limited-auth')
        .set('x-test-ratelimit', 'true')
        .set('X-Forwarded-For', ip)
        .send({});

      expect(blockedAttempt.statusCode).toBe(429);
      expect(blockedAttempt.body.success).toBe(false);
      expect(blockedAttempt.body.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});
