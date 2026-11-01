import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Building2, Calendar, Stethoscope, Filter } from 'lucide-react';

import doctorsApi from '../../services/doctors.api.js';
import specializationsApi from '../../services/specializations.api.js';
import clinicsApi from '../../services/clinics.api.js';
import RatingStars from '../../components/common/RatingStars.jsx';

export function DoctorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const query = searchParams.get('query') || '';
  const selectedSpec = searchParams.get('specialization') || '';
  const selectedClinic = searchParams.get('clinicId') || '';
  const minRating = searchParams.get('minRating') || '';

  const matchedSpec = specializations.find(
    (s) => s._id === selectedSpec || s.name.toLowerCase() === selectedSpec.toLowerCase()
  );
  const activeSpecId = matchedSpec ? matchedSpec._id : selectedSpec;

  useEffect(() => {
    async function loadFiltersAndDoctors() {
      setLoading(true);
      try {
        const [specsRes, clinicsRes, docsRes] = await Promise.allSettled([
          specializationsApi.getSpecializations(),
          clinicsApi.getClinics(),
          doctorsApi.getDoctors({
            search: query || undefined,
            specializationId: activeSpecId || selectedSpec || undefined,
            specialization: activeSpecId || selectedSpec || undefined,
            clinicId: selectedClinic || undefined,
            minRating: minRating || undefined,
          }),
        ]);

        if (specsRes.status === 'fulfilled' && specsRes.value.success) {
          setSpecializations(specsRes.value.data.specializations || []);
        }
        if (clinicsRes.status === 'fulfilled' && clinicsRes.value.success) {
          setClinics(clinicsRes.value.data.clinics || []);
        }
        if (docsRes.status === 'fulfilled' && docsRes.value.success) {
          setDoctors(docsRes.value.data.doctors || []);
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadFiltersAndDoctors();
  }, [query, selectedSpec, activeSpecId, selectedClinic, minRating]);

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Verified Medical Directory
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Find Your Doctor & Specialist
          </h1>
          <p className="text-base sm:text-lg text-neutral-text-secondary leading-relaxed max-w-2xl mx-auto">
            Search verified physicians across partner clinics. Select a doctor to view live availability and reserve your slot.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-neutral-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => updateFilter('query', e.target.value)}
                placeholder="Search by doctor name, qualification, or condition..."
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Filter Sidebar and Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Filter Sidebar */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-border shadow-sm space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-neutral-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-neutral-text-primary">
                <Filter className="w-4 h-4 text-brand-primary" />
                <span>Filters</span>
              </div>
              {(query || selectedSpec || selectedClinic || minRating) && (
                <button
                  onClick={() => setSearchParams({})}
                  className="text-xs text-brand-primary font-semibold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Specialization Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
                Specialization
              </label>
              <select
                value={activeSpecId}
                onChange={(e) => updateFilter('specialization', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-neutral-bg cursor-pointer"
              >
                <option value="">All Specializations</option>
                {specializations.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clinic Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
                Partner Clinic
              </label>
              <select
                value={selectedClinic}
                onChange={(e) => updateFilter('clinicId', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-neutral-bg"
              >
                <option value="">All Clinics & Independent</option>
                {clinics.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-text-secondary">
                Minimum Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => updateFilter('minRating', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-neutral-bg"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
              </select>
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between text-xs text-neutral-text-secondary">
              <span>Showing <strong>{doctors.length}</strong> verified doctors</span>
            </div>

            {loading ? (
              <div className="text-center py-20 text-neutral-text-secondary">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Searching doctor directory...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-3">
                <Stethoscope className="w-10 h-10 text-neutral-text-secondary mx-auto" />
                <h3 className="text-base font-bold text-neutral-text-primary">No Doctors Match Your Search</h3>
                <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
                  Try adjusting your keywords, specialization, or clinic filters.
                </p>
                <button
                  onClick={() => setSearchParams({})}
                  className="btn-outline text-xs mt-2"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {doctors.map((doctor) => {
                  const docUser = typeof doctor.userId === 'object' && doctor.userId !== null ? doctor.userId : {};
                  const docSpec = typeof doctor.specializationId === 'object' && doctor.specializationId !== null ? doctor.specializationId : {};
                  const docClinic = typeof doctor.clinicId === 'object' && doctor.clinicId !== null ? doctor.clinicId : {};

                  const doctorName = doctor.name || docUser.name || 'Doctor';
                  const specName = doctor.specializationName || docSpec.name || 'Medical Specialist';
                  const clinicName = doctor.clinicName || docClinic.name || doctor.clinicAddress || 'Independent Practice';
                  const clinicCity = doctor.clinicCity || docClinic.city || '';

                  return (
                    <div
                      key={doctor._id}
                      className="card-docyra p-6 flex flex-col justify-between space-y-5 hover:-translate-y-1 transition-all"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-xl shrink-0">
                            {doctorName ? doctorName.charAt(0) : 'D'}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h3 className="font-bold text-base text-neutral-text-primary truncate">
                              {doctorName}
                            </h3>
                            <p className="text-xs font-semibold text-brand-primary">
                              {specName}
                            </p>
                            <p className="text-[11px] text-neutral-text-secondary truncate">
                              {doctor.qualifications || 'MBBS, MD'} &bull; {doctor.yearsExperience ? `${doctor.yearsExperience} yrs exp` : 'Experienced'}
                            </p>
                          </div>
                        </div>

                        {/* Clinic Affiliation Badge */}
                        <div className="flex items-center gap-1.5 text-xs text-neutral-text-secondary">
                          <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          <span className="truncate">
                            {clinicName}{clinicCity ? ` (${clinicCity})` : ''}
                          </span>
                        </div>

                        {/* Rating & Fee */}
                        <div className="pt-2 flex items-center justify-between border-t border-neutral-border/70 text-xs">
                          <RatingStars rating={doctor.avgRating} totalReviews={doctor.totalReviews} />
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-text-secondary block">Consultation</span>
                            <span className="font-bold text-sm text-neutral-text-primary">
                              ₹{doctor.consultationFee || 500}
                            </span>
                          </div>
                        </div>

                        {doctor.bio && (
                          <p className="text-xs text-neutral-text-secondary line-clamp-2 leading-relaxed">
                            {doctor.bio}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 flex items-center gap-2">
                        <Link
                          to={`/doctors/${doctor._id}`}
                          className="btn-outline flex-1 text-xs py-2"
                        >
                          View Bio
                        </Link>
                        <Link
                          to={`/doctors/${doctor._id}`}
                          className="btn-accent flex-1 text-xs py-2"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Book Slot
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DoctorsPage;
