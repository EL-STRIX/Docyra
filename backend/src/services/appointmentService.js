import mongoose from 'mongoose';
import {
  Appointment,
  AppointmentSlot,
  DoctorProfile,
  Dependent,
  SystemSettings,
} from '../models/index.js';
import { captchaService } from './captchaService.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../utils/AppError.js';
import {
  ERROR_CODES,
  APPOINTMENT_STATUS,
  BOOKED_FOR_TYPE,
  ROLES,
} from '../config/constants.js';
import logger from '../utils/logger.js';

class AppointmentService {
  /**
   * Transactional slot booking (Hard Rule R7.1)
   */
  async bookSlot({
    patientId,
    doctorId,
    slotId,
    bookedForType = BOOKED_FOR_TYPE.SELF,
    bookedForId = null,
    reasonForVisit,
    notes = '',
    captchaToken,
  }) {
    // 1. Verify captcha if provided
    const isCaptchaValid = await captchaService.verify(captchaToken);
    if (!isCaptchaValid) {
      throw new BadRequestError('Invalid or expired CAPTCHA token', ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Validate Doctor
    const doctor = await DoctorProfile.findById(doctorId).populate('userId', 'name email');
    if (!doctor || !doctor.isApproved) {
      throw new NotFoundError('Doctor not found or not currently active', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // 3. Validate Dependent if booked for family member
    let bookedForModel = 'User';
    if (bookedForType === BOOKED_FOR_TYPE.DEPENDENT) {
      if (!bookedForId) {
        throw new BadRequestError('bookedForId is required when booking for a dependent', ERROR_CODES.VALIDATION_ERROR);
      }
      const dependent = await Dependent.findOne({
        _id: bookedForId,
        patientId: new mongoose.Types.ObjectId(patientId),
      });
      if (!dependent) {
        throw new NotFoundError('Dependent family member not found', ERROR_CODES.NOT_FOUND);
      }
      bookedForModel = 'Dependent';
    }

    // 4. Execute atomic booking (Hard Rule R7.1: MongoDB transaction where supported)
    let session = null;
    let inTransaction = false;

    // Check if connected client topology supports transactions
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const isReplicaSetOrSharded =
      topologyType &&
      (topologyType.includes('ReplicaSet') || topologyType === 'Sharded');

    if (isReplicaSetOrSharded) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        inTransaction = true;
      } catch (err) {
        logger.warn(`Could not start MongoDB transaction: ${err.message}`);
        if (session) session.endSession();
        session = null;
        inTransaction = false;
      }
    }

    try {
      const now = new Date();
      const sessionOptions = inTransaction && session ? { session } : {};

      // Atomically find and lock slot
      const slot = await AppointmentSlot.findOneAndUpdate(
        {
          _id: slotId,
          doctorId: doctor._id,
          isBooked: false,
          slotStart: { $gt: now },
        },
        { $set: { isBooked: true } },
        { new: true, ...sessionOptions }
      );

      if (!slot) {
        throw new ConflictError(
          'Slot is already booked or no longer available',
          ERROR_CODES.SLOT_ALREADY_BOOKED
        );
      }

      // Check if slot already has an active appointment (defense in depth)
      const existingAppt = await Appointment.findOne(
        { slotId: slot._id, status: { $ne: APPOINTMENT_STATUS.CANCELLED } },
        null,
        sessionOptions
      );

      if (existingAppt) {
        throw new ConflictError(
          'Slot is already booked or no longer available',
          ERROR_CODES.SLOT_ALREADY_BOOKED
        );
      }

      // Create appointment record
      const appointmentDocs = await Appointment.create(
        [
          {
            patientId: new mongoose.Types.ObjectId(patientId),
            bookedForType,
            bookedForId: bookedForType === BOOKED_FOR_TYPE.DEPENDENT ? new mongoose.Types.ObjectId(bookedForId) : null,
            bookedForModel,
            doctorId: doctor._id,
            clinicId: doctor.clinicId || null,
            slotId: slot._id,
            slotStart: slot.slotStart,
            slotEnd: slot.slotEnd,
            status: APPOINTMENT_STATUS.CONFIRMED,
            reasonForVisit,
            notes: notes || '',
          },
        ],
        sessionOptions
      );

      const createdAppointment = appointmentDocs[0];

      if (inTransaction && session) {
        await session.commitTransaction();
      }

      logger.info(
        `Appointment booked: ${createdAppointment._id} for patient ${patientId} with doctor ${doctor._id} (Slot: ${slot.slotStart})`
      );

      // Populate response details
      const populated = await Appointment.findById(createdAppointment._id)
        .populate('patientId', 'name email phone')
        .populate({
          path: 'doctorId',
          populate: [
            { path: 'userId', select: 'name email phone profilePhotoUrl' },
            { path: 'specializationId', select: 'name iconName' },
          ],
        })
        .populate('clinicId', 'name address city contactPhone')
        .populate('bookedForId');

      return populated;
    } catch (err) {
      if (inTransaction && session) {
        try {
          await session.abortTransaction();
        } catch {
          // Transaction already aborted or closed
        }
      }
      throw err;
    } finally {
      if (inTransaction && session) {
        session.endSession();
      }
    }
  }

  /**
   * Get authenticated patient's appointments
   */
  async getMyAppointments(patientId, { page = 1, limit = 10, status, upcoming } = {}) {
    const query = { patientId: new mongoose.Types.ObjectId(patientId) };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true' || upcoming === true) {
      query.slotStart = { $gte: new Date() };
      query.status = { $in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING] };
    } else if (upcoming === 'false' || upcoming === false) {
      query.$or = [
        { slotStart: { $lt: new Date() } },
        { status: { $in: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate({
          path: 'doctorId',
          populate: [
            { path: 'userId', select: 'name email phone profilePhotoUrl' },
            { path: 'specializationId', select: 'name iconName' },
          ],
        })
        .populate('clinicId', 'name address city contactPhone')
        .populate('bookedForId')
        .sort({ slotStart: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      appointments,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get single appointment by ID
   */
  async getAppointmentById(appointmentId, currentUser) {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone profilePhotoUrl' },
          { path: 'specializationId', select: 'name iconName' },
        ],
      })
      .populate('clinicId', 'name address city contactPhone')
      .populate('bookedForId');

    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    // Access control
    const isPatientOwner = currentUser.role === ROLES.PATIENT && appointment.patientId._id.toString() === currentUser.id;
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR &&
      appointment.doctorId?.userId?._id?.toString() === currentUser.id;
    const isClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      appointment.clinicId &&
      currentUser.clinicId &&
      appointment.clinicId._id.toString() === currentUser.clinicId.toString();
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isClinicAdmin && !isPlatformAdmin) {
      throw new ForbiddenError('You do not have permission to view this appointment', ERROR_CODES.FORBIDDEN);
    }

    return appointment;
  }

  /**
   * Get appointments for a Doctor
   */
  async getDoctorAppointments(doctorId, { page = 1, limit = 10, status, date, upcoming } = {}) {
    const query = { doctorId: new mongoose.Types.ObjectId(doctorId) };

    if (status) {
      query.status = status;
    }

    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      query.slotStart = { $gte: startOfDay, $lte: endOfDay };
    } else if (upcoming === 'true' || upcoming === true) {
      query.slotStart = { $gte: new Date() };
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name email phone')
        .populate('bookedForId')
        .sort({ slotStart: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      appointments,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get appointments for a Clinic (Strictly Scoped to Clinic Admin's clinicId)
   */
  async getClinicAppointments(clinicId, { page = 1, limit = 10, status, date, doctorId } = {}) {
    const query = { clinicId: new mongoose.Types.ObjectId(clinicId) };

    if (status) {
      query.status = status;
    }

    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      query.doctorId = new mongoose.Types.ObjectId(doctorId);
    }

    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      query.slotStart = { $gte: startOfDay, $lte: endOfDay };
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name email phone')
        .populate({
          path: 'doctorId',
          populate: [
            { path: 'userId', select: 'name email phone profilePhotoUrl' },
            { path: 'specializationId', select: 'name' },
          ],
        })
        .populate('bookedForId')
        .sort({ slotStart: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      appointments,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Update appointment status (Doctor / Clinic Admin / Platform Admin)
   */
  async updateStatus(appointmentId, { status, reason }, currentUser) {
    const appointment = await Appointment.findById(appointmentId).populate('doctorId');
    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    // Permission check
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR &&
      appointment.doctorId?.userId?.toString() === currentUser.id;
    const isClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      appointment.clinicId &&
      currentUser.clinicId &&
      appointment.clinicId.toString() === currentUser.clinicId.toString();
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isDoctorOwner && !isClinicAdmin && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to update status for this appointment',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Status transition validation
    const currentStatus = appointment.status;
    const validTransitions = {
      [APPOINTMENT_STATUS.PENDING]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED],
      [APPOINTMENT_STATUS.CONFIRMED]: [
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
      ],
      [APPOINTMENT_STATUS.COMPLETED]: [],
      [APPOINTMENT_STATUS.CANCELLED]: [],
      [APPOINTMENT_STATUS.NO_SHOW]: [],
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      throw new BadRequestError(
        `Cannot transition appointment from status '${currentStatus}' to '${status}'`,
        ERROR_CODES.INVALID_STATUS_TRANSITION
      );
    }

    appointment.status = status;

    if (status === APPOINTMENT_STATUS.CANCELLED) {
      appointment.cancelledBy = currentUser.role === ROLES.DOCTOR ? 'doctor' : currentUser.role;
      appointment.cancellationReason = reason || 'Cancelled by provider';
      appointment.cancelledAt = new Date();

      // Free the slot
      await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { $set: { isBooked: false } });
    }

    await appointment.save();
    logger.info(`Appointment ${appointment._id} status updated to ${status} by user ${currentUser.id}`);

    return appointment;
  }

  /**
   * Cancel appointment (Patient self-cancellation or Admin cancellation with window check)
   */
  async cancelAppointment(appointmentId, { reason }, currentUser) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
      throw new BadRequestError('Appointment is already cancelled', ERROR_CODES.VALIDATION_ERROR);
    }

    if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
      throw new BadRequestError('Cannot cancel a completed appointment', ERROR_CODES.VALIDATION_ERROR);
    }

    const isPatientOwner =
      currentUser.role === ROLES.PATIENT && appointment.patientId.toString() === currentUser.id;
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to cancel this appointment',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Patient cancellation window check
    if (isPatientOwner) {
      const settings = await SystemSettings.getSettings();
      const cancellationWindowMs = (settings.cancellationWindowHours || 24) * 60 * 60 * 1000;
      const appointmentTime = new Date(appointment.slotStart).getTime();
      const now = Date.now();

      if (appointmentTime - now < cancellationWindowMs) {
        throw new BadRequestError(
          `Appointments cannot be cancelled within ${settings.cancellationWindowHours} hours of the scheduled start time`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancelledBy = isPatientOwner ? 'patient' : 'admin';
    appointment.cancellationReason = reason || 'Cancelled by user';
    appointment.cancelledAt = new Date();

    // Free slot back up for booking
    await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { $set: { isBooked: false } });
    await appointment.save();

    logger.info(`Appointment ${appointment._id} cancelled by ${appointment.cancelledBy}`);

    // Trigger waitlist processing for freed slot (non-blocking)
    import('./waitlistService.js').then(({ waitlistService }) => {
      waitlistService.processCancellation(appointment.doctorId, appointment.slotStart).catch((e) => {
        logger.warn(`Waitlist processing failed: ${e.message}`);
      });
    }).catch(() => {});

    return appointment;
  }

  /**
   * Emergency unavailability: bulk cancels all today's confirmed/pending appointments
   */
  async emergencyUnavailable(doctorId, currentUser) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // Check authorization
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR && doctor.userId.toString() === currentUser.id;
    const isClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      doctor.clinicId &&
      currentUser.clinicId &&
      doctor.clinicId.toString() === currentUser.clinicId.toString();
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isDoctorOwner && !isClinicAdmin && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to trigger emergency unavailability for this doctor',
        ERROR_CODES.FORBIDDEN
      );
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Find all today's appointments
    const affectedAppointments = await Appointment.find({
      doctorId: doctor._id,
      status: { $in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING] },
      slotStart: { $gte: startOfToday, $lte: endOfToday },
    });

    const appointmentIds = affectedAppointments.map((a) => a._id);
    const slotIds = affectedAppointments.map((a) => a.slotId);

    if (appointmentIds.length > 0) {
      await Appointment.updateMany(
        { _id: { $in: appointmentIds } },
        {
          $set: {
            status: APPOINTMENT_STATUS.CANCELLED,
            cancelledBy: 'doctor-emergency',
            cancellationReason: 'Doctor emergency unavailability',
            cancelledAt: new Date(),
          },
        }
      );

      // Re-open slots or leave as cancelled
      await AppointmentSlot.updateMany(
        { _id: { $in: slotIds } },
        { $set: { isBooked: false } }
      );
    }

    logger.info(
      `Emergency unavailability triggered for Doctor ${doctor._id}. Cancelled ${appointmentIds.length} appointments today.`
    );

    return {
      doctorId: doctor._id,
      affectedAppointmentsCount: appointmentIds.length,
      cancelledAppointmentIds: appointmentIds,
    };
  }

  /**
   * Export appointment as standard iCalendar (.ics) RFC 5545 format
   */
  async generateIcsCalendar(appointmentId, currentUser) {
    const appointment = await this.getAppointmentById(appointmentId, currentUser);

    const formatIcsDate = (date) => {
      const d = new Date(date);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const rawDoctorName = appointment.doctorId?.userId?.name || 'Doctor';
    const doctorDisplay = rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`;
    const patientName = appointment.patientId?.name || 'Patient';
    const location = appointment.clinicId
      ? `${appointment.clinicId.name}, ${appointment.clinicId.address}, ${appointment.clinicId.city}`
      : 'Doctor Clinic';

    const nowStr = formatIcsDate(new Date());
    const startStr = formatIcsDate(appointment.slotStart);
    const endStr = formatIcsDate(appointment.slotEnd);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Docyra//Doctor Appointment System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${appointment._id}@docyra.app`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Medical Appointment with ${doctorDisplay}`,
      `DESCRIPTION:Appointment for ${patientName}. Reason: ${appointment.reasonForVisit}`,
      `LOCATION:${location}`,
      `STATUS:${appointment.status === APPOINTMENT_STATUS.CANCELLED ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return {
      filename: `docyra_appointment_${appointment._id}.ics`,
      content: icsContent,
    };
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;
