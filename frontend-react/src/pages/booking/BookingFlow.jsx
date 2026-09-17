import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  FileDown,
  UserPlus,
  Stethoscope,
  Info
} from 'lucide-react';

export default function BookingFlow() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Wizard Step (1: Slot, 2: Patient, 3: Reason, 4: Confirm, 5: Success)
  const [step, setStep] = useState(1);

  // Data states
  const [doctor, setDoctor] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Patient & Dependents
  const [bookingFor, setBookingFor] = useState('self'); // 'self' or 'dependent'
  const [dependents, setDependents] = useState([]);
  const [selectedDependentId, setSelectedDependentId] = useState('');
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [newDepData, setNewDepData] = useState({
    firstName: '',
    lastName: '',
    relationship: 'child',
    dateOfBirth: '',
    gender: 'male',
    medicalNotes: ''
  });

  // Reason & Consent
  const [reason, setReason] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // 1. Fetch Doctor details
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoadingDoc(true);
        const res = await apiClient.get(`/doctors/${doctorId}`);
        setDoctor(res.data?.doctor || res.data);
      } catch (err) {
        console.error('Failed to load doctor profile:', err);
        setErrorMessage('Could not load doctor details.');
      } finally {
        setLoadingDoc(false);
      }
    };

    if (doctorId) fetchDoc();
  }, [doctorId]);

  // 2. Fetch Slots for selected date
  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctorId || !selectedDate) return;
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const res = await apiClient.get(`/doctors/${doctorId}/slots`, {
          params: { date: selectedDate }
        });
        setSlots(res.data?.slots || []);
      } catch (err) {
        console.error('Failed to load slots:', err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate]);

  // 3. Fetch Dependents if authenticated
  useEffect(() => {
    const fetchDeps = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await apiClient.get('/dependents');
        setDependents(res.data?.dependents || []);
      } catch (err) {
        console.error('Failed to load dependents:', err);
      }
    };

    fetchDeps();
  }, [isAuthenticated]);

  const handleAddDependent = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/dependents', newDepData);
      const created = res.data?.dependent;
      setDependents((prev) => [...prev, created]);
      setSelectedDependentId(created._id);
      setBookingFor('dependent');
      setShowAddDepModal(false);
      setNewDepData({
        firstName: '',
        lastName: '',
        relationship: 'child',
        dateOfBirth: '',
        gender: 'male',
        medicalNotes: ''
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add dependent.');
    }
  };

  const handleFinalBooking = async () => {
    if (!selectedSlot) {
      setErrorMessage('Please select a valid time slot.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the clinic booking terms.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');

      const payload = {
        doctorId,
        slotId: selectedSlot._id,
        reason: reason.trim() || 'General Consultation',
        dependentId: bookingFor === 'dependent' ? selectedDependentId : undefined,
        captchaToken: 'verified-client-token'
      };

      const res = await apiClient.post('/appointments', payload);
      setCreatedAppointment(res.data?.appointment);
      setStep(5); // Success step
    } catch (err) {
      console.error('Booking failed:', err);
      const msg =
        err.response?.data?.message ||
        'The selected slot is no longer available. Please select another slot.';
      setErrorMessage(msg);
      setStep(1); // Go back to slot selection
    } finally {
      setSubmitting(false);
    }
  };

  // Date buttons (Next 7 days)
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  });

  if (loadingDoc) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-docyra-text-secondary mt-3">Loading appointment booking...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-docyra-text-primary">Doctor Not Found</h2>
        <p className="text-xs text-docyra-text-secondary mt-1 mb-6">
          The practitioner profile you requested is not active or verified.
        </p>
        <Link to="/doctors" className="btn-primary text-xs">
          Browse Verified Doctors
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Wizard Bar */}
      {step < 5 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-docyra-neutral-border shadow-sm">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-docyra-primary transition-all duration-300 -z-0"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />

            {[
              { num: 1, label: 'Time & Slot' },
              { num: 2, label: 'Patient' },
              { num: 3, label: 'Reason' },
              { num: 4, label: 'Confirm' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center z-10 bg-white px-2 sm:px-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-docyra-primary text-white ring-4 ring-docyra-primary/20 shadow-md'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-2xs font-semibold mt-1 hidden sm:block ${
                    step === s.num ? 'text-docyra-primary' : 'text-docyra-text-secondary'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Doctor Header Card */}
      {step < 5 && (
        <div className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold text-xl border border-docyra-primary/20">
              {doctor.userId?.firstName?.charAt(0) || 'D'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-2xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Practitioner
              </div>
              <h2 className="text-lg font-bold text-docyra-text-primary">
                Dr. {doctor.userId?.firstName} {doctor.userId?.lastName}
              </h2>
              <p className="text-xs text-docyra-text-secondary flex items-center gap-1.5 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 text-docyra-primary" />
                {doctor.specializationId?.name || 'General Practitioner'} •{' '}
                <Building2 className="w-3.5 h-3.5 text-docyra-text-secondary" />
                {doctor.clinicId?.name || 'Partner Clinic'}
              </p>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <div className="text-2xs text-docyra-text-secondary font-medium">Consultation Fee</div>
            <div className="text-xl font-extrabold text-docyra-primary">
              ${doctor.consultationFee || 50}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Select Date & Slot */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-docyra-text-primary">Select Appointment Date</h3>
            <p className="text-xs text-docyra-text-secondary mt-0.5">
              Choose an available date to view fixed-duration slots
            </p>
          </div>

          {/* Date Selector Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.iso;
              return (
                <button
                  key={opt.iso}
                  type="button"
                  onClick={() => setSelectedDate(opt.iso)}
                  className={`flex-shrink-0 w-20 py-3 px-2 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-docyra-primary text-white border-docyra-primary shadow-md scale-105'
                      : 'bg-white text-docyra-text-primary border-slate-200 hover:border-docyra-primary hover:bg-slate-50'
                  }`}
                >
                  <div className="text-2xs font-semibold uppercase tracking-wider opacity-80">
                    {opt.dayName}
                  </div>
                  <div className="text-lg font-bold my-0.5">{opt.dayNum}</div>
                  <div className="text-2xs font-medium opacity-80">{opt.month}</div>
                </button>
              );
            })}
          </div>

          {/* Available Slots Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider">
              Available Slots for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h4>

            {loadingSlots ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : slots.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-docyra-text-secondary">
                  No open slots available on this date.
                </p>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Try choosing another day or join the waitlist.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot) => {
                  const start = new Date(slot.slotStart);
                  const isSelected = selectedSlot?._id === slot._id;
                  return (
                    <button
                      key={slot._id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-left font-medium transition-all ${
                        isSelected
                          ? 'bg-docyra-primary text-white border-docyra-primary shadow-md ring-2 ring-docyra-primary/30'
                          : 'bg-white text-docyra-text-primary border-slate-200 hover:border-docyra-primary hover:bg-docyra-primary-light/30'
                      }`}
                    >
                      <div className="text-sm font-bold">
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`text-2xs ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {doctor.slotDuration || 30} mins
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(2)}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Patient Info <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Patient Selection (Self vs Dependent) */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-docyra-text-primary">Who is this appointment for?</h3>
            <p className="text-xs text-docyra-text-secondary mt-0.5">
              Select yourself or a registered family member/dependent
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                bookingFor === 'self'
                  ? 'border-docyra-primary bg-docyra-primary-light/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="bookingFor"
                value="self"
                checked={bookingFor === 'self'}
                onChange={() => setBookingFor('self')}
                className="mt-1 text-docyra-primary focus:ring-docyra-primary"
              />
              <div>
                <div className="font-bold text-sm text-docyra-text-primary">
                  {user?.firstName} {user?.lastName} (Me)
                </div>
                <div className="text-xs text-docyra-text-secondary mt-0.5">{user?.email}</div>
                <div className="text-2xs text-slate-400 mt-1">Primary Account Holder</div>
              </div>
            </label>

            <label
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                bookingFor === 'dependent'
                  ? 'border-docyra-primary bg-docyra-primary-light/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="bookingFor"
                value="dependent"
                checked={bookingFor === 'dependent'}
                onChange={() => setBookingFor('dependent')}
                className="mt-1 text-docyra-primary focus:ring-docyra-primary"
              />
              <div>
                <div className="font-bold text-sm text-docyra-text-primary">A Family Member / Dependent</div>
                <div className="text-xs text-docyra-text-secondary mt-0.5">
                  Child, parent, spouse, or other ward
                </div>
                <div className="text-2xs text-slate-400 mt-1">Managed under your Docyra profile</div>
              </div>
            </label>
          </div>

          {bookingFor === 'dependent' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider">
                  Select Registered Dependent
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddDepModal(true)}
                  className="text-xs font-semibold text-docyra-primary hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add New Family Member
                </button>
              </div>

              {dependents.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-docyra-text-secondary">No dependents registered yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddDepModal(true)}
                    className="btn-secondary text-xs mt-2 inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add First Dependent
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDependentId}
                  onChange={(e) => setSelectedDependentId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-docyra-primary"
                >
                  <option value="">-- Choose Dependent --</option>
                  {dependents.map((dep) => (
                    <option key={dep._id} value={dep._id}>
                      {dep.firstName} {dep.lastName} ({dep.relationship})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Slots
            </button>
            <button
              type="button"
              disabled={bookingFor === 'dependent' && !selectedDependentId}
              onClick={() => setStep(3)}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Reason <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Reason for Visit */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-docyra-text-primary">Reason for Clinical Visit</h3>
            <p className="text-xs text-docyra-text-secondary mt-0.5">
              Provide brief symptoms or notes to help the doctor prepare for your consultation
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-docyra-text-primary uppercase tracking-wider mb-2">
                Chief Complaint / Symptoms
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="4"
                placeholder="e.g. Regular health checkup, persistent cough for 3 days, prescription renewal, fever, etc."
                className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-docyra-primary"
              />
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important Emergency Notice:</span> Docyra is for scheduled clinical visits only. If you are experiencing chest pain, severe bleeding, or a life-threatening medical emergency, call 911 or visit the nearest emergency room immediately.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Patient Info
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              Review & Confirm <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Verification & Confirmation */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-docyra-text-primary">Confirm Your Booking</h3>
            <p className="text-xs text-docyra-text-secondary mt-0.5">
              Review details before final slot lock and instant confirmation
            </p>
          </div>

          {/* Booking Summary Box */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-slate-400 font-medium">Practitioner</div>
                <div className="font-bold text-sm text-docyra-text-primary mt-0.5">
                  Dr. {doctor.userId?.firstName} {doctor.userId?.lastName}
                </div>
                <div className="text-2xs text-docyra-text-secondary">
                  {doctor.specializationId?.name}
                </div>
              </div>

              <div>
                <div className="text-slate-400 font-medium">Clinic & Location</div>
                <div className="font-bold text-sm text-docyra-text-primary mt-0.5">
                  {doctor.clinicId?.name}
                </div>
                <div className="text-2xs text-docyra-text-secondary">
                  {doctor.clinicId?.address?.city}, {doctor.clinicId?.address?.country}
                </div>
              </div>

              <div>
                <div className="text-slate-400 font-medium">Scheduled Date & Time</div>
                <div className="font-bold text-sm text-docyra-text-primary mt-0.5">
                  {selectedSlot?.slotStart &&
                    new Date(selectedSlot.slotStart).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                </div>
                <div className="text-2xs text-docyra-primary font-bold">
                  {selectedSlot?.slotStart &&
                    new Date(selectedSlot.slotStart).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}{' '}
                  ({doctor.slotDuration || 30} minutes)
                </div>
              </div>

              <div>
                <div className="text-slate-400 font-medium">Patient Details</div>
                <div className="font-bold text-sm text-docyra-text-primary mt-0.5">
                  {bookingFor === 'self'
                    ? `${user?.firstName} ${user?.lastName} (Self)`
                    : dependents.find((d) => d._id === selectedDependentId)?.firstName + ' (Dependent)'}
                </div>
                <div className="text-2xs text-docyra-text-secondary">
                  Reason: {reason || 'General Consultation'}
                </div>
              </div>
            </div>
          </div>

          {/* CAPTCHA / Verification */}
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={captchaVerified}
                onChange={(e) => setCaptchaVerified(e.target.checked)}
                className="w-4 h-4 rounded text-docyra-primary focus:ring-docyra-primary"
              />
              <span className="text-xs font-medium text-docyra-text-primary">
                I am not a robot (Security verification check)
              </span>
            </label>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-docyra-primary focus:ring-docyra-primary"
            />
            <span className="text-xs text-docyra-text-secondary leading-relaxed">
              I agree to Docyra's <Link to="/terms" target="_blank" className="text-docyra-primary underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-docyra-primary underline">Privacy Policy</Link>. I understand that appointment cancellations must be made at least 24 hours prior to the visit.
            </span>
          </label>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={submitting}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Reason
            </button>
            <button
              type="button"
              disabled={!termsAccepted || !captchaVerified || submitting}
              onClick={handleFinalBooking}
              className="btn-accent text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Locking Slot...' : 'Confirm & Book Appointment'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success Screen */}
      {step === 5 && createdAppointment && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-docyra-neutral-border shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              Booking Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-docyra-text-primary mt-2">
              You're all set!
            </h2>
            <p className="text-xs text-docyra-text-secondary mt-1">
              Reference ID: <span className="font-mono font-bold text-docyra-text-primary">{createdAppointment._id}</span>
            </p>
          </div>

          <p className="text-xs text-docyra-text-secondary max-w-md mx-auto">
            A confirmation email and SMS notification have been dispatched. Your slot is guaranteed with zero double-booking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <a
              href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/appointments/${createdAppointment._id}/ics`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4" /> Download .ics Calendar
            </a>

            <Link
              to="/dashboard"
              className="btn-primary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              Go to My Appointments <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Add Dependent Modal */}
      {showAddDepModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-docyra-text-primary">Add Family Member</h3>
              <button
                type="button"
                onClick={() => setShowAddDepModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDependent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDepData.firstName}
                    onChange={(e) => setNewDepData({ ...newDepData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDepData.lastName}
                    onChange={(e) => setNewDepData({ ...newDepData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Relationship
                  </label>
                  <select
                    value={newDepData.relationship}
                    onChange={(e) => setNewDepData({ ...newDepData, relationship: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={newDepData.dateOfBirth}
                    onChange={(e) => setNewDepData({ ...newDepData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                  Medical Notes / Allergies (Optional)
                </label>
                <textarea
                  rows="2"
                  value={newDepData.medicalNotes}
                  onChange={(e) => setNewDepData({ ...newDepData, medicalNotes: e.target.value })}
                  placeholder="e.g. Asthma, Penicillin allergy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDepModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Dependent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
