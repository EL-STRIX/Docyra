import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

import authApi from '../../services/auth.api.js';
import Logo from '../../components/common/Logo.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to process password recovery.');
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
            Reset Your Password
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Enter your email to receive a secure password reset link.
          </p>
        </div>

        <div className="card-docyra p-8 bg-white shadow-docyra-card space-y-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-neutral-text-primary">
                  Check Your Inbox
                </h2>
                <p className="text-xs text-neutral-text-secondary leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we have sent instructions to reset your password. The link expires in 15 minutes.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/login" className="btn-primary text-xs w-full py-2.5">
                  Back to Sign In
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full justify-center text-sm py-3 mt-2"
              >
                {loading ? 'Sending Recovery Link...' : 'Send Password Reset Link'}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-neutral-text-secondary hover:text-brand-primary"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
