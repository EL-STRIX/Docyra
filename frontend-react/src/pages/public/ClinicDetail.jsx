import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Star, Stethoscope, ArrowLeft, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const ClinicDetail = () => {
  const { id } = useParams();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinicDetail = async () => {
      try {
        setLoading(true);
        const [clinicRes, docsRes] = await Promise.allSettled([
          apiClient.get(`/clinics/${id}`),
          apiClient.get(`/doctors?clinicId=${id}`)
        ]);

        if (clinicRes.status === 'fulfilled' && clinicRes.value.data) {
          setClinic(clinicRes.value.data);
        }
        if (docsRes.status === 'fulfilled' && docsRes.value.data) {
          setDoctors(docsRes.value.data.doctors || docsRes.value.data || []);
        }
      } catch (err) {
        console.error('Error fetching clinic detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClinicDetail();
  }, [id]);

  if (loading) {
    return <LoadingSpinner text="Loading clinic information..." />;
  }

  if (!clinic) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-docyra-text-primary">Clinic not found</h2>
        <p className="text-docyra-text-secondary text-sm">The clinic you requested might be unavailable or removed.</p>
        <Link to="/clinics" className="btn-primary inline-block text-xs">Return to Clinics</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Back button */}
      <Link to="/clinics" className="inline-flex items-center text-sm font-semibold text-docyra-text-secondary hover:text-docyra-primary space-x-1.5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Clinics</span>
      </Link>

      {/* Clinic Header Banner */}
      <div className="card-docyra p-8 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-docyra-primary text-white flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-docyra-text-primary">{clinic.name}</h1>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-sm text-docyra-text-secondary flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span>{clinic.address}, {clinic.city}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-docyra-neutral-border pt-6 text-sm text-docyra-text-secondary">
          {clinic.contactPhone && (
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-docyra-primary" />
              <span>Contact: <strong>{clinic.contactPhone}</strong></span>
            </p>
          )}
          {clinic.contactEmail && (
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-docyra-primary" />
              <span>Email: <strong>{clinic.contactEmail}</strong></span>
            </p>
          )}
        </div>
      </div>

      {/* Doctors Roster at this Clinic */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-docyra-text-primary">Medical Specialists at this Clinic</h2>
          <p className="text-sm text-docyra-text-secondary">Select a doctor below to view available appointment times.</p>
        </div>

        {doctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <div key={doc._id} className="card-docyra p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold text-base flex-shrink-0">
                      {doc.userId?.name ? doc.userId.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-docyra-text-primary">
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

                  <p className="text-xs text-docyra-text-secondary">
                    Consultation Fee: <strong>${doc.consultationFee || 100}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-docyra-neutral-border">
                  <Link
                    to={`/doctors/${doc._id}`}
                    className="btn-primary w-full text-center text-xs py-2.5 block"
                  >
                    View Availability & Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-docyra p-8 text-center text-docyra-text-secondary text-sm">
            No doctors currently listed under this clinic.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicDetail;
