import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-docyra-text-primary">Check Your Email</h1>
        <p className="text-xs text-docyra-text-secondary leading-relaxed max-w-sm mx-auto">
          If an account exists with <strong>{email}</strong>, we have dispatched a password reset link. This link will expire in 1 hour.
        </p>
        <div className="pt-4">
          <Link to="/login" className="btn-primary text-xs py-2.5 px-6">Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Badge variant="primary">Account Recovery</Badge>
        <h1 className="text-3xl font-extrabold text-docyra-text-primary">Forgot Password?</h1>
        <p className="text-xs text-docyra-text-secondary">Enter your registered email to receive a secure password reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="card-docyra p-8 space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              placeholder="sarah@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md"
        >
          {loading ? <span>Sending Reset Link...</span> : (
            <>
              <span>Send Password Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-semibold text-docyra-text-secondary hover:text-docyra-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
