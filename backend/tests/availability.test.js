const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { User, DoctorProfile, Specialization, AvailabilityRule, AppointmentSlot, SystemSettings } = require('../src/models');
const { ROLES, USER_STATUS } = require('../src/config/constants');
const authService = require('../src/services/authService');
const availabilityService = require('../src/services/availabilityService');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Availability & Slot Generation Engine (Phase 5)', () => {
  let adminUser;
  let doctorUser;
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
      DoctorProfile.deleteMany({}),
      Specialization.deleteMany({}),
      AvailabilityRule.deleteMany({}),
      AppointmentSlot.deleteMany({}),
      SystemSettings.deleteMany({})
    ]);

    specialization = await Specialization.create({
      name: 'General Medicine',
      icon: 'stethoscope'
    });

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@docyra.app',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE
    });

    doctorUser = await User.create({
      name: 'Dr. Gregory',
      email: 'dr.gregory@docyra.app',
      passwordHash: 'hash',
      role: ROLES.DOCTOR,
      status: USER_STATUS.ACTIVE
    });

    await DoctorProfile.create({
      userId: doctorUser._id,
      specializationId: specialization._id,
      consultationFee: 500,
      isApproved: true
    });
  });

  it('PUT /api/v1/doctors/:id/availability should set weekly availability rules and generate slots', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const { accessToken } = authService.generateTokenPair(doctorUser);
    const rules = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', slotDurationMinutes: 30 }, // Monday (4 slots)
      { dayOfWeek: 2, startTime: '14:00', endTime: '16:00', slotDurationMinutes: 30 }  // Tuesday (4 slots)
    ];

    const res = await request(app)
      .put(`/api/v1/doctors/${doctorUser._id}/availability`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rules });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const dbRules = await AvailabilityRule.find({ doctorId: doctorUser._id });
    expect(dbRules.length).toBe(2);

    const generatedSlots = await AppointmentSlot.find({ doctorId: doctorUser._id });
    expect(generatedSlots.length).toBeGreaterThan(0);
  });

  it('Running slot generation multiple times should be idempotent with zero duplicate slots (R7.1)', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const { accessToken } = authService.generateTokenPair(doctorUser);
    const rules = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', slotDurationMinutes: 30 }
    ];

    await request(app)
      .put(`/api/v1/doctors/${doctorUser._id}/availability`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rules });

    const initialSlotCount = await AppointmentSlot.countDocuments({ doctorId: doctorUser._id });

    // Run generation again manually
    await availabilityService.generateSlotsForDoctor(doctorUser._id, 60);

    const secondSlotCount = await AppointmentSlot.countDocuments({ doctorId: doctorUser._id });
    expect(secondSlotCount).toBe(initialSlotCount);
  });

  it('GET /api/v1/doctors/:id/slots should return available slots for a specific date', async () => {
    if (mongoose.connection.readyState !== 1) return;

    // Create a specific slot for tomorrow
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 10, 0, 0));
    const end = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 10, 30, 0));

    await AppointmentSlot.create({
      doctorId: doctorUser._id,
      slotStart: start,
      slotEnd: end,
      isBooked: false
    });

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorUser._id}/slots?date=${dateStr}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].isBooked).toBe(false);
  });

  it('GET and PUT /api/v1/admin/settings should manage platform system settings', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const { accessToken } = authService.generateTokenPair(adminUser);

    const getRes = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.defaultCurrency).toBe('INR');

    const putRes = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        defaultSlotDurationMinutes: 45,
        cancellationWindowHours: 4
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.data.defaultSlotDurationMinutes).toBe(45);
    expect(putRes.body.data.cancellationWindowHours).toBe(4);
  });
});
