import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, MapPin, Phone, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import clinicsApi from '../../services/clinics.api.js';

export function ClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClinics() {
      try {
        const res = await clinicsApi.getClinics();
        if (res.success) {
          setClinics(res.data.clinics || []);
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadClinics();
  }, []);

  const cities = Array.from(new Set(clinics.map((c) => c.city).filter(Boolean)));

  const filteredClinics = clinics.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
    const matchesCity = !selectedCity || c.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Verified Partner Directory
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Partner Healthcare Clinics
          </h1>
          <p className="text-base sm:text-lg text-neutral-text-secondary leading-relaxed max-w-2xl mx-auto">
            Discover accredited partner clinics with dedicated staff, verified medical facilities, and live appointment booking.
          </p>

          {/* Search and City Filters */}
          <div className="pt-4 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clinics by name or area..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
              />
            </div>

            {cities.length > 0 && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 rounded-full bg-white border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm cursor-pointer"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Clinics Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20 text-neutral-text-secondary">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Loading partner clinics...</p>
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-neutral-border max-w-md mx-auto p-8 space-y-3">
            <Building2 className="w-10 h-10 text-neutral-text-secondary mx-auto" />
            <p className="text-base font-semibold text-neutral-text-primary">No partner clinics found</p>
            <p className="text-xs text-neutral-text-secondary">Try searching with different keywords or city filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCity('');
              }}
              className="btn-outline text-xs mt-2"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClinics.map((clinic) => (
              <div
                key={clinic._id}
                className="card-docyra p-7 flex flex-col justify-between space-y-6 hover:-translate-y-1 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="badge-primary text-[10px]">
                      {clinic.city || 'Partner Clinic'}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-neutral-text-primary">
                      {clinic.name}
                    </h3>
                    <div className="flex items-start gap-2 text-xs text-neutral-text-secondary mt-2">
                      <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <span>{clinic.address || 'Address on file'}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs text-neutral-text-secondary">
                    {clinic.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-brand-primary" />
                        <span>{clinic.contactPhone}</span>
                      </div>
                    )}
                    {clinic.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-brand-primary" />
                        <span>{clinic.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-border flex items-center justify-between">
                  <span className="text-xs text-neutral-text-secondary font-medium">
                    {clinic.doctorsCount !== undefined ? `${clinic.doctorsCount} Doctors` : 'Specialist Team'}
                  </span>
                  <Link
                    to={`/clinics/${clinic._id}`}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    <span>View Roster</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ClinicsPage;
