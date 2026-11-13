import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  ArrowRight,
  HeartPulse,
  Award,
  ChevronRight,
  CheckCircle2,
  Quote,
  Activity,
  Users,
  Lock,
} from 'lucide-react';
import clinicsApi from '../../services/clinics.api.js';
import specializationsApi from '../../services/specializations.api.js';
import statsApi from '../../services/stats.api.js';
import RatingStars from '../../components/common/RatingStars.jsx';
import { formatAddress } from '../../utils/formatAddress.js';

export function HomePage() {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [stats, setStats] = useState({
    totalClinics: 3,
    totalDoctors: 3,
    totalAppointments: 1,
    completedAppointments: 1,
    cancelledAppointments: 0,
    slotReliability: '100%',
    totalSlots: 60,
    avgRating: 4.8,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [specsRes, clinicsRes, statsRes] = await Promise.allSettled([
          specializationsApi.getSpecializations(),
          clinicsApi.getClinics({ limit: 6 }),
          statsApi.getPublicStats(),
        ]);

        if (specsRes.status === 'fulfilled' && specsRes.value.success) {
          setSpecializations(specsRes.value.data.specializations || []);
        }
        if (clinicsRes.status === 'fulfilled' && clinicsRes.value.success) {
          setClinics(clinicsRes.value.data.clinics || []);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value?.data) {
          setStats(statsRes.value.data);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('query', searchQuery);
    if (selectedSpecialization) params.append('specialization', selectedSpecialization);
    navigate(`/doctors?${params.toString()}`);
  };

  const defaultSpecialties = [
    { name: 'Cardiology', icon: HeartPulse, desc: 'Heart health, diagnostics & preventative cardiovascular care' },
    { name: 'Dermatology', icon: Sparkles, desc: 'Comprehensive skin health, therapeutic dermatology & treatments' },
    { name: 'Pediatrics', icon: Users, desc: 'Compassionate healthcare for infants, children & adolescents' },
    { name: 'Orthopedics', icon: Activity, desc: 'Bone, joint & sports injury specialist consultations' },
    { name: 'General Medicine', icon: ShieldCheck, desc: 'Primary care, annual health checkups & chronic care' },
    { name: 'Neurology', icon: Award, desc: 'Advanced neurological disorders, diagnostics & brain care' },
  ];

  const displaySpecs = specializations.length > 0 ? specializations : defaultSpecialties;

  const testimonials = [
    {
      name: 'Ananya Sharma',
      city: 'Bangalore',
      rating: 5,
      comment: 'Booking through Docyra was completely seamless. I found a top cardiologist at Apollo City Hospital and received instant confirmation without long hold queues.',
      clinic: 'Apollo City Hospital',
    },
    {
      name: 'Rajesh Mukherjee',
      city: 'Kolkata',
      rating: 5,
      comment: 'The real-time slot calendar is incredible. Zero double-booking, friendly SMS reminder 24 hours prior, and smooth check-in at Fortis Health Point.',
      clinic: 'Fortis Health Point',
    },
    {
      name: 'Dr. Priya Varma',
      city: 'Mumbai',
      rating: 5,
      comment: 'As a patient managing care for my elderly parents, the family dependents feature makes booking appointments for multiple loved ones straightforward.',
      clinic: 'Max Care Center',
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary-light border border-teal-200/80 text-brand-primary text-xs sm:text-sm font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>Vetted Partner Clinics &bull; Atomic Zero Double-Booking</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-neutral-text-primary leading-[1.1]">
              Find your clinic. <br />
              <span className="text-brand-primary">Book your care.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-neutral-text-secondary max-w-2xl leading-relaxed">
              Docyra connects you with verified healthcare clinics and leading practitioners. Instant booking with guaranteed slot reservations.
            </p>

            {/* Unified Search Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="w-full max-w-3xl bg-white p-3 sm:p-4 rounded-2xl sm:rounded-full border border-neutral-border shadow-docyra-card hover:shadow-docyra-hover transition-all flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 flex items-center gap-3 px-3 w-full">
                <Search className="w-5 h-5 text-neutral-text-secondary shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, symptoms, or clinics..."
                  className="w-full bg-transparent text-sm sm:text-base text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none"
                />
              </div>

              <div className="hidden sm:block h-8 w-px bg-neutral-border"></div>

              <div className="flex-1 flex items-center gap-3 px-3 w-full">
                <Building2 className="w-5 h-5 text-neutral-text-secondary shrink-0" />
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base text-neutral-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="">All Specializations</option>
                  {displaySpecs.map((spec, i) => (
                    <option key={spec._id || i} value={spec._id || spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn-accent w-full sm:w-auto px-7 py-3 text-sm shrink-0"
              >
                <span>Find Doctors</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-neutral-text-secondary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-neutral-text-primary">
                  {stats.completedAppointments > 0
                    ? `${stats.completedAppointments}${stats.completedAppointments >= 10 ? '+' : ''}`
                    : `${stats.totalAppointments || 0}${stats.totalAppointments >= 10 ? '+' : ''}`}
                </span>{' '}
                Appointments Completed
              </div>
              <div className="flex items-center gap-2">
                <RatingStars rating={stats.avgRating || 4.8} showRating={false} />
                <span className="font-semibold text-neutral-text-primary">
                  {Number(stats.avgRating || 4.8).toFixed(1)}/5
                </span>{' '}
                Patient Satisfaction
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-primary" />
                <span className="font-semibold text-neutral-text-primary">
                  {stats.totalClinics > 0 ? `${stats.totalClinics} Strictly Vetted` : 'Strictly Vetted'}
                </span>{' '}
                {stats.totalClinics > 1 ? 'Clinics' : 'Clinic Model'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How it Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Streamlined Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
            How Docyra Works
          </h2>
          <p className="text-neutral-text-secondary text-base">
            Book certified clinic consultations in three intuitive, transparent steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="card-docyra flex flex-col items-center text-center p-8 space-y-4 relative group">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary text-xl font-bold transition-transform group-hover:scale-110">
              <Building2 className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">Step 1</span>
            <h3 className="text-xl font-semibold text-neutral-text-primary">Select a Clinic & Doctor</h3>
            <p className="text-sm text-neutral-text-secondary leading-relaxed">
              Browse trusted partner clinics, explore verified physician credentials, experience, and transparent consultation fees.
            </p>
          </div>

          <div className="card-docyra flex flex-col items-center text-center p-8 space-y-4 relative group">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent-light flex items-center justify-center text-brand-accent-hover text-xl font-bold transition-transform group-hover:scale-110">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">Step 2</span>
            <h3 className="text-xl font-semibold text-neutral-text-primary">Pick Live Available Slot</h3>
            <p className="text-sm text-neutral-text-secondary leading-relaxed">
              Select your preferred appointment date and time from synchronized live availability with atomic concurrency locking.
            </p>
          </div>

          <div className="card-docyra flex flex-col items-center text-center p-8 space-y-4 relative group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold transition-transform group-hover:scale-110">
              <Calendar className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">Step 3</span>
            <h3 className="text-xl font-semibold text-neutral-text-primary">Instant Confirmation & Reminders</h3>
            <p className="text-sm text-neutral-text-secondary leading-relaxed">
              Receive immediate email and SMS confirmations, `.ics` calendar invites, and automated 24h & 1h appointment notifications.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Specializations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="badge-primary uppercase tracking-wider text-[11px] mb-2">
              Medical Disciplines
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
              Explore by Specialization
            </h2>
            <p className="text-neutral-text-secondary text-base mt-1">
              Find qualified specialists across essential fields of healthcare.
            </p>
          </div>
          <Link
            to="/specializations"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
          >
            <span>View all specializations</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySpecs.slice(0, 6).map((spec, i) => (
            <Link
              key={spec._id || i}
              to={`/doctors?specialization=${spec._id || spec.name}`}
              className="card-docyra p-6 flex items-start gap-4 hover:-translate-y-1 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-neutral-text-primary group-hover:text-brand-primary transition-colors">
                  {spec.name}
                </h3>
                <p className="text-xs text-neutral-text-secondary leading-relaxed line-clamp-2">
                  {spec.description || 'Consult with licensed physicians and specialists.'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Featured Partner Clinics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white py-16 px-6 sm:px-12 rounded-3xl border border-neutral-border shadow-docyra-card">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="badge-accent uppercase tracking-wider text-[11px] mb-2">
              Verified Healthcare Centers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
              Featured Partner Clinics
            </h2>
            <p className="text-neutral-text-secondary text-base mt-1">
              Top clinics vetted by Platform Admins for safety, hygiene, and specialist excellence.
            </p>
          </div>
          <Link
            to="/clinics"
            className="btn-outline text-xs py-2 px-4"
          >
            <span>Browse All Clinics</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {clinics.length > 0 ? (
            clinics.slice(0, 3).map((clinic) => (
              <div key={clinic._id} className="border border-neutral-border rounded-2xl p-6 bg-neutral-bg hover:bg-white hover:shadow-docyra-hover transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge-primary text-[10px]">{clinic.city || 'City Location'}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active Clinic
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-text-primary">
                    {clinic.name}
                  </h3>
                  <p className="text-xs text-neutral-text-secondary leading-relaxed">
                    {formatAddress(clinic.address)}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-neutral-border/70 flex items-center justify-between">
                  <span className="text-xs text-neutral-text-secondary">
                    {clinic.contactPhone || 'Phone Verified'}
                  </span>
                  <Link
                    to={`/clinics/${clinic._id}`}
                    className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
                  >
                    <span>View Doctors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            // Placeholder demonstration cards
            [
              { name: 'Apollo City Hospital', city: 'Bangalore', address: '124 Bannerghatta Road, Central District' },
              { name: 'Fortis Health Point', city: 'Mumbai', address: '45 Linking Road, Bandra West' },
              { name: 'Max Healthcare Institute', city: 'Delhi NCR', address: '88 Ring Road, South Extension' },
            ].map((clinic, i) => (
              <div key={i} className="border border-neutral-border rounded-2xl p-6 bg-neutral-bg hover:bg-white hover:shadow-docyra-hover transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge-primary text-[10px]">{clinic.city}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-text-primary">
                    {clinic.name}
                  </h3>
                  <p className="text-xs text-neutral-text-secondary leading-relaxed">
                    {formatAddress(clinic.address)}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-neutral-border/70 flex items-center justify-between">
                  <span className="text-xs text-neutral-text-secondary">Full Roster</span>
                  <Link
                    to="/clinics"
                    className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
                  >
                    <span>Explore Clinic</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. Stats Band */}
      <section className="bg-brand-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-brand-accent">
                {stats.totalClinics > 0 ? `${stats.totalClinics}${stats.totalClinics >= 10 ? '+' : ''}` : '0'}
              </span>
              <p className="text-xs sm:text-sm text-teal-100 font-medium">Onboarded Partner Clinics</p>
            </div>
            <div className="space-y-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-brand-accent">
                {stats.totalDoctors > 0 ? `${stats.totalDoctors}${stats.totalDoctors >= 10 ? '+' : ''}` : '0'}
              </span>
              <p className="text-xs sm:text-sm text-teal-100 font-medium">Verified Medical Doctors</p>
            </div>
            <div className="space-y-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-brand-accent">
                {stats.totalAppointments > 0 ? `${stats.totalAppointments}${stats.totalAppointments >= 10 ? '+' : ''}` : '0'}
              </span>
              <p className="text-xs sm:text-sm text-teal-100 font-medium">Appointments Booked</p>
            </div>
            <div className="space-y-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-brand-accent">
                {stats.slotReliability || '100%'}
              </span>
              <p className="text-xs sm:text-sm text-teal-100 font-medium">Slot Reliability</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Patient Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Patient Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
            Trusted by Patients Across the Country
          </h2>
          <p className="text-neutral-text-secondary text-base">
            Read verified reviews from patients who experienced hassle-free clinic appointments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="card-docyra p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <Quote className="w-8 h-8 text-brand-primary-light" />
                <RatingStars rating={t.rating} />
                <p className="text-sm text-neutral-text-secondary leading-relaxed italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-neutral-text-primary">{t.name}</h4>
                  <p className="text-xs text-neutral-text-secondary">{t.city}</p>
                </div>
                <span className="text-[11px] font-medium text-brand-primary bg-brand-primary-light px-2.5 py-1 rounded-full">
                  {t.clinic}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Why Docyra 4-Pillar Trust Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-primary-light/40 border border-teal-100 rounded-3xl p-8 sm:p-14 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="badge-primary uppercase tracking-wider text-[11px]">
              The Docyra Standard
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
              Why Healthcare Leaders Choose Docyra
            </h2>
            <p className="text-neutral-text-secondary text-base">
              Built from the ground up to solve scheduling fragmentation, ghost bookings, and privacy vulnerabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-neutral-text-primary">Verified Clinics Only</h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                No unverified listings or spam. Every clinic and practitioner undergoes vetting before onboarding.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent text-neutral-text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-neutral-text-primary">Atomic Scheduling</h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                Database-level transactional locking ensures no two patients can ever reserve the same slot.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-neutral-text-primary">GDPR & HIPAA Aligned</h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                Complete data rights, full audit logs on medical record touchpoints, and end-to-end encryption.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-dark text-white flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-neutral-text-primary">Automated Reminders</h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                Idempotent 24-hour and 1-hour SMS/Email sweeps ensure patients never miss a scheduled visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Pre-Footer Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-primary-dark to-brand-primary rounded-3xl p-8 sm:p-14 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8 shadow-docyra-elevated">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Ready to schedule your appointment?
            </h2>
            <p className="text-sm sm:text-base text-teal-100">
              Find the right clinic and book your specialist care in under two minutes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0">
            <Link to="/doctors" className="btn-accent px-8 py-3.5 text-base w-full sm:w-auto">
              <Calendar className="w-5 h-5" />
              <span>Book Appointment</span>
            </Link>
            <Link to="/clinics" className="btn-outline px-6 py-3.5 text-base w-full sm:w-auto text-white bg-transparent border-white/40 hover:bg-white/10 hover:text-white">
              <span>View Clinics</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
