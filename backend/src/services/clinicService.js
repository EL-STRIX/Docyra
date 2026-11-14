import mongoose from 'mongoose';
import { Clinic, DoctorProfile, Appointment } from '../models/index.js';
import { CLINIC_SUBSCRIPTION_STATUS, ERROR_CODES, APPOINTMENT_STATUS } from '../config/constants.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

function formatClinicForOutput(c, doctorCount = 0) {
  const isAct = c.subscriptionStatus === CLINIC_SUBSCRIPTION_STATUS.ACTIVE || c.status === 'active';
  const streetStr = typeof c.address === 'string' ? c.address : (c.address?.street || '');
  const cityStr = c.city || (typeof c.address === 'object' ? c.address?.city : '') || '';
  const stateStr = c.state || (typeof c.address === 'object' ? c.address?.state : '') || '';
  const postalCodeStr = c.postalCode || (typeof c.address === 'object' ? c.address?.postalCode : '') || '';
  const countryStr = c.country || (typeof c.address === 'object' ? c.address?.country : '') || 'India';
  const phoneStr = c.contactPhone || (typeof c.contact === 'object' ? c.contact?.phone : '') || '';
  const emailStr = c.contactEmail || (typeof c.contact === 'object' ? c.contact?.email : '') || '';

  return {
    ...c,
    isActive: isAct,
    status: isAct ? 'active' : 'suspended',
    subscriptionStatus: c.subscriptionStatus || (isAct ? 'active' : 'suspended'),
    doctorCount,
    rating: c.avgRating || 5.0,
    reviewCount: c.totalReviews || 0,
    address: streetStr,
    addressObject: {
      street: streetStr,
      city: cityStr,
      state: stateStr,
      postalCode: postalCodeStr,
      country: countryStr,
    },
    street: streetStr,
    city: cityStr,
    state: stateStr,
    postalCode: postalCodeStr,
    country: countryStr,
    contactPhone: phoneStr,
    contactEmail: emailStr,
    contact: {
      phone: phoneStr,
      email: emailStr,
      website: c.website || '',
    },
  };
}

class ClinicService {
  /**
   * Public: List active clinics with search & pagination (No geo-search, B2B onboarded model)
   */
  async listPublicClinics({ page = 1, limit = 10, search, city }) {
    const query = {
      subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    };

    if (city) {
      query.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Clinic.countDocuments(query),
    ]);

