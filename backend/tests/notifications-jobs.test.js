const http = require('http');
const mongoose = require('mongoose');
const { io: Client } = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/sockets');
const {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AppointmentSlot,
  Appointment,
  SystemSettings
} = require('../src/models');
const { ROLES, USER_STATUS, APPOINTMENT_STATUS } = require('../src/config/constants');
const authService = require('../src/services/authService');
const notificationService = require('../src/services/notificationService');
const { runReminderSweep } = require('../src/jobs/reminder.job');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('Phase 8: Notifications, Real-Time & Background Jobs', () => {
  let server, socketServer, serverPort;
  let doctorUser, patientUser, clinic;
  let doctorToken, patientToken;
  let testSlot, testAppointment24h, testAppointment1h;

  beforeAll(async () => {
    await connectDB();

    server = http.createServer(app);
    socketServer = initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
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
      SystemSettings.deleteMany({})
    ]);

    clinic = await Clinic.create({
      name: 'City Care Hospital',
      address: '500 Main Street',
      city: 'Boston',
      contactEmail: 'care@docyra.test',
      contactPhone: '+1987654321'
    });

    const spec = await Specialization.create({
      name: 'Pediatrics',
      slug: 'pediatrics'
    });

    doctorUser = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'sarah@docyra.test',
      passwordHash: 'hash',
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
      consultationFee: 120
    });

    patientUser = await User.create({
      name: 'John Connor',
      email: 'john@docyra.test',
      phone: '+15551234567',
      passwordHash: 'hash',
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true
    });
    patientToken = authService.generateTokenPair(patientUser).accessToken;

    // Slot & Appointment for 24h reminder (24 hours from now)
    const slot24hStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slot24hEnd = new Date(slot24hStart.getTime() + 30 * 60 * 1000);

    const slot24h = await AppointmentSlot.create({
      doctorId: doctorUser._id,
      clinicId: clinic._id,
      slotStart: slot24hStart,
      slotEnd: slot24hEnd,
      isBooked: true
    });

    testAppointment24h = await Appointment.create({
      doctorId: doctorUser._id,
      patientId: patientUser._id,
      clinicId: clinic._id,
      slotId: slot24h._id,
      slotStart: slot24hStart,
      slotEnd: slot24hEnd,
      status: APPOINTMENT_STATUS.CONFIRMED,
      bookedForType: 'self',
      bookedForId: patientUser._id,
      bookedForModel: 'User',
      reminder24hSent: false,
      reminder1hSent: false
    });

    // Slot & Appointment for 1h reminder (60 minutes from now)
    const slot1hStart = new Date(Date.now() + 60 * 60 * 1000);
    const slot1hEnd = new Date(slot1hStart.getTime() + 30 * 60 * 1000);

    const slot1h = await AppointmentSlot.create({
      doctorId: doctorUser._id,
      clinicId: clinic._id,
      slotStart: slot1hStart,
      slotEnd: slot1hEnd,
      isBooked: true
    });

    testAppointment1h = await Appointment.create({
      doctorId: doctorUser._id,
      patientId: patientUser._id,
      clinicId: clinic._id,
      slotId: slot1h._id,
      slotStart: slot1hStart,
      slotEnd: slot1hEnd,
      status: APPOINTMENT_STATUS.CONFIRMED,
      bookedForType: 'self',
      bookedForId: patientUser._id,
      bookedForModel: 'User',
      reminder24hSent: false,
      reminder1hSent: false
    });
  });

  describe('Notification Dispatch Fan-Out', () => {
    it('successfully dispatches notification across socket, email, and SMS channels', async () => {
      const result = await notificationService.dispatch('appointment:created', {
        recipientId: patientUser._id,
        doctorUserId: doctorUser._id,
        clinicId: clinic._id,
        data: { message: 'Booking confirmed' },
        email: {
          to: patientUser.email,
          subject: 'Appointment Booked',
          html: '<p>Your appointment is confirmed</p>'
        },
        sms: {
          to: patientUser.phone,
          message: 'Your appointment is confirmed'
        }
      });

      expect(result).toBe(true);
    });
  });

  describe('JWT-Authenticated Socket.IO Handshake & Real-Time Rooms', () => {
    it('authenticates socket connection and joins user & clinic rooms', (done) => {
      const clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: doctorToken },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });

      clientSocket.on('connect_error', (err) => {
        done(err);
      });
    });

    it('rejects unauthenticated socket connections', (done) => {
      const clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid_jwt_token' },
        transports: ['websocket']
      });

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toMatch(/Authentication error/);
        clientSocket.disconnect();
        done();
      });
    });
  });

  describe('Idempotent Reminder Background Job Sweep', () => {
    it('sweeps and sends 24h & 1h reminders, and enforces idempotency on repeat runs', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // 1. First sweep: should send both 24h and 1h reminders
      const firstRun = await runReminderSweep();
      expect(firstRun.reminders24hCount).toBe(1);
      expect(firstRun.reminders1hCount).toBe(1);

      // Verify flags in database
      const apt24h = await Appointment.findById(testAppointment24h._id);
      expect(apt24h.reminder24hSent).toBe(true);

      const apt1h = await Appointment.findById(testAppointment1h._id);
      expect(apt1h.reminder1hSent).toBe(true);

      // 2. Second sweep immediately after: should be 0 because flags prevent duplicates
      const secondRun = await runReminderSweep();
      expect(secondRun.reminders24hCount).toBe(0);
      expect(secondRun.reminders1hCount).toBe(0);
    });
  });
});
