import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Upload, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';

export const DoctorApply = () => {
  const [specializations, setSpecializations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specializationId: '',
    medicalLicenseNumber: '',
    consultationFee: '',
    qualifications: '',
    bio: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const res = await apiClient.get('/specializations');
        if (res.data) setSpecializations(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSpecializations();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      if (file) {
        data.append('licenseDocument', file);
      }

      await apiClient.post('/doctors/apply', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-docyra-text-primary">Application Submitted Successfully!</h1>
        <p className="text-docyra-text-secondary text-sm leading-relaxed max-w-md mx-auto">
          Thank you for applying to practice on Docyra. Our Platform Administrators are reviewing your medical credentials and license documents. You will receive an email confirmation once approved.
        </p>
        <div className="pt-4">
          <Link to="/" className="btn-primary text-xs px-8 py-3">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="primary">Practitioner Network</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-docyra-text-primary">
          Join Docyra as an Independent Doctor
        </h1>
        <p className="text-sm text-docyra-text-secondary">
          Expand your clinical practice. Manage schedules, reduce no-shows, and deliver transparent healthcare.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-docyra p-8 sm:p-12 space-y-8">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-docyra-text-primary border-b border-stone-100 pb-2 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-docyra-primary" />
            <span>1. Personal & Account Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Full Name (with title)</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Dr. Jane Smith"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="jane.smith@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+1 555-123-4567"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Practice */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-docyra-text-primary border-b border-stone-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>2. Clinical Credentials & Verification</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Medical Specialization</label>
              <select
                name="specializationId"
                required
                value={formData.specializationId}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs bg-white focus:ring-2 focus:ring-docyra-primary/20"
              >
                <option value="">Select Specialization</option>
                {specializations.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Medical License Number</label>
              <input
                type="text"
                name="medicalLicenseNumber"
                required
                placeholder="e.g. MED-882390-NY"
                value={formData.medicalLicenseNumber}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Consultation Fee ($ USD)</label>
              <input
                type="number"
                name="consultationFee"
                required
                placeholder="150"
                value={formData.consultationFee}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Medical License Document (PDF/Image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                onChange={handleFileChange}
                className="w-full px-3 py-1.5 rounded-xl border border-docyra-neutral-border text-xs bg-stone-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700">Degrees & Qualifications</label>
            <input
              type="text"
              name="qualifications"
              placeholder="e.g. MD - Harvard Medical School, Board Certified Cardiologist"
              value={formData.qualifications}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700">Professional Biography</label>
            <textarea
              name="bio"
              rows="3"
              placeholder="Brief overview of your clinical background, clinical interests, and approach to care..."
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-lg"
          >
            {loading ? <span>Submitting Application...</span> : (
              <>
                <span>Submit Doctor Application for Review</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorApply;
