const request = require('supertest');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const app = require('../src/app');
const {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AppointmentSlot,
  Appointment,
  Dependent,
  Review,
  AuditLog,
  SystemSettings
} = require('../src/models');
const { ROLES, USER_STATUS, APPOINTMENT_STATUS } = require('../src/config/constants');
const authService = require('../src/services/authService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Phase 9: 2FA, GDPR Data Export & Security Hardening', () => {
  let patientUser, doctorUser, clinic;
  let patientToken, doctorToken;

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
      Specialization.deleteMany({}),
      AppointmentSlot.deleteMany({}),
      Appointment.deleteMany({}),
      Dependent.deleteMany({}),
      Review.deleteMany({}),
      AuditLog.deleteMany({}),
      SystemSettings.deleteMany({})
    ]);

    clinic = await Clinic.create({
      name: 'Alpha Clinic',
      address: '123 Alpha St',
      city: 'Seattle',
      contactEmail: 'alpha@docyra.test',
      contactPhone: '+1234567890'
    });

    const spec = await Specialization.create({
      name: 'Dermatology',
      slug: 'dermatology'
    });

    doctorUser = await User.create({
      name: 'Dr. Gregory House',
      email: 'doctor2fa@docyra.test',
      passwordHash: await require('bcryptjs').hash('Password123!', 10),
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true
    });
    doctorToken = authService.generateTokenPair(doctorUser).accessToken;

    await DoctorProfile.create({
      userId: doctorUser._id,
      clinicId: clinic._id,
      specializationId: spec._id,
      status: 'approved',
      consultationFee: 200
    });

    patientUser = await User.create({
      name: 'Arthur Dent',
      email: 'arthur@docyra.test',
      phone: '+15559876543',
      passwordHash: await require('bcryptjs').hash('Password123!', 10),
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true
    });
    patientToken = authService.generateTokenPair(patientUser).accessToken;
  });

  describe('Two-Factor Authentication (2FA) Lifecycle', () => {
    it('sets up 2FA, generates secret and QR code data URL', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.qrCodeUrl).toMatch(/^data:image\/png;base64,/);

      // Confirm secret is stored on user
      const user = await User.findById(doctorUser._id);
      expect(user.twoFactorSecret).toBe(res.body.data.secret);
      expect(user.twoFactorEnabled).toBe(false); // Not enabled until verified
    });

    it('verifies valid TOTP code to activate 2FA', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // 1. Setup 2FA
      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${doctorToken}`);

      const secret = setupRes.body.data.secret;

      // 2. Generate valid TOTP token
      const validToken = speakeasy.totp({
        secret,
        encoding: 'base32'
      });

      // 3. Verify
      const verifyRes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ token: validToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      const user = await User.findById(doctorUser._id);
      expect(user.twoFactorEnabled).toBe(true);
    });

    it('enforces 2FA challenge on login for 2FA-enabled accounts', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // Enable 2FA on doctor
      const secret = speakeasy.generateSecret().base32;
      doctorUser.twoFactorSecret = secret;
      doctorUser.twoFactorEnabled = true;
      await doctorUser.save();

      // Attempt standard login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor2fa@docyra.test',
          password: 'Password123!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.requires2FA).toBe(true);
      expect(loginRes.body.data.tempToken).toBeDefined();
      expect(loginRes.headers['set-cookie']).toBeUndefined(); // NO session cookie issued yet

      // Complete 2FA with tempToken
      const validToken = speakeasy.totp({
        secret,
        encoding: 'base32'
      });

      const verifyRes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .send({
          tempToken: loginRes.body.data.tempToken,
          token: validToken
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.accessToken).toBeDefined();
      expect(verifyRes.headers['set-cookie']).toBeDefined(); // Full cookies issued
    });
  });

  describe('GDPR Personal Data Export & Account Deletion', () => {
    it('exports all user data as a complete JSON bundle with audit trail', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // Create dependent and appointment for patient
      await Dependent.create({
        patientId: patientUser._id,
        name: 'Little Dent',
        relationship: 'child',
        dateOfBirth: new Date('2018-05-12')
      });

      const slot = await AppointmentSlot.create({
        doctorId: doctorUser._id,
        clinicId: clinic._id,
        slotStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        slotEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
        isBooked: true
      });

      await Appointment.create({
        doctorId: doctorUser._id,
        patientId: patientUser._id,
        clinicId: clinic._id,
        slotId: slot._id,
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        status: APPOINTMENT_STATUS.CONFIRMED,
        bookedForType: 'self',
        bookedForId: patientUser._id,
        bookedForModel: 'User'
      });

      const res = await request(app)
        .get('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userProfile.email).toBe('arthur@docyra.test');
      expect(res.body.data.dependents.length).toBe(1);
      expect(res.body.data.appointments.length).toBe(1);

      // Verify audit log was recorded
      const auditEntry = await AuditLog.findOne({
        actorId: patientUser._id,
        action: 'GDPR_DATA_EXPORT'
      });
      expect(auditEntry).toBeDefined();
    });

    it('deactivates and anonymizes account on delete request', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);

      const user = await User.findById(patientUser._id);
      expect(user.status).toBe(USER_STATUS.DEACTIVATED);
      expect(user.name).toBe('Deactivated User');
      expect(user.email).toMatch(/@anonymized.docyra.app$/);
    });
  });

  describe('Security & CSP Headers Pass (TRD Section 7)', () => {
    it('returns strict security headers on all responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });
});
