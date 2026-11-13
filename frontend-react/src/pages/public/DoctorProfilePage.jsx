import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Calendar,
  Clock,
  Building2,
  MapPin,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

import doctorsApi from '../../services/doctors.api.js';
import reviewsApi from '../../services/reviews.api.js';
import RatingStars from '../../components/common/RatingStars.jsx';
import { formatAddress } from '../../utils/formatAddress.js';

export function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);

  // Available 7 days for quick date selection
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    async function loadDoctorData() {
      try {
        const [docRes, revRes] = await Promise.allSettled([
          doctorsApi.getDoctorById(id),
          reviewsApi.getDoctorReviews(id),
        ]);

        if (docRes.status === 'fulfilled' && docRes.value.success) {
          setDoctor(docRes.value.data.doctor);
        } else {
          setError('Doctor profile not found');
        }

        if (revRes.status === 'fulfilled' && revRes.value.success) {
          setReviews(revRes.value.data.reviews || []);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoadingDoctor(false);
      }
    }
    loadDoctorData();
  }, [id]);

  useEffect(() => {
    async function loadSlots() {
      if (!id) return;
      setLoadingSlots(true);
      try {
        const res = await doctorsApi.getDoctorSlots(id, selectedDate);
        if (res.success) {
          setSlots(res.data.slots || []);
        }
      } catch (err) {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [id, selectedDate]);

  const handleSlotSelect = (slot) => {
    // Navigate to booking flow with preselected slot
    navigate(`/book?doctorId=${id}&slotId=${slot._id}&date=${selectedDate}`);
  };

  if (loadingDoctor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-neutral-text-secondary">Loading doctor profile...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-neutral-text-primary">Doctor Not Found</h2>
        <p className="text-sm text-neutral-text-secondary">{error}</p>
        <Link to="/doctors" className="btn-outline text-xs mt-2 inline-flex">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Doctors
        </Link>
      </div>
    );
  }

  const docUser = typeof doctor.userId === 'object' && doctor.userId !== null ? doctor.userId : {};
  const docSpec = typeof doctor.specializationId === 'object' && doctor.specializationId !== null ? doctor.specializationId : {};
  const docClinic = typeof doctor.clinicId === 'object' && doctor.clinicId !== null ? doctor.clinicId : {};

  const doctorName = doctor.name || docUser.name || 'Doctor';
  const specName = doctor.specializationName || docSpec.name || 'Medical Specialist';
  const clinicName = doctor.clinicName || docClinic.name || doctor.clinicAddress || 'Independent Practice';
  const clinicAddress = doctor.clinicAddress || formatAddress(docClinic.address, 'Verified Clinic Location');

  return (
    <div className="space-y-12 pb-20">
      {/* Header Bio Card */}
      <section className="bg-white border-b border-neutral-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            to="/doctors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-text-secondary hover:text-brand-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to directory</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-brand-primary text-white flex items-center justify-center text-3xl sm:text-4xl font-extrabold shadow-md shrink-0">
                {doctorName ? doctorName.charAt(0) : 'D'}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-primary text-xs font-bold">
                    {specName}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Practitioner</span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-text-primary tracking-tight">
                  {doctorName}
                </h1>

                <p className="text-xs sm:text-sm text-neutral-text-secondary font-medium">
                  {doctor.qualifications || 'MBBS, MD'} &bull; {doctor.yearsExperience ? `${doctor.yearsExperience} Years Clinical Experience` : 'Licensed Specialist'}
                </p>

                <div className="flex items-center gap-4 pt-1">
                  <RatingStars rating={doctor.avgRating} totalReviews={doctor.totalReviews} size="md" />
                </div>
              </div>
            </div>

            {/* Fee & Location Box */}
            <div className="bg-neutral-bg p-6 rounded-2xl border border-neutral-border space-y-3 shrink-0">
              <div>
                <span className="text-xs text-neutral-text-secondary block">Consultation Fee</span>
                <span className="text-2xl font-extrabold text-brand-primary">
                  ₹{doctor.consultationFee || 500}
                </span>
                <span className="text-xs text-neutral-text-secondary"> / session</span>
              </div>

              <div className="pt-2 border-t border-neutral-border/80 space-y-1 text-xs text-neutral-text-secondary">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-text-primary">
                  <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{clinicName}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-text-secondary shrink-0 mt-0.5" />
                  <span>{clinicAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout: Bio + Live Slot Booking */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Doctor Bio & Patient Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="card-docyra p-8 space-y-4">
              <h2 className="text-xl font-bold text-neutral-text-primary border-b border-neutral-border pb-3">
                About the Physician
              </h2>
              <p className="text-sm text-neutral-text-secondary leading-relaxed whitespace-pre-line">
                {doctor.bio ||
                  `${doctorName} is a dedicated practitioner specializing in ${specName || 'comprehensive medicine'}. With extensive clinical experience, ${doctorName} provides evidence-based diagnoses and compassionate patient-centered healthcare.`}
              </p>

              <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-neutral-border/70 text-xs">
                <div>
                  <span className="text-neutral-text-secondary block">Specialization</span>
                  <span className="font-bold text-neutral-text-primary">{specName || 'General'}</span>
                </div>
                <div>
                  <span className="text-neutral-text-secondary block">Credentials</span>
                  <span className="font-bold text-neutral-text-primary">{doctor.qualifications || 'MBBS'}</span>
                </div>
                <div>
                  <span className="text-neutral-text-secondary block">Experience</span>
                  <span className="font-bold text-neutral-text-primary">{doctor.yearsExperience || '5+'} Years</span>
                </div>
              </div>
            </div>

            {/* Patient Reviews Section */}
            <div className="card-docyra p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-border pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-xl font-bold text-neutral-text-primary">
                    Verified Patient Reviews ({reviews.length})
                  </h2>
                </div>
                <RatingStars rating={doctor.avgRating} size="sm" />
              </div>

              {reviews.length === 0 ? (
                <p className="text-sm text-neutral-text-secondary italic py-4">
                  No patient reviews submitted yet for this doctor. Be the first to leave feedback after your completed appointment!
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="p-4 rounded-xl bg-neutral-bg border border-neutral-border/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-text-primary">
                          {rev.patientId?.name || 'Verified Patient'}
                        </span>
                        <span className="text-neutral-text-secondary">
                          {rev.createdAt ? format(new Date(rev.createdAt), 'MMM dd, yyyy') : ''}
                        </span>
                      </div>
                      <RatingStars rating={rev.rating} size="sm" />
                      <p className="text-xs text-neutral-text-secondary leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Slot Selector */}
          <div className="lg:col-span-1">
            <div className="card-docyra p-6 space-y-6 sticky top-24">
              <div className="border-b border-neutral-border pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-lg font-bold text-neutral-text-primary">
                    Select Appointment Slot
                  </h2>
                </div>
                <p className="text-xs text-neutral-text-secondary mt-1">
                  Live synchronized availability.
                </p>
              </div>

              {/* Date Scroll Bar */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
                  Choose Date
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {next7Days.slice(0, 4).map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                            : 'bg-white text-neutral-text-primary border-neutral-border hover:border-brand-primary'
                        }`}
                      >
                        <span className="text-[10px] block font-medium uppercase">
                          {format(d, 'EEE')}
                        </span>
                        <span className="text-sm font-bold block">
                          {format(d, 'dd')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {next7Days.slice(4, 7).map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                            : 'bg-white text-neutral-text-primary border-neutral-border hover:border-brand-primary'
                        }`}
                      >
                        <span className="text-[10px] block font-medium uppercase">
                          {format(d, 'EEE')}
                        </span>
                        <span className="text-xs font-bold block">
                          {format(d, 'dd MMM')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-text-secondary">
                  <span>Available times on <strong>{format(new Date(selectedDate), 'MMM dd')}</strong></span>
                </div>

                {loadingSlots ? (
                  <div className="py-8 text-center text-neutral-text-secondary">
                    <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs">Checking open slots...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-neutral-bg border border-neutral-border text-center space-y-2">
                    <Clock className="w-6 h-6 text-neutral-text-secondary mx-auto" />
                    <p className="text-xs font-semibold text-neutral-text-primary">No Slots Available</p>
                    <p className="text-[11px] text-neutral-text-secondary">
                      All slots for this date are booked or outside clinic hours.
                    </p>
                    <Link
                      to={`/waitlist?doctorId=${id}`}
                      className="btn-outline text-[11px] py-1.5 px-3 mt-1 inline-block"
                    >
                      Join Waitlist
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        key={slot._id}
                        onClick={() => handleSlotSelect(slot)}
                        className="p-2.5 rounded-xl border border-neutral-border bg-white hover:bg-brand-primary-light hover:border-brand-primary text-neutral-text-primary hover:text-brand-primary font-semibold text-xs transition-all flex items-center justify-center gap-1.5 group"
                      >
                        <Clock className="w-3.5 h-3.5 text-brand-primary group-hover:scale-110 transition-transform" />
                        <span>{format(new Date(slot.slotStart), 'hh:mm a')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorProfilePage;
