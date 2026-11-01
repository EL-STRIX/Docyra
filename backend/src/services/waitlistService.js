import mongoose from 'mongoose';
import { Waitlist, DoctorProfile } from '../models/index.js';
import { appointmentService } from './appointmentService.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';

class WaitlistService {
  /**
   * Patient: Join waitlist for a doctor across a desired date range
   */
  async joinWaitlist({ patientId, doctorId, desiredDateRangeStart, desiredDateRangeEnd }) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor || !doctor.isApproved) {
      throw new NotFoundError('Doctor not found or not approved', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const startDate = new Date(desiredDateRangeStart);
    const endDate = new Date(desiredDateRangeEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid date format for desired date range', ERROR_CODES.VALIDATION_ERROR);
    }

    if (startDate > endDate) {
      throw new BadRequestError('desiredDateRangeEnd must be after desiredDateRangeStart', ERROR_CODES.VALIDATION_ERROR);
    }

    // Check for duplicate active waitlist
    const existing = await Waitlist.findOne({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: doctor._id,
      status: 'waiting',
      desiredDateRangeStart: startDate,
      desiredDateRangeEnd: endDate,
    });

    if (existing) {
      return existing;
    }

    const waitlistEntry = await Waitlist.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: doctor._id,
      desiredDateRangeStart: startDate,
      desiredDateRangeEnd: endDate,
      status: 'waiting',
    });

    logger.info(`Patient ${patientId} joined waitlist for Doctor ${doctorId}`);
    return waitlistEntry;
  }

  /**
   * FIFO Waitlist claim trigger on appointment/slot cancellation (Architecture 7.6)
   */
  async processCancellation(doctorId, cancelledSlotStart) {
    const slotTime = new Date(cancelledSlotStart);

    // Find earliest waiting patient in FIFO order
    const candidate = await Waitlist.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: 'waiting',
      desiredDateRangeStart: { $lte: slotTime },
      desiredDateRangeEnd: { $gte: slotTime },
    }).sort({ createdAt: 1 });

    if (!candidate) {
      logger.info(`No waiting patients found for cancelled slot at ${slotTime.toISOString()}`);
      return null;
    }

    candidate.status = 'notified';
    candidate.notifiedAt = new Date();
    candidate.claimExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours claim window
    await candidate.save();

    logger.info(
      `Waitlist candidate notified: Patient ${candidate.patientId} for Doctor ${doctorId} (Slot: ${slotTime.toISOString()})`
    );

    return candidate;
  }

  /**
   * Patient: Claim notified waitlist slot
   */
  async claimSlot({ waitlistId, slotId, reasonForVisit, notes, captchaToken }, patientId) {
    const waitlist = await Waitlist.findById(waitlistId);
    if (!waitlist) {
      throw new NotFoundError('Waitlist entry not found', ERROR_CODES.NOT_FOUND);
    }

    if (waitlist.patientId.toString() !== patientId) {
      throw new ForbiddenError('You do not have permission to claim this waitlist slot', ERROR_CODES.FORBIDDEN);
    }

    if (waitlist.status !== 'notified') {
      throw new BadRequestError('Waitlist slot is not in notified status', ERROR_CODES.VALIDATION_ERROR);
    }

    if (waitlist.claimExpiresAt && new Date() > new Date(waitlist.claimExpiresAt)) {
      waitlist.status = 'expired';
      await waitlist.save();
      throw new BadRequestError('Waitlist claim window has expired', ERROR_CODES.VALIDATION_ERROR);
    }

    // Execute booking transaction
    const appointment = await appointmentService.bookSlot({
      patientId,
      doctorId: waitlist.doctorId,
      slotId,
      reasonForVisit: reasonForVisit || 'Booked via waitlist',
      notes: notes || '',
      captchaToken,
    });

    waitlist.status = 'claimed';
    await waitlist.save();

    logger.info(`Waitlist ${waitlist._id} claimed successfully by patient ${patientId}`);
    return appointment;
  }

  /**
   * Patient: List my waitlist entries
   */
  async getMyWaitlists(patientId) {
    const entries = await Waitlist.find({
      patientId: new mongoose.Types.ObjectId(patientId),
      status: { $nin: ['cancelled'] },
    })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name profilePhotoUrl' },
          { path: 'specializationId', select: 'name' },
          { path: 'clinicId', select: 'name city' },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    return entries;
  }

  /**
   * Patient: Cancel waitlist request
   */
  async cancelWaitlist(waitlistId, patientId) {
    const entry = await Waitlist.findOne({
      _id: waitlistId,
      patientId: new mongoose.Types.ObjectId(patientId),
    });

    if (!entry) {
      throw new NotFoundError('Waitlist entry not found', ERROR_CODES.NOT_FOUND);
    }

    entry.status = 'cancelled';
    await entry.save();

    logger.info(`Waitlist ${waitlistId} cancelled by patient ${patientId}`);
    return entry;
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