    // Attach doctor count to each clinic
    const clinicIds = clinics.map((c) => c._id);
    const doctorCounts = await DoctorProfile.aggregate([
      { $match: { clinicId: { $in: clinicIds }, isApproved: true } },
      { $group: { _id: '$clinicId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    doctorCounts.forEach((dc) => {
      countMap[dc._id.toString()] = dc.count;
    });

    const enrichedClinics = clinics.map((c) =>
      formatClinicForOutput(c, countMap[c._id.toString()] || 0)
    );

    return {
      clinics: enrichedClinics,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Public: Get clinic detail with doctor roster
   */
  async getClinicDetail(clinicId) {
    const clinic = await Clinic.findById(clinicId).lean();
    if (!clinic) {
      throw new NotFoundError('Clinic not found', ERROR_CODES.CLINIC_NOT_FOUND);
    }

    // Fetch doctors affiliated with this clinic (only approved practitioners)
    const rawDoctors = await DoctorProfile.find({
      clinicId: clinic._id,
      isApproved: true,
    })
      .populate('userId', 'name email phone profilePhotoUrl status')
      .populate('specializationId', 'name iconName')
      .lean();

    const doctors = rawDoctors.map((doc) => ({
      ...doc,
      name: doc.userId?.name || doc.name || 'Practitioner',
      email: doc.userId?.email || doc.email || '',
      phone: doc.userId?.phone || doc.phone || '',
      status: doc.status || (doc.userId?.status === 'active' || doc.isApproved ? 'active' : 'suspended'),
      experienceYears: doc.yearsExperience ?? doc.experienceYears ?? 0,
      yearsExperience: doc.yearsExperience ?? doc.experienceYears ?? 0,
    }));

    return {
      clinic: formatClinicForOutput(clinic, doctors.length),
      doctors,
    };
  }

  /**
   * Platform Admin: Onboard a new clinic
   */
  async onboardClinic({ name, address, city, state, postalCode, country, website, contactEmail, contactPhone, subscriptionStatus = CLINIC_SUBSCRIPTION_STATUS.ACTIVE, description, adminId }) {
    const existing = await Clinic.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new ConflictError('A clinic with this name already exists', ERROR_CODES.CONFLICT);
    }

    const clinic = await Clinic.create({
      name,
      address,
      city,
      state: state || '',
      postalCode: postalCode || '',
      country: country || 'India',
      website: website || '',
      contactEmail,
      contactPhone,
      subscriptionStatus,
      description: description || '',
      onboardedByAdminId: adminId,
    });

    logger.info(`Clinic onboarded: ${clinic.name} (${clinic._id})`);
    return clinic;
  }

  /**
   * Platform Admin: Update clinic details or subscription status
   */
  async updateClinic(clinicId, updateData) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      throw new NotFoundError('Clinic not found', ERROR_CODES.CLINIC_NOT_FOUND);
    }

    if (updateData.name && updateData.name !== clinic.name) {
      const duplicate = await Clinic.findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: clinicId },
      });
      if (duplicate) {
        throw new ConflictError('A clinic with this name already exists', ERROR_CODES.CONFLICT);
      }
    }

    Object.assign(clinic, updateData);
    await clinic.save();

    logger.info(`Clinic updated: ${clinic.name} (${clinic._id})`);
    return clinic;
  }

  /**
   * Platform Admin: List all clinics (including suspended and trial)
   */
  async listAllClinicsAdmin({ page = 1, limit = 10, status, search }) {
    const query = {};

    if (status) {
      query.subscriptionStatus = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .populate('onboardedByAdminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Clinic.countDocuments(query),
    ]);

    return {
      clinics: clinics.map((c) => formatClinicForOutput(c)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Clinic Admin: Revenue Analytics & Records based strictly on completed consultations
   */
  async getClinicRevenueAnalytics({ clinicId, period = 'day', startDate, endDate, year, doctorId }) {
    if (!clinicId) {
      throw new NotFoundError('Clinic ID is required', ERROR_CODES.VALIDATION_ERROR);
    }

    const query = {
      clinicId: new mongoose.Types.ObjectId(clinicId),
      status: APPOINTMENT_STATUS.COMPLETED, // STRICTLY COMPLETED APPOINTMENTS ONLY
    };

    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      query.doctorId = new mongoose.Types.ObjectId(doctorId);
    }

    const completedAppointments = await Appointment.find(query)
      .populate({
        path: 'doctorId',
        select: 'userId specializationId consultationFee title qualifications',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'specializationId', select: 'name' },
        ],
      })
      .populate('patientId', 'name email phone')
      .populate('bookedForId', 'name relationship gender')
      .sort({ updatedAt: -1, slotStart: -1 })
      .lean();

    // Helper for Indian Standard Time (Asia/Kolkata) formatting
    const toIST = (date) => {
      const d = new Date(date);
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d); // YYYY-MM-DD
      const [y, m, day] = dateStr.split('-');
      return {
        fullDate: dateStr,
        year: y,
        month: `${y}-${m}`,
        day,
        formatted: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(d),
        shortDay: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(d),
        monthLabel: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }).format(d),
        shortMonth: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(d),
      };
    };

    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const currentYearIST = todayIST.split('-')[0];

    let todayRevenue = 0;
    let todayCompletedVisits = 0;
    let totalRevenue = 0;
    let totalCompletedVisits = completedAppointments.length;

    const doctorMap = new Map();

    const processedApts = completedAppointments.map((apt) => {
      const fee = typeof apt.consultationFee === 'number' && apt.consultationFee >= 0
        ? apt.consultationFee
        : (apt.doctorId?.consultationFee || 500);

      const completionDate = apt.updatedAt || apt.slotStart || apt.createdAt;
      const ist = toIST(completionDate);

      totalRevenue += fee;

      if (ist.fullDate === todayIST) {
        todayRevenue += fee;
        todayCompletedVisits += 1;
      }

      // Group doctor revenue
      const docId = apt.doctorId?._id?.toString() || 'unknown';
      let docEntry = doctorMap.get(docId);
      if (!docEntry) {
        const dObj = apt.doctorId || {};
        let docName = dObj.userId?.name || dObj.name || 'Practitioner';
        if (!/^dr\.?\s+/i.test(docName)) {
          docName = `Dr. ${docName}`;
        }
        docEntry = {
          doctorId: docId,
          doctorName: docName,
          specialization: dObj.specializationId?.name || 'General Medicine',
          consultationFee: dObj.consultationFee || 500,
          completedVisits: 0,
          revenue: 0,
        };
        doctorMap.set(docId, docEntry);
      }
      docEntry.completedVisits += 1;
      docEntry.revenue += fee;

      let patientName = apt.bookedForId?.name || apt.patientId?.name || 'Patient';
      if (apt.bookedForType === 'dependent' && apt.bookedForId?.relationship) {
        patientName += ` (${apt.bookedForId.relationship})`;
      }

      let docName = apt.doctorId?.userId?.name || apt.doctorId?.name || 'Practitioner';
      if (!/^dr\.?\s+/i.test(docName)) {
        docName = `Dr. ${docName}`;
      }

      return {
        _id: apt._id,
        appointmentId: apt._id,
        patientName,
        patientEmail: apt.patientId?.email || '',
        patientPhone: apt.patientId?.phone || '',
        doctorName,
        doctorId: apt.doctorId?._id,
        specialization: apt.doctorId?.specializationId?.name || 'General Medicine',
        fee,
        status: apt.status,
        completedAt: completionDate,
        appointmentDate: apt.slotStart,
        istDate: ist.fullDate,
        istMonth: ist.month,
        istYear: ist.year,
        istFormatted: ist.formatted,
        reasonForVisit: apt.reasonForVisit || 'Medical Consultation',
      };
    });

    const averageFeePerVisit = totalCompletedVisits > 0 ? Math.round(totalRevenue / totalCompletedVisits) : 0;

    // Doctor Breakdown
    const doctorBreakdown = Array.from(doctorMap.values()).map((doc) => ({
      ...doc,
      percentage: totalRevenue > 0 ? Math.round((doc.revenue / totalRevenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Build Chart Data based on period
    let chartData = [];
    let periodRevenue = 0;
    let periodCompletedVisits = 0;

    if (period === 'month') {
      const selectedYear = year ? String(year) : currentYearIST;
      const monthsMap = new Map();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 1; m <= 12; m++) {
        const mKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
        monthsMap.set(mKey, {
          key: mKey,
          label: `${monthNames[m - 1]} ${selectedYear}`,
          shortLabel: monthNames[m - 1],
          revenue: 0,
          count: 0,
        });
      }

      for (const apt of processedApts) {
        if (apt.istYear === selectedYear && monthsMap.has(apt.istMonth)) {
          const entry = monthsMap.get(apt.istMonth);
          entry.revenue += apt.fee;
          entry.count += 1;
          periodRevenue += apt.fee;
          periodCompletedVisits += 1;
        }
      }

      chartData = Array.from(monthsMap.values());
    } else if (period === 'year') {
      const currentY = parseInt(currentYearIST, 10);
      const yearsMap = new Map();
      for (let y = currentY - 4; y <= currentY; y++) {
        const yKey = String(y);
        yearsMap.set(yKey, {
          key: yKey,
          label: yKey,
          shortLabel: yKey,
          revenue: 0,
          count: 0,
        });
      }

      for (const apt of processedApts) {
        if (yearsMap.has(apt.istYear)) {
          const entry = yearsMap.get(apt.istYear);
          entry.revenue += apt.fee;
          entry.count += 1;
          periodRevenue += apt.fee;
          periodCompletedVisits += 1;
        }
      }

      chartData = Array.from(yearsMap.values());
    } else {
      // Default: 'day' - Show continuous daily breakdown (last 14 days)
      const daysMap = new Map();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
        const shortLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(d);
        daysMap.set(dateKey, {
          key: dateKey,
          label: shortLabel,
          shortLabel,
          date: dateKey,
          revenue: 0,
          count: 0,
        });
      }

      for (const apt of processedApts) {
        if (daysMap.has(apt.istDate)) {
          const entry = daysMap.get(apt.istDate);
          entry.revenue += apt.fee;
          entry.count += 1;
          periodRevenue += apt.fee;
          periodCompletedVisits += 1;
        }
      }

      chartData = Array.from(daysMap.values());
    }

    return {
      summary: {
        todayRevenue,
        todayCompletedVisits,
        totalRevenue,
        totalCompletedVisits,
        periodRevenue,
        periodCompletedVisits,
        averageFeePerVisit,
        period,
      },
      chartData,
      doctorBreakdown,
      transactions: processedApts,
    };
  }
}

export const clinicService = new ClinicService();
export default clinicService;
