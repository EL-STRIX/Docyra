import mongoose from 'mongoose';
import {
  Appointment,
  AppointmentSlot,
  DoctorProfile,
  Dependent,
  SystemSettings,
  Review,
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
import notificationService from './notificationService.js';

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
    previousAppointmentId = null,
  }) {
    // 0. Check system settings & platform maintenance mode
    const settings = await SystemSettings.getSettings();
    if (settings.maintenanceMode) {
      throw new BadRequestError(
        'Platform is currently in maintenance mode. New appointment bookings are temporarily frozen.',
        ERROR_CODES.BAD_REQUEST
      );
    }

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

    // Validate previous appointment if booking a follow-up visit
    let previousAppointment = null;
    let isFollowUp = false;
    if (previousAppointmentId) {
      if (!mongoose.Types.ObjectId.isValid(previousAppointmentId)) {
        throw new BadRequestError('Invalid previous appointment ID', ERROR_CODES.VALIDATION_ERROR);
      }
      previousAppointment = await Appointment.findById(previousAppointmentId);
      if (!previousAppointment) {
        throw new NotFoundError('Previous appointment not found', ERROR_CODES.NOT_FOUND);
      }
      if (previousAppointment.patientId.toString() !== patientId.toString()) {
        throw new ForbiddenError('You can only book follow-up consultations for your own appointments', ERROR_CODES.FORBIDDEN);
      }
      if (previousAppointment.doctorId.toString() !== doctor._id.toString()) {
        throw new BadRequestError('Follow-up consultations must be booked with the same physician', ERROR_CODES.VALIDATION_ERROR);
      }
      isFollowUp = true;
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

      // Check advance booking horizon against system settings
      const maxHorizonMs = (settings.maxAdvanceBookingDays || 60) * 24 * 60 * 60 * 1000;
      if (new Date(slot.slotStart).getTime() - now.getTime() > maxHorizonMs) {
        throw new BadRequestError(
          `Cannot book appointments more than ${settings.maxAdvanceBookingDays || 60} days in advance`,
          ERROR_CODES.VALIDATION_ERROR
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
            previousAppointmentId: previousAppointment ? previousAppointment._id : null,
            isFollowUp,
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
        .populate('bookedForId')
        .populate({
          path: 'previousAppointmentId',
          select: 'slotStart status reasonForVisit prescription medicalTests notes doctorId clinicId createdAt',
        })
        .populate({
          path: 'previousAppointmentId',
          select: 'slotStart status reasonForVisit prescription medicalTests notes doctorId clinicId createdAt',
          populate: [
            { path: 'doctorId', populate: { path: 'userId', select: 'name profilePhotoUrl' } },
            { path: 'clinicId', select: 'name address' },
          ],
        });

      // Dispatch booking notification
      try {
        const docName = populated.doctorId?.userId?.name || doctor.name || 'Doctor';
        notificationService.dispatch('appointment:created', {
          appointmentId: populated._id,
          patientId: populated.patientId?._id?.toString() || patientId.toString(),
          patientEmail: populated.patientId?.email,
          patientPhone: populated.patientId?.phone,
          doctorId: populated.doctorId?._id?.toString() || doctorId.toString(),
          doctorName: docName,
          slotStart: populated.slotStart,
          clinicId: populated.clinicId?._id?.toString(),
          clinicName: populated.clinicId?.name,
          date: new Date(populated.slotStart).toDateString(),
          message: `Your appointment with Dr. ${docName} on ${new Date(populated.slotStart).toDateString()} is confirmed.`,
        }).catch((e) => logger.warn(`Notification dispatch failed: ${e.message}`));
      } catch (err) {
        logger.warn(`Failed to dispatch booking notification: ${err.message}`);
      }

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
   * Automatically transition elapsed unattended appointments to cancelled
   * Any appointment with slotEnd < now that was never marked completed or cancelled
   */
  async autoCancelElapsedAppointments(filter = {}) {
    try {
      const now = new Date();
      const query = {
        ...filter,
        $or: [
          { slotEnd: { $lt: now } },
          { slotEnd: null, slotStart: { $lt: now } },
        ],
        status: { $in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED] },
      };

      const elapsedAppointments = await Appointment.find(query).select('_id slotId');
      if (!elapsedAppointments || elapsedAppointments.length === 0) return 0;

      const ids = elapsedAppointments.map((a) => a._id);
      const slotIds = elapsedAppointments.map((a) => a.slotId).filter(Boolean);

      await Promise.all([
        Appointment.updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              status: APPOINTMENT_STATUS.CANCELLED,
              cancelledBy: 'system',
              cancellationReason: 'Missed appointment - Visit slot elapsed without doctor completion',
              cancelledAt: now,
            },
          }
        ),
        AppointmentSlot.updateMany(
          { _id: { $in: slotIds } },
          { $set: { isBooked: false } }
        ),
      ]);

      logger.info(`Auto-cancelled ${ids.length} past elapsed unattended appointment(s)`);
      return ids.length;
    } catch (err) {
      logger.error('Error auto-cancelling elapsed appointments:', err);
      return 0;
    }
  }

  /**
   * Get authenticated patient's appointments
   */
  async getMyAppointments(patientId, { page = 1, limit = 10, status, upcoming } = {}) {
    await this.autoCancelElapsedAppointments({ patientId: new mongoose.Types.ObjectId(patientId) });

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
        .populate({
          path: 'previousAppointmentId',
          select: 'slotStart status reasonForVisit prescription medicalTests notes doctorId clinicId createdAt',
        })
        .sort({ slotStart: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    const formattedAppointments = appointments.map((apt) => {
      const bookedFor = apt.bookedFor || (apt.bookedForType === 'dependent' && apt.bookedForId ? {
        name: apt.bookedForId.name,
        relationship: apt.bookedForId.relationship,
        dateOfBirth: apt.bookedForId.dateOfBirth,
        type: 'dependent',
      } : {
        name: apt.patientId?.name || 'Patient',
        type: 'self',
      });
      const consultationFee = apt.consultationFee || apt.doctorId?.consultationFee || 500;
      const feeCurrency = apt.feeCurrency || apt.doctorId?.feeCurrency || 'INR';
      return {
        ...apt,
        bookedFor,
        consultationFee,
        feeCurrency,
      };
    });

    return {
      appointments: formattedAppointments,
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
      .populate('patientId', 'name email phone bloodGroup dateOfBirth gender allergies chronicConditions heightCm weightKg emergencyContactName emergencyContactPhone')
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email phone profilePhotoUrl' },
          { path: 'specializationId', select: 'name iconName' },
        ],
      })
      .populate('clinicId', 'name address city contactPhone')
      .populate('bookedForId')
      .populate({
        path: 'previousAppointmentId',
        select: 'slotStart status reasonForVisit prescription medicalTests notes doctorId clinicId createdAt',
        populate: [
          { path: 'doctorId', populate: { path: 'userId', select: 'name profilePhotoUrl' } },
          { path: 'clinicId', select: 'name address' },
        ],
      });

    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    // Auto-cancel past unattended appointments if slot elapsed without doctor completion
    if (
      [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status) &&
      ((appointment.slotEnd && new Date(appointment.slotEnd) < new Date()) ||
        (!appointment.slotEnd && new Date(appointment.slotStart) < new Date()))
    ) {
      const now = new Date();
      appointment.status = APPOINTMENT_STATUS.CANCELLED;
      appointment.cancelledBy = 'system';
      appointment.cancellationReason = 'Missed appointment - Visit slot elapsed without doctor completion';
      appointment.cancelledAt = now;
      await appointment.save();
      if (appointment.slotId) {
        await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { $set: { isBooked: false } });
      }
    }

    // Access control
    const currentUserIdStr = (currentUser._id || currentUser.id || '').toString();
    const docUserIdStr = (
      appointment.doctorId?.userId?._id ||
      appointment.doctorId?.userId ||
      ''
    ).toString();
    const isPatientOwner = currentUser.role === ROLES.PATIENT && (appointment.patientId?._id || appointment.patientId)?.toString() === currentUserIdStr;
    const isDoctorOwner = currentUser.role === ROLES.DOCTOR && docUserIdStr === currentUserIdStr;
    const isClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      appointment.clinicId &&
      currentUser.clinicId &&
      (appointment.clinicId._id || appointment.clinicId).toString() === currentUser.clinicId.toString();
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isClinicAdmin && !isPlatformAdmin) {
      throw new ForbiddenError('You do not have permission to view this appointment', ERROR_CODES.FORBIDDEN);
    }

    const aptObj = appointment.toObject ? appointment.toObject() : appointment;
    const bookedFor = aptObj.bookedFor || (aptObj.bookedForType === 'dependent' && aptObj.bookedForId ? {
      name: aptObj.bookedForId.name,
      relationship: aptObj.bookedForId.relationship,
      dateOfBirth: aptObj.bookedForId.dateOfBirth,
      gender: aptObj.bookedForId.gender,
      bloodGroup: aptObj.bookedForId.bloodGroup,
      allergies: aptObj.bookedForId.allergies,
      chronicConditions: aptObj.bookedForId.chronicConditions,
      heightCm: aptObj.bookedForId.heightCm,
      weightKg: aptObj.bookedForId.weightKg,
      emergencyContactName: aptObj.bookedForId.emergencyContactName,
      emergencyContactPhone: aptObj.bookedForId.emergencyContactPhone,
      type: 'dependent',
    } : {
      name: aptObj.patientId?.name || 'Patient',
      email: aptObj.patientId?.email,
      phone: aptObj.patientId?.phone,
      bloodGroup: aptObj.patientId?.bloodGroup,
      dateOfBirth: aptObj.patientId?.dateOfBirth,
      gender: aptObj.patientId?.gender,
      allergies: aptObj.patientId?.allergies,
      chronicConditions: aptObj.patientId?.chronicConditions,
      heightCm: aptObj.patientId?.heightCm,
      weightKg: aptObj.patientId?.weightKg,
      emergencyContactName: aptObj.patientId?.emergencyContactName,
      emergencyContactPhone: aptObj.patientId?.emergencyContactPhone,
      type: 'self',
    });
    const consultationFee = aptObj.consultationFee || aptObj.doctorId?.consultationFee || 500;
    const feeCurrency = aptObj.feeCurrency || aptObj.doctorId?.feeCurrency || 'INR';

    const existingReview = await Review.findOne({ appointmentId: appointment._id }).lean();

    return {
      ...aptObj,
      bookedFor,
      consultationFee,
      feeCurrency,
      review: existingReview || null,
    };
  }

  /**
   * Get appointments for a Doctor
   */
  async getDoctorAppointments(doctorId, { page = 1, limit = 10, status, date, upcoming, patientId, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    await this.autoCancelElapsedAppointments({ doctorId: new mongoose.Types.ObjectId(doctorId) });

    const query = { doctorId: new mongoose.Types.ObjectId(doctorId) };

    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      query.patientId = new mongoose.Types.ObjectId(patientId);
    }

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

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 1000);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const sortField = sortBy === 'slotStart' ? 'slotStart' : 'createdAt';
    const sortValue = sortOrder === 'asc' ? 1 : -1;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name email phone')
        .populate('bookedForId')
        .populate({
          path: 'previousAppointmentId',
          select: 'slotStart status reasonForVisit prescription medicalTests notes doctorId clinicId createdAt',
        })
        .sort({ [sortField]: sortValue })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    const formattedAppointments = appointments.map((apt) => {
      const bookedFor = apt.bookedFor || (apt.bookedForType === 'dependent' && apt.bookedForId ? {
        name: apt.bookedForId.name,
        relationship: apt.bookedForId.relationship,
        dateOfBirth: apt.bookedForId.dateOfBirth,
        type: 'dependent',
      } : {
        name: apt.patientId?.name || 'Patient',
        email: apt.patientId?.email,
        phone: apt.patientId?.phone,
        type: 'self',
      });
      const consultationFee = apt.consultationFee || apt.doctorId?.consultationFee || 500;
      const feeCurrency = apt.feeCurrency || apt.doctorId?.feeCurrency || 'INR';
      return {
        ...apt,
        bookedFor,
        consultationFee,
        feeCurrency,
      };
    });

    return {
      appointments: formattedAppointments,
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
    await this.autoCancelElapsedAppointments({ clinicId: new mongoose.Types.ObjectId(clinicId) });

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

    const formattedAppointments = appointments.map((apt) => {
      const bookedFor = apt.bookedFor || (apt.bookedForType === 'dependent' && apt.bookedForId ? {
        name: apt.bookedForId.name,
        relationship: apt.bookedForId.relationship,
        dateOfBirth: apt.bookedForId.dateOfBirth,
        type: 'dependent',
      } : {
        name: apt.patientId?.name || 'Patient',
        type: 'self',
      });
      const consultationFee = apt.consultationFee || apt.doctorId?.consultationFee || 500;
      const feeCurrency = apt.feeCurrency || apt.doctorId?.feeCurrency || 'INR';
      return {
        ...apt,
        bookedFor,
        consultationFee,
        feeCurrency,
      };
    });

    return {
      appointments: formattedAppointments,
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
  async updateStatus(appointmentId, { status, reason, notes, prescription, medicalTests } = {}, currentUser) {
    const appointment = await Appointment.findById(appointmentId).populate('doctorId');
    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    // Permission check
    const currentUserId = currentUser.id || currentUser._id?.toString();
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR &&
      (
        appointment.doctorId?.userId?.toString() === currentUserId ||
        appointment.doctorId?._id?.toString() === currentUserId ||
        appointment.doctorId?.toString() === currentUserId
      );
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

    // Protection rule: after appointment is cancelled or concluded, writing prescriptions/tests/notes is prohibited
    const isCancelled = appointment.status === APPOINTMENT_STATUS.CANCELLED;
    const isConcluded = appointment.status === APPOINTMENT_STATUS.COMPLETED || appointment.status === APPOINTMENT_STATUS.NO_SHOW;

    const isWritingContent =
      prescription !== undefined ||
      medicalTests !== undefined ||
      (notes !== undefined && notes !== appointment.notes);

    if (isWritingContent) {
      if (isCancelled) {
        throw new BadRequestError(
          'Cannot write or edit prescriptions, lab tests, or clinical notes for a cancelled appointment. This record is view-only.',
          ERROR_CODES.INVALID_STATUS_TRANSITION
        );
      }
      if (isConcluded) {
        throw new BadRequestError(
          'Cannot write or edit prescriptions, lab tests, or clinical notes for an already completed or concluded consultation. This record is view-only.',
          ERROR_CODES.INVALID_STATUS_TRANSITION
        );
      }
    }

    if (notes !== undefined) {
      appointment.notes = notes;
    }

    if (prescription !== undefined) {
      appointment.prescription = {
        medicines: prescription?.medicines || [],
        generalAdvice: prescription?.generalAdvice || '',
        followUpDate: prescription?.followUpDate || null,
        followUpDays: prescription?.followUpDays || null,
        prescribedAt: new Date(),
      };
    }

    if (medicalTests !== undefined) {
      appointment.medicalTests = medicalTests;
    }

    // Status transition validation
    if (status === 'no_show') {
      status = APPOINTMENT_STATUS.NO_SHOW;
    }

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

    if (status && status !== currentStatus) {
      const isSystemCancelled = currentStatus === APPOINTMENT_STATUS.CANCELLED && appointment.cancelledBy === 'system';
      const allowed = (validTransitions[currentStatus] || []).includes(status) ||
        (isSystemCancelled && [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.NO_SHOW].includes(status));

      if (!allowed) {
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
        if (appointment.slotId) {
          await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { $set: { isBooked: false } });
        }
      } else if (status === APPOINTMENT_STATUS.NO_SHOW) {
        // Free slot on no-show
        if (appointment.slotId) {
          await AppointmentSlot.findByIdAndUpdate(appointment.slotId, { $set: { isBooked: false } });
        }
      }
    }

    await appointment.save();
    logger.info(`Appointment ${appointment._id} updated by user ${currentUserId}`);

    if (status && status !== currentStatus) {
      try {
        const eventName = status === APPOINTMENT_STATUS.CANCELLED ? 'appointment:cancelled' : 'appointment:statusChanged';
        notificationService.dispatch(eventName, {
          appointmentId: appointment._id,
          patientId: appointment.patientId?.toString(),
          status: appointment.status,
          reason: appointment.cancellationReason,
          slotStart: appointment.slotStart,
          message: status === APPOINTMENT_STATUS.CANCELLED
            ? `Your appointment was cancelled: ${appointment.cancellationReason}`
            : `Your appointment status was updated to ${status}.`,
        }).catch((e) => logger.warn(`Status update notification dispatch failed: ${e.message}`));
      } catch (err) {
        logger.warn(`Failed to dispatch status update notification: ${err.message}`);
      }
    }

    return this.getAppointmentById(appointment._id, currentUser);
  }

  /**
   * Cancel appointment (Patient self-cancellation or Admin cancellation with window check)
   */
  async cancelAppointment(appointmentId, { reason, confirmLate, emergency } = {}, currentUser) {
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

    const currentUserId = (currentUser.id || currentUser._id || '').toString();
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR &&
      (
        appointment.doctorId?.userId?.toString() === currentUserId ||
        appointment.doctorId?._id?.toString() === currentUserId ||
        appointment.doctorId?.toString() === currentUserId
      );
    const isClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      appointment.clinicId &&
      currentUser.clinicId &&
      appointment.clinicId.toString() === currentUser.clinicId.toString();
    const isPatientOwner =
      currentUser.role === ROLES.PATIENT && appointment.patientId.toString() === currentUserId;
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isClinicAdmin && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to cancel this appointment',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Patient cancellation window check (relaxed if confirmLate/emergency confirmed)
    if (isPatientOwner && !confirmLate && !emergency) {
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
    appointment.cancelledBy = isDoctorOwner ? 'doctor' : (isClinicAdmin ? 'clinic_admin' : (isPatientOwner ? 'patient' : 'admin'));
    appointment.cancellationReason = reason || (isDoctorOwner ? 'Cancelled by doctor' : 'Cancelled by user');
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

    try {
      notificationService.dispatch('appointment:cancelled', {
        appointmentId: appointment._id,
        patientId: appointment.patientId?.toString(),
        slotStart: appointment.slotStart,
        reason: appointment.cancellationReason,
        cancelledBy: appointment.cancelledBy,
        date: new Date(appointment.slotStart).toDateString(),
        message: `Your appointment on ${new Date(appointment.slotStart).toDateString()} has been cancelled.`,
      }).catch((e) => logger.warn(`Cancellation notification dispatch failed: ${e.message}`));
    } catch (err) {
      logger.warn(`Failed to dispatch cancellation notification: ${err.message}`);
    }

    return appointment;
  }

  /**
   * Reschedule an existing appointment (Updates existing appointment in place without creating a new record)
   */
  async rescheduleAppointment(appointmentId, { slotId }, currentUser) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
      throw new BadRequestError('Cannot reschedule a cancelled appointment', ERROR_CODES.VALIDATION_ERROR);
    }

    if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
      throw new BadRequestError('Cannot reschedule a completed appointment', ERROR_CODES.VALIDATION_ERROR);
    }

    const isPatientOwner =
      currentUser.role === ROLES.PATIENT && appointment.patientId.toString() === currentUser.id;
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to reschedule this appointment',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Check system maintenance mode & cancellation window
    const settings = await SystemSettings.getSettings();
    if (settings.maintenanceMode) {
      throw new BadRequestError(
        'Platform is currently in maintenance mode. Appointment rescheduling is temporarily frozen.',
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (isPatientOwner) {
      const cancellationWindowMs = (settings.cancellationWindowHours || 24) * 60 * 60 * 1000;
      const appointmentTime = new Date(appointment.slotStart).getTime();
      if (appointmentTime - Date.now() < cancellationWindowMs) {
        throw new BadRequestError(
          `Appointments cannot be rescheduled within ${settings.cancellationWindowHours} hours of the scheduled start time`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (appointment.slotId && appointment.slotId.toString() === slotId.toString()) {
      throw new BadRequestError('Please select a different appointment slot to reschedule', ERROR_CODES.VALIDATION_ERROR);
    }

    const doctor = await DoctorProfile.findById(appointment.doctorId);
    if (!doctor || !doctor.isApproved) {
      throw new NotFoundError('Doctor not found or no longer active', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const now = new Date();

    // Execute atomic booking/rescheduling
    let session = null;
    let inTransaction = false;

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
      const sessionOptions = inTransaction && session ? { session } : {};

      // Atomically find and lock new slot (must belong to the SAME doctor)
      const newSlot = await AppointmentSlot.findOneAndUpdate(
        {
          _id: slotId,
          doctorId: doctor._id,
          isBooked: false,
          slotStart: { $gt: now },
        },
        { $set: { isBooked: true } },
        { new: true, ...sessionOptions }
      );

      if (!newSlot) {
        throw new ConflictError(
          'Selected slot is already booked or no longer available',
          ERROR_CODES.SLOT_ALREADY_BOOKED
        );
      }

      // Check if slot already has an active appointment (defense in depth)
      const existingAppt = await Appointment.findOne(
        { slotId: newSlot._id, status: { $ne: APPOINTMENT_STATUS.CANCELLED } },
        null,
        sessionOptions
      );

      if (existingAppt) {
        throw new ConflictError(
          'Selected slot is already booked or no longer available',
          ERROR_CODES.SLOT_ALREADY_BOOKED
        );
      }

      const oldSlotId = appointment.slotId;
      const oldSlotStart = appointment.slotStart;

      // Update existing appointment IN PLACE - do not create a new appointment document
      // All other details (bookedForType, bookedForId, doctor, fee, patient, reason) remain identical
      appointment.slotId = newSlot._id;
      appointment.slotStart = newSlot.slotStart;
      appointment.slotEnd = newSlot.slotEnd;
      appointment.reminder24hSent = false;
      appointment.reminder1hSent = false;
      appointment.rescheduledAt = new Date();
      appointment.rescheduleCount = (appointment.rescheduleCount || 0) + 1;

      await appointment.save(sessionOptions);

      // Free the old slot
      if (oldSlotId) {
        await AppointmentSlot.findByIdAndUpdate(
          oldSlotId,
          { $set: { isBooked: false } },
          sessionOptions
        );
      }

      if (inTransaction && session) {
        await session.commitTransaction();
      }

      logger.info(
        `Appointment ${appointment._id} rescheduled from ${oldSlotStart} to ${newSlot.slotStart}`
      );

      // Process waitlist for the freed old slot
      if (oldSlotStart) {
        import('./waitlistService.js').then(({ waitlistService }) => {
          waitlistService.processCancellation(appointment.doctorId, oldSlotStart).catch((e) => {
            logger.warn(`Waitlist processing failed for rescheduled slot: ${e.message}`);
          });
        }).catch(() => {});
      }

      // Populate response
      const populated = await Appointment.findById(appointment._id)
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

      try {
        const docName = populated.doctorId?.userId?.name || doctor.name || 'Doctor';
        notificationService.dispatch('appointment:rescheduled', {
          appointmentId: populated._id,
          patientId: populated.patientId?._id?.toString() || currentUser.id,
          patientEmail: populated.patientId?.email,
          patientPhone: populated.patientId?.phone,
          doctorId: populated.doctorId?._id?.toString() || appointment.doctorId.toString(),
          doctorName: docName,
          slotStart: populated.slotStart,
          clinicId: populated.clinicId?._id?.toString(),
          clinicName: populated.clinicId?.name,
          date: new Date(populated.slotStart).toDateString(),
          message: `Your appointment with Dr. ${docName} has been rescheduled to ${new Date(populated.slotStart).toDateString()} at ${new Date(populated.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        }).catch((e) => logger.warn(`Reschedule notification dispatch failed: ${e.message}`));
      } catch (err) {
        logger.warn(`Failed to dispatch reschedule notification: ${err.message}`);
      }

      return populated;
    } catch (err) {
      if (inTransaction && session) {
        try {
          await session.abortTransaction();
        } catch {
          // Transaction already aborted
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
   * Emergency unavailability: bulk cancels all today's confirmed/pending appointments
   */
  async emergencyUnavailable(doctorId, currentUser, data = {}) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // Check authorization
    const currentUserIdStr = (currentUser._id || currentUser.id || '').toString();
    const isDoctorOwner =
      currentUser.role === ROLES.DOCTOR && doctor.userId.toString() === currentUserIdStr;
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

    const { date, reason } = data;
    let targetStart, targetEnd, dateStr;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetStart = new Date(`${date}T00:00:00.000Z`);
      targetEnd = new Date(`${date}T23:59:59.999Z`);
      dateStr = date;
    } else {
      const now = new Date();
      targetStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      targetEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      dateStr = now.toISOString().split('T')[0];
    }

    const cancellationReason = reason || 'Doctor emergency unavailability';

    // Store override in doctor profile
    if (!doctor.unavailabilityOverrides) {
      doctor.unavailabilityOverrides = [];
    }
    doctor.unavailabilityOverrides.unshift({
      date: dateStr,
      reason: cancellationReason,
      declaredAt: new Date(),
    });
    if (doctor.unavailabilityOverrides.length > 20) {
      doctor.unavailabilityOverrides = doctor.unavailabilityOverrides.slice(0, 20);
    }
    await doctor.save();

    // Find all matching appointments
    const affectedAppointments = await Appointment.find({
      doctorId: doctor._id,
      status: { $in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING] },
      slotStart: { $gte: targetStart, $lte: targetEnd },
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
            cancellationReason,
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
      `Emergency unavailability triggered for Doctor ${doctor._id} on ${dateStr}. Cancelled ${appointmentIds.length} appointments.`
    );

    return {
      doctorId: doctor._id,
      date: dateStr,
      reason: cancellationReason,
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
