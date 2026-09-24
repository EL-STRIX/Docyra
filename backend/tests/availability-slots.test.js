import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { User, Clinic, Specialization, DoctorProfile, AvailabilityRule, AppointmentSlot, SystemSettings } from '../src/models/index.js';
import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS } from '../src/config/constants.js';
import { slotService } from '../src/services/slotService.js';

let mongoServer;
let adminToken;
let doctor1Token;
let doctor2Token;
let clinic1AdminToken;
let doctor1Profile;
let doctor2Profile;
let clinic1;
let clinic2;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize SystemSettings
  await SystemSettings.create({
    defaultSlotDurationMinutes: 30,
    cancellationWindowHours: 24,
    defaultCurrency: 'INR',
    maxAdvanceBookingDays: 60,
  });

  // Create Platform Admin
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
  const spec = await Specialization.create({ name: 'General Medicine', iconName: 'Stethoscope' });

  // Create Clinics
  clinic1 = await Clinic.create({
    name: 'City Care Hospital',
    address: '123 Main St',
    city: 'Bengaluru',
    contactEmail: 'care@cityhospital.test',
    contactPhone: '+91 80 1111 2222',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  clinic2 = await Clinic.create({
    name: 'Metro Medical',
    address: '456 Cross Rd',
    city: 'Delhi',
    contactEmail: 'desk@metromedical.test',
    contactPhone: '+91 11 3333 4444',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  // Create Clinic 1 Admin
  const clinic1Admin = await User.create({
    name: 'Clinic 1 Admin',
    email: 'admin@cityhospital.test',
    passwordHash: 'hash',
    role: ROLES.CLINIC_ADMIN,
    clinicId: clinic1._id,
    status: USER_STATUS.ACTIVE,
  });

  clinic1AdminToken = jwt.sign(
    { id: clinic1Admin._id.toString(), email: clinic1Admin.email, role: ROLES.CLINIC_ADMIN, clinicId: clinic1._id.toString() },
    env.JWT_ACCESS_SECRET
  );

  // Create Doctor 1 (Affiliated with Clinic 1)
  const doctor1User = await User.create({
    name: 'Dr. Gregory House',
    email: 'house@docyra.test',
    passwordHash: 'hash',
    role: ROLES.DOCTOR,
    clinicId: clinic1._id,
    status: USER_STATUS.ACTIVE,
  });

  doctor1Profile = await DoctorProfile.create({
    userId: doctor1User._id,
    clinicId: clinic1._id,
    specializationId: spec._id,
    qualifications: ['MBBS', 'MD'],
    consultationFee: 1000,
    isApproved: true,
  });

  doctor1Token = jwt.sign(
    { id: doctor1User._id.toString(), email: doctor1User.email, role: ROLES.DOCTOR, clinicId: clinic1._id.toString() },
    env.JWT_ACCESS_SECRET
  );

  // Create Doctor 2 (Affiliated with Clinic 2)
  const doctor2User = await User.create({
    name: 'Dr. John Watson',
    email: 'watson@docyra.test',
    passwordHash: 'hash',
    role: ROLES.DOCTOR,
    clinicId: clinic2._id,
    status: USER_STATUS.ACTIVE,
  });

  doctor2Profile = await DoctorProfile.create({
    userId: doctor2User._id,
    clinicId: clinic2._id,
    specializationId: spec._id,
    qualifications: ['MBBS'],
    consultationFee: 600,
    isApproved: true,
  });

  doctor2Token = jwt.sign(
    { id: doctor2User._id.toString(), email: doctor2User.email, role: ROLES.DOCTOR, clinicId: clinic2._id.toString() },
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

describe('Phase 5: Availability Rules & Slot Generation Engine Tests', () => {
  describe('Availability Rules Management & Scoping', () => {
    it('PUT /api/v1/doctors/:id/availability should allow a doctor to set their own recurring availability', async () => {
      const res = await request(app)
        .put(`/api/v1/doctors/${doctor1Profile._id}/availability`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          rules: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 }, // Monday
            { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 }, // Wednesday
            { dayOfWeek: 5, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30 }, // Friday
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(3);
      expect(res.body.data.slotGeneration).toBeDefined();

      const rulesInDb = await AvailabilityRule.find({ doctorId: doctor1Profile._id });
      expect(rulesInDb.length).toBe(3);
    });

    it('PUT /api/v1/doctors/:id/availability should reject invalid time ranges (endTime <= startTime)', async () => {
      const res = await request(app)
        .put(`/api/v1/doctors/${doctor1Profile._id}/availability`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          rules: [
            { dayOfWeek: 2, startTime: '16:00', endTime: '14:00', slotDurationMinutes: 30 },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/v1/doctors/:id/availability should forbid Doctor 2 from modifying Doctor 1 rules', async () => {
      const res = await request(app)
        .put(`/api/v1/doctors/${doctor1Profile._id}/availability`)
        .set('Authorization', `Bearer ${doctor2Token}`)
        .send({
          rules: [
            { dayOfWeek: 2, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
          ],
        });

      expect(res.statusCode).toBe(403);
    });

    it('PUT /api/v1/doctors/:id/availability should allow Clinic 1 Admin to manage Doctor 1 (same clinic)', async () => {
      const res = await request(app)
        .put(`/api/v1/doctors/${doctor1Profile._id}/availability`)
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .send({
          rules: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
            { dayOfWeek: 4, startTime: '14:00', endTime: '16:00', slotDurationMinutes: 30 },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rules.length).toBe(2);
    });

    it('PUT /api/v1/doctors/:id/availability should forbid Clinic 1 Admin from modifying Doctor 2 (different clinic)', async () => {
      const res = await request(app)
        .put(`/api/v1/doctors/${doctor2Profile._id}/availability`)
        .set('Authorization', `Bearer ${clinic1AdminToken}`)
        .send({
          rules: [
            { dayOfWeek: 2, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
          ],
        });

      expect(res.statusCode).toBe(403);
    });

    it('GET /api/v1/doctors/:id/availability should return active rules', async () => {
      const res = await request(app)
        .get(`/api/v1/doctors/${doctor1Profile._id}/availability`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('Slot Generation Engine & Idempotency', () => {
    it('POST /api/v1/admin/jobs/generate-slots should trigger slot generation across all doctors', async () => {
      const res = await request(app)
        .post('/api/v1/admin/jobs/generate-slots')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctorsProcessed).toBeGreaterThanOrEqual(1);

      const doctor1Slots = await AppointmentSlot.find({ doctorId: doctor1Profile._id });
      expect(doctor1Slots.length).toBeGreaterThan(0);
    });

    it('Slot generation MUST be completely idempotent (re-running creates 0 duplicates and retains existing)', async () => {
      const initialCount = await AppointmentSlot.countDocuments({ doctorId: doctor1Profile._id });
      expect(initialCount).toBeGreaterThan(0);

      // Re-run generation for doctor 1
      const rerunResult = await slotService.generateSlotsForDoctor(doctor1Profile._id);

      expect(rerunResult.newSlotsCreated).toBe(0);
      expect(rerunResult.existingSlotsRetained).toBeGreaterThan(0);

      const afterCount = await AppointmentSlot.countDocuments({ doctorId: doctor1Profile._id });
      expect(afterCount).toBe(initialCount);
    });

    it('Re-running slot generation MUST NOT overwrite booked status of an existing slot', async () => {
      // Pick one slot and simulate booking it
      const slot = await AppointmentSlot.findOne({ doctorId: doctor1Profile._id });
      expect(slot).toBeDefined();

      slot.isBooked = true;
      await slot.save();

      // Run slot generation again
      await slotService.generateSlotsForDoctor(doctor1Profile._id);

      // Verify slot is STILL booked
      const verifiedSlot = await AppointmentSlot.findById(slot._id);
      expect(verifiedSlot.isBooked).toBe(true);
    });
  });

  describe('Public Available Slot Lookup', () => {
    it('GET /api/v1/doctors/:id/slots?date=YYYY-MM-DD should return open slots for an available date', async () => {
      // Find a slot that was generated in the future
      const futureSlot = await AppointmentSlot.findOne({
        doctorId: doctor1Profile._id,
        isBooked: false,
        slotStart: { $gt: new Date() },
      }).sort({ slotStart: 1 });

      expect(futureSlot).toBeDefined();

      const year = futureSlot.slotStart.getUTCFullYear();
      const month = String(futureSlot.slotStart.getUTCMonth() + 1).padStart(2, '0');
      const day = String(futureSlot.slotStart.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const res = await request(app).get(`/api/v1/doctors/${doctor1Profile._id}/slots?date=${dateStr}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(dateStr);
      expect(res.body.data.availableSlotCount).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.slots)).toBe(true);
      expect(res.body.data.slots.every((s) => s.isBooked === false)).toBe(true);
    });

    it('GET /api/v1/doctors/:id/slots should return empty list on days with no availability', async () => {
      // Pick a Sunday far in the future
      const res = await request(app).get(`/api/v1/doctors/${doctor1Profile._id}/slots?date=2028-01-02`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availableSlotCount).toBe(0);
      expect(res.body.data.slots.length).toBe(0);
    });

    it('GET /api/v1/doctors/:id/slots should reject invalid date formats', async () => {
      const res = await request(app).get(`/api/v1/doctors/${doctor1Profile._id}/slots?date=25-09-2026`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('System Settings Administration', () => {
    it('GET /api/v1/admin/settings should return platform settings for Admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.defaultSlotDurationMinutes).toBe(30);
      expect(res.body.data.cancellationWindowHours).toBe(24);
      expect(res.body.data.defaultCurrency).toBe('INR');
    });

    it('PUT /api/v1/admin/settings should update platform settings', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          defaultSlotDurationMinutes: 45,
          cancellationWindowHours: 12,
          defaultCurrency: 'INR',
          maxAdvanceBookingDays: 90,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.defaultSlotDurationMinutes).toBe(45);
      expect(res.body.data.cancellationWindowHours).toBe(12);
      expect(res.body.data.maxAdvanceBookingDays).toBe(90);
    });

    it('GET /api/v1/admin/settings should forbid non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
