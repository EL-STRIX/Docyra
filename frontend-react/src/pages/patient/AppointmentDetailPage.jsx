import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  Star,
  AlertTriangle,
} from 'lucide-react';
import appointmentsApi from '../../services/appointments.api.js';
import reviewsApi from '../../services/reviews.api.js';
import useSocketEvent from '../../context/useSocketEvent.js';

export function AppointmentDetailPage() {
  const { id } = useParams();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchAppointment = useCallback(async () => {
    try {
      const res = await appointmentsApi.getAppointmentById(id);
      if (res.success) {
        setAppointment(res.data.appointment);
      } else {
        setError('Appointment record not found');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load appointment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  // Real-time listener for status changes
  useSocketEvent('appointment:statusChanged', (payload) => {
    if (payload.appointmentId === id) {
      fetchAppointment();
    }
  });

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await appointmentsApi.cancelAppointment(id, { reason: cancelReason });
      if (res.success) {
        setCancelModalOpen(false);
        fetchAppointment();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await reviewsApi.submitReview({
        appointmentId: id,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        rating: Number(rating),
        comment,
      });
      if (res.success) {
        setReviewSubmitted(true);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-neutral-text-secondary">Loading appointment details...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-neutral-text-primary">Appointment Not Found</h2>
        <p className="text-sm text-neutral-text-secondary">{error}</p>
        <Link to="/dashboard" className="btn-outline text-xs mt-2 inline-flex">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const doctorProfile = appointment.doctorId || {};
  const doctorUser = typeof doctorProfile.userId === 'object' && doctorProfile.userId !== null ? doctorProfile.userId : {};
  const doctorName = doctorProfile.name || doctorUser.name || 'Doctor';
  const clinic = appointment.clinicId || {};
  const isDependent = appointment.bookedForType === 'dependent';
  const dependent = appointment.bookedForId;

  const hoursUntilAppointment = differenceInHours(new Date(appointment.slotStart), new Date());
  const canCancelOnline = hoursUntilAppointment >= 24 && ['pending', 'confirmed'].includes(appointment.status);

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-text-secondary hover:text-brand-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Appointments</span>
        </Link>
      </div>

      <div className="card-docyra p-8 space-y-8 bg-white">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-text-secondary">
              Appointment #{appointment._id?.slice(-8)}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary">
              Consultation Details
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {appointment.status === 'confirmed' && (
              <span className="badge-success text-xs py-1 px-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmed</span>
              </span>
            )}
            {appointment.status === 'pending' && (
              <span className="badge-warning text-xs py-1 px-3">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Confirmation</span>
              </span>
            )}
            {appointment.status === 'completed' && (
              <span className="badge-info text-xs py-1 px-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </span>
            )}
            {appointment.status === 'cancelled' && (
              <span className="badge-error text-xs py-1 px-3">
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelled</span>
              </span>
            )}
          </div>
        </div>

        {/* Doctor & Clinic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Info */}
          <div className="p-6 rounded-2xl bg-neutral-bg border border-neutral-border space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
              Physician
            </span>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-lg">
                {doctorName ? doctorName.charAt(0) : 'D'}
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-text-primary">{doctorName}</h3>
                <p className="text-xs font-semibold text-brand-primary">
                  {doctorProfile.specializationId?.name || 'Specialist'}
                </p>
                <p className="text-[11px] text-neutral-text-secondary">{doctorProfile.qualifications}</p>
              </div>
            </div>
          </div>

          {/* Clinic Location */}
          <div className="p-6 rounded-2xl bg-neutral-bg border border-neutral-border space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
              Clinic Location
            </span>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm text-neutral-text-primary">
                {clinic.name || doctorProfile.clinicAddress || 'Clinic Partner'}
              </h4>
              <p className="text-neutral-text-secondary flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                <span>{clinic.address || doctorProfile.clinicAddress || 'Address on file'}</span>
              </p>
              {clinic.contactPhone && (
                <p className="text-neutral-text-secondary pt-1">
                  Phone: <strong>{clinic.contactPhone}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Slot Schedule & Patient Details */}
        <div className="p-6 rounded-2xl border border-neutral-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-neutral-text-secondary block">Date & Time</span>
              <span className="font-bold text-sm text-neutral-text-primary block mt-0.5">
                {format(new Date(appointment.slotStart), 'EEE, MMM dd, yyyy')}
              </span>
              <span className="text-brand-primary font-semibold">
                {format(new Date(appointment.slotStart), 'hh:mm a')}
              </span>
            </div>

            <div>
              <span className="text-neutral-text-secondary block">Patient Profile</span>
              <span className="font-bold text-sm text-neutral-text-primary block mt-0.5">
                {isDependent ? `${dependent?.name || 'Dependent'} (Family)` : 'Self'}
              </span>
            </div>

            <div>
              <span className="text-neutral-text-secondary block">Reason for Visit</span>
              <span className="font-medium text-neutral-text-primary block mt-0.5 italic">
                &ldquo;{appointment.reasonForVisit || 'General Consultation'}&rdquo;
              </span>
            </div>
          </div>

          {appointment.cancelledBy && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1">
              <span className="font-bold">Cancellation Notice:</span>
              <p>Cancelled by: {appointment.cancelledBy} &bull; Reason: {appointment.cancellationReason || 'No details'}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-neutral-border flex flex-wrap items-center justify-between gap-4">
          <a
            href={appointmentsApi.getIcsCalendarUrl(appointment._id)}
            download
            className="btn-outline text-xs py-2 px-4"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .ics Calendar</span>
          </a>

          <div className="flex items-center gap-3">
            {['pending', 'confirmed'].includes(appointment.status) && (
              <>
                <Link
                  to={`/doctors/${doctorProfile._id}`}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Reschedule
                </Link>

                {canCancelOnline ? (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2 px-4"
                  >
                    Cancel Appointment
                  </button>
                ) : (
                  <span className="text-[11px] text-neutral-text-secondary italic">
                    Within 24h window. Please call clinic directly to cancel.
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Review Section if Completed */}
        {appointment.status === 'completed' && (
          <div id="review" className="pt-6 border-t border-neutral-border space-y-4">
            <h3 className="text-lg font-bold text-neutral-text-primary">
              Leave a Patient Review
            </h3>

            {reviewSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Thank you! Your verified review has been submitted for automated publication.</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            s <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-border'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-neutral-text-primary ml-2">{rating}/5 Stars</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Your Review / Feedback *</label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience regarding the consultation, punctuality, and medical care..."
                    className="w-full p-3 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-accent text-xs py-2 px-5"
                >
                  {submittingReview ? 'Submitting Review...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-docyra-elevated animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-neutral-text-primary">Cancel Appointment?</h3>
              <p className="text-xs text-neutral-text-secondary">
                Are you sure you want to cancel this reservation? The slot will immediately open up for other patients.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-text-primary">Reason for cancellation (optional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, feeling better..."
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="btn-outline text-xs py-2 px-4"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="btn-outline text-xs py-2 px-4 bg-rose-600 text-white hover:bg-rose-700 border-rose-600"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentDetailPage;
