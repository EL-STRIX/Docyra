const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AppointmentSlot,
  Appointment,
  Review,
  Waitlist,
  AuditLog,
  SystemSettings
} = require('../src/models');
const { ROLES, USER_STATUS, APPOINTMENT_STATUS, REVIEW_STATUS } = require('../src/config/constants');
const authService = require('../src/services/authService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Phase 7: Reviews, Waitlist & Compliance Audit Logging', () => {
  let adminUser, doctorUser, patient1, patient2;
  let adminToken, doctorToken, patient1Token, patient2Token;
  let testClinic, testSpec, testSlot, completedAppointment, futureAppointment;

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
      Review.deleteMany({}),
      Waitlist.deleteMany({}),
      AuditLog.deleteMany({}),
      SystemSettings.deleteMany({})
    ]);

    await SystemSettings.create({
      defaultSlotDurationMinutes: 30,
      cancellationWindowHours: 2,
      waitlistClaimWindowMinutes: 30
    });

    testClinic = await Clinic.create({
      name: 'Central Health Clinic',
      address: '100 Medical Blvd',
      city: 'New York',
      contactEmail: 'central@docyra.test',
      contactPhone: '+1234567890'
    });

    testSpec = await Specialization.create({
      name: 'Cardiology',
      slug: 'cardiology'
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@docyra.test',
      passwordHash: 'hashedpassword',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE
    });
    adminToken = authService.generateTokenPair(adminUser).accessToken;

    doctorUser = await User.create({
      name: 'Dr. Jane Smith',
      email: 'doctor@docyra.test',
      passwordHash: 'hashedpassword',
      role: ROLES.DOCTOR,
      status: USER_STATUS.ACTIVE
    });
    doctorToken = authService.generateTokenPair(doctorUser).accessToken;

    await DoctorProfile.create({
      userId: doctorUser._id,
      clinicId: testClinic._id,
      specializationId: testSpec._id,
      status: 'approved',
      consultationFee: 150,
      avgRating: 0,
      totalReviews: 0
    });

    patient1 = await User.create({
      name: 'John Patient',
      email: 'patient1@docyra.test',
      passwordHash: 'hashedpassword',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE
    });
    patient1Token = authService.generateTokenPair(patient1).accessToken;

    patient2 = await User.create({
      name: 'Alice Second',
      email: 'patient2@docyra.test',
      passwordHash: 'hashedpassword',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE
    });
    patient2Token = authService.generateTokenPair(patient2).accessToken;

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    testSlot = await AppointmentSlot.create({
      doctorId: doctorUser._id,
      clinicId: testClinic._id,
      slotStart: futureDate,
      slotEnd: new Date(futureDate.getTime() + 30 * 60 * 1000),
      isBooked: true
    });

    completedAppointment = await Appointment.create({
      doctorId: doctorUser._id,
      patientId: patient1._id,
      clinicId: testClinic._id,
      slotId: testSlot._id,
      slotStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
      slotEnd: new Date(Date.now() - 90 * 60 * 1000),
      status: APPOINTMENT_STATUS.COMPLETED,
      bookedForType: 'self',
      bookedForId: patient1._id,
      bookedForModel: 'User'
    });

    const futureSlot2 = await AppointmentSlot.create({
      doctorId: doctorUser._id,
      clinicId: testClinic._id,
      slotStart: new Date(futureDate.getTime() + 60 * 60 * 1000),
      slotEnd: new Date(futureDate.getTime() + 90 * 60 * 1000),
      isBooked: true
    });

    futureAppointment = await Appointment.create({
      doctorId: doctorUser._id,
      patientId: patient1._id,
      clinicId: testClinic._id,
      slotId: futureSlot2._id,
      slotStart: futureSlot2.slotStart,
      slotEnd: futureSlot2.slotEnd,
      status: APPOINTMENT_STATUS.CONFIRMED,
      bookedForType: 'self',
      bookedForId: patient1._id,
      bookedForModel: 'User'
    });
  });

  describe('Review Service & Recalculation', () => {
    it('blocks review submission on uncompleted appointments', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: futureAppointment._id,
          rating: 5,
          comment: 'Doctor was great!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('submits valid review for completed appointment and updates doctor avgRating', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: completedAppointment._id,
          rating: 5,
          comment: 'Outstanding care and very professional.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.status).toBe(REVIEW_STATUS.PUBLISHED);

      const doctorProfile = await DoctorProfile.findOne({ userId: doctorUser._id });
      expect(doctorProfile.avgRating).toBe(5);
      expect(doctorProfile.totalReviews).toBe(1);
    });

    it('flags review containing profanity for moderation (P-8a)', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const slot2 = await AppointmentSlot.create({
        doctorId: doctorUser._id,
        clinicId: testClinic._id,
        slotStart: new Date(Date.now() - 5 * 60 * 60 * 1000),
        slotEnd: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isBooked: true
      });

      const apt2 = await Appointment.create({
        doctorId: doctorUser._id,
        patientId: patient2._id,
        clinicId: testClinic._id,
        slotId: slot2._id,
        slotStart: slot2.slotStart,
        slotEnd: slot2.slotEnd,
        status: APPOINTMENT_STATUS.COMPLETED,
        bookedForType: 'self',
        bookedForId: patient2._id,
        bookedForModel: 'User'
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          appointmentId: apt2._id,
          rating: 1,
          comment: 'This doctor was an absolute asshole and rude!'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.status).toBe(REVIEW_STATUS.FLAGGED);

      // Doctor avg rating should NOT be updated with flagged review
      const doctorProfile = await DoctorProfile.findOne({ userId: doctorUser._id });
      expect(doctorProfile.avgRating).toBe(0);
      expect(doctorProfile.totalReviews).toBe(0);

      // Admin can view flagged reviews
      const adminRes = await request(app)
        .get('/api/v1/reviews/admin/flagged')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBeGreaterThan(0);

      // Admin moderates the review to PUBLISHED
      const modRes = await request(app)
        .patch(`/api/v1/reviews/admin/${res.body.data.review._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: REVIEW_STATUS.PUBLISHED });

      expect(modRes.status).toBe(200);
      expect(modRes.body.data.status).toBe(REVIEW_STATUS.PUBLISHED);

      // Recalculation after moderation
      const updatedProfile = await DoctorProfile.findOne({ userId: doctorUser._id });
      expect(updatedProfile.avgRating).toBe(1);
      expect(updatedProfile.totalReviews).toBe(1);
    });
  });

  describe('Waitlist Service (FIFO trigger on cancellation)', () => {
    it('allows patient to join waitlist and triggers FIFO notification on appointment cancellation', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const waitStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const waitEndDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

      // Patient2 joins waitlist for doctor
      const joinRes = await request(app)
        .post('/api/v1/waitlist')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          doctorId: doctorUser._id,
          desiredDateRangeStart: waitStartDate,
          desiredDateRangeEnd: waitEndDate
        });

      expect(joinRes.status).toBe(201);
      expect(joinRes.body.data.status).toBe('waiting');

      // Patient1 cancels pending appointment in that window
      const cancelRes = await request(app)
        .patch(`/api/v1/appointments/${futureAppointment._id}/cancel`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ cancellationReason: 'Change of plans' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.appointment.status).toBe(APPOINTMENT_STATUS.CANCELLED);

      // Verify earliest waitlist entry was transitioned to 'notified' with a claim expiration
      const waitlistEntry = await Waitlist.findById(joinRes.body.data._id);
      expect(waitlistEntry.status).toBe('notified');
      expect(waitlistEntry.notifiedAt).toBeDefined();
      expect(waitlistEntry.claimExpiresAt).toBeDefined();
    });
  });

  describe('Compliance Audit Logging (R6.3)', () => {
    it('records and queries audit logs for PHI and sensitive actions', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // Submit a review to generate an audit log entry
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: completedAppointment._id,
          rating: 4,
          comment: 'Good overall experience.'
        });

      // Query audit logs as Admin
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const actions = res.body.data.map(log => log.action);
      expect(actions).toContain('REVIEW_SUBMITTED');
    });

    it('denies audit logs access to non-admins', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(403);
    });
  });
});
