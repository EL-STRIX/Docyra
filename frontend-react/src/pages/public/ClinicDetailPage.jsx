import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, ShieldCheck, Calendar, ArrowLeft, Stethoscope } from 'lucide-react';
import clinicsApi from '../../services/clinics.api.js';
import RatingStars from '../../components/common/RatingStars.jsx';

export function ClinicDetailPage() {
  const { id } = useParams();
  const [clinic, setClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadClinicDetail() {
      try {
        const res = await clinicsApi.getClinicById(id);
        if (res.success) {
          setClinic(res.data.clinic);
          setDoctors(res.data.doctors || []);
        } else {
          setError('Clinic not found');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load clinic');
      } finally {
        setLoading(false);
      }
    }
    loadClinicDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-neutral-text-secondary">Loading clinic details...</p>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <Building2 className="w-12 h-12 text-neutral-text-secondary mx-auto" />
        <h2 className="text-2xl font-bold text-neutral-text-primary">Clinic Not Found</h2>
        <p className="text-sm text-neutral-text-secondary">{error || 'The requested clinic could not be located.'}</p>
        <Link to="/clinics" className="btn-outline text-xs mt-2 inline-flex">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Clinics
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Clinic Header Banner */}
      <section className="bg-white border-b border-neutral-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            to="/clinics"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-text-secondary hover:text-brand-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all clinics</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-primary text-[10px]">{clinic.city || 'Healthcare Center'}</span>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Onboarded Partner</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
                {clinic.name}
              </h1>

              <div className="flex items-start gap-2 text-sm text-neutral-text-secondary max-w-2xl">
                <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>{clinic.address}</span>
              </div>
            </div>

            {/* Clinic Quick Contact Box */}
            <div className="bg-neutral-bg p-5 rounded-2xl border border-neutral-border space-y-2 text-xs text-neutral-text-secondary shrink-0">
              <span className="font-bold text-neutral-text-primary uppercase tracking-wider text-[10px]">
                Direct Clinic Desk
              </span>
              {clinic.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-neutral-text-primary">{clinic.contactPhone}</span>
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
        </div>
      </section>

      {/* Doctor Roster at this clinic */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-text-primary tracking-tight">
              Practicing Specialists ({doctors.length})
            </h2>
            <p className="text-xs text-neutral-text-secondary mt-1">
              Qualified physicians stationed at {clinic.name}.
            </p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-border p-10 text-center space-y-3">
            <Stethoscope className="w-10 h-10 text-neutral-text-secondary mx-auto" />
            <h3 className="text-base font-semibold text-neutral-text-primary">No Doctors Currently Listed</h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              This clinic is onboarded and in the process of synchronizing practitioner rosters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const user = doctor.userId || {};
              const spec = doctor.specializationId || {};

              return (
                <div
                  key={doctor._id}
                  className="card-docyra p-6 flex flex-col justify-between space-y-5 hover:-translate-y-1 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
                        {user.name ? user.name.charAt(0) : 'D'}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-bold text-base text-neutral-text-primary truncate">
                          {user.name || 'Dr. Specialist'}
                        </h3>
                        <p className="text-xs font-semibold text-brand-primary">
                          {spec.name || 'Medical Specialist'}
                        </p>
                        <p className="text-[11px] text-neutral-text-secondary truncate">
                          {doctor.qualifications || 'MBBS, MD'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-neutral-border/70 text-xs">
                      <RatingStars rating={doctor.avgRating} totalReviews={doctor.totalReviews} />
                      <span className="font-bold text-neutral-text-primary">
                        ₹{doctor.consultationFee || 500}
                      </span>
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
                      Profile
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
      </section>
    </div>
  );
}

export default ClinicDetailPage;
