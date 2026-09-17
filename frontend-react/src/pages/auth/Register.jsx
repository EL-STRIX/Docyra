import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!formData.acceptedTerms) {
      return setError('You must accept the Terms of Service and Privacy Policy to register.');
    }

    try {
      setLoading(true);
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        acceptedTermsVersion: '1.0'
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-docyra-text-primary">Registration Successful!</h1>
        <p className="text-sm text-docyra-text-secondary leading-relaxed">
          We have dispatched an activation link to <strong>{formData.email}</strong>. Please check your inbox and click the link to activate your account.
        </p>
        <div className="pt-4">
          <Link to="/login" className="btn-primary text-xs py-2.5 px-6">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Badge variant="primary">Patient Registration</Badge>
        <h1 className="text-3xl font-extrabold text-docyra-text-primary">Create your Docyra Account</h1>
        <p className="text-xs text-docyra-text-secondary">Join thousands booking transparent healthcare appointments</p>
      </div>

      <form onSubmit={handleSubmit} className="card-docyra p-8 space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="Sarah Connor"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              placeholder="sarah@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Phone Number (for SMS notifications)</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              placeholder="Min. 8 characters with letter & number"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Confirm Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            id="terms"
            checked={formData.acceptedTerms}
            onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
            className="mt-0.5 rounded text-docyra-primary focus:ring-docyra-primary"
          />
          <label htmlFor="terms" className="text-xs text-docyra-text-secondary leading-tight">
            I agree to the <Link to="/terms" className="text-docyra-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-docyra-primary hover:underline">Privacy Policy</Link>.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md"
        >
          {loading ? <span>Creating Account...</span> : (
            <>
              <span>Sign Up for Free</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-docyra-text-secondary pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-docyra-primary hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
