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
  Dependent,
  SystemSettings
} = require('../src/models');
const { ROLES, USER_STATUS, APPOINTMENT_STATUS, ERROR_CODES } = require('../src/config/constants');
const authService = require('../src/services/authService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Booking Engine & Transactional Safety (Phase 6 - R7.1, R10.2)', () => {
  let patient1;
  let patient2;
  let doctorUser;
  let clinic;
  let clinicAdmin;
  let testSlot;
  let specialization;

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
      SystemSettings.deleteMany({})
    ]);

    await SystemSettings.create({
      defaultSlotDurationMinutes: 30,
      cancellationWindowHours: 2,
      defaultCurrency: 'INR'
    });

    specialization = await Specialization.create({
      name: 'Cardiology',
      icon: 'heart'
    });

    clinic = await Clinic.create({
      name: 'Max Health Clinic',
      address: '100 Max Road',
      city: 'Mumbai',
      contactEmail: 'max@docyra.app',
      contactPhone: '9988776655'
    });

    doctorUser = await User.create({
      name: 'Dr. House',
      email: 'dr.house@docyra.app',
      passwordHash: 'hash',
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      status: USER_STATUS.ACTIVE
    });

    await DoctorProfile.create({
      userId: doctorUser._id,
      clinicId: clinic._id,
      specializationId: specialization._id,
      consultationFee: 500,
      isApproved: true,
      manualApprovalMode: false
    });

    clinicAdmin = await User.create({
      name: 'Max Clinic Admin',
      email: 'admin.max@docyra.app',
      passwordHash: 'hash',
      role: ROLES.CLINIC_ADMIN,
      clinicId: clinic._id,
      status: USER_STATUS.ACTIVE
    });

    patient1 = await User.create({
      name: 'Alice Patient',
      email: 'alice@docyra.app',
      passwordHash: 'hash',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE
    });

    patient2 = await User.create({
      name: 'Bob Patient',
      email: 'bob@docyra.app',
      passwordHash: 'hash',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE
    });

    // Create a bookable slot 48 hours in the future
    const slotStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    testSlot = await AppointmentSlot.create({
      doctorId: doctorUser._id,
      slotStart,
      slotEnd,
      isBooked: false
    });
  });

  describe('Race Condition & Transactional Safety (R7.1, R10.2)', () => {
    it('CONCURRENT BOOKING TEST: exactly one of two simultaneous requests for the same slot must succeed, the other must fail with 409', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const token1 = authService.generateTokenPair(patient1).accessToken;
      const token2 = authService.generateTokenPair(patient2).accessToken;

      // Fire two concurrent requests for the exact same slot
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${token1}`)
          .send({
            slotId: testSlot._id.toString(),
            bookedForType: 'self',
            reasonForVisit: 'Alice first booking'
          }),
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${token2}`)
          .send({
            slotId: testSlot._id.toString(),
            bookedForType: 'self',
            reasonForVisit: 'Bob concurrent booking'
          })
      ]);

      const statusCodes = [res1.statusCode, res2.statusCode].sort();
      expect(statusCodes).toEqual([201, 409]);

      const conflictRes = res1.statusCode === 409 ? res1 : res2;
      expect(conflictRes.body.error.code).toBe(ERROR_CODES.SLOT_ALREADY_BOOKED);

      // Verify DB state: exactly 1 appointment created, slot is marked isBooked: true
      const appointmentsCount = await Appointment.countDocuments({ slotId: testSlot._id });
      expect(appointmentsCount).toBe(1);

      const updatedSlot = await AppointmentSlot.findById(testSlot._id);
      expect(updatedSlot.isBooked).toBe(true);
    });
  });

  describe('Dependent Booking (P-5a)', () => {
    it('should allow patient to add dependent and book an appointment for them', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(patient1);

      // 1. Add dependent
      const depRes = await request(app)
        .post('/api/v1/dependents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Tommy Patient',
          relationship: 'Son',
          dateOfBirth: '2019-06-10'
        });

      expect(depRes.statusCode).toBe(201);
      const dependentId = depRes.body.data._id;

      // 2. Book slot for dependent
      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          slotId: testSlot._id.toString(),
          bookedForType: 'dependent',
          bookedForId: dependentId,
          reasonForVisit: 'Child checkup'
        });

      expect(bookRes.statusCode).toBe(201);
      expect(bookRes.body.data.appointment.bookedForType).toBe('dependent');
      expect(bookRes.body.data.appointment.bookedForId.toString()).toBe(dependentId.toString());
    });
  });

  describe('Appointment Retrieval & Scoping (P-6, D-2, CA-1)', () => {
    it('Patient, Doctor, and Clinic Admin should retrieve correct scoped appointments', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const patientToken = authService.generateTokenPair(patient1).accessToken;
      const doctorToken = authService.generateTokenPair(doctorUser).accessToken;
      const clinicAdminToken = authService.generateTokenPair(clinicAdmin).accessToken;

      // Book appointment
      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ slotId: testSlot._id.toString(), bookedForType: 'self' });

      const appointmentId = bookRes.body.data.appointment._id;

      // 1. Patient view
      const patRes = await request(app)
        .get('/api/v1/appointments/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(patRes.statusCode).toBe(200);
      expect(patRes.body.data.length).toBe(1);

      // 2. Doctor view
      const docRes = await request(app)
        .get('/api/v1/appointments/doctor')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(docRes.statusCode).toBe(200);
      expect(docRes.body.data.length).toBe(1);

      // 3. Clinic Admin view
      const caRes = await request(app)
        .get('/api/v1/clinic-admin/appointments')
        .set('Authorization', `Bearer ${clinicAdminToken}`);
      expect(caRes.statusCode).toBe(200);
      expect(caRes.body.data.length).toBe(1);

      // 4. Detail view
      const detailRes = await request(app)
        .get(`/api/v1/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.body.data._id.toString()).toBe(appointmentId.toString());
    });
  });

  describe('Cancellation & Cancellation Window Enforcement (P-6)', () => {
    it('should allow cancellation before window and free the slot', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(patient1);

      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ slotId: testSlot._id.toString(), bookedForType: 'self' });

      const appointmentId = bookRes.body.data.appointment._id;

      const cancelRes = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ cancellationReason: 'Change of travel plans' });

      expect(cancelRes.statusCode).toBe(200);
      expect(cancelRes.body.data.appointment.status).toBe(APPOINTMENT_STATUS.CANCELLED);

      // Verify slot is freed
      const slot = await AppointmentSlot.findById(testSlot._id);
      expect(slot.isBooked).toBe(false);
    });

    it('should reject patient cancellation within cancellation window (2 hours)', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(patient1);

      // Slot in 30 minutes (within 2 hr window)
      const soonStart = new Date(Date.now() + 30 * 60 * 1000);
      const soonSlot = await AppointmentSlot.create({
        doctorId: doctorUser._id,
        slotStart: soonStart,
        slotEnd: new Date(soonStart.getTime() + 30 * 60 * 1000),
        isBooked: false
      });

      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ slotId: soonSlot._id.toString(), bookedForType: 'self' });

      const appointmentId = bookRes.body.data.appointment._id;

      const cancelRes = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.statusCode).toBe(400);
      expect(cancelRes.body.error.code).toBe(ERROR_CODES.CANCELLATION_WINDOW_EXPIRED);
    });
  });

  describe('Doctor Emergency Unavailability Flow (D-2a)', () => {
    it('should bulk cancel today appointments and free slots', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const patientToken = authService.generateTokenPair(patient1).accessToken;
      const doctorToken = authService.generateTokenPair(doctorUser).accessToken;

      // Slot for today
      const todaySlot = await AppointmentSlot.create({
        doctorId: doctorUser._id,
        slotStart: new Date(),
        slotEnd: new Date(Date.now() + 30 * 60 * 1000),
        isBooked: false
      });

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ slotId: todaySlot._id.toString(), bookedForType: 'self' });

      // Trigger emergency unavailability
      const emergRes = await request(app)
        .post(`/api/v1/doctors/${doctorUser._id}/emergency-unavailable`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(emergRes.statusCode).toBe(200);
      expect(emergRes.body.data.cancelledCount).toBe(1);

      const apt = await Appointment.findOne({ slotId: todaySlot._id });
      expect(apt.status).toBe(APPOINTMENT_STATUS.CANCELLED);
      expect(apt.cancelledBy).toBe('doctor-emergency');
    });
  });

  describe('Calendar Export (P-6b)', () => {
    it('GET /api/v1/appointments/:id/ics should return valid iCalendar file', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const { accessToken } = authService.generateTokenPair(patient1);

      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ slotId: testSlot._id.toString(), bookedForType: 'self' });

      const appointmentId = bookRes.body.data.appointment._id;

      const icsRes = await request(app)
        .get(`/api/v1/appointments/${appointmentId}/ics`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(icsRes.statusCode).toBe(200);
      expect(icsRes.headers['content-type']).toContain('text/calendar');
      expect(icsRes.text).toContain('BEGIN:VCALENDAR');
      expect(icsRes.text).toContain('BEGIN:VEVENT');
      expect(icsRes.text).toContain('Dr. House');
    });
  });
});
