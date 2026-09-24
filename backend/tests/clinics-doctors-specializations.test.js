import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { User, Clinic, Specialization, DoctorProfile } from '../src/models/index.js';
import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS } from '../src/config/constants.js';

let mongoServer;
let adminToken;
let adminUser;
let clinic1;
let clinic2;
let clinic1AdminToken;
let specCardio;
let specDerma;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed Admin
  adminUser = await User.create({
    name: 'Platform Admin',
    email: 'admin@docyra.test',
    passwordHash: 'hash',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: ROLES.ADMIN, clinicId: null },
    env.JWT_ACCESS_SECRET
  );

  // Seed Specializations
  specCardio = await Specialization.create({ name: 'Cardiology', description: 'Heart care', iconName: 'HeartPulse' });
  specDerma = await Specialization.create({ name: 'Dermatology', description: 'Skin care', iconName: 'Sparkles' });

  // Seed Clinics
  clinic1 = await Clinic.create({
    name: 'Apollo City Hospital',
    address: '100 MG Road',
    city: 'Bengaluru',
    contactEmail: 'contact@apollo.test',
    contactPhone: '+91 80 1234 5678',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  clinic2 = await Clinic.create({
    name: 'CareFirst Center',
    address: '200 Park St',
    city: 'Mumbai',
    contactEmail: 'contact@carefirst.test',
    contactPhone: '+91 22 1234 5678',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  // Seed Clinic 1 Admin
  const clinic1Admin = await User.create({
    name: 'Apollo Manager',
    email: 'manager@apollo.test',
    passwordHash: 'hash',
    role: ROLES.CLINIC_ADMIN,
    clinicId: clinic1._id,
    status: USER_STATUS.ACTIVE,
  });

  clinic1AdminToken = jwt.sign(
    { id: clinic1Admin._id.toString(), email: clinic1Admin.email, role: ROLES.CLINIC_ADMIN, clinicId: clinic1._id.toString() },
    env.JWT_ACCESS_SECRET
  );
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Phase 4: Clinics, Doctors & Specializations Integration Tests', () => {
  describe('Specialization Management', () => {
    it('GET /api/v1/specializations should return all specializations publicly', async () => {
      const res = await request(app).get('/api/v1/specializations');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/v1/admin/specializations should allow Platform Admin to create specialization', async () => {
      const res = await request(app)
        .post('/api/v1/admin/specializations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurology', description: 'Brain disorders', iconName: 'Brain' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Neurology');
    });
  });

  describe('Clinic Management & Discovery', () => {
    it('GET /api/v1/clinics should list active clinics publicly with doctor counts', async () => {
      const res = await request(app).get('/api/v1/clinics?city=Bengaluru');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Apollo City Hospital');
      expect(res.body.data[0]).toHaveProperty('doctorCount');

      const allRes = await request(app).get('/api/v1/clinics');
      expect(allRes.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/v1/clinics/:id should return clinic details and doctor roster', async () => {
      const res = await request(app).get(`/api/v1/clinics/${clinic1._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clinic.name).toBe('Apollo City Hospital');
      expect(Array.isArray(res.body.data.doctors)).toBe(true);

      const res2 = await request(app).get(`/api/v1/clinics/${clinic2._id}`);
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.clinic.name).toBe('CareFirst Center');
    });

    it('POST /api/v1/admin/clinics should allow Platform Admin to onboard a new clinic', async () => {
      const res = await request(app)
        .post('/api/v1/admin/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fortis Health Point',
          address: '50 Ring Road',
          city: 'Delhi',
          contactEmail: 'desk@fortis.test',
          contactPhone: '+91 11 9876 5432',
          subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Fortis Health Point');
    });
  });

  describe('Independent Doctor Application & Admin Review Flow', () => {
    let appliedDoctorId;

    it('POST /api/v1/doctors/apply should allow doctor to apply with license upload (initially unapproved)', async () => {
      const res = await request(app)
        .post('/api/v1/doctors/apply')
        .field('name', 'Dr. Gregory House')
        .field('email', 'dr.house@docyra.test')
        .field('password', 'Password123')
        .field('phone', '+91 9999988888')
        .field('specializationId', specCardio._id.toString())
        .field('qualifications', 'MBBS, MD')
        .field('consultationFee', 900)
        .field('clinicAddress', 'Diagnostics Clinic, Suite 10')
        .attach('licenseFile', Buffer.from('Mock Medical License PDF content'), 'medical_license.pdf');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending_review');

      appliedDoctorId = res.body.data.applicationId;

      // Verify unapproved in database
      const profile = await DoctorProfile.findById(appliedDoctorId);
      expect(profile.isApproved).toBe(false);
      expect(profile.licenseDocumentUrl).toBeDefined();

      // Unapproved doctor must NOT appear in public doctor search
      const searchRes = await request(app).get('/api/v1/doctors?search=Gregory');
      expect(searchRes.body.data.length).toBe(0);
    });

    it('GET /api/v1/admin/doctors/applications should list pending applications for Platform Admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/doctors/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((a) => a._id.toString() === appliedDoctorId.toString())).toBe(true);
    });

    it('PATCH /api/v1/admin/doctors/:id/approve should approve the doctor application', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/doctors/${appliedDoctorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Now doctor MUST appear in public search
      const searchRes = await request(app).get('/api/v1/doctors?search=Gregory');
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].name).toBe('Dr. Gregory House');
      expect(searchRes.body.data[0].clinicName).toBeUndefined(); // Independent practitioner
    });
  });

  describe('Clinic Admin Doctor Management (Auto-Approved & Scoped)', () => {
    it('POST /api/v1/clinic-admin/doctors should add an auto-approved doctor to Clinic 1', async () => {
      const res = await request(app)
        .post('/api/v1/clinic-admin/doctors')
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .send({
          name: 'Dr. Meredith Grey',
          email: 'meredith.grey@apollo.test',
          password: 'Password123',
          phone: '+91 80 5555 4444',
          specializationId: specDerma._id.toString(),
          qualifications: ['MBBS', 'MS'],
          consultationFee: 700,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctorProfile.isApproved).toBe(true); // Auto-approved
      expect(res.body.data.doctorProfile.clinicId.toString()).toBe(clinic1._id.toString());

      // Appears in public search affiliated with Apollo
      const searchRes = await request(app).get('/api/v1/doctors?search=Meredith');
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].clinicName).toBe('Apollo City Hospital');
    });

    it('GET /api/v1/clinic-admin/doctors should list ONLY doctors belonging to Clinic 1', async () => {
      const res = await request(app)
        .get('/api/v1/clinic-admin/doctors')
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((doc) => doc.clinicId.toString() === clinic1._id.toString())).toBe(true);
    });
  });
});
