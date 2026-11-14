import mongoose from 'mongoose';
import { Dependent, Appointment } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import { ERROR_CODES, APPOINTMENT_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';
import { emitToUser } from '../sockets/index.js';

class DependentService {
  /**
   * Add a dependent family member for a patient
   */
  async createDependent(patientId, data) {
    const dependent = await Dependent.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      name: data.name,
      relationship: data.relationship,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender || 'prefer_not_to_say',
      bloodGroup: data.bloodGroup || null,
      allergies: data.allergies || '',
      chronicConditions: data.chronicConditions || '',
      emergencyContactName: data.emergencyContactName || '',
      emergencyContactPhone: data.emergencyContactPhone || '',
      heightCm: data.heightCm ? parseFloat(data.heightCm) : null,
      weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
    });

    logger.info(`Dependent created: ${dependent.name} for patient ${patientId}`);

    try {
      emitToUser(patientId.toString(), 'dependent:created', {
        dependentId: dependent._id,
        name: dependent.name,
        relationship: dependent.relationship,
        message: `${dependent.name} (${dependent.relationship}) was added to your family profiles.`,
      });
    } catch (err) {
      logger.warn(`Failed to emit dependent:created socket: ${err.message}`);
    }

    return dependent;
  }

  /**
   * List all dependents for a patient
   */
  async listDependents(patientId) {
    const dependents = await Dependent.find({
      patientId: new mongoose.Types.ObjectId(patientId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return dependents;
  }

  /**
   * Get single dependent detail
   */
  async getDependent(patientId, dependentId) {
    const dependent = await Dependent.findOne({
      _id: dependentId,
      patientId,
    }).lean();

    if (!dependent) {
      throw new NotFoundError('Dependent not found', ERROR_CODES.NOT_FOUND);
    }

    return dependent;
  }

  /**
   * Update dependent
   */
  async updateDependent(patientId, dependentId, updateData) {
    const dependent = await Dependent.findOne({
      _id: dependentId,
      patientId,
    });

    if (!dependent) {
      throw new NotFoundError('Dependent not found', ERROR_CODES.NOT_FOUND);
    }

    if (updateData.name) dependent.name = updateData.name;
    if (updateData.relationship) dependent.relationship = updateData.relationship;
    if (updateData.dateOfBirth) dependent.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.gender) dependent.gender = updateData.gender;
    if (updateData.bloodGroup !== undefined) dependent.bloodGroup = updateData.bloodGroup || null;
    if (updateData.allergies !== undefined) dependent.allergies = updateData.allergies || '';
    if (updateData.chronicConditions !== undefined) dependent.chronicConditions = updateData.chronicConditions || '';
    if (updateData.emergencyContactName !== undefined) dependent.emergencyContactName = updateData.emergencyContactName || '';
    if (updateData.emergencyContactPhone !== undefined) dependent.emergencyContactPhone = updateData.emergencyContactPhone || '';
    if (updateData.heightCm !== undefined) dependent.heightCm = updateData.heightCm ? parseFloat(updateData.heightCm) : null;
    if (updateData.weightKg !== undefined) dependent.weightKg = updateData.weightKg ? parseFloat(updateData.weightKg) : null;

    await dependent.save();
    return dependent;
  }

  /**
   * Delete dependent
   */
  async deleteDependent(patientId, dependentId) {
    const dependent = await Dependent.findOne({
      _id: dependentId,
      patientId,
    });

    if (!dependent) {
      throw new NotFoundError('Dependent not found', ERROR_CODES.NOT_FOUND);
    }

    // Check if there are active appointments for this dependent
    const activeAppointment = await Appointment.findOne({
      bookedForId: dependent._id,
      status: { $in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED] },
    });

    if (activeAppointment) {
      throw new BadRequestError(
        'Cannot delete dependent with active upcoming appointments',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const depName = dependent.name;
    await Dependent.deleteOne({ _id: dependent._id });
    logger.info(`Dependent deleted: ${dependentId} by patient ${patientId}`);

    try {
      emitToUser(patientId.toString(), 'dependent:deleted', {
        dependentId,
        name: depName,
        message: `${depName} profile was removed from your account.`,
      });
    } catch (err) {
      logger.warn(`Failed to emit dependent:deleted socket: ${err.message}`);
    }
  }
}

export const dependentService = new DependentService();
export default dependentService;
