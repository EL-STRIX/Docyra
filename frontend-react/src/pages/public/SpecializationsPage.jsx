import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, HeartPulse, ChevronRight } from 'lucide-react';


import specializationsApi from '../../services/specializations.api.js';

export function SpecializationsPage() {
  const [specializations, setSpecializations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSpecs() {
      try {
        const res = await specializationsApi.getSpecializations();
        if (res.success) {
          setSpecializations(res.data.specializations || []);
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadSpecs();
  }, []);

  const defaultSpecs = [
    { name: 'Cardiology', description: 'Specialized diagnosis and treatment of cardiovascular and heart conditions.' },
    { name: 'Dermatology', description: 'Comprehensive skin health, therapeutic dermatology and cosmetic consultations.' },
    { name: 'Pediatrics', description: 'Compassionate medical care for infants, growing children and adolescents.' },
    { name: 'Orthopedics', description: 'Treatment of musculoskeletal system, bones, joints, ligaments and sports injuries.' },
    { name: 'General Medicine', description: 'Primary healthcare, diagnostic examinations and preventative chronic illness management.' },
    { name: 'Neurology', description: 'Advanced neurology care for brain, spinal cord and nervous system disorders.' },
    { name: 'Gynecology & Obstetrics', description: 'Women health, prenatal care, reproductive medicine and obstetrics.' },
    { name: 'Ophthalmology', description: 'Comprehensive eye examinations, vision care and surgical consultations.' },
    { name: 'ENT / Otorhinolaryngology', description: 'Ear, nose, throat and head/neck specialist consultations.' },
  ];

  const dataList = specializations.length > 0 ? specializations : defaultSpecs;
  const filteredSpecs = dataList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Comprehensive Directory
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Medical Specializations
          </h1>
          <p className="text-base sm:text-lg text-neutral-text-secondary leading-relaxed max-w-2xl mx-auto">
            Explore healthcare disciplines, understand clinical scopes, and connect directly with verified specialists across partner clinics.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-md mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by specialization or keyword..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20 text-neutral-text-secondary">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Loading medical specializations...</p>
          </div>
        ) : filteredSpecs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-neutral-border max-w-md mx-auto p-8 space-y-3">
            <p className="text-base font-semibold text-neutral-text-primary">No specializations found</p>
            <p className="text-xs text-neutral-text-secondary">Try adjusting your search query.</p>
            <button onClick={() => setSearch('')} className="btn-outline text-xs mt-2">
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpecs.map((spec, i) => (
              <Link
                key={spec._id || i}
                to={`/doctors?specialization=${encodeURIComponent(spec._id || spec.name)}`}
                className="card-docyra p-7 flex flex-col justify-between space-y-5 hover:-translate-y-1 transition-all group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-neutral-text-primary group-hover:text-brand-primary transition-colors">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-neutral-text-secondary leading-relaxed">
                    {spec.description || 'Specialized clinical diagnosis and treatments.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-border flex items-center justify-between text-xs font-semibold text-brand-primary group-hover:text-brand-primary-hover">
                  <span>Browse Specialists</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SpecializationsPage;
