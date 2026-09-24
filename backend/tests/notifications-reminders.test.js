import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { env } from '../src/config/env.js';
import { User, Clinic, Specialization, DoctorProfile, AppointmentSlot, Appointment } from '../src/models/index.js';
import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS, APPOINTMENT_STATUS } from '../src/config/constants.js';
import { notificationService } from '../src/services/notificationService.js';
import { runReminderSweepJob } from '../src/jobs/reminder.job.js';

let mongoServer;
let patientUser;
let doctorUser;
let doctorProfile;
let clinic;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@docyra.test',
    passwordHash: 'hash',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  clinic = await Clinic.create({
    name: 'Wellness Clinic',
    address: '10 Park St',
    city: 'Bengaluru',
    contactEmail: 'contact@wellness.test',
    contactPhone: '+91 80 8888 7777',
    subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    onboardedByAdminId: adminUser._id,
  });

  doctorUser = await User.create({
    name: 'Dr. John Watson',
    email: 'watson@wellness.test',
    passwordHash: 'hash',
    role: ROLES.DOCTOR,
    clinicId: clinic._id,
    status: USER_STATUS.ACTIVE,
  });

  const spec = await Specialization.create({ name: 'General Medicine', iconName: 'Stethoscope' });

  doctorProfile = await DoctorProfile.create({
    userId: doctorUser._id,
    clinicId: clinic._id,
    specializationId: spec._id,
    qualifications: ['MBBS'],
    consultationFee: 500,
    isApproved: true,
  });

  patientUser = await User.create({
    name: 'Mary Morstan',
    email: 'mary@example.test',
    phone: '+91 9876543210',
    passwordHash: 'hash',
    role: ROLES.PATIENT,
    status: USER_STATUS.ACTIVE,
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

describe('Phase 8: Notification Fan-Out & Reminder Job Tests', () => {
  describe('Universal Notification Dispatcher (Fan-out pattern)', () => {
    it('dispatch("appointment:created") should execute socket, email, and SMS channels in parallel', async () => {
      const results = await notificationService.dispatch('appointment:created', {
        patientId: patientUser._id.toString(),
        patientEmail: patientUser.email,
        patientPhone: patientUser.phone,
        clinicId: clinic._id.toString(),
        doctorName: 'John Watson',
        slotStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3); // socket + email + sms
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });

    it('dispatch("appointment:cancelled") should fan out to email and SMS', async () => {
      const results = await notificationService.dispatch('appointment:cancelled', {
        patientId: patientUser._id.toString(),
        patientEmail: patientUser.email,
        patientPhone: patientUser.phone,
        doctorName: 'John Watson',
        slotStart: new Date(),
        reason: 'Provider illness',
      });

      expect(results.length).toBe(3);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Appointment Reminder Background Sweep Job', () => {
    let appt24h;
    let appt1h;

    beforeAll(async () => {
      // 1. Create appointment starting in exactly 24 hours
      const time24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slot24h = await AppointmentSlot.create({
        doctorId: doctorProfile._id,
        slotStart: time24h,
        slotEnd: new Date(time24h.getTime() + 30 * 60 * 1000),
        isBooked: true,
      });

      appt24h = await Appointment.create({
        patientId: patientUser._id,
        doctorId: doctorProfile._id,
        clinicId: clinic._id,
        slotId: slot24h._id,
        slotStart: slot24h.slotStart,
        slotEnd: slot24h.slotEnd,
        status: APPOINTMENT_STATUS.CONFIRMED,
        reasonForVisit: 'General checkup in 24h',
        reminder24hSent: false,
        reminder1hSent: false,
      });

      // 2. Create appointment starting in exactly 1 hour (60 minutes)
      const time1h = new Date(Date.now() + 60 * 60 * 1000);
      const slot1h = await AppointmentSlot.create({
        doctorId: doctorProfile._id,
        slotStart: time1h,
        slotEnd: new Date(time1h.getTime() + 30 * 60 * 1000),
        isBooked: true,
      });

      appt1h = await Appointment.create({
        patientId: patientUser._id,
        doctorId: doctorProfile._id,
        clinicId: clinic._id,
        slotId: slot1h._id,
        slotStart: slot1h.slotStart,
        slotEnd: slot1h.slotEnd,
        status: APPOINTMENT_STATUS.CONFIRMED,
        reasonForVisit: 'Immediate checkup in 1h',
        reminder24hSent: false,
        reminder1hSent: false,
      });
    });

    it('runReminderSweepJob() should find both threshold appointments and dispatch reminders', async () => {
      const result = await runReminderSweepJob();

      expect(result.reminders24hSent).toBeGreaterThanOrEqual(1);
      expect(result.reminders1hSent).toBeGreaterThanOrEqual(1);

      // Verify flags in database
      const updated24h = await Appointment.findById(appt24h._id);
      expect(updated24h.reminder24hSent).toBe(true);

      const updated1h = await Appointment.findById(appt1h._id);
      expect(updated1h.reminder1hSent).toBe(true);
    });

    it('Reminder sweep job MUST be completely idempotent (re-running dispatches 0 duplicate reminders)', async () => {
      const secondRun = await runReminderSweepJob();

      expect(secondRun.reminders24hSent).toBe(0);
      expect(secondRun.reminders1hSent).toBe(0);
      expect(secondRun.totalSent).toBe(0);
    });
  });

  describe('JWT Socket Authentication Tokens', () => {
    it('Valid token payload decodes correctly for socket connections', () => {
      const token = jwt.sign(
        { id: patientUser._id.toString(), email: patientUser.email, role: ROLES.PATIENT, clinicId: null },
        env.JWT_ACCESS_SECRET
      );

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      expect(decoded.id).toBe(patientUser._id.toString());
      expect(decoded.role).toBe(ROLES.PATIENT);
    });

    it('Tampered or expired token fails verification', () => {
      expect(() => {
        jwt.verify('invalid.token.signature', env.JWT_ACCESS_SECRET);
      }).toThrow();
    });
  });
});
