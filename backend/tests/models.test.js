import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AppointmentSlot,
  Appointment,
  Review,
  SystemSettings,
  AuditLog,
} from '../src/models/index.js';

import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS } from '../src/config/constants.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 300000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Phase 1: Data Models & Index Verification', () => {
  describe('User Model', () => {
    it('should create a valid user and enforce unique email index', async () => {
      await User.init(); // Ensure indexes are built

      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed_password_sample',
        role: ROLES.PATIENT,
        status: USER_STATUS.ACTIVE,
      };

      const user = await User.create(userData);
      expect(user._id).toBeDefined();
      expect(user.email).toBe('jane@example.com');
      expect(user.role).toBe(ROLES.PATIENT);

      // Attempt duplicate email
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Clinic & DoctorProfile Models', () => {
    it('should create clinic and link doctor profile correctly', async () => {
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: 'hash',
        role: ROLES.ADMIN,
      });

      const clinic = await Clinic.create({
        name: 'Apollo City Hospital',
        address: '100 Main St',
        city: 'Bengaluru',
        contactEmail: 'contact@apollo.com',
        contactPhone: '9998887777',
        subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
        onboardedByAdminId: admin._id,
      });

      const spec = await Specialization.create({
        name: 'Cardiology',
        description: 'Heart care',
      });

      const docUser = await User.create({
        name: 'Dr. John',
        email: 'dr.john@test.com',
        passwordHash: 'hash',
        role: ROLES.DOCTOR,
        clinicId: clinic._id,
      });

      const docProfile = await DoctorProfile.create({
        userId: docUser._id,
        clinicId: clinic._id,
        specializationId: spec._id,
        consultationFee: 750,
        isApproved: true,
      });

      expect(docProfile._id).toBeDefined();
      expect(docProfile.clinicId.toString()).toEqual(clinic._id.toString());
      expect(docProfile.feeCurrency).toBe('INR');
    });
  });

  describe('AppointmentSlot Unique Compound Index (R7.1 Hard Rule)', () => {
    it('MUST reject duplicate slots with same { doctorId, slotStart, slotEnd }', async () => {
      await AppointmentSlot.init(); // Ensure compound index is created

      const fakeDoctorId = new mongoose.Types.ObjectId();
      const slotStart = new Date('2026-10-01T09:00:00.000Z');
      const slotEnd = new Date('2026-10-01T09:30:00.000Z');

      // Create first slot
      const firstSlot = await AppointmentSlot.create({
        doctorId: fakeDoctorId,
        slotStart,
        slotEnd,
        isBooked: false,
      });

      expect(firstSlot._id).toBeDefined();

      // Attempt to create identical slot for same doctor and time window
      let duplicateError;
      try {
        await AppointmentSlot.create({
          doctorId: fakeDoctorId,
          slotStart,
          slotEnd,
          isBooked: false,
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000); // Duplicate key error
    });

    it('should allow identical times for DIFFERENT doctors', async () => {
      await AppointmentSlot.init();

      const doc1 = new mongoose.Types.ObjectId();
      const doc2 = new mongoose.Types.ObjectId();
      const slotStart = new Date('2026-10-01T10:00:00.000Z');
      const slotEnd = new Date('2026-10-01T10:30:00.000Z');

      const slot1 = await AppointmentSlot.create({ doctorId: doc1, slotStart, slotEnd });
      const slot2 = await AppointmentSlot.create({ doctorId: doc2, slotStart, slotEnd });

      expect(slot1._id).toBeDefined();
      expect(slot2._id).toBeDefined();
      expect(slot1._id.toString()).not.toEqual(slot2._id.toString());
    });
  });

  describe('Appointment & Review Models', () => {
    it('should create appointment and enforce single review per appointment', async () => {
      await Review.init();

      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@test.com',
        passwordHash: 'hash',
        role: ROLES.PATIENT,
      });

      const docUser = await User.create({
        name: 'Doctor User',
        email: 'doc@test.com',
        passwordHash: 'hash',
        role: ROLES.DOCTOR,
      });

      const spec = await Specialization.create({ name: 'Dermatology' });
      const docProfile = await DoctorProfile.create({
        userId: docUser._id,
        specializationId: spec._id,
        consultationFee: 500,
      });

      const slot = await AppointmentSlot.create({
        doctorId: docProfile._id,
        slotStart: new Date('2026-10-01T11:00:00.000Z'),
        slotEnd: new Date('2026-10-01T11:30:00.000Z'),
        isBooked: true,
      });

      const appointment = await Appointment.create({
        patientId: patient._id,
        doctorId: docProfile._id,
        slotId: slot._id,
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        reasonForVisit: 'Skin consultation',
      });

      expect(appointment._id).toBeDefined();
      expect(appointment.status).toBe('pending');

      const review = await Review.create({
        appointmentId: appointment._id,
        patientId: patient._id,
        doctorId: docProfile._id,
        rating: 5,
        comment: 'Great doctor!',
      });

      expect(review._id).toBeDefined();

      // Duplicate review on same appointment must fail
      await expect(
        Review.create({
          appointmentId: appointment._id,
          patientId: patient._id,
          doctorId: docProfile._id,
          rating: 4,
          comment: 'Another review',
        })
      ).rejects.toThrow();
    });
  });

  describe('SystemSettings Singleton & AuditLog Model', () => {
    it('should retrieve default system settings singleton', async () => {
      const settings = await SystemSettings.getSettings();
      expect(settings).toBeDefined();
      expect(settings.defaultSlotDurationMinutes).toBe(30);
      expect(settings.defaultCurrency).toBe('INR');
      expect(settings.cancellationWindowHours).toBe(24);
    });

    it('should record audit log entries with metadata', async () => {
      const audit = await AuditLog.create({
        actorRole: 'patient',
        action: 'APPOINTMENT_BOOKED',
        resourceType: 'Appointment',
        resourceId: 'apt_123',
        ipAddress: '127.0.0.1',
        metadata: { slotId: 'slot_123' },
      });

      expect(audit._id).toBeDefined();
      expect(audit.timestamp).toBeDefined();
      expect(audit.action).toBe('APPOINTMENT_BOOKED');
    });
  });
});
