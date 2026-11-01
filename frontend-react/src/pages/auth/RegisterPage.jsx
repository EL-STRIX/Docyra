import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

import useAuth from '../../context/useAuth.js';
import Logo from '../../components/common/Logo.jsx';


export function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptedTerms: true,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        acceptedTerms: true,
        termsVersion: '2.0',
      });

      if (res.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Create Your Patient Account
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Book guaranteed appointments across accredited partner clinics.
          </p>
        </div>

        <div className="card-docyra p-8 bg-white shadow-docyra-card space-y-6">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-neutral-text-primary">
                  Account Created Successfully!
                </h2>
                <p className="text-xs text-neutral-text-secondary leading-relaxed">
                  Your account has been created for <strong>{formData.email}</strong>. Your password is securely saved and your account is active.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/login" className="btn-primary text-xs w-full py-2.5">
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Contact Phone (for SMS reminders)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 chars (upper, lower, digit)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acceptedTerms"
                  name="acceptedTerms"
                  checked={formData.acceptedTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-neutral-border text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="acceptedTerms" className="text-xs text-neutral-text-secondary leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-brand-primary font-semibold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="text-brand-primary font-semibold hover:underline">
                    Privacy Policy
                  </Link>.
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full justify-center text-sm py-3 mt-2"
              >
                {loading ? 'Creating Account...' : 'Register as Patient'}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-neutral-border text-center text-xs text-neutral-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
