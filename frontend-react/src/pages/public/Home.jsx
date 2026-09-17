import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Stethoscope,
  ShieldCheck,
  Star,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [specRes, clinicRes, docRes] = await Promise.allSettled([
          apiClient.get('/specializations'),
          apiClient.get('/clinics?limit=4'),
          apiClient.get('/doctors?limit=4')
        ]);

        if (specRes.status === 'fulfilled' && specRes.value.data) {
          setSpecializations(specRes.value.data.slice(0, 6));
        }
        if (clinicRes.status === 'fulfilled' && clinicRes.value.data) {
          setClinics(clinicRes.value.data.clinics || clinicRes.value.data || []);
        }
        if (docRes.status === 'fulfilled' && docRes.value.data) {
          setDoctors(docRes.value.data.doctors || docRes.value.data || []);
        }
      } catch (err) {
        console.error('Error fetching home page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/doctors');
    }
  };

  return (
    <div className="space-y-20 lg:space-y-28 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-docyra-primary-light border border-docyra-primary/20 text-docyra-primary text-xs font-semibold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-docyra-accent" />
              <span>Verified Clinic Healthcare Network</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-docyra-text-primary tracking-tight leading-[1.15]">
              Find the right doctor. <br />
              <span className="text-docyra-primary">Book in minutes.</span>
            </h1>

            {/* Subcopy */}
            <p className="text-lg sm:text-xl text-docyra-text-secondary leading-relaxed font-normal max-w-2xl mx-auto">
              Docyra connects you directly with certified clinics and top-rated medical specialists. Real-time availability, zero booking fees, and immediate confirmation.
            </p>

            {/* Hero Search Bar */}
            <div className="pt-4 max-w-2xl mx-auto">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white rounded-2xl sm:rounded-full border border-docyra-neutral-border shadow-xl shadow-docyra-primary/5 focus-within:ring-2 focus-within:ring-docyra-primary/20"
              >
                <div className="flex items-center flex-1 w-full px-4 py-2">
                  <Search className="w-5 h-5 text-docyra-text-secondary mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search doctor, clinic name, or specialty (e.g. Cardiology)..."
                    className="w-full text-sm text-docyra-text-primary placeholder-stone-400 bg-transparent focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-accent w-full sm:w-auto text-sm px-7 py-3 whitespace-nowrap flex items-center justify-center space-x-2"
                >
                  <span>Find Care</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Trust Chips Row */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-docyra-text-secondary font-medium">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-docyra-neutral-border shadow-sm">
                <Building2 className="w-4 h-4 text-docyra-primary" />
                <span><strong className="text-docyra-text-primary">15+</strong> Partner Clinics</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-docyra-neutral-border shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span><strong className="text-docyra-text-primary">100%</strong> Verified Doctors</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-docyra-neutral-border shadow-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span><strong className="text-docyra-text-primary">4.9/5</strong> Patient Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="primary">Simple 3-Step Process</Badge>
          <h2 className="text-3xl font-bold text-docyra-text-primary tracking-tight sm:text-4xl">
            Healthcare booking, simplified
          </h2>
          <p className="text-docyra-text-secondary text-base">
            Skip the waiting room phone queues. Book verified healthcare in three effortless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="card-docyra p-8 space-y-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold text-xl">
              01
            </div>
            <h3 className="text-xl font-bold text-docyra-text-primary">Discover Clinic or Specialty</h3>
            <p className="text-docyra-text-secondary text-sm leading-relaxed">
              Explore our curated network of registered healthcare clinics and medical specialties in your area.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card-docyra p-8 space-y-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl">
              02
            </div>
            <h3 className="text-xl font-bold text-docyra-text-primary">Select Doctor & Time Slot</h3>
            <p className="text-docyra-text-secondary text-sm leading-relaxed">
              Review verified practitioner profiles, consultation fees, patient feedback, and pick an exact open slot.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card-docyra p-8 space-y-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl">
              03
            </div>
            <h3 className="text-xl font-bold text-docyra-text-primary">Instant Booking & Sync</h3>
            <p className="text-docyra-text-secondary text-sm leading-relaxed">
              Get immediate SMS & email confirmations, auto-sync to your Google/Apple calendar, and seamless reminders.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SPECIALIZATIONS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <Badge variant="primary">Medical Specialties</Badge>
            <h2 className="text-3xl font-bold text-docyra-text-primary tracking-tight">
              Top Specializations
            </h2>
            <p className="text-docyra-text-secondary text-sm">
              Find specialized medical care tailored to your exact health needs.
            </p>
          </div>
          <Link
            to="/specializations"
            className="text-sm font-semibold text-docyra-primary hover:text-docyra-primary-dark flex items-center space-x-1"
          >
            <span>View All Specialties</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading specializations..." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {specializations.length > 0 ? (
              specializations.map((spec) => (
                <Link
                  key={spec._id || spec.slug}
                  to={`/doctors?specialization=${spec._id}`}
                  className="card-docyra p-6 flex flex-col items-center text-center space-y-3 group hover:border-docyra-primary"
                >
                  <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-docyra-text-primary group-hover:text-docyra-primary">
                    {spec.name}
                  </span>
                </Link>
              ))
            ) : (
              ['Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics', 'General Medicine'].map((name) => (
                <Link
                  key={name}
                  to={`/doctors`}
                  className="card-docyra p-6 flex flex-col items-center text-center space-y-3 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm text-docyra-text-primary">{name}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      {/* 4. FEATURED CLINICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <Badge variant="primary">Verified Healthcare Centers</Badge>
            <h2 className="text-3xl font-bold text-docyra-text-primary tracking-tight">
              Partner Clinics
            </h2>
            <p className="text-docyra-text-secondary text-sm">
              Accredited medical facilities with dedicated specialist teams.
            </p>
          </div>
          <Link
            to="/clinics"
            className="text-sm font-semibold text-docyra-primary hover:text-docyra-primary-dark flex items-center space-x-1"
          >
            <span>Browse All Clinics</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {clinics.length > 0 ? (
            clinics.map((clinic) => (
              <div key={clinic._id} className="card-docyra p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-docyra-primary text-white flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-docyra-text-primary line-clamp-1">{clinic.name}</h3>
                  <p className="text-xs text-docyra-text-secondary line-clamp-2">
                    {clinic.address}, {clinic.city}
                  </p>
                </div>
                <div className="pt-4 border-t border-docyra-neutral-border flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Partner
                  </span>
                  <Link
                    to={`/clinics/${clinic._id}`}
                    className="text-xs font-bold text-docyra-primary hover:underline"
                  >
                    View Doctors →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-12 card-docyra">
              <p className="text-docyra-text-secondary text-sm">No partner clinics found at this moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. TOP RATED DOCTORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <Badge variant="primary">Experienced Specialists</Badge>
            <h2 className="text-3xl font-bold text-docyra-text-primary tracking-tight">
              Featured Doctors
            </h2>
            <p className="text-docyra-text-secondary text-sm">
              Highly rated medical practitioners ready to provide compassionate care.
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-sm font-semibold text-docyra-primary hover:text-docyra-primary-dark flex items-center space-x-1"
          >
            <span>Search All Doctors</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.length > 0 ? (
            doctors.map((doc) => (
              <div key={doc._id} className="card-docyra p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold text-base flex-shrink-0">
                      {doc.userId?.name ? doc.userId.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-docyra-text-primary line-clamp-1">
                        {doc.userId?.name || 'Doctor'}
                      </h3>
                      <p className="text-xs text-docyra-text-secondary font-medium">
                        {doc.specializationId?.name || 'Specialist'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-amber-600 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{doc.avgRating ? doc.avgRating.toFixed(1) : 'New'}</span>
                    <span className="text-stone-400 font-normal">({doc.totalReviews || 0} reviews)</span>
                  </div>

                  <p className="text-xs text-docyra-text-secondary line-clamp-2">
                    {doc.clinicId ? `${doc.clinicId.name} • ` : 'Independent Clinic • '}
                    Fee: ${doc.consultationFee || 100}
                  </p>
                </div>

                <div className="pt-3 border-t border-docyra-neutral-border">
                  <Link
                    to={`/doctors/${doc._id}`}
                    className="btn-primary w-full text-center text-xs py-2 block"
                  >
                    View Availability
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-12 card-docyra">
              <p className="text-docyra-text-secondary text-sm">No doctors listed yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-docyra-primary to-[#0B4747] rounded-3xl p-10 sm:p-16 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready for high-quality, transparent healthcare?
            </h2>
            <p className="text-stone-200 text-base leading-relaxed">
              Join thousands of patients booking their appointments seamlessly with verified medical practitioners.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/doctors" className="btn-accent text-sm px-8 py-3.5 w-full sm:w-auto shadow-lg">
                Book an Appointment Today
              </Link>
              <Link to="/doctors/apply" className="btn-outline !border-white !text-white hover:!bg-white/10 text-sm px-8 py-3.5 w-full sm:w-auto">
                Join as a Doctor
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
