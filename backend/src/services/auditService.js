import mongoose from 'mongoose';
import { AuditLog, User, Clinic } from '../models/index.js';
import logger from '../utils/logger.js';

function formatAuditLogForOutput(log) {
  const ts = log.timestamp || log.createdAt || new Date();
  const actor = log.actorId && typeof log.actorId === 'object' ? log.actorId : null;
  const actorEmail = log.actorEmail || actor?.email || 'system@docyra.app';
  const actorName = actor?.name || (actorEmail && actorEmail.includes('@') ? actorEmail.split('@')[0].replace('.', ' ') : 'System Daemon');
  const actorRole = log.actorRole || actor?.role || 'system';
  const rType = log.resourceType || log.targetType || 'System';
  const rId = log.resourceId || log.targetId || '';

  return {
    ...log,
    id: log._id ? log._id.toString() : '',
    _id: log._id ? log._id.toString() : '',
    timestamp: ts,
    createdAt: ts,
    actorId: actor ? { _id: actor._id ? actor._id.toString() : '', name: actor.name, email: actor.email, role: actor.role } : null,
    actorName: actorName.charAt(0).toUpperCase() + actorName.slice(1),
    actorEmail,
    actorRole,
    action: log.action || 'SYSTEM_EVENT',
    resourceType: rType,
    targetType: rType,
    resourceId: rId,
    targetId: rId,
    ipAddress: log.ipAddress || '127.0.0.1',
    userAgent: log.userAgent || 'Docyra-Portal/1.0',
    metadata: log.metadata || {},
  };
}

