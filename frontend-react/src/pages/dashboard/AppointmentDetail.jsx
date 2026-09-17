import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  User,
  Building2,
  FileDown,
  XCircle,
  Star,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Stethoscope,
  MapPin,
  CalendarPlus
} from 'lucide-react';

export default function AppointmentDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(searchParams.get('action') === 'review');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/appointments/${id}`);
      setAppointment(res.data?.appointment || res.data);
    } catch (err) {
      console.error('Failed to load appointment:', err);
      setErrorMsg('Failed to load appointment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAppointment();
  }, [id]);

  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      setCancelling(true);
      setErrorMsg('');
      await apiClient.patch(`/appointments/${id}/cancel`, {
        cancellationReason: cancelReason || 'Cancelled by patient'
      });
      setSuccessMsg('Appointment cancelled successfully.');
      setShowCancelModal(false);
      fetchAppointment();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      setErrorMsg('');
      await apiClient.post('/reviews', {
        appointmentId: id,
        rating,
        comment: comment.trim()
      });
      setSuccessMsg('Thank you! Your review has been submitted for moderation.');
      setShowReviewModal(false);
      fetchAppointment();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownloadIcs = () => {
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/appointments/${id}/ics`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-docyra-text-secondary mt-3">Loading appointment...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-docyra-text-primary">Appointment Not Found</h2>
        <Link to="/dashboard" className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const doctor = appointment.doctorSnapshot || appointment.doctorId;
  const clinic = appointment.clinicSnapshot || appointment.clinicId;
  const slot = appointment.slotId || {};
  const slotStart = slot.slotStart ? new Date(slot.slotStart) : null;
  const slotEnd = slot.slotEnd ? new Date(slot.slotEnd) : null;
  const isUpcoming = ['booked', 'confirmed'].includes(appointment.status);
  const isCompleted = appointment.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-xs font-bold text-docyra-primary hover:underline flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Appointments
      </button>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-docyra-neutral-border shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-docyra-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-docyra-text-primary">
                Appointment Summary
              </h1>
              <Badge status={appointment.status} />
            </div>
            <p className="text-xs text-docyra-text-secondary mt-1">
              Booking Ref: <span className="font-mono font-bold text-docyra-text-primary">{appointment._id}</span> • Created on {new Date(appointment.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadIcs}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-docyra-text-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FileDown className="w-4 h-4" /> Download .ics
            </button>

            {isCompleted && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Star className="w-4 h-4 fill-white" /> Write Review
              </button>
            )}

            {isUpcoming && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Doctor & Clinic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Doctor Info */}
            <div className="p-6 rounded-2xl bg-docyra-primary-light/20 border border-docyra-primary/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-docyra-primary text-white flex items-center justify-center font-bold text-lg">
                  {doctor?.fullName?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="text-2xs font-bold text-docyra-primary uppercase tracking-wider">
                    Assigned Doctor
                  </div>
                  <h3 className="text-base font-bold text-docyra-text-primary">
                    {doctor?.fullName || 'Dr. Medical Officer'}
                  </h3>
                  <div className="text-xs text-docyra-text-secondary">
                    {doctor?.specialization || 'General Practice'}
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Info */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 text-docyra-text-primary flex items-center justify-center font-bold text-lg">
                  <Building2 className="w-6 h-6 text-docyra-primary" />
                </div>
                <div>
                  <div className="text-2xs font-bold text-docyra-text-secondary uppercase tracking-wider">
                    Partner Clinic
                  </div>
                  <h3 className="text-base font-bold text-docyra-text-primary">
                    {clinic?.name || 'Docyra Verified Clinic'}
                  </h3>
                  <div className="text-xs text-docyra-text-secondary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {clinic?.address?.city || 'Location'}, {clinic?.address?.country || 'USA'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="border-t border-docyra-neutral-border pt-6">
            <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider mb-4">
              Schedule & Timing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200">
                <div className="text-2xs text-docyra-text-secondary font-medium">Date</div>
                <div className="text-sm font-bold text-docyra-text-primary mt-1">
                  {slotStart
                    ? slotStart.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'N/A'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="text-2xs text-docyra-text-secondary font-medium">Time Slot</div>
                <div className="text-sm font-bold text-docyra-text-primary mt-1">
                  {slotStart
                    ? `${slotStart.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - ${slotEnd?.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`
                    : 'N/A'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="text-2xs text-docyra-text-secondary font-medium">Consultation Type</div>
                <div className="text-sm font-bold text-docyra-text-primary mt-1">
                  In-Clinic Consultation
                </div>
              </div>
            </div>
          </div>

          {/* Patient Details & Reason */}
          <div className="border-t border-docyra-neutral-border pt-6 space-y-4">
            <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider">
              Patient Information
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold text-docyra-text-primary">
                  {appointment.dependentSnapshot?.fullName
                    ? `${appointment.dependentSnapshot.fullName} (${appointment.dependentSnapshot.relationship})`
                    : `${user?.firstName} ${user?.lastName} (Account Holder)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason for Visit:</span>
                <span className="font-medium text-docyra-text-primary italic">
                  "{appointment.reason || 'General Consultation'}"
                </span>
              </div>
              {appointment.cancellationReason && (
                <div className="flex justify-between text-red-600">
                  <span className="font-semibold">Cancellation Note:</span>
                  <span>{appointment.cancellationReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-docyra-text-primary">Cancel Appointment</h3>
              <p className="text-xs text-docyra-text-secondary mt-1">
                Please provide a brief reason for cancelling. This will free the slot for patients waiting on the queue.
              </p>
            </div>

            <form onSubmit={handleCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  required
                  placeholder="e.g. Rescheduled with another clinic, personal conflict..."
                  className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="btn-secondary text-xs"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                <h3 className="text-xl font-bold text-docyra-text-primary">Rate Your Visit</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-docyra-text-secondary">
              Share your honest feedback about Dr. {doctor?.fullName || 'the doctor'}. Reviews are moderated before being displayed publicly.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-2 transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          rating >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Your Review / Comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="4"
                  required
                  placeholder="Share details about the doctor's bedside manner, punctuality, and overall care quality..."
                  className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submittingReview}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary text-xs"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
