const mongoose = require('mongoose');
const ics = require('ics');
const {
  Appointment,
  AppointmentSlot,
  DoctorProfile,
  Dependent
} = require('../models');
const { APPOINTMENT_STATUS, BOOKED_FOR_TYPE, ERROR_CODES, ROLES } = require('../config/constants');
const AppError = require('../utils/AppError');
const captchaService = require('./captchaService');
const systemSettingsService = require('./systemSettingsService');
const waitlistService = require('./waitlistService');
const logger = require('../utils/logger');

class AppointmentService {
  /**
   * CRITICAL BOOKING TRANSACTION ENGINE (R7.1, architecture.md Section 3.3)
   */
  async bookSlot({
    patientId,
    slotId,
    bookedForType = BOOKED_FOR_TYPE.SELF,
    bookedForId,
    reasonForVisit = '',
    captchaToken
  }) {
    // 1. Verify CAPTCHA (TRD Section 7)
    await captchaService.verifyToken(captchaToken);

    // 2. Validate Dependent if booking on behalf of dependent (P-5a)
    let targetBookedForId = patientId;
    let targetBookedForModel = 'User';

    if (bookedForType === BOOKED_FOR_TYPE.DEPENDENT) {
      if (!bookedForId) {
        throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'bookedForId is required for dependent bookings');
      }
      const dependent = await Dependent.findOne({ _id: bookedForId, patientId });
      if (!dependent) {
        throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Dependent record not found under your account');
      }
      targetBookedForId = dependent._id;
      targetBookedForModel = 'Dependent';
    }

    // Atomic execution helper
    const executeBooking = async (session = null) => {
      // Atomic slot lock: findOneAndUpdate with isBooked: false -> isBooked: true
      const slot = await AppointmentSlot.findOneAndUpdate(
        { _id: slotId, isBooked: false },
        { isBooked: true },
        { new: true, ...(session ? { session } : {}) }
      );

      if (!slot) {
        throw AppError.conflict(
          ERROR_CODES.SLOT_ALREADY_BOOKED,
          'This appointment slot has already been booked or is no longer available'
        );
      }

      // Fetch Doctor Profile to determine clinic affiliation and approval mode
      const docProfileQuery = DoctorProfile.findOne({ userId: slot.doctorId });
      if (session) docProfileQuery.session(session);
      const docProfile = await docProfileQuery;

      const initialStatus = docProfile && docProfile.manualApprovalMode
        ? APPOINTMENT_STATUS.PENDING
        : APPOINTMENT_STATUS.CONFIRMED;

      const appointmentData = {
        patientId,
        bookedForType,
        bookedForId: targetBookedForId,
        bookedForModel: targetBookedForModel,
        doctorId: slot.doctorId,
        clinicId: docProfile ? docProfile.clinicId : null,
        slotId: slot._id,
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        status: initialStatus,
        reasonForVisit: reasonForVisit.trim()
      };

      if (session) {
        const created = await Appointment.create([appointmentData], { session });
        return created[0];
      } else {
        return Appointment.create(appointmentData);
      }
    };

