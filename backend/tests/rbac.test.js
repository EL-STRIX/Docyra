const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const app = require('../src/app');
const auth = require('../src/middleware/auth');
const { requireRole, scopeClinic } = require('../src/middleware/rbac');
const { csrf } = require('../src/middleware/csrf');
const { User, Clinic } = require('../src/models');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../src/config/constants');
const authService = require('../src/services/authService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('RBAC, Clinic-Scoping & Middleware Chain (Phase 3)', () => {
  let clinicA;
  let clinicB;
  let patientUser;
  let clinicAdminA;
  let adminUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) return;

    await User.deleteMany({});
    await Clinic.deleteMany({});

    clinicA = await Clinic.create({
      name: 'Clinic Alpha',
      address: '100 Alpha St',
      city: 'Mumbai',
      contactEmail: 'alpha@docyra.app',
      contactPhone: '1111111111'
    });

    clinicB = await Clinic.create({
      name: 'Clinic Beta',
      address: '200 Beta St',
      city: 'Delhi',
      contactEmail: 'beta@docyra.app',
      contactPhone: '2222222222'
    });

    patientUser = await User.create({
      name: 'Patient User',
      email: 'patient@docyra.app',
      passwordHash: 'hash',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE
    });

    clinicAdminA = await User.create({
      name: 'Clinic A Admin',
      email: 'admin.a@docyra.app',
      passwordHash: 'hash',
      role: ROLES.CLINIC_ADMIN,
      clinicId: clinicA._id,
      status: USER_STATUS.ACTIVE
    });

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'superadmin@docyra.app',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE
    });
  });

  describe('RBAC (requireRole)', () => {
    // Setup a test express app with test routes
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());

    testApp.get('/test/admin-only', auth, requireRole(ROLES.ADMIN), (req, res) => {
      res.status(200).json({ success: true, data: 'admin-secret' });
    });

    testApp.get('/test/clinic-admin-only', auth, requireRole(ROLES.CLINIC_ADMIN), (req, res) => {
      res.status(200).json({ success: true, data: 'clinic-admin-secret' });
    });

    testApp.use(require('../src/middleware/errorHandler'));

    it('should reject a patient attempting to access admin route with 403 FORBIDDEN', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(patientUser);
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('should allow platform admin to access admin route with 200', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(adminUser);
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('admin-secret');
    });
  });

  describe('Clinic-Scoping (scopeClinic — R6.4, R6.5)', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());

    testApp.get('/test/clinic-data/:clinicId', auth, requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), scopeClinic, (req, res) => {
      res.status(200).json({ success: true, scopedToClinic: req.clinicId });
    });

    testApp.use(require('../src/middleware/errorHandler'));

    it('should allow Clinic Admin A to access Clinic A data', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(clinicAdminA);
      const res = await request(testApp)
        .get(`/test/clinic-data/${clinicA._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scopedToClinic.toString()).toBe(clinicA._id.toString());
    });

    it('should reject Clinic Admin A attempting to access Clinic B data with 403 CLINIC_ACCESS_DENIED', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(clinicAdminA);
      const res = await request(testApp)
        .get(`/test/clinic-data/${clinicB._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.CLINIC_ACCESS_DENIED);
    });
  });

  describe('CSRF Protection (Double-submit cookie)', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());
    testApp.use(csrf);

    testApp.post('/test/mutate', (req, res) => {
      res.status(200).json({ success: true, data: 'mutated' });
    });

    testApp.use(require('../src/middleware/errorHandler'));

    it('should reject mutating request when cookie is set but X-CSRF-Token is missing/mismatched', async () => {
      const res = await request(testApp)
        .post('/test/mutate')
        .set('Cookie', ['csrfToken=valid_secret_token_123'])
        .set('X-CSRF-Token', 'wrong_token')
        .send({ test: true });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.CSRF_TOKEN_INVALID);
    });

    it('should allow mutating request when cookie matches X-CSRF-Token header', async () => {
      const token = 'valid_secret_token_abc_123';
      const res = await request(testApp)
        .post('/test/mutate')
        .set('Cookie', [`csrfToken=${token}`])
        .set('X-CSRF-Token', token)
        .send({ test: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('mutated');
    });
  });
});
