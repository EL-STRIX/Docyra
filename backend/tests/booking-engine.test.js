import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import { env } from '../src/config/env.js';
import {
  User,
  Clinic,
  Specialization,
  DoctorProfile,
  AppointmentSlot,
  Appointment,
  SystemSettings,
} from '../src/models/index.js';
import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS, APPOINTMENT_STATUS, BOOKED_FOR_TYPE } from '../src/config/constants.js';

let mongoServer;
let adminToken;
let patient1Token;
let patient2Token;
let doctor1Token;
let clinic1AdminToken;
let patient1User;
let patient2User;
let doctor1User;
let doctor1Profile;
let clinic1;
let futureSlot1;
let futureSlot2;
let nearFutureSlot;
let todaySlot;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize SystemSettings (24h cancellation window)
  await SystemSettings.create({
    defaultSlotDurationMinutes: 30,
    cancellationWindowHours: 24,
    defaultCurrency: 'INR',
    maxAdvanceBookingDays: 60,
  });

  // Create Admin
  const adminUser = await User.create({
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

  // Create Specialization
  const spec = await Specialization.create({ name: 'Cardiology', iconName: 'HeartPulse' });

  // Create Clinic
  clinic1 = await Clinic.create({
    name: 'Metro Heart Institute',
    address: '77 Medical Plaza',
    city: 'Bengaluru',
    contactEmail: 'desk@metroheart.test',
    contactPhone: '+91 80 7777 8888',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  // Create Clinic Admin
  const clinicAdminUser = await User.create({
    name: 'Metro Admin',
    email: 'admin@metroheart.test',
    passwordHash: 'hash',
    role: ROLES.CLINIC_ADMIN,
    clinicId: clinic1._id,
    status: USER_STATUS.ACTIVE,
  });

  clinic1AdminToken = jwt.sign(
    { id: clinicAdminUser._id.toString(), email: clinicAdminUser.email, role: ROLES.CLINIC_ADMIN, clinicId: clinic1._id.toString() },
    env.JWT_ACCESS_SECRET
  );

  // Create Doctor
  doctor1User = await User.create({
    name: 'Dr. Strange',
    email: 'dr.strange@docyra.test',
    passwordHash: 'hash',
    role: ROLES.DOCTOR,
    clinicId: clinic1._id,
    status: USER_STATUS.ACTIVE,
  });

  doctor1Profile = await DoctorProfile.create({
    userId: doctor1User._id,
    clinicId: clinic1._id,
    specializationId: spec._id,
    qualifications: ['MBBS', 'MS'],
    consultationFee: 1200,
    isApproved: true,
  });

  doctor1Token = jwt.sign(
    { id: doctor1User._id.toString(), email: doctor1User.email, role: ROLES.DOCTOR, clinicId: clinic1._id.toString() },
    env.JWT_ACCESS_SECRET
  );

  // Create Patients
  patient1User = await User.create({
    name: 'Alice Smith',
    email: 'alice.smith@test.com',
    passwordHash: 'hash',
    role: ROLES.PATIENT,
    status: USER_STATUS.ACTIVE,
  });

  patient1Token = jwt.sign(
    { id: patient1User._id.toString(), email: patient1User.email, role: ROLES.PATIENT, clinicId: null },
    env.JWT_ACCESS_SECRET
  );

  patient2User = await User.create({
    name: 'Bob Jones',
    email: 'bob.jones@test.com',
    passwordHash: 'hash',
    role: ROLES.PATIENT,
    status: USER_STATUS.ACTIVE,
  });

  patient2Token = jwt.sign(
    { id: patient2User._id.toString(), email: patient2User.email, role: ROLES.PATIENT, clinicId: null },
    env.JWT_ACCESS_SECRET
  );

  // Seed Slots:
  // 1. Future slot (5 days ahead, for race condition testing)
  const fiveDaysAhead = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  futureSlot1 = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: fiveDaysAhead,
    slotEnd: new Date(fiveDaysAhead.getTime() + 30 * 60 * 1000),
    isBooked: false,
  });

  // 2. Future slot 2 (6 days ahead, for normal booking and dependent booking)
  const sixDaysAhead = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  futureSlot2 = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: sixDaysAhead,
    slotEnd: new Date(sixDaysAhead.getTime() + 30 * 60 * 1000),
    isBooked: false,
  });

  // 3. Near-future slot (2 hours ahead, within 24h cancellation window)
  const twoHoursAhead = new Date(Date.now() + 2 * 60 * 60 * 1000);
  nearFutureSlot = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: twoHoursAhead,
    slotEnd: new Date(twoHoursAhead.getTime() + 30 * 60 * 1000),
    isBooked: false,
  });

  // 4. Today slot (for emergency unavailability test - 1 hour in future today)
  const todayTime = new Date(Date.now() + 60 * 60 * 1000);
  todaySlot = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: todayTime,
    slotEnd: new Date(todayTime.getTime() + 30 * 60 * 1000),
    isBooked: false,
  });
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Phase 6: Transactional Booking Engine & Status Lifecycle', () => {
  describe('Concurrent Double-Booking Race Condition Prevention (R7.1)', () => {
    it('Concurrent requests for the same slot: exactly ONE succeeds (201), the other fails (409)', async () => {
      // Send 2 simultaneous booking requests for futureSlot1
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${patient1Token}`)
          .send({
            doctorId: doctor1Profile._id.toString(),
            slotId: futureSlot1._id.toString(),
            reasonForVisit: 'Chest pain and palpitations',
          }),
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${patient2Token}`)
          .send({
            doctorId: doctor1Profile._id.toString(),
            slotId: futureSlot1._id.toString(),
            reasonForVisit: 'Routine cardiac checkup',
          }),
      ]);

      const statusCodes = [res1.statusCode, res2.statusCode].sort();
      expect(statusCodes).toEqual([201, 409]);

      // Verify slot in DB is booked
      const updatedSlot = await AppointmentSlot.findById(futureSlot1._id);
      expect(updatedSlot.isBooked).toBe(true);

      // Verify only ONE appointment was created in DB for futureSlot1
      const apptCount = await Appointment.countDocuments({ slotId: futureSlot1._id });
      expect(apptCount).toBe(1);
    });
  });

  describe('Dependent Family Member Management & Dependent Booking', () => {
    let dependentId;

    it('POST /api/v1/dependents should allow patient to register family member', async () => {
      const res = await request(app)
        .post('/api/v1/dependents')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          name: 'Tommy Smith',
          relationship: 'child',
          dateOfBirth: '2018-05-12',
          gender: 'male',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Tommy Smith');
      expect(res.body.data.relationship).toBe('child');
      dependentId = res.body.data._id;
    });

    it('GET /api/v1/dependents should list dependents for the patient', async () => {
      const res = await request(app)
        .get('/api/v1/dependents')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(dependentId);
    });

    it('POST /api/v1/appointments with bookedForType: "dependent" should link appointment to dependent', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId: doctor1Profile._id.toString(),
          slotId: futureSlot2._id.toString(),
          bookedForType: BOOKED_FOR_TYPE.DEPENDENT,
          bookedForId: dependentId,
          reasonForVisit: 'Pediatric arrhythmia consultation',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookedForType).toBe(BOOKED_FOR_TYPE.DEPENDENT);
      expect(res.body.data.bookedForId._id.toString()).toBe(dependentId);
    });
  });

  describe('Appointments Query & Clinic-Scoping', () => {
    it('GET /api/v1/appointments/my should list appointments for authenticated patient', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/my')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].doctorId).toBeDefined();
    });

    it('GET /api/v1/appointments/doctor should list appointments for logged-in doctor', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/doctor')
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/clinic-admin/appointments should return appointments strictly for their clinic', async () => {
      const res = await request(app)
        .get('/api/v1/clinic-admin/appointments')
        .set('Authorization', `Bearer ${clinic1AdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((a) => a.clinicId.toString() === clinic1._id.toString())).toBe(true);
    });
  });

  describe('Status Transitions & Cancellation Window Enforcement', () => {
    let cancellableAppointmentId;
    let lateAppointmentId;

    beforeAll(async () => {
      // Book the 2-hour-ahead near-future slot (for late cancellation test)
      const lateRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          doctorId: doctor1Profile._id.toString(),
          slotId: nearFutureSlot._id.toString(),
          reasonForVisit: 'Immediate checkup',
        });
      lateAppointmentId = lateRes.body.data._id;

      // Create and book a slot 10 days in the future (for valid cancellation test)
      const tenDaysAhead = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const slot10 = await AppointmentSlot.create({
        doctorId: doctor1Profile._id,
        slotStart: tenDaysAhead,
        slotEnd: new Date(tenDaysAhead.getTime() + 30 * 60 * 1000),
        isBooked: false,
      });

      const cancelRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId: doctor1Profile._id.toString(),
          slotId: slot10._id.toString(),
          reasonForVisit: 'Routine checkup',
        });
      cancellableAppointmentId = cancelRes.body.data._id;
    });

    it('PATCH /api/v1/appointments/:id/cancel should allow patient to cancel appointment well in advance', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${cancellableAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ reason: 'Travel schedule changed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(APPOINTMENT_STATUS.CANCELLED);
      expect(res.body.data.cancelledBy).toBe('patient');
    });

    it('PATCH /api/v1/appointments/:id/cancel should reject cancellation within 24h window for patient', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${lateAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ reason: 'Feeling better now' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('hours of the scheduled start time');
    });

    it('PATCH /api/v1/appointments/:id/status should allow Doctor to mark appointment completed', async () => {
      // Find an appointment for doctor1
      const appt = await Appointment.findOne({ doctorId: doctor1Profile._id, status: APPOINTMENT_STATUS.CONFIRMED });
      expect(appt).toBeDefined();

      const res = await request(app)
        .patch(`/api/v1/appointments/${appt._id}/status`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ status: APPOINTMENT_STATUS.COMPLETED });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(APPOINTMENT_STATUS.COMPLETED);
    });

    it('PATCH /api/v1/appointments/:id/status should reject invalid status transitions', async () => {
      const appt = await Appointment.findOne({ doctorId: doctor1Profile._id, status: APPOINTMENT_STATUS.COMPLETED });

      // Completed cannot transition back to pending
      const res = await request(app)
        .patch(`/api/v1/appointments/${appt._id}/status`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ status: APPOINTMENT_STATUS.CONFIRMED });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/appointments/:id should allow Platform Admin to view any appointment', async () => {
      const appt = await Appointment.findOne({ doctorId: doctor1Profile._id });
      const res = await request(app)
        .get(`/api/v1/appointments/${appt._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(appt._id.toString());
    });
  });

  describe('Emergency Unavailability & iCalendar Export', () => {
    it('POST /api/v1/doctors/:id/emergency-unavailable should bulk-cancel today appointments', async () => {
      // Book the today slot first
      const bookTodayRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          doctorId: doctor1Profile._id.toString(),
          slotId: todaySlot._id.toString(),
          reasonForVisit: 'Urgent consult',
        });
      expect(bookTodayRes.statusCode).toBe(201);

      // Doctor triggers emergency unavailability
      const res = await request(app)
        .post(`/api/v1/doctors/${doctor1Profile._id}/emergency-unavailable`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affectedAppointmentsCount).toBeGreaterThanOrEqual(1);

      // Verify today's appointment status is cancelledBy doctor-emergency
      const updatedAppt = await Appointment.findById(bookTodayRes.body.data._id);
      expect(updatedAppt.status).toBe(APPOINTMENT_STATUS.CANCELLED);
      expect(updatedAppt.cancelledBy).toBe('doctor-emergency');
    });

    it('GET /api/v1/appointments/:id/ics should generate standard RFC 5545 iCalendar export', async () => {
      const appt = await Appointment.findOne({ patientId: patient1User._id });
      expect(appt).toBeDefined();

      const res = await request(app)
        .get(`/api/v1/appointments/${appt._id}/ics`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.headers['content-disposition']).toContain('.ics');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain('SUMMARY:Medical Appointment with Dr. Strange');
      expect(res.text).toContain('END:VCALENDAR');
    });
  });
});