    // 3. Start MongoDB Transaction (R7.1)
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const appointment = await executeBooking(session);
      await session.commitTransaction();
      logger.info(`✅ [AppointmentService] Booked appointment ${appointment._id} for patient ${patientId} (transactional)`);
      return appointment;
    } catch (err) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      // If standalone Mongo without replica sets in local dev, fallback to atomic operation
      if (err.message && (err.message.includes('replica set') || err.message.includes('Transaction numbers'))) {
        const appointment = await executeBooking(null);
        logger.info(`✅ [AppointmentService] Booked appointment ${appointment._id} for patient ${patientId} (atomic)`);
        return appointment;
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Get patient's own + dependents' appointments (P-6)
   */
  async getPatientAppointments(patientId, { page = 1, limit = 10, status } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { patientId };
    if (status) query.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('doctorId', 'name email phone profilePhotoUrl')
        .populate('clinicId', 'name address city contactPhone')
        .populate('bookedForId')
        .sort({ slotStart: -1 })
        .skip(skip)
        .limit(limitNum),
      Appointment.countDocuments(query)
    ]);

    return {
      appointments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get doctor's scheduled appointments (D-2)
   */
  async getDoctorAppointments(doctorId, { page = 1, limit = 10, status, date } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { doctorId };
    if (status) query.status = status;

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      query.slotStart = { $gte: startOfDay, $lte: endOfDay };
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name email phone')
        .populate('bookedForId')
        .sort({ slotStart: 1 })
        .skip(skip)
        .limit(limitNum),
      Appointment.countDocuments(query)
    ]);

    return {
      appointments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get clinic appointments strictly scoped to Clinic Admin's clinic (CA-1, R6.4, R6.5)
   */
  async getClinicAppointments(clinicId, { page = 1, limit = 10, status, doctorId } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { clinicId };
    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('doctorId', 'name email')
        .populate('patientId', 'name email phone')
        .populate('bookedForId')
        .sort({ slotStart: -1 })
        .skip(skip)
        .limit(limitNum),
      Appointment.countDocuments(query)
    ]);

    return {
      appointments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get single appointment with access check
   */
  async getAppointmentById(id, user) {
    const appointment = await Appointment.findById(id)
      .populate('doctorId', 'name email phone')
      .populate('clinicId', 'name address city contactPhone contactEmail')
      .populate('patientId', 'name email phone')
      .populate('bookedForId');

    if (!appointment) {
      throw AppError.notFound(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }

    // Access authorization check
    const isPatient = appointment.patientId._id.toString() === user._id.toString();
    const isDoctor = appointment.doctorId._id.toString() === user._id.toString();
    const isClinicAdmin = user.role === ROLES.CLINIC_ADMIN && appointment.clinicId && appointment.clinicId._id.toString() === user.clinicId?.toString();
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isPatient && !isDoctor && !isClinicAdmin && !isAdmin) {
      throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'You do not have access to view this appointment');
    }

    return appointment;
  }

  /**
   * Update appointment status (Doctor/Admin: complete, no-show, accept/reject)
   */
  async updateStatus(user, appointmentId, newStatus) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw AppError.notFound(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }

    // Role check
    if (user.role === ROLES.DOCTOR && appointment.doctorId.toString() !== user._id.toString()) {
      throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'You can only update your own appointments');
    }

    if (user.role === ROLES.CLINIC_ADMIN && appointment.clinicId?.toString() !== user.clinicId?.toString()) {
      throw AppError.forbidden(ERROR_CODES.CLINIC_ACCESS_DENIED, 'Access denied to other clinic appointments');
    }

    // If doctor rejected/cancelled, free the slot
    if (newStatus === APPOINTMENT_STATUS.CANCELLED) {
      await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { isBooked: false });
      appointment.cancelledBy = user.role;
      appointment.cancellationReason = 'Cancelled/Rejected by doctor or clinic';
    }

    appointment.status = newStatus;
    await appointment.save();

    return appointment;
  }

  /**
   * Cancel appointment with cancellation window enforcement (P-6)
   */
  async cancelAppointment(user, appointmentId, cancellationReason = '') {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw AppError.notFound(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
      throw AppError.badRequest(ERROR_CODES.BAD_REQUEST, 'Appointment is already cancelled');
    }

    // Patient cancellation check
    if (user.role === ROLES.PATIENT) {
      if (appointment.patientId.toString() !== user._id.toString()) {
        throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'You can only cancel your own appointments');
      }

      // Check cancellation window from SystemSettings
      const settings = await systemSettingsService.getSettings();
      const minWindowHours = settings.cancellationWindowHours || 2;
      const minWindowMs = minWindowHours * 60 * 60 * 1000;
      const timeUntilSlot = new Date(appointment.slotStart) - new Date();

      if (timeUntilSlot < minWindowMs) {
        throw AppError.badRequest(
          ERROR_CODES.CANCELLATION_WINDOW_EXPIRED,
          `Appointments cannot be cancelled within ${minWindowHours} hours of the scheduled time.`
        );
      }
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancelledBy = user.role;
    appointment.cancellationReason = cancellationReason || 'Cancelled by user';
    await appointment.save();

    // Re-open the slot
    await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { isBooked: false });

    // Trigger FIFO waitlist claim notification (architecture Section 7.6)
    try {
      await waitlistService.triggerSlotAvailable(appointment.doctorId, appointment.slotStart);
    } catch (err) {
      logger.error(`[AppointmentService] Error triggering waitlist notification: ${err.message}`);
    }

    return appointment;
  }

  /**
   * Doctor Emergency Unavailability Flow (D-2a, architecture Section 7.7)
   */
  async emergencyUnavailable(doctorUserId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Find all today's confirmed/pending appointments
    const affectedAppointments = await Appointment.find({
      doctorId: doctorUserId,
      slotStart: { $gte: todayStart, $lte: todayEnd },
      status: { $in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING] }
    });

    for (const apt of affectedAppointments) {
      apt.status = APPOINTMENT_STATUS.CANCELLED;
      apt.cancelledBy = 'doctor-emergency';
      apt.cancellationReason = 'Doctor same-day emergency unavailability';
      await apt.save();

      // Free the slot
      await AppointmentSlot.findByIdAndUpdate(apt.slotId, { isBooked: false });
    }

    logger.info(`🚨 [AppointmentService] Emergency cancellation executed: ${affectedAppointments.length} appointments cancelled for doctor ${doctorUserId}`);
    return affectedAppointments;
  }

  /**
   * Generate downloadable .ics calendar file for appointment (P-6b)
   */
  async generateIcs(appointmentId, user) {
    const appointment = await this.getAppointmentById(appointmentId, user);

    const startDate = new Date(appointment.slotStart);
    const durationMinutes = Math.round((new Date(appointment.slotEnd) - startDate) / 60000) || 30;

    const event = {
      start: [
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + 1,
        startDate.getUTCDate(),
        startDate.getUTCHours(),
        startDate.getUTCMinutes()
      ],
      duration: { minutes: durationMinutes },
      title: `Docyra Appointment: Dr. ${appointment.doctorId.name}`,
      description: `Medical Appointment on Docyra with Dr. ${appointment.doctorId.name}.\nReason: ${appointment.reasonForVisit || 'General Consultation'}`,
      location: appointment.clinicId
        ? `${appointment.clinicId.name}, ${appointment.clinicId.address}, ${appointment.clinicId.city}`
        : 'Consultation Clinic',
      url: 'https://patient.docyra.app',
      status: 'CONFIRMED'
    };

    return new Promise((resolve, reject) => {
      ics.createEvent(event, (error, value) => {
        if (error) return reject(error);
        resolve(value);
      });
    });
  }
}

module.exports = new AppointmentService();
