import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const Clinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    fetchClinics();
  }, [search, cityFilter]);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (cityFilter) queryParams.append('city', cityFilter);

      const res = await apiClient.get(`/clinics?${queryParams.toString()}`);
      if (res.data) {
        setClinics(res.data.clinics || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">Healthcare Facilities</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Partner Clinics & Medical Centers
        </h1>
        <p className="text-lg text-docyra-text-secondary leading-relaxed">
          Browse verified medical centers partnering with Docyra for streamlined doctor appointments.
        </p>
      </div>

      {/* Filters */}
      <div className="card-docyra p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search clinic by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-docyra-primary/20"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <MapPin className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Filter by city (e.g. New York)..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-docyra-primary/20"
          />
        </div>
      </div>

      {/* Clinic Grid */}
      {loading ? (
        <LoadingSpinner text="Loading clinics..." />
      ) : clinics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinics.map((clinic) => (
            <div key={clinic._id} className="card-docyra p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Verified Partner
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-docyra-text-primary">{clinic.name}</h3>
                  <p className="text-xs text-docyra-text-secondary flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span>{clinic.address}, {clinic.city}</span>
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-docyra-text-secondary border-t border-stone-100 pt-3">
                  {clinic.contactPhone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{clinic.contactPhone}</span>
                    </p>
                  )}
                  {clinic.contactEmail && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{clinic.contactEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-docyra-neutral-border">
                <Link
                  to={`/clinics/${clinic._id}`}
                  className="btn-primary w-full text-center text-xs py-2.5 flex items-center justify-center space-x-1.5"
                >
                  <span>View Clinic & Doctors</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card-docyra space-y-3">
          <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-lg font-bold text-docyra-text-primary">No clinics matched your filters</h3>
          <p className="text-sm text-docyra-text-secondary">Try searching with different keywords or clear filters.</p>
        </div>
      )}
    </div>
  );
};

export default Clinics;
