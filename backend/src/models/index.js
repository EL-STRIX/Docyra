const User = require('./User');
const Clinic = require('./Clinic');
const DoctorProfile = require('./DoctorProfile');
const Specialization = require('./Specialization');
const AvailabilityRule = require('./AvailabilityRule');
const AppointmentSlot = require('./AppointmentSlot');
const Appointment = require('./Appointment');
const Dependent = require('./Dependent');
const Review = require('./Review');
const Waitlist = require('./Waitlist');
const AuditLog = require('./AuditLog');
const SystemSettings = require('./SystemSettings');

module.exports = {
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
};
