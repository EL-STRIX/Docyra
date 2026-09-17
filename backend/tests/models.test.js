const mongoose = require('mongoose');
const {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AvailabilityRule,
  AppointmentSlot,
  Appointment,
  Dependent,
  Review,
  Waitlist,
  AuditLog,
  SystemSettings
} = require('../src/models');
const { ROLES, USER_STATUS, CLINIC_STATUS, APPOINTMENT_STATUS } = require('../src/config/constants');

describe('Data Models & Schema Validations (Phase 1)', () => {
  it('User model should require name, email, passwordHash and sanitize toJSON', () => {
    const user = new User({
      name: 'Test Patient',
      email: 'test@example.com',
      passwordHash: 'hashed_password_123',
      twoFactorSecret: 'secret_123'
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();

    const json = user.toJSON();
    expect(json.name).toBe('Test Patient');
    expect(json.email).toBe('test@example.com');
    expect(json.passwordHash).toBeUndefined();
    expect(json.twoFactorSecret).toBeUndefined();
  });

  it('User model should reject invalid role', () => {
    const user = new User({
      name: 'Bad Role User',
      email: 'bad@example.com',
      passwordHash: 'pass',
      role: 'superman'
    });

    const validationError = user.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.role).toBeDefined();
  });

  it('Clinic model should require name, address, city, contactEmail, contactPhone', () => {
    const clinic = new Clinic({
      name: 'Test Clinic',
      address: '123 Main St',
      city: 'Mumbai',
      contactEmail: 'clinic@test.com',
      contactPhone: '1234567890'
    });

    const validationError = clinic.validateSync();
    expect(validationError).toBeUndefined();
  });

  it('DoctorProfile model should require userId, specializationId, consultationFee', () => {
    const doctorProfile = new DoctorProfile({
      userId: new mongoose.Types.ObjectId(),
      specializationId: new mongoose.Types.ObjectId(),
      consultationFee: 500
    });

    const validationError = doctorProfile.validateSync();
    expect(validationError).toBeUndefined();
  });

  it('AppointmentSlot model should have compound unique index defined', () => {
    const indexes = AppointmentSlot.schema.indexes();
    const compoundUnique = indexes.find(
      ([idx, opts]) => idx.doctorId === 1 && idx.slotStart === 1 && idx.slotEnd === 1 && opts?.unique === true
    );
    expect(compoundUnique).toBeDefined();
  });

  it('Appointment model should validate required fields and status enum', () => {
    const apt = new Appointment({
      patientId: new mongoose.Types.ObjectId(),
      bookedForType: 'self',
      bookedForId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      slotId: new mongoose.Types.ObjectId(),
      slotStart: new Date(),
      slotEnd: new Date(),
      status: APPOINTMENT_STATUS.CONFIRMED
    });

    const validationError = apt.validateSync();
    expect(validationError).toBeUndefined();
  });

  it('Review model should enforce rating min 1 and max 5', () => {
    const reviewHigh = new Review({
      appointmentId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      rating: 6
    });
    expect(reviewHigh.validateSync().errors.rating).toBeDefined();

    const reviewLow = new Review({
      appointmentId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      rating: 0
    });
    expect(reviewLow.validateSync().errors.rating).toBeDefined();
  });

  it('SystemSettings model should have default values configured', () => {
    const settings = new SystemSettings({});
    expect(settings.defaultSlotDurationMinutes).toBe(30);
    expect(settings.cancellationWindowHours).toBe(2);
    expect(settings.defaultCurrency).toBe('INR');
  });
});