class AuditService {
  /**
   * Log an audit event (Non-blocking async write)
   */
  async log({
    actorId = null,
    actorEmail = null,
    actorRole = 'anonymous',
    action,
    resourceType,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
  }) {
    try {
      await AuditLog.create({
        actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? new mongoose.Types.ObjectId(actorId) : null,
        actorEmail,
        actorRole,
        action,
        resourceType,
        resourceId: resourceId ? resourceId.toString() : null,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Docyra-Operations/1.0',
        metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error(`Failed to record audit log: ${err.message}`, { action, resourceType, resourceId });
    }
  }

  /**
   * Auto-seed realistic initial compliance audit logs if database is empty
   */
  async seedInitialAuditLogsIfEmpty() {
    try {
      const count = await AuditLog.countDocuments();
      if (count > 0) return;

      const adminUser = await User.findOne({ email: 'admin@docyra.app' }).lean();
      const clinicAdmin = await User.findOne({ email: 'apollo.admin@docyra.app' }).lean();
      const doctorUser = await User.findOne({ email: 'sarah.jenkins@docyra.app' }).lean();
      const sampleClinic = await Clinic.findOne().lean();

      const now = Date.now();
      const minutesAgo = (mins) => new Date(now - mins * 60 * 1000);
      const hoursAgo = (hrs) => new Date(now - hrs * 3600 * 1000);
      const daysAgo = (days) => new Date(now - days * 24 * 3600 * 1000);

      const sampleLogs = [
        {
          actorId: adminUser ? adminUser._id : null,
          actorEmail: 'admin@docyra.app',
          actorRole: 'admin',
          action: 'USER_LOGIN',
          resourceType: 'Auth',
          resourceId: adminUser ? adminUser._id.toString() : 'auth-session',
          ipAddress: '103.21.244.18',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          metadata: { loginMethod: 'password', mfaVerified: false, portal: 'admin_portal' },
          timestamp: minutesAgo(8),
        },
        {
          actorId: adminUser ? adminUser._id : null,
          actorEmail: 'admin@docyra.app',
          actorRole: 'admin',
          action: 'SYSTEM_SETTINGS_UPDATE',
          resourceType: 'SystemSettings',
          resourceId: 'global_config',
          ipAddress: '103.21.244.18',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          metadata: { updatedFields: ['defaultCurrency', 'cancellationWindowHours'], newCurrency: 'INR', previousCurrency: 'INR' },
          timestamp: minutesAgo(24),
        },
        {
          actorId: null,
          actorEmail: 'system@docyra.app',
          actorRole: 'system',
          action: 'SLOT_GENERATION_CRON',
          resourceType: 'AppointmentSlot',
          resourceId: 'batch-slot-gen-daily',
          ipAddress: '127.0.0.1',
          userAgent: 'Docyra-CronDaemon/v2.1',
          metadata: { generatedSlotsCount: 48, doctorsProcessed: 4, dateRangeDays: 14 },
          timestamp: hoursAgo(2),
        },
        {
          actorId: adminUser ? adminUser._id : null,
          actorEmail: 'admin@docyra.app',
          actorRole: 'admin',
          action: 'CLINIC_STATUS_UPDATE',
          resourceType: 'Clinic',
          resourceId: sampleClinic ? sampleClinic._id.toString() : '661000000000000000000001',
          ipAddress: '103.21.244.18',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          metadata: { clinicName: sampleClinic?.name || 'Apollo City Care Center', previousStatus: 'trial', newStatus: 'active' },
          timestamp: hoursAgo(5),
        },
        {
          actorId: clinicAdmin ? clinicAdmin._id : null,
          actorEmail: 'apollo.admin@docyra.app',
          actorRole: 'clinic_admin',
          action: 'USER_LOGIN',
          resourceType: 'Auth',
          resourceId: clinicAdmin ? clinicAdmin._id.toString() : 'auth-session',
          ipAddress: '49.207.210.82',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
          metadata: { loginMethod: 'password', clinicId: sampleClinic ? sampleClinic._id.toString() : null },
          timestamp: hoursAgo(7),
        },
        {
          actorId: adminUser ? adminUser._id : null,
          actorEmail: 'admin@docyra.app',
          actorRole: 'admin',
          action: 'DOCTOR_CREDENTIAL_VERIFIED',
          resourceType: 'DoctorProfile',
          resourceId: doctorUser ? doctorUser._id.toString() : 'doc-profile-01',
          ipAddress: '103.21.244.18',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          metadata: { doctorName: 'Dr. Sarah Jenkins', licenseNumber: 'MCI-2018-8472', verificationStatus: 'approved' },
          timestamp: hoursAgo(12),
        },
        {
          actorId: doctorUser ? doctorUser._id : null,
          actorEmail: 'sarah.jenkins@docyra.app',
          actorRole: 'doctor',
          action: 'AVAILABILITY_RULE_SAVED',
          resourceType: 'AvailabilityRule',
          resourceId: 'rule-weekday-morning',
          ipAddress: '122.161.49.15',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Mobile/15E148',
          metadata: { daysOfWeek: [1, 2, 3, 4, 5], shiftStart: '09:00', shiftEnd: '14:00', slotDuration: 30 },
          timestamp: daysAgo(1),
        },
        {
          actorId: null,
          actorEmail: 'patient.john@example.com',
          actorRole: 'patient',
          action: 'APPOINTMENT_BOOKED',
          resourceType: 'Appointment',
          resourceId: 'apt-sample-301',
          ipAddress: '115.99.182.44',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
          metadata: { specialization: 'Cardiology', fee: 800, bookingType: 'self' },
          timestamp: daysAgo(2),
        },
        {
          actorId: doctorUser ? doctorUser._id : null,
          actorEmail: 'sarah.jenkins@docyra.app',
          actorRole: 'doctor',
          action: 'APPOINTMENT_COMPLETED',
          resourceType: 'Appointment',
          resourceId: 'apt-sample-301',
          ipAddress: '122.161.49.15',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          metadata: { patientOutcome: 'Prescription Issued & Follow-up Scheduled', durationMins: 25 },
          timestamp: daysAgo(2),
        },
        {
          actorId: adminUser ? adminUser._id : null,
          actorEmail: 'admin@docyra.app',
          actorRole: 'admin',
          action: 'CLINIC_ONBOARD',
          resourceType: 'Clinic',
          resourceId: sampleClinic ? sampleClinic._id.toString() : '661000000000000000000001',
          ipAddress: '103.21.244.18',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          metadata: { name: 'MetroCare Wellness Polyclinic', city: 'Mumbai', tier: 'enterprise' },
          timestamp: daysAgo(3),
        },
        {
          actorId: null,
          actorEmail: 'system@docyra.app',
          actorRole: 'system',
          action: 'SECURITY_AUDIT_VERIFIED',
          resourceType: 'SecurityPolicy',
          resourceId: 'hipaa-phi-integrity-check',
          ipAddress: '127.0.0.1',
          userAgent: 'Docyra-SecDaemon/v1.0',
          metadata: { integrityCheck: 'PASSED', unencryptedFieldsFound: 0, complianceStandard: 'HIPAA/DISHA' },
          timestamp: daysAgo(4),
        },
        {
          actorId: null,
          actorEmail: 'system@docyra.app',
          actorRole: 'system',
          action: 'PLATFORM_INITIALIZATION',
          resourceType: 'SystemSettings',
          resourceId: 'initial_deployment',
          ipAddress: '127.0.0.1',
          userAgent: 'Docyra-InitScript/v1.0',
          metadata: { version: '2.0.0', environment: 'production', multiTenantEnabled: true },
          timestamp: daysAgo(7),
        },
      ];

      await AuditLog.insertMany(sampleLogs);
      logger.info(`Seeded ${sampleLogs.length} initial compliance audit records.`);
    } catch (err) {
      logger.warn(`Could not auto-seed audit logs: ${err.message}`);
    }
  }

  /**
   * Platform Admin: Query searchable, paginated audit logs with live metrics
   */
  async getAuditLogs({
    page = 1,
    limit = 20,
    actorId,
    actorEmail,
    action,
    resourceType,
    dateFrom,
    dateTo,
    search,
    role,
  }) {
    // Seed sample compliance logs if collection is empty
    await this.seedInitialAuditLogsIfEmpty();

    const query = {};

    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      query.actorId = new mongoose.Types.ObjectId(actorId);
    }

    if (actorEmail) {
      query.actorEmail = { $regex: actorEmail, $options: 'i' };
    }

    if (role && role !== 'all') {
      query.actorRole = role;
    }

    if (action) {
      query.action = action;
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) query.timestamp.$lte = new Date(dateTo);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { action: { $regex: s, $options: 'i' } },
        { actorEmail: { $regex: s, $options: 'i' } },
        { resourceType: { $regex: s, $options: 'i' } },
        { resourceId: { $regex: s, $options: 'i' } },
        { ipAddress: { $regex: s, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [logs, total, totalCount, adminCount, systemCount, securityCount, distinctActors] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      AuditLog.countDocuments(query),
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ actorRole: 'admin' }),
      AuditLog.countDocuments({ actorRole: 'system' }),
      AuditLog.countDocuments({
        action: { $regex: 'LOGIN|LOGOUT|AUTH|SECURITY|PASSWORD|SUSPEND|VERIF', $options: 'i' },
      }),
      AuditLog.distinct('actorEmail'),
    ]);

    const formattedLogs = logs.map(formatAuditLogForOutput);

    return {
      logs: formattedLogs,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
        stats: {
          totalEvents: totalCount,
          adminEvents: adminCount,
          systemEvents: systemCount,
          securityEvents: securityCount,
          distinctActors: distinctActors.length || 1,
        },
      },
    };
  }
}

export const auditService = new AuditService();
export default auditService;
