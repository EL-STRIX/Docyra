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
  Waitlist,
  SystemSettings,
} from '../src/models/index.js';
import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS, APPOINTMENT_STATUS, REVIEW_STATUS } from '../src/config/constants.js';
import { auditService } from '../src/services/auditService.js';
import { waitlistService } from '../src/services/waitlistService.js';

let mongoServer;
let adminToken;
let patient1Token;
let patient2Token;
let doctor1Token;
let patient1User;
let patient2User;
let doctor1User;
let doctor1Profile;
let completedAppointment;
let confirmedAppointment;
let candidateSlot;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await SystemSettings.create({
    defaultSlotDurationMinutes: 30,
    cancellationWindowHours: 24,
  });

  // Admin
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

  // Specialization & Clinic
  const spec = await Specialization.create({ name: 'Neurology', iconName: 'Brain' });
  const clinic = await Clinic.create({
    name: 'Neuro Center',
    address: '100 Brain Ave',
    city: 'Bengaluru',
    contactEmail: 'info@neurocenter.test',
    contactPhone: '+91 80 1234 9999',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  // Doctor
  doctor1User = await User.create({
    name: 'Dr. Derek Shepherd',
    email: 'shepherd@docyra.test',
    passwordHash: 'hash',
    role: ROLES.DOCTOR,
    clinicId: clinic._id,
    status: USER_STATUS.ACTIVE,
  });

  doctor1Profile = await DoctorProfile.create({
    userId: doctor1User._id,
    clinicId: clinic._id,
    specializationId: spec._id,
    qualifications: ['MBBS', 'MCh'],
    consultationFee: 1500,
    isApproved: true,
  });

  doctor1Token = jwt.sign(
    { id: doctor1User._id.toString(), email: doctor1User.email, role: ROLES.DOCTOR, clinicId: clinic._id.toString() },
    env.JWT_ACCESS_SECRET
  );

  // Patients
  patient1User = await User.create({
    name: 'Elena Gilbert',
    email: 'elena@test.com',
    passwordHash: 'hash',
    role: ROLES.PATIENT,
    status: USER_STATUS.ACTIVE,
  });

  patient1Token = jwt.sign(
    { id: patient1User._id.toString(), email: patient1User.email, role: ROLES.PATIENT, clinicId: null },
    env.JWT_ACCESS_SECRET
  );

  patient2User = await User.create({
    name: 'Stefan Salvatore',
    email: 'stefan@test.com',
    passwordHash: 'hash',
    role: ROLES.PATIENT,
    status: USER_STATUS.ACTIVE,
  });

  patient2Token = jwt.sign(
    { id: patient2User._id.toString(), email: patient2User.email, role: ROLES.PATIENT, clinicId: null },
    env.JWT_ACCESS_SECRET
  );

  // Slots & Appointments
  const slot1 = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    slotEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    isBooked: true,
  });

  completedAppointment = await Appointment.create({
    patientId: patient1User._id,
    doctorId: doctor1Profile._id,
    clinicId: clinic._id,
    slotId: slot1._id,
    slotStart: slot1.slotStart,
    slotEnd: slot1.slotEnd,
    status: APPOINTMENT_STATUS.COMPLETED,
    reasonForVisit: 'Migraine follow up',
  });

  const slot2 = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    slotEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    isBooked: true,
  });

  confirmedAppointment = await Appointment.create({
    patientId: patient1User._id,
    doctorId: doctor1Profile._id,
    clinicId: clinic._id,
    slotId: slot2._id,
    slotStart: slot2.slotStart,
    slotEnd: slot2.slotEnd,
    status: APPOINTMENT_STATUS.CONFIRMED,
    reasonForVisit: 'Upcoming consult',
  });

  // Candidate Slot for Waitlist Test
  const waitlistSlotDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  candidateSlot = await AppointmentSlot.create({
    doctorId: doctor1Profile._id,
    slotStart: waitlistSlotDate,
    slotEnd: new Date(waitlistSlotDate.getTime() + 30 * 60 * 1000),
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

describe('Phase 7: Reviews, Waitlist & Audit Trail Tests', () => {
  describe('Doctor Reviews & Automated Moderation', () => {
    let createdReviewId;

    it('POST /api/v1/reviews should reject review submission for non-completed appointment', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: confirmedAppointment._id.toString(),
          rating: 5,
          comment: 'Doctor was great!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('completed');
    });

    it('POST /api/v1/reviews should submit review for completed appointment and recalculate doctor rating', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: completedAppointment._id.toString(),
          rating: 5,
          comment: 'Outstanding neurosurgeon, highly recommended!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(REVIEW_STATUS.PUBLISHED);
      createdReviewId = res.body.data._id;

      // Verify doctor profile avgRating is 5.0
      const updatedDoctor = await DoctorProfile.findById(doctor1Profile._id);
      expect(updatedDoctor.avgRating).toBe(5);
      expect(updatedDoctor.totalReviews).toBe(1);
    });

    it('POST /api/v1/reviews should reject duplicate review for same appointment', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          appointmentId: completedAppointment._id.toString(),
          rating: 4,
          comment: 'Second review attempt',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Profanity moderation: review containing flagged words must be marked status: flagged', async () => {
      // Create another completed appointment for patient2
      const slotProfanity = await AppointmentSlot.create({
        doctorId: doctor1Profile._id,
        slotStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        slotEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        isBooked: true,
      });

      const apptProfanity = await Appointment.create({
        patientId: patient2User._id,
        doctorId: doctor1Profile._id,
        slotId: slotProfanity._id,
        slotStart: slotProfanity.slotStart,
        slotEnd: slotProfanity.slotEnd,
        status: APPOINTMENT_STATUS.COMPLETED,
        reasonForVisit: 'Checkup',
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          appointmentId: apptProfanity._id.toString(),
          rating: 1,
          comment: 'This clinic is a complete scam and fraud!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe(REVIEW_STATUS.FLAGGED);
      expect(res.body.data.moderationNote).toContain('automated profanity filter');

      // Flagged review must NOT be included in public avgRating calculation
      const doctor = await DoctorProfile.findById(doctor1Profile._id);
      expect(doctor.avgRating).toBe(5); // Still 5.0 from the 1st published review
      expect(doctor.totalReviews).toBe(1);
    });

    it('PATCH /api/v1/reviews/:id should allow patient to edit review within 48h', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${createdReviewId}`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          rating: 4,
          comment: 'Great surgeon, polite and thorough explanation.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);

      const doctor = await DoctorProfile.findById(doctor1Profile._id);
      expect(doctor.avgRating).toBe(4);
    });

    it('GET /api/v1/reviews/doctor/:id should return published reviews for public view', async () => {
      const res = await request(app).get(`/api/v1/reviews/doctor/${doctor1Profile._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].patientId.name).toBe('Elena Gilbert');
    });

    it('DELETE /api/v1/reviews/:id should forbid doctors from deleting reviews', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${createdReviewId}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('FIFO Waitlist Queue & Cancellation Claims', () => {
    let waitlistEntryId;

    it('POST /api/v1/waitlists should allow patient to join waitlist for doctor', async () => {
      const startDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/waitlists')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          doctorId: doctor1Profile._id.toString(),
          desiredDateRangeStart: startDate,
          desiredDateRangeEnd: endDate,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('waiting');
      waitlistEntryId = res.body.data._id;
    });

    it('When a slot in date range becomes available, earliest waiting patient is notified', async () => {
      // Simulate cancellation trigger
      const candidate = await waitlistService.processCancellation(doctor1Profile._id, candidateSlot.slotStart);

      expect(candidate).toBeDefined();
      expect(candidate._id.toString()).toBe(waitlistEntryId.toString());
      expect(candidate.status).toBe('notified');
      expect(candidate.claimExpiresAt).toBeDefined();
    });

    it('POST /api/v1/waitlists/claim should allow notified patient to claim and book slot', async () => {
      const res = await request(app)
        .post('/api/v1/waitlists/claim')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          waitlistId: waitlistEntryId,
          slotId: candidateSlot._id.toString(),
          reasonForVisit: 'Claimed via waitlist for neuro checkup',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(APPOINTMENT_STATUS.CONFIRMED);

      // Verify waitlist status changed to claimed
      const updatedWaitlist = await Waitlist.findById(waitlistEntryId);
      expect(updatedWaitlist.status).toBe('claimed');
    });
  });

  describe('Compliance & Security Audit Trail', () => {
    beforeAll(async () => {
      // Record a test audit log event
      await auditService.log({
        actorId: patient1User._id,
        actorEmail: patient1User.email,
        actorRole: ROLES.PATIENT,
        action: 'APPOINTMENT_CREATED',
        resourceType: 'Appointment',
        resourceId: completedAppointment._id.toString(),
        ipAddress: '127.0.0.1',
        userAgent: 'JestTestRunner',
        metadata: { fee: 1500 },
      });
    });

    it('GET /api/v1/admin/audit-logs should return paginated audit logs for Platform Admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const log = res.body.data.find((l) => l.action === 'APPOINTMENT_CREATED');
      expect(log).toBeDefined();
      expect(log.actorEmail).toBe('elena@test.com');
      expect(log.resourceType).toBe('Appointment');
    });

    it('GET /api/v1/admin/audit-logs should forbid non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
