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
  RotateCcw,
  FileText,
  Pill,
  ExternalLink,
  Activity,
} from 'lucide-react';
import appointmentsApi from '../../services/appointments.api.js';
import reviewsApi from '../../services/reviews.api.js';
import useSocketEvent from '../../context/useSocketEvent.js';
import useSocket from '../../context/useSocket.js';
import { formatAddress } from '../../utils/formatAddress.js';

export function AppointmentDetailPage() {
  const { id } = useParams();
  const { addNotification } = useSocket() || {};

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
      const res = await appointmentsApi.cancelAppointment(id, {
        reason: cancelReason,
        confirmLate: true,
      });
      if (res.success) {
        setCancelModalOpen(false);
        fetchAppointment();
        if (addNotification) {
          const docUser = appointment?.doctorId?.userId || {};
          const docName = docUser.name || appointment?.doctorId?.name || 'your doctor';
          const dateStr = appointment?.slotStart ? format(new Date(appointment.slotStart), 'dd MMM yyyy') : 'the scheduled date';
          addNotification({
            type: 'appointment:cancelled',
            category: 'appointment',
            title: 'Appointment Cancelled',
            message: `Your appointment with Dr. ${docName.replace(/^Dr\.\s*/i, '')} on ${dateStr} has been cancelled.`,
            link: '/dashboard',
            actionLabel: 'View Appointments',
            data: { appointmentId: id, ...appointment },
          });
        }
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
        if (addNotification) {
          const docUser = appointment?.doctorId?.userId || {};
          const docName = docUser.name || appointment?.doctorId?.name || 'the specialist';
          addNotification({
            type: 'review:submitted',
            category: 'review',
            title: 'Review Published',
            message: `Your ${rating}-star feedback for Dr. ${docName.replace(/^Dr\.\s*/i, '')} has been published.`,
            link: '/reviews',
            actionLabel: 'My Reviews',
          });
        }
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

          <div className="flex flex-wrap items-center gap-3">
            {(appointment.isFollowUp || appointment.previousAppointmentId) && (
              <span className="badge-primary text-xs py-1 px-3 flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Follow-Up Visit</span>
              </span>
            )}
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
                <span>
                  {appointment.cancelledBy === 'system' || appointment.cancellationReason?.toLowerCase()?.includes('missed')
                    ? 'Missed / Auto-Cancelled'
                    : 'Cancelled'}
                </span>
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
                <span>{formatAddress(clinic.address, doctorProfile.clinicAddress || 'Address on file')}</span>
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

        {/* Linked Prior Visit if this is a follow-up */}
        {(appointment.isFollowUp || appointment.previousAppointmentId) && (
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-blue-900 block">
                  Follow-Up Consultation
                </span>
                <p className="text-blue-700">
                  This consultation is linked to prior visit #{typeof appointment.previousAppointmentId === 'object' ? (appointment.previousAppointmentId?._id?.slice(-8) || '') : (appointment.previousAppointmentId?.slice(-8) || '')} for continuity of diagnostic tests and treatment.
                </p>
              </div>
            </div>
            {typeof appointment.previousAppointmentId === 'object' && appointment.previousAppointmentId?._id && (
              <Link
                to={`/appointments/${appointment.previousAppointmentId._id}`}
                className="btn-outline text-blue-700 border-blue-300 hover:bg-blue-100 text-xs py-1.5 px-3 self-start sm:self-auto shrink-0"
              >
                View Prior Visit
              </Link>
            )}
          </div>
        )}

        {/* Book Follow-Up Action Callout if Completed */}
        {appointment.status === 'completed' && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-brand-primary" />
                <h3 className="text-base font-bold text-neutral-text-primary">
                  Need a Follow-Up Consultation?
                </h3>
              </div>
              <p className="text-xs text-neutral-text-secondary max-w-xl">
                Book a follow-up visit with Dr. {doctorName} for continuous tracking of this medical issue. Your prescribed diagnostic tests and treatment history will be seamlessly available to the physician.
              </p>
              {appointment.prescription?.followUpDate && (
                <p className="text-xs font-semibold text-brand-primary">
                  Doctor's Recommended Follow-up Date: {appointment.prescription.followUpDate}
                </p>
              )}
            </div>

            <Link
              to={`/book?doctorId=${doctorProfile._id}&previousAppointmentId=${appointment._id}&followUp=true`}
              className="btn-accent text-xs py-2.5 px-5 flex items-center gap-2 font-bold shrink-0 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Book Follow-up Visit</span>
            </Link>
          </div>
        )}

        {/* Book Again Action Callout if Cancelled or Missed */}
        {appointment.status === 'cancelled' && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <h3 className="text-base font-bold text-neutral-text-primary">
                  {appointment.cancelledBy === 'system' || appointment.cancellationReason?.toLowerCase()?.includes('missed')
                    ? 'Appointment Missed & Auto-Cancelled'
                    : 'Appointment Cancelled'}
                </h3>
              </div>
              <p className="text-xs text-neutral-text-secondary max-w-xl">
                {appointment.cancellationReason || 'This appointment was cancelled because the visit time elapsed.'}{' '}
                You can rebook this consultation with Dr. {doctorName} at {clinic.name || 'the clinic'} using all your previous details without starting from scratch.
              </p>
            </div>

            <Link
              to={`/book?doctorId=${doctorProfile._id}&previousAppointmentId=${appointment._id}&rebook=true`}
              className="btn-accent text-xs py-2.5 px-5 flex items-center gap-2 font-bold shrink-0 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Book This Appointment Again</span>
            </Link>
          </div>
        )}

        {/* Doctor's Prescription (if recorded) */}
        {appointment.prescription && (appointment.prescription.medicines?.length > 0 || appointment.prescription.generalAdvice) && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-primary font-bold">
                <Pill className="w-4 h-4" />
                <h3 className="text-base font-bold text-neutral-text-primary">Prescription & Medications</h3>
              </div>
              {appointment.prescription.prescribedAt && (
                <span className="text-[11px] text-neutral-text-secondary">
                  Prescribed: {format(new Date(appointment.prescription.prescribedAt), 'dd MMM yyyy')}
                </span>
              )}
            </div>

            {appointment.prescription.medicines?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-neutral-border text-neutral-text-secondary">
                      <th className="py-2 font-semibold">Medicine</th>
                      <th className="py-2 font-semibold">Dosage</th>
                      <th className="py-2 font-semibold">Frequency</th>
                      <th className="py-2 font-semibold">Duration</th>
                      <th className="py-2 font-semibold">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-border">
                    {appointment.prescription.medicines.map((m, idx) => (
                      <tr key={idx} className="hover:bg-neutral-bg/50">
                        <td className="py-2.5 font-bold text-neutral-text-primary">{m.name}</td>
                        <td className="py-2.5 text-neutral-text-secondary">{m.dosage || '-'}</td>
                        <td className="py-2.5 text-neutral-text-secondary">{m.frequency || '-'}</td>
                        <td className="py-2.5 text-neutral-text-secondary">{m.duration || '-'}</td>
                        <td className="py-2.5 text-neutral-text-secondary italic">{m.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {appointment.prescription.generalAdvice && (
              <div className="p-3 rounded-xl bg-neutral-bg border border-neutral-border text-xs space-y-1">
                <span className="font-bold text-neutral-text-primary">Clinical Advice:</span>
                <p className="text-neutral-text-secondary">{appointment.prescription.generalAdvice}</p>
              </div>
            )}
          </div>
        )}

        {/* Diagnostic & Laboratory Tests (if ordered) */}
        {appointment.medicalTests?.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-border space-y-4">
            <div className="flex items-center gap-2 text-brand-primary font-bold">
              <Activity className="w-4 h-4" />
              <h3 className="text-base font-bold text-neutral-text-primary">Diagnostic & Lab Tests</h3>
            </div>

            <div className="space-y-3">
              {appointment.medicalTests.map((test, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-neutral-border bg-neutral-bg/40 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-neutral-text-primary">{test.testName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        test.status === 'completed' || test.status === 'normal'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : test.status === 'abnormal'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {test.status || 'ordered'}
                      </span>
                    </div>

                    {test.resultFileUrl && (
                      <a
                        href={test.resultFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline text-xs py-1 px-3 flex items-center gap-1.5 text-brand-primary border-brand-primary self-start sm:self-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Lab Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {test.instructions && (
                    <p className="text-xs text-neutral-text-secondary">
                      <span className="font-semibold text-neutral-text-primary">Instructions: </span>
                      {test.instructions}
                    </p>
                  )}

                  {test.resultNotes && (
                    <div className="p-2.5 rounded-lg bg-white border border-neutral-border text-xs text-neutral-text-primary">
                      <span className="font-bold text-neutral-text-secondary block text-[10px] uppercase">Lab Findings:</span>
                      {test.resultNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

          <div className="flex flex-wrap items-center gap-3">
            {appointment.status === 'completed' && (
              <Link
                to={`/book?doctorId=${doctorProfile._id}&previousAppointmentId=${appointment._id}&followUp=true`}
                className="btn-accent text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Book Follow-up Visit</span>
              </Link>
            )}
            {appointment.status === 'cancelled' && (
              <Link
                to={`/book?doctorId=${doctorProfile._id}&previousAppointmentId=${appointment._id}&rebook=true`}
                className="btn-accent text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Book Again</span>
              </Link>
            )}
            {['pending', 'confirmed'].includes(appointment.status) && (
              <>
                <Link
                  to={`/doctors/${doctorProfile._id}`}
                  className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
                >
                  <Clock className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Reschedule</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Appointment</span>
                </button>
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
                Are you sure you want to cancel your appointment with <strong className="text-neutral-text-primary">Dr. {doctorName}</strong> on {appointment.slotStart ? format(new Date(appointment.slotStart), 'EEEE, MMM dd, yyyy') : 'scheduled date'}?
              </p>
              {hoursUntilAppointment < 24 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-left mt-2">
                  <span className="font-bold block">Notice:</span>
                  This appointment is scheduled within 24 hours. Confirming will cancel your reservation and free up the slot immediately.
                </div>
              )}
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
                className="btn-outline text-xs py-2 px-4 cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="btn-outline text-xs py-2 px-4 bg-rose-600 text-white hover:bg-rose-700 border-rose-600 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{cancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentDetailPage;
