const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { User, Clinic, DoctorProfile, Specialization } = require('../src/models');
const { ROLES, USER_STATUS } = require('../src/config/constants');
const authService = require('../src/services/authService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Clinics, Doctors & Specializations Domain (Phase 4)', () => {
  let adminUser;
  let clinicA;
  let clinicAdminA;
  let specializationCardio;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) return;

    await Promise.all([
      User.deleteMany({}),
      Clinic.deleteMany({}),
      DoctorProfile.deleteMany({}),
      Specialization.deleteMany({})
    ]);

    // Create Specialization
    specializationCardio = await Specialization.create({
      name: 'Cardiology',
      description: 'Heart and blood vessel health',
      icon: 'heart'
    });

    // Create Admin
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@docyra.app',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE
    });

    // Create Clinic A
    clinicA = await Clinic.create({
      name: 'Apollo Heart Clinic',
      address: '42 Health Blvd',
      city: 'Mumbai',
      contactEmail: 'apollo@docyra.app',
      contactPhone: '9998887770',
      subscriptionStatus: 'active',
      specializationIds: [specializationCardio._id]
    });

    // Create Clinic Admin A
    clinicAdminA = await User.create({
      name: 'Apollo Manager',
      email: 'apollo.manager@docyra.app',
      passwordHash: 'hash',
      role: ROLES.CLINIC_ADMIN,
      clinicId: clinicA._id,
      status: USER_STATUS.ACTIVE
    });
  });

  it('GET /api/v1/specializations should list all specializations publicly', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).get('/api/v1/specializations');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Cardiology');
  });

  it('POST /api/v1/admin/clinics should allow Admin to onboard a new clinic', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const { accessToken } = authService.generateTokenPair(adminUser);
    const res = await request(app)
      .post('/api/v1/admin/clinics')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Fortis Multi-Specialty Clinic',
        address: '500 Sector 18',
        city: 'Gurgaon',
        contactEmail: 'contact@fortis.in',
        contactPhone: '9876543210',
        specializationIds: [specializationCardio._id]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Fortis Multi-Specialty Clinic');
  });

  it('GET /api/v1/clinics should list active clinics publicly with pagination and filters', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app)
      .get('/api/v1/clinics?city=Mumbai')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Apollo Heart Clinic');
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('POST /api/v1/doctors/apply should register unapproved independent doctor', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app)
      .post('/api/v1/doctors/apply')
      .send({
        name: 'Dr. John Watson',
        email: 'dr.watson@docyra.app',
        password: 'DoctorPassword123',
        phone: '9123456789',
        specializationId: specializationCardio._id.toString(),
        qualifications: ['MBBS', 'MD'],
        bio: 'Experienced surgeon',
        consultationFee: 700,
        clinicAddress: '221B Baker Street'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.isApproved).toBe(false);
    expect(res.body.data.profile.clinicId).toBeNull();
  });

  it('PATCH /api/v1/admin/doctors/:id/approve should allow Admin to approve doctor', async () => {
    if (mongoose.connection.readyState !== 1) return;

    // First apply
    const applyRes = await request(app)
      .post('/api/v1/doctors/apply')
      .send({
        name: 'Dr. Gregory House',
        email: 'dr.house@docyra.app',
        password: 'DoctorPassword123',
        phone: '9123456788',
        specializationId: specializationCardio._id.toString(),
        qualifications: ['MD', 'Infectious Disease'],
        consultationFee: 1500
      });

    const profileId = applyRes.body.data.profile._id;

    // Approve as Admin
    const { accessToken } = authService.generateTokenPair(adminUser);
    const approveRes = await request(app)
      .patch(`/api/v1/admin/doctors/${profileId}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isApproved: true });

    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.isApproved).toBe(true);
  });

  it('POST /api/v1/clinic-admin/doctors should auto-approve doctor under own clinic', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const { accessToken } = authService.generateTokenPair(clinicAdminA);
    const res = await request(app)
      .post('/api/v1/clinic-admin/doctors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Dr. Clinic Associate',
        email: 'dr.associate@docyra.app',
        password: 'Password123',
        phone: '9888877777',
        specializationId: specializationCardio._id.toString(),
        qualifications: ['MBBS', 'MD'],
        consultationFee: 600
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.isApproved).toBe(true);
    expect(res.body.data.profile.clinicId.toString()).toBe(clinicA._id.toString());
  });

  it('GET /api/v1/clinic-admin/doctors should return doctors only for logged in clinic', async () => {
    if (mongoose.connection.readyState !== 1) return;

    // Add a doctor under Clinic A
    const { accessToken } = authService.generateTokenPair(clinicAdminA);
    await request(app)
      .post('/api/v1/clinic-admin/doctors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Dr. Clinic Associate 2',
        email: 'dr.associate2@docyra.app',
        password: 'Password123',
        specializationId: specializationCardio._id.toString(),
        qualifications: ['MBBS'],
        consultationFee: 500
      });

    const res = await request(app)
      .get('/api/v1/clinic-admin/doctors')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].clinicId.toString()).toBe(clinicA._id.toString());
  });
});
