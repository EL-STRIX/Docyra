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
  Printer,
  Calendar,
  User,
  Building2,
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
  const [submittedReview, setSubmittedReview] = useState(null);

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
        const created = res.data?.review || res.data || { rating, comment, createdAt: new Date().toISOString() };
        setSubmittedReview(created);
        fetchAppointment();
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
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit review';
      if (msg.toLowerCase().includes('already been submitted')) {
        fetchAppointment();
      }
      alert(msg);
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
  const rawDoctorName = doctorProfile.name || doctorUser.name || 'Doctor';
  const doctorName = rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`;
  const doctorSpecialization = doctorProfile.specializationId?.name || 'General Practice';
  const clinic = appointment.clinicId || {};

  const isDependent = appointment.bookedForType === 'dependent' || appointment.bookedFor?.type === 'dependent';
  const dependent = appointment.bookedForId || (isDependent ? appointment.bookedFor : null);
  const patientName = appointment.bookedFor?.name || dependent?.name || appointment.patientId?.name || 'Patient';
  const patientPhone = appointment.bookedFor?.phone || dependent?.phone || appointment.patientId?.phone || '';
  const patientEmail = appointment.bookedFor?.email || dependent?.email || appointment.patientId?.email || '';
  const patientGender = appointment.bookedFor?.gender || dependent?.gender || appointment.patientId?.gender || '';
  const patientDob = appointment.bookedFor?.dateOfBirth || dependent?.dateOfBirth || appointment.patientId?.dateOfBirth;

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    try {
      const dob = new Date(dobString);
      const diffMs = Date.now() - dob.getTime();
      const ageDate = new Date(diffMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return '';
    }
  };
  const patientAge = patientDob ? `${calculateAge(patientDob)} yrs` : '';
  const consultationFee = appointment.consultationFee ?? doctorProfile.consultationFee ?? 500;
  const existingReview = appointment.review || submittedReview;

  const hoursUntilAppointment = differenceInHours(new Date(appointment.slotStart), new Date());

  const formatTestStatus = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress':
      case 'process': return 'In Progress';
      case 'not_started': return 'Not Started';
      case 'ordered': return 'Ordered';
      default: return (status || 'Not Started').replace(/_/g, ' ');
    }
  };

  const getTestStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress':
      case 'process':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'not_started':
      case 'ordered':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getPaymentStatusDisplay = (status) => {
    if (status === 'completed' || status === 'paid') return 'Paid Online';
    if (status === 'refunded') return 'Refunded';
    return 'Pay at Clinic';
  };

  const getPaymentStatusBadgeClass = (status) => {
    if (status === 'completed' || status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'refunded') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const printMedicines = () => {
    if (!appointment) return;
    const clinicName = clinic.name || 'Docyra Healthcare Partner';
    const clinicAddress = formatAddress(clinic.address, doctorProfile.clinicAddress || '');
    const clinicPhone = clinic.contactPhone || '';
    const dateStr = format(new Date(appointment.slotStart), 'dd MMM yyyy');
    const medicines = appointment.prescription?.medicines || [];

    const rowsHtml = medicines.map((m, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827;">${m.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.dosage || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.frequency || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.duration || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">${m.instructions || 'As advised'}</td>
      </tr>
    `).join('');

    const adviceHtml = appointment.prescription?.generalAdvice ? `
      <div style="margin-top: 20px; padding: 12px 16px; background: #F8FAFC; border-left: 4px solid #0F5C54; border-radius: 4px;">
        <strong style="color: #0F5C54; font-size: 13px; text-transform: uppercase;">Doctor's General Advice:</strong>
        <p style="margin: 4px 0 0; color: #334155; font-size: 13px; line-height: 1.5;">${appointment.prescription.generalAdvice}</p>
      </div>
    ` : '';

    const followUpHtml = appointment.prescription?.followUpDate ? `
      <div style="margin-top: 10px; font-size: 12px; color: #475569;">
        <strong>Follow-up Recommendation:</strong> ${appointment.prescription.followUpDate}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription Dispensing Slip - #${appointment._id.slice(-6)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F5C54; padding-bottom: 14px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0F5C54; margin: 0; }
          .clinic-sub { font-size: 12px; color: #6B7280; margin-top: 3px; }
          .badge-dispense { font-size: 11px; font-weight: 800; background: #E6F4F1; color: #0F5C54; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F9FAFB; padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 20px; font-size: 12px; }
          .meta-item { margin-bottom: 4px; }
          .meta-lbl { color: #6B7280; font-weight: 600; width: 110px; display: inline-block; }
          .meta-val { font-weight: 700; color: #111827; }
          .table-title { font-size: 13px; font-weight: 800; color: #0F5C54; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
          th { background: #0F5C54; color: #FFFFFF; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; }
          .sig-line { border-top: 1px solid #9CA3AF; width: 180px; text-align: center; padding-top: 6px; font-weight: 600; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="clinic-name">${clinicName}</h1>
            <div class="clinic-sub">${clinicAddress} ${clinicPhone ? '• Tel: ' + clinicPhone : ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge-dispense">Prescription Slip</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Ref #${appointment._id.slice(-6)} • ${dateStr}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-item"><span class="meta-lbl">Patient Name:</span> <span class="meta-val">${patientName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Age / Gender:</span> <span class="meta-val">${patientAge || '-'} ${patientGender ? '/ ' + patientGender.toUpperCase() : ''}</span></div>
            ${patientPhone ? `<div class="meta-item"><span class="meta-lbl">Phone:</span> <span class="meta-val">${patientPhone}</span></div>` : ''}
          </div>
          <div>
            <div class="meta-item"><span class="meta-lbl">Doctor:</span> <span class="meta-val">${doctorName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Specialty:</span> <span class="meta-val">${doctorSpecialization}</span></div>
            <div class="meta-item"><span class="meta-lbl">Consultation:</span> <span class="meta-val">${dateStr}</span></div>
          </div>
        </div>

        <div class="table-title">Prescribed Medications</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${adviceHtml}
        ${followUpHtml}

        <div class="footer">
          <div>Docyra Healthcare • Generated on ${new Date().toLocaleDateString('en-IN')}</div>
          <div class="sig-line">Doctor / Pharmacist Signature</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    }
  };

  const printTests = () => {
    if (!appointment) return;
    const clinicName = clinic.name || 'Docyra Healthcare Partner';
    const clinicAddress = formatAddress(clinic.address, doctorProfile.clinicAddress || '');
    const clinicPhone = clinic.contactPhone || '';
    const dateStr = format(new Date(appointment.slotStart), 'dd MMM yyyy');
    const tests = appointment.medicalTests || [];

    const rowsHtml = tests.map((t, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827;">${t.testName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${t.instructions || 'Routine evaluation as requested'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; text-transform: uppercase; font-weight: 600; color: #0F5C54;">${formatTestStatus(t.status)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diagnostic Tests Requisition - #${appointment._id.slice(-6)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F5C54; padding-bottom: 14px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0F5C54; margin: 0; }
          .clinic-sub { font-size: 12px; color: #6B7280; margin-top: 3px; }
          .badge-lab { font-size: 11px; font-weight: 800; background: #E6F4F1; color: #0F5C54; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F9FAFB; padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 20px; font-size: 12px; }
          .meta-item { margin-bottom: 4px; }
          .meta-lbl { color: #6B7280; font-weight: 600; width: 110px; display: inline-block; }
          .meta-val { font-weight: 700; color: #111827; }
          .table-title { font-size: 13px; font-weight: 800; color: #0F5C54; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
          th { background: #0F5C54; color: #FFFFFF; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; }
          .sig-line { border-top: 1px solid #9CA3AF; width: 180px; text-align: center; padding-top: 6px; font-weight: 600; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="clinic-name">${clinicName}</h1>
            <div class="clinic-sub">${clinicAddress} ${clinicPhone ? '• Tel: ' + clinicPhone : ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge-lab">Diagnostic / Lab Requisition Slip</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Ref #${appointment._id.slice(-6)} • ${dateStr}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-item"><span class="meta-lbl">Patient Name:</span> <span class="meta-val">${patientName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Age / Gender:</span> <span class="meta-val">${patientAge || '-'} ${patientGender ? '/ ' + patientGender.toUpperCase() : ''}</span></div>
            ${patientPhone ? `<div class="meta-item"><span class="meta-lbl">Phone:</span> <span class="meta-val">${patientPhone}</span></div>` : ''}
          </div>
          <div>
            <div class="meta-item"><span class="meta-lbl">Referring Doctor:</span> <span class="meta-val">${doctorName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Department:</span> <span class="meta-val">${doctorSpecialization}</span></div>
            <div class="meta-item"><span class="meta-lbl">Date Advised:</span> <span class="meta-val">${dateStr}</span></div>
          </div>
        </div>

        <div class="table-title">Advised Diagnostic Tests</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Test Name</th>
              <th>Clinical Notes / Instructions</th>
              <th style="width: 120px; text-align: center;">Current Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Requisitioned via Docyra Healthcare • Generated on ${new Date().toLocaleDateString('en-IN')}</div>
          <div class="sig-line">Lab Technician / Pathologist Signature</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    }
  };

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
              Appointment Summary &amp; Clinical Details
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

            {/* Quick Print Actions in Header */}
            {appointment.prescription?.medicines?.length > 0 && (
              <button
                type="button"
                onClick={printMedicines}
                className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-bold text-neutral-text-primary hover:text-brand-primary cursor-pointer"
                title="Print Prescribed Medicines"
              >
                <Printer className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Print Medicines</span>
              </button>
            )}
            {appointment.medicalTests?.length > 0 && (
              <button
                type="button"
                onClick={printTests}
                className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 font-bold text-neutral-text-primary hover:text-brand-primary cursor-pointer"
                title="Print Advised Lab Tests"
              >
                <Printer className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Print Tests</span>
              </button>
            )}
          </div>
        </div>

        {/* Schedule Date & Time Banner (Matching Clinic Admin View) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-neutral-900">
              {appointment.slotStart ? format(new Date(appointment.slotStart), 'EEEE, dd MMMM yyyy') : 'Scheduled Date'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-teal-800">
              {appointment.slotStart ? format(new Date(appointment.slotStart), 'h:mm a') : ''}
              {appointment.slotEnd ? ` - ${format(new Date(appointment.slotEnd), 'h:mm a')}` : ''}
            </div>
          </div>
        </div>

        {/* 2-Column Summary: Patient Information & Physician / Consultation Fee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Information */}
          <div className="p-5 rounded-2xl bg-neutral-bg border border-neutral-border space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <User className="w-3.5 h-3.5 text-brand-primary" />
              <span>Patient Information</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Patient Name</span>
                <span className="font-bold text-neutral-text-primary flex items-center gap-1.5">
                  {patientName}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {isDependent ? (dependent?.relationship || 'Dependent') : 'Self Booking'}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Booking Type</span>
                <span className="font-semibold text-neutral-text-primary">
                  {isDependent ? 'Family Dependent' : 'Self Booking'}
                </span>
              </div>

              {patientEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-text-secondary">Email Address</span>
                  <span className="font-medium text-neutral-text-primary">{patientEmail}</span>
                </div>
              )}

              {patientPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-text-secondary">Phone Number</span>
                  <span className="font-medium text-neutral-text-primary">{patientPhone}</span>
                </div>
              )}

              {(patientGender || patientAge) && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-text-secondary">Gender / Age</span>
                  <span className="font-medium text-neutral-text-primary capitalize">
                    {patientGender || '-'}{patientAge ? ` • ${patientAge}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Physician & Consultation Fee */}
          <div className="p-5 rounded-2xl bg-neutral-bg border border-neutral-border space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <Building2 className="w-3.5 h-3.5 text-brand-primary" />
              <span>Physician &amp; Consultation Fee</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Attending Physician</span>
                <span className="font-bold text-teal-800">{doctorName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Department / Specialty</span>
                <span className="font-semibold text-neutral-text-primary">{doctorSpecialization}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Clinic Location</span>
                <span className="font-medium text-neutral-text-primary text-right truncate max-w-[200px]" title={clinic.name || doctorProfile.clinicAddress || 'Docyra Clinic'}>
                  {clinic.name || doctorProfile.clinicAddress || 'Docyra Clinic'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-border/60">
                <span className="text-neutral-text-secondary">Consultation Fee</span>
                <span className="font-bold text-sm text-neutral-text-primary">₹{consultationFee}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary">Payment Status</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPaymentStatusBadgeClass(appointment.paymentStatus)}`}>
                  {getPaymentStatusDisplay(appointment.paymentStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reason for Visit */}
        {appointment.reasonForVisit && (
          <div className="p-4 rounded-xl bg-white border border-neutral-border space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-text-secondary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-primary" />
              <span>Reason for Visit</span>
            </span>
            <p className="font-medium text-neutral-text-primary italic">
              &ldquo;{appointment.reasonForVisit}&rdquo;
            </p>
          </div>
        )}

        {/* Doctor's Clinical Notes (Recorded by Doctor) */}
        {appointment.notes && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-text-primary">
                  Doctor&apos;s Clinical Notes
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                Doctor&apos;s Record &bull; Read-Only
              </span>
            </div>
            <div className="p-4 rounded-xl bg-neutral-bg border border-neutral-border text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
              {appointment.notes}
            </div>
          </div>
        )}

        {/* Prescribed Medicines (if recorded) */}
        {appointment.prescription && (appointment.prescription.medicines?.length > 0 || appointment.prescription.generalAdvice) && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-text-primary">
                  Prescribed Medicines
                </h3>
              </div>

              <button
                type="button"
                onClick={printMedicines}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-neutral-text-primary hover:text-brand-primary self-start sm:self-auto cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Medicine List</span>
              </button>
            </div>

            {appointment.prescription.medicines?.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-neutral-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-bg border-b border-neutral-border text-neutral-text-secondary">
                    <tr>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Medicine Name</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Dosage</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Frequency</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Duration</th>
                      <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-border">
                    {appointment.prescription.medicines.map((m, idx) => (
                      <tr key={idx} className="hover:bg-neutral-bg/50">
                        <td className="py-2.5 px-3 font-bold text-neutral-text-primary">{m.name}</td>
                        <td className="py-2.5 px-3 text-neutral-text-secondary">{m.dosage || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {m.frequency || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-text-secondary">{m.duration || '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-600 italic">{m.instructions || 'As advised'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {appointment.prescription.generalAdvice && (
              <div className="p-3.5 rounded-xl bg-neutral-bg border-l-4 border-l-brand-primary border border-neutral-border text-xs space-y-1">
                <span className="font-bold text-brand-primary uppercase text-[10px] tracking-wider block">Clinical Advice:</span>
                <p className="text-neutral-text-secondary leading-relaxed">{appointment.prescription.generalAdvice}</p>
              </div>
            )}

            {appointment.prescription.followUpDate && (
              <div className="text-xs text-neutral-text-secondary font-medium">
                <strong className="text-neutral-text-primary">Recommended Follow-up Date: </strong>
                <span>{appointment.prescription.followUpDate}</span>
              </div>
            )}
          </div>
        )}

        {/* Advised Diagnostic & Lab Tests (if ordered) */}
        {appointment.medicalTests?.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-text-primary">
                  Advised Diagnostic &amp; Lab Tests
                </h3>
              </div>

              <button
                type="button"
                onClick={printTests}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-neutral-text-primary hover:text-brand-primary self-start sm:self-auto cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Lab Tests</span>
              </button>
            </div>

            <div className="space-y-3">
              {appointment.medicalTests.map((test, idx) => (
                <div key={idx} className="p-4 sm:p-5 rounded-2xl border border-neutral-border bg-neutral-bg/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-neutral-text-primary">{test.testName}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${getTestStatusBadgeClass(test.status)}`}>
                        {formatTestStatus(test.status)}
                      </span>
                    </div>

                    {test.resultFileUrl ? (
                      <a
                        href={test.resultFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 text-xs font-bold transition-colors self-start sm:self-auto"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        <span>View Lab Report</span>
                        <ExternalLink className="w-3 h-3 text-teal-700" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl font-medium self-start sm:self-auto">
                        Result report pending upload by clinic diagnostics
                      </span>
                    )}
                  </div>

                  {test.instructions && (
                    <p className="text-xs text-neutral-text-secondary">
                      <strong className="text-neutral-text-primary">Doctor&apos;s Instructions: </strong>
                      {test.instructions}
                    </p>
                  )}

                  {test.resultNotes && (
                    <div className="p-3 rounded-xl bg-white border border-neutral-border text-xs text-neutral-text-primary space-y-1">
                      <span className="font-bold text-neutral-text-secondary block text-[10px] uppercase tracking-wider">
                        Test Findings / Result Notes:
                      </span>
                      <p className="whitespace-pre-wrap">{test.resultNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notice if Doctor hasn't recorded clinical notes, medicines, or tests yet */}
        {!appointment.notes &&
          (!appointment.prescription?.medicines || appointment.prescription.medicines.length === 0) &&
          (!appointment.medicalTests || appointment.medicalTests.length === 0) &&
          appointment.status !== 'cancelled' && (
            <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border text-xs text-neutral-text-secondary flex items-center gap-3">
              <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Consultation notes, prescribed medicines, and lab tests will appear here once recorded by the doctor.</span>
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
                  to={`/book?rescheduleId=${appointment._id}&doctorId=${doctorProfile._id}`}
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-neutral-text-primary">
                {existingReview ? 'Your Verified Review' : 'Leave a Patient Review'}
              </h3>
              {existingReview && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Review Submitted &bull; 1 Review Allowed
                </span>
              )}
            </div>

            {existingReview ? (
              <div className="p-5 rounded-2xl bg-neutral-bg/60 border border-neutral-border space-y-3 max-w-xl">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= (existingReview.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-300'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-neutral-text-primary ml-1">
                      {existingReview.rating}/5 Stars
                    </span>
                  </div>

                  <span className="text-neutral-text-secondary text-[11px]">
                    {existingReview.createdAt
                      ? format(new Date(existingReview.createdAt), 'dd MMM yyyy')
                      : 'Verified Review'}
                  </span>
                </div>

                <p className="text-xs text-neutral-text-primary leading-relaxed bg-white p-3.5 rounded-xl border border-neutral-border/70 italic">
                  &ldquo;{existingReview.comment}&rdquo;
                </p>

                <div className="flex items-center gap-1.5 text-[11px] text-neutral-text-secondary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Your verified feedback has been recorded. Reviews can only be submitted once per appointment.</span>
                </div>
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
                        className="p-1 cursor-pointer"
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
                  className="btn-accent text-xs py-2 px-5 cursor-pointer"
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
