import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

import authApi from '../../services/auth.api.js';
import Logo from '../../components/common/Logo.jsx';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError('Verification token is missing from the link.');
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.verifyEmail(token);
        if (res.success) {
          setSuccess(true);
          setMessage(res.data?.message || 'Email verified successfully!');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Verification link has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Account Activation
          </h1>
        </div>

        <div className="card-docyra p-8 bg-white shadow-docyra-card text-center space-y-6">
          {loading ? (
            <div className="py-8 space-y-3">
              <div className="w-10 h-10 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-neutral-text-secondary">Verifying your email address...</p>
            </div>
          ) : success ? (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-neutral-text-primary">
                  Email Verified Successfully!
                </h2>
                <p className="text-xs text-neutral-text-secondary leading-relaxed">
                  {message || 'Your Docyra patient account is now active. You can sign in and book appointments.'}
                </p>
              </div>
              <Link to="/login" className="btn-primary w-full justify-center text-sm py-3 inline-flex">
                <span>Sign In to Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-neutral-text-primary">
                  Verification Failed
                </h2>
                <p className="text-xs text-neutral-text-secondary leading-relaxed">
                  {error || 'This link may have expired or already been used.'}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Link to="/login" className="btn-primary w-full justify-center text-xs py-2.5">
                  Go to Sign In
                </Link>
                <Link to="/register" className="btn-outline w-full justify-center text-xs py-2.5">
                  Create New Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
