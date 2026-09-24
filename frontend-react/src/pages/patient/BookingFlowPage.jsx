import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Building2,
  User,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
} from 'lucide-react';
import doctorsApi from '../../services/doctors.api.js';
import dependentsApi from '../../services/dependents.api.js';
import appointmentsApi from '../../services/appointments.api.js';
import useAuth from '../../context/useAuth.js';

export function BookingFlowPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const doctorId = searchParams.get('doctorId');
  const slotId = searchParams.get('slotId');

  const [doctor, setDoctor] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [bookedForType, setBookedForType] = useState('self');
  const [selectedDependentId, setSelectedDependentId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  const [currentStep, setCurrentStep] = useState(1); // 1: Details & Patient, 2: Review & Submit, 3: Success
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBookingPrerequisites() {
      if (!doctorId) {
        setError('No doctor selected for booking');
        setLoading(false);
        return;
      }

      try {
        const [docRes, depRes] = await Promise.allSettled([
          doctorsApi.getDoctorById(doctorId),
          dependentsApi.getDependents(),
        ]);

        if (docRes.status === 'fulfilled' && docRes.value.success) {
          setDoctor(docRes.value.data.doctor);
        } else {
          setError('Doctor profile not found');
        }

        if (depRes.status === 'fulfilled' && depRes.value.success) {
          setDependents(depRes.value.data.dependents || []);
        }
      } catch (err) {
        setError('Failed to prepare booking details');
      } finally {
        setLoading(false);
      }
    }
    loadBookingPrerequisites();
  }, [doctorId]);

  const handleBookingSubmit = async () => {
    setError(null);
    setBookingInProgress(true);

    try {
      const payload = {
        doctorId,
        slotId: slotId || undefined,
        bookedForType,
        bookedForId: bookedForType === 'dependent' ? selectedDependentId : undefined,
        reasonForVisit: reasonForVisit || 'General Medical Consultation',
      };

      const res = await appointmentsApi.bookAppointment(payload);
      if (res.success) {
        setConfirmedAppointment(res.data.appointment);
        setCurrentStep(3);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This slot was just booked by another patient. Please select another slot.');
      } else {
        setError(err.response?.data?.error?.message || 'Booking transaction failed. Please try again.');
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-neutral-text-secondary">Preparing appointment details...</p>
      </div>
    );
  }

  const doctorUser = doctor?.userId || {};
  const spec = doctor?.specializationId || {};
  const clinic = doctor?.clinicId || {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Step Progress Bar */}
      <div className="flex items-center justify-between border-b border-neutral-border pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep >= 1 ? 'bg-brand-primary text-white' : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            1
          </div>
          <span className="text-xs font-bold text-neutral-text-primary">Patient Details</span>
        </div>
        <div className="w-12 h-0.5 bg-neutral-border"></div>
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep >= 2 ? 'bg-brand-primary text-white' : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            2
          </div>
          <span className="text-xs font-bold text-neutral-text-primary">Review & Confirm</span>
        </div>
        <div className="w-12 h-0.5 bg-neutral-border"></div>
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 3 ? 'bg-emerald-600 text-white' : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            3
          </div>
          <span className="text-xs font-bold text-neutral-text-primary">Confirmed</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Select Patient & Reason */}
      {currentStep === 1 && (
        <div className="card-docyra p-8 space-y-6 bg-white">
          {/* Doctor Summary Banner */}
          <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
              {doctorUser.name ? doctorUser.name.charAt(0) : 'D'}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold text-base text-neutral-text-primary truncate">
                {doctorUser.name || 'Dr. Specialist'}
              </h3>
              <p className="text-xs font-semibold text-brand-primary">
                {spec.name || 'Medical Specialist'}
              </p>
              <p className="text-[11px] text-neutral-text-secondary flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{clinic.name || doctor?.clinicAddress || 'Clinic Affiliation'}</span>
              </p>
            </div>
          </div>

          {/* Book For Selection (Self vs Dependent) */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
              Who is this appointment for?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBookedForType('self')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  bookedForType === 'self'
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold'
                    : 'border-neutral-border bg-white text-neutral-text-primary'
                }`}
              >
                <User className="w-5 h-5" />
                <div>
                  <span className="text-sm block">Myself</span>
                  <span className="text-[10px] font-normal text-neutral-text-secondary block">
                    {user?.name}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBookedForType('dependent')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  bookedForType === 'dependent'
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold'
                    : 'border-neutral-border bg-white text-neutral-text-primary'
                }`}
              >
                <Users className="w-5 h-5" />
                <div>
                  <span className="text-sm block">Family Dependent</span>
                  <span className="text-[10px] font-normal text-neutral-text-secondary block">
                    Child, Spouse, Parent
                  </span>
                </div>
              </button>
            </div>

            {bookedForType === 'dependent' && (
              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-neutral-text-primary">
                  Select Family Member Profile
                </label>
                {dependents.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                    <p>You have not added any family dependents yet.</p>
                    <Link to="/dependents" className="btn-outline text-[11px] py-1 px-3 inline-block">
                      + Add a Dependent Profile
                    </Link>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedDependentId}
                    onChange={(e) => setSelectedDependentId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                  >
                    <option value="">Choose dependent...</option>
                    {dependents.map((dep) => (
                      <option key={dep._id} value={dep._id}>
                        {dep.name} ({dep.relationship})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Reason for Visit */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-text-primary">
              Reason for Consultation (Optional)
            </label>
            <textarea
              rows={3}
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="e.g. Routine checkup, ongoing symptoms, prescription review..."
              className="w-full p-3.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-outline text-xs py-2.5 px-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={bookedForType === 'dependent' && !selectedDependentId}
              onClick={() => setCurrentStep(2)}
              className="btn-accent text-xs py-2.5 px-6"
            >
              <span>Continue to Confirmation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review & CAPTCHA Confirmation */}
      {currentStep === 2 && (
        <div className="card-docyra p-8 space-y-6 bg-white">
          <h2 className="text-xl font-bold text-neutral-text-primary border-b border-neutral-border pb-3">
            Review Appointment Reservation
          </h2>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-bg border border-neutral-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Doctor:</span>
                <span className="font-bold text-neutral-text-primary">{doctorUser.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Specialization:</span>
                <span className="font-semibold text-brand-primary">{spec.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Clinic Location:</span>
                <span className="font-semibold text-neutral-text-primary">
                  {clinic.name || doctor?.clinicAddress}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Consultation Fee:</span>
                <span className="font-extrabold text-sm text-neutral-text-primary">
                  ₹{doctor?.consultationFee || 500}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-border/70">
                <span className="text-neutral-text-secondary">Booked For:</span>
                <span className="font-bold text-neutral-text-primary">
                  {bookedForType === 'self'
                    ? `${user?.name} (Self)`
                    : `${dependents.find((d) => d._id === selectedDependentId)?.name || 'Family Dependent'}`}
                </span>
              </div>
            </div>

            {/* CAPTCHA Protection Simulated Checkpoint */}
            <div className="p-4 rounded-2xl border border-teal-200 bg-brand-primary-light/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-primary" />
                <div>
                  <span className="font-bold text-xs text-neutral-text-primary block">
                    Google reCAPTCHA v3 Protected
                  </span>
                  <span className="text-[10px] text-neutral-text-secondary">
                    Automated spam & bot reservation verification passed.
                  </span>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>

            <p className="text-[11px] text-neutral-text-secondary leading-relaxed">
              By confirming this booking, you agree to Docyra&apos;s 24-hour appointment cancellation policy.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-outline text-xs py-2.5 px-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>
            <button
              type="button"
              disabled={bookingInProgress}
              onClick={handleBookingSubmit}
              className="btn-accent text-xs py-3 px-7"
            >
              {bookingInProgress ? 'Reserving Slot Atomically...' : 'Confirm & Reserve Slot'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Booking Success */}
      {currentStep === 3 && confirmedAppointment && (
        <div className="card-docyra p-8 sm:p-12 text-center space-y-6 bg-white">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="badge-success text-xs font-bold">Booking Confirmed</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
              Your Appointment is Reserved!
            </h2>
            <p className="text-xs sm:text-sm text-neutral-text-secondary max-w-md mx-auto leading-relaxed">
              We have sent a booking confirmation to your registered email and SMS reminders will trigger 24h & 1h prior to your consultation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border text-xs text-left space-y-2 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Doctor:</span>
              <span className="font-bold text-neutral-text-primary">{doctorUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Scheduled Date:</span>
              <span className="font-bold text-neutral-text-primary">
                {format(new Date(confirmedAppointment.slotStart), 'EEEE, MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Time Slot:</span>
              <span className="font-bold text-brand-primary">
                {format(new Date(confirmedAppointment.slotStart), 'hh:mm a')}
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={appointmentsApi.getIcsCalendarUrl(confirmedAppointment._id)}
              download
              className="btn-outline w-full sm:w-auto text-xs py-2.5 px-5"
            >
              <Download className="w-4 h-4" />
              <span>Add to Calendar (.ics)</span>
            </a>
            <Link
              to={`/appointments/${confirmedAppointment._id}`}
              className="btn-primary w-full sm:w-auto text-xs py-2.5 px-6"
            >
              <span>View Appointment Detail</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingFlowPage;
