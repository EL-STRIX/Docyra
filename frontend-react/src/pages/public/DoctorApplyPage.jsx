import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import doctorsApi from '../../services/doctors.api.js';
import specializationsApi from '../../services/specializations.api.js';
import clinicsApi from '../../services/clinics.api.js';

export function DoctorApplyPage() {
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    clinicId: '',
    specializationId: '',
    qualifications: '',
    yearsExperience: '',
    consultationFee: '500',
    clinicAddress: '',
    bio: '',
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedClinicName, setSubmittedClinicName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [specRes, clinicRes] = await Promise.all([
          specializationsApi.getSpecializations(),
          clinicsApi.getClinics({ limit: 100 }),
        ]);

        if (specRes.success) {
          setSpecializations(specRes.data.specializations || []);
        }

        const clinicList = clinicRes.data?.clinics || [];
        setClinics(clinicList);
      } catch (err) {
        // Fallback
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'clinicId') {
      const match = clinics.find((c) => c._id === value);
      if (match) {
        setSubmittedClinicName(match.name);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.clinicId) {
      setError('Please select a healthcare clinic facility.');
      return;
    }

    if (!licenseFile) {
      setError('Please upload your official medical registration/license document.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      data.append('licenseDocument', licenseFile);

      const res = await doctorsApi.applyDoctor(data);
      if (res.success) {
        if (res.data?.clinicName) {
          setSubmittedClinicName(res.data.clinicName);
        }
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit doctor application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Doctor Application
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Apply to Join a Partner Clinic
          </h1>
          <p className="text-base text-neutral-text-secondary leading-relaxed max-w-xl mx-auto">
            Choose your preferred clinic facility, submit your medical credentials, and practice seamlessly with verified patient scheduling.
          </p>
        </div>
      </section>

      {/* Form Container */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-docyra p-8 sm:p-12 space-y-8">
          {success ? (
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-neutral-text-primary">
                  Application Submitted to {submittedClinicName || 'Clinic'}!
                </h2>
                <p className="text-sm text-neutral-text-secondary max-w-md mx-auto leading-relaxed">
                  Your credentials and application have been sent directly to the <strong>{submittedClinicName || 'selected clinic'}</strong> administration. The clinic administrator will review your medical license and activate your doctor portal account.
                </p>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/" className="btn-primary text-sm px-6 py-2.5">
                  Return to Home
                </Link>
                <Link to="/clinics" className="btn-secondary text-sm px-6 py-2.5">
                  View Clinics Directory
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Full Name (with Dr. title) *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Rajesh Gupta"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@example.com"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Portal Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 chars (upper, lower, digit)"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Contact Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Specialization */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Primary Specialization *</label>
                  <select
                    name="specializationId"
                    required
                    value={formData.specializationId}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qualifications */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Qualifications *</label>
                  <input
                    type="text"
                    name="qualifications"
                    required
                    value={formData.qualifications}
                    onChange={handleChange}
                    placeholder="e.g. MBBS, MD, DM (Cardiology)"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Years Experience */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Years of Experience</label>
                  <input
                    type="number"
                    name="yearsExperience"
                    min={0}
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    placeholder="e.g. 10"
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Consultation Fee */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-text-primary">Consultation Fee (₹ INR) *</label>
                  <input
                    type="number"
                    name="consultationFee"
                    required
                    min={0}
                    value={formData.consultationFee}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Target Clinic Facility Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Target Clinic / Hospital Facility *</span>
                </label>
                <select
                  name="clinicId"
                  required
                  value={formData.clinicId}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                >
                  <option value="">Select Clinic to Join</option>
                  {clinics.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.city ? `(${c.city})` : (c.address?.city ? `(${c.address.city})` : '')}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-text-secondary leading-relaxed">
                  Select the healthcare clinic where you want to practice. Your application will be sent directly to that clinic&apos;s administrator for review and approval.
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-text-primary">Professional Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Summarize your clinical focus, treatments offered, and patient approach..."
                  className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* License Document Upload */}
              <div className="space-y-2 p-5 rounded-2xl border-2 border-dashed border-teal-200 bg-brand-primary-light/30">
                <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" />
                  <span>Medical Registration / License Document (PDF / Image) *</span>
                </label>
                <p className="text-[11px] text-neutral-text-secondary leading-relaxed">
                  Upload your state medical council registration certificate or proof of qualification. This is strictly required for platform verification.
                </p>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-neutral-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary-hover cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full justify-center text-sm py-3"
              >
                {loading ? 'Submitting Application...' : 'Submit Application for Review'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default DoctorApplyPage;
