import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
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
  Calendar,
  Clock,
  Stethoscope,
  RotateCcw,
} from 'lucide-react';
import doctorsApi from '../../services/doctors.api.js';
import clinicsApi from '../../services/clinics.api.js';
import dependentsApi from '../../services/dependents.api.js';
import appointmentsApi from '../../services/appointments.api.js';
import useAuth from '../../context/useAuth.js';
import useSocket from '../../context/useSocket.js';
import { formatAddress } from '../../utils/formatAddress.js';

export function BookingFlowPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addNotification } = useSocket() || {};

  const queryDoctorId = searchParams.get('doctorId');
  const querySlotId = searchParams.get('slotId');
  const queryDate = searchParams.get('date');
  const queryPreviousAppointmentId = searchParams.get('previousAppointmentId') || searchParams.get('followUpId');

  // Master lists
  const [allDoctors, setAllDoctors] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('');

  // Follow-up context state
  const [previousAppointment, setPreviousAppointment] = useState(null);
  const [loadingPreviousAppointment, setLoadingPreviousAppointment] = useState(!!queryPreviousAppointmentId);

  // Current booking selections
  const [selectedDoctorId, setSelectedDoctorId] = useState(queryDoctorId || '');
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(queryDate || format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(querySlotId || '');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Patient & consultation details
  const [bookedForType, setBookedForType] = useState('self');
  const [selectedDependentId, setSelectedDependentId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  // Flow control & state
  // Step 1: Doctor, Clinic & Slot Selection
  // Step 2: Patient & Consultation Details
  // Step 3: Review & Confirmation
  // Step 4: Confirmed Success
  const [currentStep, setCurrentStep] = useState(queryDoctorId && querySlotId ? 2 : 1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [error, setError] = useState(null);

  // Next 10 days for date picker
  const availableDates = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i));

  // 1. Initial Load: Load all doctors, clinics, and dependents
  useEffect(() => {
    async function loadInitialData() {
      setLoadingInitial(true);
      setError(null);
      try {
        const [docsRes, clinicsRes, depsRes] = await Promise.allSettled([
          doctorsApi.getDoctors(),
          clinicsApi.getClinics(),
          dependentsApi.getDependents(),
        ]);

        if (docsRes.status === 'fulfilled' && docsRes.value.success) {
          setAllDoctors(docsRes.value.data.doctors || []);
        }
        if (clinicsRes.status === 'fulfilled' && clinicsRes.value.success) {
          setAllClinics(clinicsRes.value.data.clinics || []);
        }
        if (depsRes.status === 'fulfilled' && depsRes.value.success) {
          setDependents(depsRes.value.data.dependents || []);
        }
      } catch (err) {
        setError('Failed to load clinic and doctor directory.');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitialData();
  }, []);

  // 2. Load Doctor Details when selectedDoctorId changes
  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctor(null);
      setSlots([]);
      setSelectedSlot(null);
      setSelectedSlotId('');
      return;
    }

    async function fetchDoctor() {
      try {
        const res = await doctorsApi.getDoctorById(selectedDoctorId);
        if (res.success) {
          setDoctor(res.data.doctor);
        } else {
          setError('Selected doctor could not be loaded.');
        }
      } catch (err) {
        setError('Failed to fetch doctor details.');
      }
    }
    fetchDoctor();
  }, [selectedDoctorId]);

  // Load prior appointment if this is a follow-up booking
  useEffect(() => {
    if (!queryPreviousAppointmentId) return;
    async function loadPriorAppointment() {
      setLoadingPreviousAppointment(true);
      try {
        const res = await appointmentsApi.getAppointmentById(queryPreviousAppointmentId);
        if (res.success && res.data.appointment) {
          const prev = res.data.appointment;
          setPreviousAppointment(prev);

          // Pre-select and lock to same doctor
          const prevDocId = typeof prev.doctorId === 'object' ? prev.doctorId?._id : prev.doctorId;
          if (prevDocId) {
            setSelectedDoctorId(prevDocId);
          }

          // Pre-select clinic if available
          if (prev.clinicId) {
            const prevClinicId = typeof prev.clinicId === 'object' ? prev.clinicId?._id : prev.clinicId;
            if (prevClinicId) {
              setSelectedClinicFilter(prevClinicId);
            }
          }

          // Pre-select patient / dependent profile
          if (prev.bookedForType === 'dependent' && prev.bookedForId) {
            setBookedForType('dependent');
            const depId = typeof prev.bookedForId === 'object' ? prev.bookedForId?._id : prev.bookedForId;
            setSelectedDependentId(depId || '');
          } else {
            setBookedForType('self');
          }

          // Pre-fill reason for visit for continuous diagnosis
          const isRebook = searchParams.get('rebook') === 'true' || prev.status === 'cancelled';
          const origReason = prev.reasonForVisit || 'Medical Consultation';
          setReasonForVisit((prevVal) => {
            if (prevVal) return prevVal;
            if (isRebook) return origReason;
            return origReason.toLowerCase().startsWith('follow-up') ? origReason : `Follow-up: ${origReason}`;
          });

          // Suggest doctor's recommended follow-up date if available
          if (prev.prescription?.followUpDate) {
            const parsed = new Date(prev.prescription.followUpDate);
            if (!isNaN(parsed.getTime()) && parsed >= new Date()) {
              setSelectedDate(format(parsed, 'yyyy-MM-dd'));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load prior appointment for follow up:', err);
      } finally {
        setLoadingPreviousAppointment(false);
      }
    }
    loadPriorAppointment();
  }, [queryPreviousAppointmentId]);

  // 3. Load Slots when selectedDoctorId or selectedDate changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDoctorId || !selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await doctorsApi.getDoctorSlots(selectedDoctorId, selectedDate);
      if (res.success) {
        const availableSlots = res.data.slots || [];
        setSlots(availableSlots);

        // If a slot was pre-selected, find its full object
        if (selectedSlotId) {
          const match = availableSlots.find((s) => s._id === selectedSlotId);
          if (match) {
            setSelectedSlot(match);
          }
        }
      } else {
        setSlots([]);
      }
    } catch (err) {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctorId, selectedDate, selectedSlotId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Handle doctor selection from the doctor list
  const handleSelectDoctor = (doc) => {
    setSelectedDoctorId(doc._id);
    setSelectedSlotId('');
    setSelectedSlot(null);
    setError(null);
    // Update URL query parameters cleanly
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('doctorId', doc._id);
      next.delete('slotId');
      return next;
    });
  };

  // Handle slot selection
  const handleSelectSlot = (slot) => {
    setSelectedSlotId(slot._id);
    setSelectedSlot(slot);
    setError(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('doctorId', selectedDoctorId);
      next.set('slotId', slot._id);
      next.set('date', selectedDate);
      return next;
    });
  };

  // Submit appointment booking
  const handleBookingSubmit = async () => {
    if (!selectedDoctorId || !selectedSlotId) {
      setError('Please select both a doctor and an appointment time slot.');
      setCurrentStep(1);
      return;
    }

    if (bookedForType === 'dependent' && !selectedDependentId) {
      setError('Please select a family dependent profile.');
      setCurrentStep(2);
      return;
    }

    setError(null);
    setBookingInProgress(true);

    try {
      const payload = {
        doctorId: selectedDoctorId,
        slotId: selectedSlotId,
        bookedForType,
        bookedForId: bookedForType === 'dependent' ? selectedDependentId : undefined,
        reasonForVisit: reasonForVisit.trim() || 'General Medical Consultation',
        previousAppointmentId: queryPreviousAppointmentId || undefined,
      };

      const res = await appointmentsApi.bookAppointment(payload);
      if (res.success) {
        setConfirmedAppointment(res.data.appointment);
        setCurrentStep(4);
        if (addNotification) {
          const apptDoc = res.data.appointment;
          const formattedDate = selectedSlot?.slotStart
            ? format(new Date(selectedSlot.slotStart), 'EEE, dd MMM yyyy')
            : 'scheduled date';
          const formattedTime = selectedSlot?.slotStart
            ? format(new Date(selectedSlot.slotStart), 'hh:mm a')
            : '';
          addNotification({
            type: 'appointment:created',
            category: 'appointment',
            title: 'Appointment Booked',
            message: `Your appointment with Dr. ${doctorName.replace(/^Dr\.\s*/i, '')} on ${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''} is confirmed.`,
            link: `/appointments/${apptDoc._id}`,
            actionLabel: 'View Details',
            data: { appointmentId: apptDoc._id, ...apptDoc },
          });
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This slot was just reserved by another patient. Please pick another available time.');
        setCurrentStep(1);
        fetchSlots();
      } else {
        setError(err.response?.data?.error?.message || 'Appointment reservation failed. Please try again.');
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  // Filter doctors by clinic if selected
  const filteredDoctors = allDoctors.filter((d) => {
    if (!selectedClinicFilter) return true;
    const cId = typeof d.clinicId === 'object' ? d.clinicId?._id : d.clinicId;
    return cId === selectedClinicFilter;
  });

  const docUser = typeof doctor?.userId === 'object' && doctor?.userId !== null ? doctor.userId : {};
  const doctorName = doctor?.name || docUser?.name || 'Selected Doctor';
  const spec = typeof doctor?.specializationId === 'object' && doctor?.specializationId !== null ? doctor.specializationId : { name: doctor?.specializationName };
  const clinic = typeof doctor?.clinicId === 'object' && doctor?.clinicId !== null ? doctor?.clinicId : { name: doctor?.clinicName };

  const selectedDependent = dependents.find((d) => d._id === selectedDependentId);

  if (loadingInitial) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-neutral-text-secondary">Loading healthcare directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Step Progress Bar */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 1
                ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                : currentStep > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span className={`text-xs font-bold ${currentStep >= 1 ? 'text-neutral-text-primary' : 'text-neutral-text-secondary'}`}>
            Doctor & Slot
          </span>
        </div>

        <div className="w-8 sm:w-16 h-0.5 bg-neutral-border"></div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 2
                ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                : currentStep > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span className={`text-xs font-bold ${currentStep >= 2 ? 'text-neutral-text-primary' : 'text-neutral-text-secondary'}`}>
            Patient Details
          </span>
        </div>

        <div className="w-8 sm:w-16 h-0.5 bg-neutral-border"></div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 3
                ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                : currentStep === 4
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-border text-neutral-text-secondary'
            }`}
          >
            {currentStep === 4 ? '✓' : '3'}
          </div>
          <span className={`text-xs font-bold ${currentStep >= 3 ? 'text-neutral-text-primary' : 'text-neutral-text-secondary'}`}>
            Confirm
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Follow-up / Rebooking Continuity Notice */}
      {previousAppointment && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-blue-50 to-teal-50 border border-teal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {previousAppointment.status === 'cancelled' || searchParams.get('rebook') === 'true'
                    ? 'Rebooking Missed Appointment'
                    : 'Continuous Care Follow-up'}
                </span>
                <span className="text-xs text-neutral-text-secondary">
                  Linked to Visit #{previousAppointment._id?.slice(-8)}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-text-primary">
                {previousAppointment.status === 'cancelled' || searchParams.get('rebook') === 'true'
                  ? `Rebooking Consultation with Dr. ${doctorName}`
                  : `Follow-Up Consultation with Dr. ${doctorName}`}
              </h2>
              <p className="text-xs text-neutral-text-secondary">
                Diagnosing for: <strong className="text-neutral-text-primary">&ldquo;{previousAppointment.reasonForVisit || 'Medical Consultation'}&rdquo;</strong>.
                {previousAppointment.status === 'cancelled' || searchParams.get('rebook') === 'true'
                  ? ' All previous patient details, physician, clinic, and medical context are preserved.'
                  : ' Your prior prescriptions and diagnostic lab reports are linked for tracking.'}
              </p>
            </div>
          </div>

          <Link
            to={`/appointments/${previousAppointment._id}`}
            className="btn-outline text-teal-800 border-teal-300 hover:bg-teal-100 text-xs py-1.5 px-3 self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            Review Prior Details
          </Link>
        </div>
      )}

      {/* ──────────────── STEP 1: Select Doctor, Clinic & Available Slot ──────────────── */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* A. If no doctor selected yet: Show Clinic Filter & Doctor Cards */}
          {!doctor ? (
            <div className="card-docyra p-6 sm:p-8 space-y-6 bg-white">
              <div className="space-y-1">
                <span className="badge-primary text-[10px] uppercase font-bold">Step 1 of 3</span>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-text-primary">
                  Choose a Clinic & Specialist
                </h2>
                <p className="text-xs sm:text-sm text-neutral-text-secondary">
                  Select a verified medical consultant from our partner clinics to view live availability.
                </p>
              </div>

              {/* Clinic Filter Dropdown */}
              {allClinics.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Filter by Partner Clinic</span>
                  </label>
                  <select
                    value={selectedClinicFilter}
                    onChange={(e) => setSelectedClinicFilter(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                  >
                    <option value="">All Clinics ({allClinics.length} Available)</option>
                    {allClinics.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.city || 'Partner Center'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Doctor Directory Grid */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
                  Available Doctors ({filteredDoctors.length})
                </label>

                {filteredDoctors.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-bg rounded-2xl border border-neutral-border space-y-2">
                    <Stethoscope className="w-8 h-8 text-neutral-text-secondary mx-auto" />
                    <p className="text-sm font-semibold text-neutral-text-primary">No doctors available</p>
                    <p className="text-xs text-neutral-text-secondary">Try selecting another clinic filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDoctors.map((doc) => {
                      const u = typeof doc.userId === 'object' && doc.userId !== null ? doc.userId : {};
                      const docItemName = doc.name || u.name || 'Doctor';
                      const s = typeof doc.specializationId === 'object' && doc.specializationId !== null ? doc.specializationId : {};
                      const specItemName = doc.specializationName || s.name || 'Specialist';
                      const c = typeof doc.clinicId === 'object' && doc.clinicId !== null ? doc.clinicId : {};
                      const clinicItemName = doc.clinicName || c.name || doc.clinicAddress || 'Partner Clinic';

                      return (
                        <div
                          key={doc._id}
                          onClick={() => handleSelectDoctor(doc)}
                          className="p-4 rounded-2xl border border-neutral-border hover:border-brand-primary hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between space-y-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                                {docItemName ? docItemName.charAt(0) : 'D'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-neutral-text-primary group-hover:text-brand-primary transition-colors truncate">
                                  {docItemName}
                                </h4>
                                <span className="badge-primary text-[10px] py-0 px-2">
                                  {specItemName}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-neutral-text-secondary flex items-center gap-1 truncate">
                              <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                              <span className="truncate">{clinicItemName}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-neutral-border/70 flex items-center justify-between text-xs">
                            <span className="font-extrabold text-neutral-text-primary">
                              ₹{doc.consultationFee || 500}
                            </span>
                            <span className="text-[11px] font-bold text-brand-primary group-hover:underline flex items-center gap-1">
                              Select & View Slots <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* B. Doctor is Selected: Show Banner + Date & Live Slots Picker */
            <div className="card-docyra p-6 sm:p-8 space-y-6 bg-white">
              {/* Doctor Header Banner */}
              <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-xl shrink-0">
                    {doctorName ? doctorName.charAt(0) : 'D'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-text-primary">
                        {doctorName}
                      </h3>
                      <span className="badge-primary text-[10px]">{spec.name || 'Specialist'}</span>
                    </div>
                    <p className="text-xs text-neutral-text-secondary flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{clinic.name || doctor?.clinicAddress || 'Partner Clinic'}</span>
                      {clinic.city && <span>&bull; {clinic.city}</span>}
                    </p>
                    <p className="text-xs font-semibold text-neutral-text-primary pt-0.5">
                      Consultation Fee: <span className="text-brand-primary">₹{doctor?.consultationFee || 500}</span>
                    </p>
                  </div>
                </div>

                {!queryPreviousAppointmentId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDoctor(null);
                      setSelectedDoctorId('');
                      setSelectedSlotId('');
                      setSelectedSlot(null);
                      setSearchParams(new URLSearchParams());
                    }}
                    className="btn-outline text-xs py-1.5 px-3 self-start sm:self-center"
                  >
                    Change Doctor
                  </button>
                ) : (
                  <span className="badge-primary text-[10px] py-1.5 px-3 self-start sm:self-center bg-teal-50 text-teal-800 border border-teal-200 font-bold flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-brand-primary" />
                    <span>Follow-Up Physician</span>
                  </span>
                )}
              </div>

              {/* Date Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span>Select Consultation Date</span>
                </label>

                <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
                  {availableDates.slice(0, 5).map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm ring-2 ring-brand-primary/20'
                            : 'bg-white text-neutral-text-primary border-neutral-border hover:border-brand-primary'
                        }`}
                      >
                        <span className="text-[10px] block font-semibold uppercase">
                          {format(d, 'EEE')}
                        </span>
                        <span className="text-sm font-extrabold block">
                          {format(d, 'dd MMM')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 pt-1">
                  {availableDates.slice(5, 10).map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm ring-2 ring-brand-primary/20'
                            : 'bg-white text-neutral-text-primary border-neutral-border hover:border-brand-primary'
                        }`}
                      >
                        <span className="text-[10px] block font-semibold uppercase">
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

              {/* Live Available Slots Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <span>Available Time Slots ({slots.length})</span>
                  </label>
                  <span className="text-xs text-neutral-text-secondary">
                    {format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="py-10 text-center text-neutral-text-secondary">
                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs">Checking live open slots...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-neutral-bg border border-neutral-border text-center space-y-2">
                    <Clock className="w-8 h-8 text-neutral-text-secondary mx-auto" />
                    <p className="text-sm font-semibold text-neutral-text-primary">
                      No Available Slots for this Date
                    </p>
                    <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
                      All consultation slots on this date are fully reserved. Please pick another date above or join the waitlist.
                    </p>
                    <Link
                      to={`/waitlist?doctorId=${selectedDoctorId}`}
                      className="btn-outline text-xs py-1.5 px-4 mt-2 inline-block"
                    >
                      Join Waitlist for {doctorName}
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedSlotId === slot._id;
                      return (
                        <button
                          key={slot._id}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm ring-2 ring-brand-primary/20'
                              : 'bg-white text-neutral-text-primary border-neutral-border hover:border-brand-primary hover:bg-brand-primary-light'
                          }`}
                        >
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-brand-primary'}`} />
                          <span>{format(new Date(slot.slotStart), 'hh:mm a')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <div className="pt-4 flex items-center justify-end border-t border-neutral-border">
                <button
                  type="button"
                  disabled={!selectedSlotId}
                  onClick={() => {
                    if (!selectedSlot && selectedSlotId) {
                      const found = slots.find((s) => s._id === selectedSlotId);
                      if (found) setSelectedSlot(found);
                    }
                    setCurrentStep(2);
                  }}
                  className="btn-accent text-xs py-2.5 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>Continue to Patient Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── STEP 2: Patient Selection & Visit Reason ──────────────── */}
      {currentStep === 2 && (
        <div className="card-docyra p-6 sm:p-8 space-y-6 bg-white">
          <div className="space-y-1">
            <span className="badge-primary text-[10px] uppercase font-bold">Step 2 of 3</span>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-text-primary">
              Patient Information
            </h2>
            <p className="text-xs sm:text-sm text-neutral-text-secondary">
              Specify who will attend the consultation and note any primary health concerns.
            </p>
          </div>

          {/* Booking Summary Pill */}
          <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-neutral-text-primary block text-sm">
                {doctorName}
              </span>
              <span className="text-brand-primary font-semibold block">{spec.name || 'Specialist'}</span>
              <span className="text-neutral-text-secondary block">
                {clinic.name || doctor?.clinicAddress} &bull; ₹{doctor?.consultationFee || 500}
              </span>
            </div>
            <div className="sm:text-right space-y-0.5">
              <span className="text-neutral-text-secondary block text-[11px]">Appointment Slot:</span>
              <span className="font-bold text-neutral-text-primary block">
                {selectedSlot?.slotStart
                  ? format(new Date(selectedSlot.slotStart), 'EEE, MMM dd, yyyy')
                  : format(new Date(selectedDate), 'EEE, MMM dd, yyyy')}
              </span>
              <span className="font-bold text-brand-primary block">
                {selectedSlot?.slotStart
                  ? format(new Date(selectedSlot.slotStart), 'hh:mm a')
                  : 'Time Slot Selected'}
              </span>
            </div>
          </div>

          {/* Book For Selection (Self vs Dependent) */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
              Who is this appointment for?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBookedForType('self')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  bookedForType === 'self'
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                    : 'border-neutral-border bg-white text-neutral-text-primary hover:border-brand-primary'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-brand-primary/30 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <span className="text-sm block font-bold">Myself</span>
                  <span className="text-[11px] font-normal text-neutral-text-secondary block">
                    {user?.name} ({user?.email})
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBookedForType('dependent')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  bookedForType === 'dependent'
                    ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                    : 'border-neutral-border bg-white text-neutral-text-primary hover:border-brand-primary'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-brand-primary/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <span className="text-sm block font-bold">Family Dependent</span>
                  <span className="text-[11px] font-normal text-neutral-text-secondary block">
                    Child, Spouse, or Elderly Parent
                  </span>
                </div>
              </button>
            </div>

            {/* Dependent selection dropdown */}
            {bookedForType === 'dependent' && (
              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-neutral-text-primary">
                  Select Family Member Profile
                </label>
                {dependents.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                    <p>You have not registered any family dependents yet.</p>
                    <Link to="/dependents" className="btn-outline text-[11px] py-1 px-3 inline-block">
                      + Add a Dependent Profile
                    </Link>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedDependentId}
                    onChange={(e) => setSelectedDependentId(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
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
              Reason for Consultation (Symptoms or Purpose)
            </label>
            <textarea
              rows={3}
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="e.g. Routine checkup, ongoing headache, prescription refill, lab review..."
              className="w-full p-3.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Navigation Actions */}
          <div className="pt-4 flex items-center justify-between border-t border-neutral-border">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-outline text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Slot Picker</span>
            </button>
            <button
              type="button"
              disabled={bookedForType === 'dependent' && !selectedDependentId}
              onClick={() => setCurrentStep(3)}
              className="btn-accent text-xs py-2.5 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Continue to Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STEP 3: Review & Atomic Confirmation ──────────────── */}
      {currentStep === 3 && (
        <div className="card-docyra p-6 sm:p-8 space-y-6 bg-white">
          <div className="space-y-1 border-b border-neutral-border pb-3">
            <span className="badge-primary text-[10px] uppercase font-bold">Step 3 of 3</span>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-text-primary">
              Review & Confirm Appointment
            </h2>
            <p className="text-xs sm:text-sm text-neutral-text-secondary">
              Please verify your appointment details before final confirmation.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Consultation Summary Card */}
            <div className="p-5 rounded-2xl bg-neutral-bg border border-neutral-border space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Physician / Doctor:</span>
                <span className="font-bold text-sm text-neutral-text-primary">{doctorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Specialization:</span>
                <span className="font-semibold text-brand-primary">{spec.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Clinic Facility:</span>
                <span className="font-semibold text-neutral-text-primary">
                  {clinic.name || doctor?.clinicAddress}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Clinic Address:</span>
                <span className="text-neutral-text-primary">
                  {formatAddress(clinic.address, doctor?.clinicAddress || 'Indiranagar Medical Hub')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-border/70">
                <span className="text-neutral-text-secondary">Consultation Date:</span>
                <span className="font-bold text-neutral-text-primary">
                  {selectedSlot?.slotStart
                    ? format(new Date(selectedSlot.slotStart), 'EEEE, MMMM dd, yyyy')
                    : format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Time Slot:</span>
                <span className="font-extrabold text-sm text-brand-primary">
                  {selectedSlot?.slotStart
                    ? format(new Date(selectedSlot.slotStart), 'hh:mm a')
                    : 'Selected Slot'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-border/70">
                <span className="text-neutral-text-secondary">Patient Name:</span>
                <span className="font-bold text-neutral-text-primary">
                  {bookedForType === 'self' ? `${user?.name} (Self)` : selectedDependent?.name || 'Dependent'}
                </span>
              </div>
              {reasonForVisit && (
                <div className="flex justify-between items-start">
                  <span className="text-neutral-text-secondary">Consultation Reason:</span>
                  <span className="text-right text-neutral-text-primary max-w-xs">{reasonForVisit}</span>
                </div>
              )}
              {queryPreviousAppointmentId && (
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
                  <span className="font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-brand-primary" />
                    Episode Tracking:
                  </span>
                  <span className="font-semibold text-xs">Follow-Up (Linked to Visit #{queryPreviousAppointmentId.slice(-8)})</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-neutral-border/70">
                <span className="text-neutral-text-secondary">Payable Fee at Clinic:</span>
                <span className="font-extrabold text-base text-neutral-text-primary">
                  ₹{doctor?.consultationFee || 500}
                </span>
              </div>
            </div>

            {/* reCAPTCHA Checkpoint */}
            <div className="p-4 rounded-2xl border border-teal-200 bg-brand-primary-light/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0" />
                <div>
                  <span className="font-bold text-xs text-neutral-text-primary block">
                    Google reCAPTCHA v3 Protected
                  </span>
                  <span className="text-[10px] text-neutral-text-secondary">
                    Atomic concurrency locking ensures zero double-booking.
                  </span>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <p className="text-[11px] text-neutral-text-secondary leading-relaxed">
              By confirming this appointment, you agree to Docyra&apos;s cancellation policy. An instant confirmation and `.ics` calendar invitation will be issued.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-neutral-border">
            <button
              type="button"
              disabled={bookingInProgress}
              onClick={() => setCurrentStep(2)}
              className="btn-outline text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>
            <button
              type="button"
              disabled={bookingInProgress}
              onClick={handleBookingSubmit}
              className="btn-accent text-xs py-3 px-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bookingInProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Reserving Slot Atomically...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Book Appointment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STEP 4: Success Screen ──────────────── */}
      {currentStep === 4 && confirmedAppointment && (
        <div className="card-docyra p-8 sm:p-12 text-center space-y-6 bg-white shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="badge-success text-xs font-bold">Booking Confirmed</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
              Your Appointment is Reserved!
            </h2>
            <p className="text-xs sm:text-sm text-neutral-text-secondary max-w-md mx-auto leading-relaxed">
              We have scheduled your visit with {doctorName || 'your doctor'}. Confirmation notifications and automated reminders have been generated.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-bg border border-neutral-border text-xs text-left space-y-2.5 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Doctor:</span>
              <span className="font-bold text-neutral-text-primary">{doctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Clinic:</span>
              <span className="font-semibold text-neutral-text-primary">{clinic.name}</span>
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
            <div className="flex justify-between">
              <span className="text-neutral-text-secondary">Booking Reference:</span>
              <span className="font-mono text-[11px] text-neutral-text-primary">
                {confirmedAppointment._id}
              </span>
            </div>
            {(confirmedAppointment.isFollowUp || queryPreviousAppointmentId) && (
              <div className="flex justify-between items-center text-teal-800 font-semibold pt-1 border-t border-neutral-border/70">
                <span>Continuity Status:</span>
                <span className="flex items-center gap-1 text-[11px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                  <RotateCcw className="w-3 h-3" />
                  Follow-Up Care Linked
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={appointmentsApi.getIcsCalendarUrl(confirmedAppointment._id)}
              download
              className="btn-outline w-full sm:w-auto text-xs py-2.5 px-5 flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Add to Calendar (.ics)</span>
            </a>
            <Link
              to={`/appointments/${confirmedAppointment._id}`}
              className="btn-primary w-full sm:w-auto text-xs py-2.5 px-6 flex items-center justify-center gap-1.5"
            >
              <span>View Appointment Detail</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="btn-outline w-full sm:w-auto text-xs py-2.5 px-5"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingFlowPage;
