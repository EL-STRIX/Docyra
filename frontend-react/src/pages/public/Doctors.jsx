import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Star, Building2, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const Doctors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchParam = searchParams.get('search') || '';
  const specParam = searchParams.get('specialization') || '';
  const clinicParam = searchParams.get('clinicId') || '';

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [selectedSpec, setSelectedSpec] = useState(specParam);
  const [selectedClinic, setSelectedClinic] = useState(clinicParam);
  const [minRating, setMinRating] = useState('');

  useEffect(() => {
    // Fetch specializations & clinics for filter dropdowns
    const fetchFilters = async () => {
      try {
        const [specsRes, clinicsRes] = await Promise.allSettled([
          apiClient.get('/specializations'),
          apiClient.get('/clinics')
        ]);
        if (specsRes.status === 'fulfilled' && specsRes.value.data) {
          setSpecializations(specsRes.value.data);
        }
        if (clinicsRes.status === 'fulfilled' && clinicsRes.value.data) {
          setClinics(clinicsRes.value.data.clinics || clinicsRes.value.data || []);
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [searchParam, specParam, clinicParam, minRating]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchParam) queryParams.append('search', searchParam);
      if (specParam) queryParams.append('specializationId', specParam);
      if (clinicParam) queryParams.append('clinicId', clinicParam);
      if (minRating) queryParams.append('minRating', minRating);

      const res = await apiClient.get(`/doctors?${queryParams.toString()}`);
      if (res.data) {
        setDoctors(res.data.doctors || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    const newParams = {};
    if (searchTerm.trim()) newParams.search = searchTerm.trim();
    if (selectedSpec) newParams.specialization = selectedSpec;
    if (selectedClinic) newParams.clinicId = selectedClinic;
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpec('');
    setSelectedClinic('');
    setMinRating('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">Verified Medical Practitioners</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Find and Book Verified Doctors
        </h1>
        <p className="text-lg text-docyra-text-secondary leading-relaxed">
          Search specialized clinicians, compare patient reviews, and schedule appointments with real-time slot verification.
        </p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={applyFilters} className="card-docyra p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Doctor name or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:outline-none focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>

          {/* Specialization select */}
          <div>
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:outline-none focus:ring-2 focus:ring-docyra-primary/20 bg-white"
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec._id} value={spec._id}>{spec.name}</option>
              ))}
            </select>
          </div>

          {/* Clinic select */}
          <div>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:outline-none focus:ring-2 focus:ring-docyra-primary/20 bg-white"
            >
              <option value="">All Partner Clinics</option>
              {clinics.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Rating filter */}
          <div>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:outline-none focus:ring-2 focus:ring-docyra-primary/20 bg-white"
            >
              <option value="">Any Rating</option>
              <option value="4.5">★ 4.5 & above</option>
              <option value="4.0">★ 4.0 & above</option>
              <option value="3.5">★ 3.5 & above</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <span className="text-xs text-docyra-text-secondary">
            Showing <strong>{doctors.length}</strong> verified doctors
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-stone-500 hover:text-stone-800 px-3 py-1.5"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2 shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {/* Doctors Grid */}
      {loading ? (
        <LoadingSpinner text="Searching doctors..." />
      ) : doctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div key={doc._id} className="card-docyra p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {doc.userId?.name ? doc.userId.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-docyra-text-primary">
                        {doc.userId?.name || 'Doctor'}
                      </h3>
                      <p className="text-xs font-semibold text-docyra-primary flex items-center gap-1 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{doc.specializationId?.name || 'Medical Specialist'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold">{doc.avgRating ? doc.avgRating.toFixed(1) : 'New'}</span>
                  <span className="text-stone-500">({doc.totalReviews || 0} patient reviews)</span>
                </div>

                <p className="text-xs text-docyra-text-secondary leading-relaxed line-clamp-2">
                  {doc.bio || 'Accredited medical practitioner providing comprehensive diagnostics and specialized care.'}
                </p>

                <div className="space-y-1 text-xs text-stone-600 border-t border-stone-100 pt-3">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{doc.clinicId?.name || 'Independent Consultation'}</span>
                  </p>
                  <p className="font-semibold text-docyra-text-primary pt-1">
                    Consultation Fee: ${doc.consultationFee || 100}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-docyra-neutral-border">
                <Link
                  to={`/doctors/${doc._id}`}
                  className="btn-accent w-full text-center text-xs py-2.5 flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card-docyra space-y-3">
          <Stethoscope className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-lg font-bold text-docyra-text-primary">No doctors found matching your criteria</h3>
          <p className="text-sm text-docyra-text-secondary">Try relaxing search terms or selecting a different specialization.</p>
          <button onClick={clearFilters} className="btn-primary text-xs mt-2">Clear All Filters</button>
        </div>
      )}
    </div>
  );
};

export default Doctors;
