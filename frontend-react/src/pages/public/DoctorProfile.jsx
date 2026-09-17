import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Building2,
  Stethoscope,
  Calendar,
  Clock,
  ShieldCheck,
  Award,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  // Available date buttons (today + next 6 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  useEffect(() => {
    if (doctor) {
      fetchSlots(selectedDate);
      fetchReviews();
    }
  }, [doctor, selectedDate]);

  const fetchDoctor = async () => {
    try {
      setLoadingDoctor(true);
      const res = await apiClient.get(`/doctors/${id}`);
      if (res.data) {
        setDoctor(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctor:', err);
    } finally {
      setLoadingDoctor(false);
    }
  };

  const fetchSlots = async (dateStr) => {
    try {
      setLoadingSlots(true);
      const res = await apiClient.get(`/doctors/${id}/slots?date=${dateStr}`);
      if (res.data) {
        setSlots(res.data.slots || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const docUserId = doctor?.userId?._id || doctor?.userId || id;
      const res = await apiClient.get(`/reviews/doctor/${docUserId}`);
      if (res.data) {
        setReviews(res.data.reviews || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSelectSlot = (slot) => {
    navigate(`/book/${id}?slotId=${slot._id}&date=${selectedDate}`);
  };

  if (loadingDoctor) {
    return <LoadingSpinner text="Loading doctor profile..." />;
  }

  if (!doctor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-docyra-text-primary">Doctor Profile Not Found</h2>
        <Link to="/doctors" className="btn-primary inline-block text-xs">Back to Doctors</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Back Link */}
      <Link to="/doctors" className="inline-flex items-center text-sm font-semibold text-docyra-text-secondary hover:text-docyra-primary space-x-1.5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Doctors</span>
      </Link>

      {/* Main Grid: Profile Info + Availability Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Doctor Profile & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="card-docyra p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="w-24 h-24 rounded-3xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-extrabold text-3xl flex-shrink-0 shadow-inner">
                {doctor.userId?.name ? doctor.userId.name.charAt(0) : 'D'}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-docyra-text-primary">
                    {doctor.userId?.name || 'Doctor'}
                  </h1>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                <p className="text-sm font-semibold text-docyra-primary flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  <span>{doctor.specializationId?.name || 'Specialist'}</span>
                </p>

                <div className="flex items-center space-x-2 text-xs text-amber-700 font-semibold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="text-sm">{doctor.avgRating ? doctor.avgRating.toFixed(1) : 'New'}</span>
                  <span className="text-stone-400 font-normal">({doctor.totalReviews || 0} patient reviews)</span>
                </div>
              </div>
            </div>

            {/* Quick Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-docyra-neutral-border pt-6 text-xs text-stone-600">
              <div className="space-y-1">
                <span className="text-stone-400 font-medium">Consultation Fee</span>
                <p className="text-base font-bold text-docyra-text-primary">${doctor.consultationFee || 100}</p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400 font-medium">Clinic Affiliation</span>
                <p className="text-sm font-bold text-docyra-text-primary truncate">
                  {doctor.clinicId?.name || 'Independent Consultation'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400 font-medium">Experience / Status</span>
                <p className="text-sm font-bold text-emerald-600">Active & Accepting Patients</p>
              </div>
            </div>
          </div>

          {/* Biography & Qualifications */}
          <div className="card-docyra p-8 space-y-6">
            <h2 className="text-xl font-bold text-docyra-text-primary">About the Doctor</h2>
            <p className="text-sm text-docyra-text-secondary leading-relaxed whitespace-pre-line">
              {doctor.bio || 'Dr. ' + (doctor.userId?.name || 'Specialist') + ' is an accredited medical practitioner with extensive experience delivering compassionate, evidence-based care. All consultations include thorough clinical assessments and individualized care plans.'}
            </p>

            {doctor.qualifications && (
              <div className="pt-4 border-t border-stone-100">
                <h3 className="text-sm font-bold text-docyra-text-primary mb-2">Qualifications & Education</h3>
                <p className="text-xs text-docyra-text-secondary leading-relaxed">{doctor.qualifications}</p>
              </div>
            )}
          </div>

          {/* Verified Patient Reviews */}
          <div className="card-docyra p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-docyra-text-primary flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-docyra-primary" />
                <span>Patient Reviews ({reviews.length})</span>
              </h2>
            </div>

            {loadingReviews ? (
              <LoadingSpinner size="sm" text="Loading reviews..." />
            ) : reviews.length > 0 ? (
              <div className="space-y-4 divide-y divide-stone-100">
                {reviews.map((rev) => (
                  <div key={rev._id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-docyra-text-primary">
                        {rev.patientId?.name || 'Verified Patient'}
                      </span>
                      <div className="flex items-center text-xs text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-1" />
                        <span>{rev.rating} / 5</span>
                      </div>
                    </div>
                    <p className="text-xs text-docyra-text-secondary leading-relaxed">
                      "{rev.comment || 'Great consultation and care.'}"
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {format(new Date(rev.createdAt || Date.now()), 'MMMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-docyra-text-secondary">
                No patient reviews submitted yet for this doctor. Be the first to leave a review after your appointment!
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Slot Picker & Booking Widget */}
        <div className="lg:col-span-1">
          <div className="card-docyra p-6 sm:p-8 space-y-6 sticky top-28">
            <div>
              <h3 className="text-lg font-bold text-docyra-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-docyra-accent" />
                <span>Select Appointment Time</span>
              </h3>
              <p className="text-xs text-docyra-text-secondary mt-1">Live slot availability from practice calendar</p>
            </div>

            {/* Date Pill Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Choose Date</span>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                {availableDates.map((d) => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center px-3 py-2 rounded-2xl border text-xs flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-docyra-primary text-white border-docyra-primary shadow-md'
                          : 'bg-stone-50 text-docyra-text-primary border-docyra-neutral-border hover:bg-stone-100'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-semibold opacity-80">{format(d, 'EEE')}</span>
                      <span className="text-sm font-bold mt-0.5">{format(d, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                <span>Available Slots</span>
                <span className="text-stone-400 font-normal">{slots.length} open</span>
              </span>

              {loadingSlots ? (
                <LoadingSpinner size="sm" text="Checking slots..." />
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const timeLabel = format(new Date(slot.slotStart), 'hh:mm a');
                    return (
                      <button
                        key={slot._id}
                        onClick={() => handleSelectSlot(slot)}
                        className="p-2.5 rounded-xl border border-docyra-primary/30 text-docyra-primary hover:bg-docyra-primary hover:text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timeLabel}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 px-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                  <AlertCircle className="w-6 h-6 text-stone-400 mx-auto" />
                  <p className="text-xs text-docyra-text-secondary">No open slots on {format(new Date(selectedDate), 'MMM d, yyyy')}.</p>
                  <Link
                    to={`/dashboard/waitlist?doctorId=${id}`}
                    className="text-xs font-bold text-docyra-accent hover:underline block"
                  >
                    Join Waitlist for this date →
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-docyra-neutral-border pt-4 text-xs text-stone-500 space-y-1">
              <p>• Free cancellation up to 2 hours before</p>
              <p>• Instant booking confirmation & SMS reminder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
