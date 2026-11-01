import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Clinic } from '../models/Clinic.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Appointment } from '../models/Appointment.js';
import { AppointmentSlot } from '../models/AppointmentSlot.js';
import { Review } from '../models/Review.js';

export const getHealth = (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      services: {
        database: dbStatus,
        api: 'online',
      },
    },
  });
};

export const getPublicStats = async (req, res, next) => {
  try {
    const [
      totalClinics,
      totalDoctors,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalSlots,
      doctorRatingsAggregate,
      reviewsAggregate,
    ] = await Promise.all([
      Clinic.countDocuments({ subscriptionStatus: { $ne: 'suspended' } }),
      DoctorProfile.countDocuments({ isApproved: true }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      AppointmentSlot.countDocuments({ slotStart: { $gte: new Date() }, isBooked: false }),
      DoctorProfile.aggregate([
        { $match: { isApproved: true, avgRating: { $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: '$avgRating' }, totalReviews: { $sum: '$totalReviews' } } },
      ]),
      Review.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    // Live slot reliability
    let slotReliability = '99.9%';
    if (totalAppointments > 0) {
      const successful = totalAppointments - cancelledAppointments;
      const rate = (successful / totalAppointments) * 100;
      slotReliability = rate === 100 ? '100%' : `${rate.toFixed(1)}%`;
    }

    let avgRating = 4.8;
    if (doctorRatingsAggregate.length > 0 && doctorRatingsAggregate[0].avgRating) {
      avgRating = Math.round(doctorRatingsAggregate[0].avgRating * 10) / 10;
    } else if (reviewsAggregate.length > 0 && reviewsAggregate[0].avgRating) {
      avgRating = Math.round(reviewsAggregate[0].avgRating * 10) / 10;
    }

    res.status(200).json({
      success: true,
      data: {
        totalClinics,
        totalDoctors,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        slotReliability,
        totalSlots,
        avgRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getHealth,
  getPublicStats,
};
