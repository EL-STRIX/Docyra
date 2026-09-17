import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Missing verification token in link.');
        setLoading(false);
        return;
      }

      try {
        await apiClient.get(`/auth/verify-email?token=${token}`);
        setVerified(true);
      } catch (err) {
        setError(err.message || 'Invalid or expired email verification link.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      {loading ? (
        <LoadingSpinner text="Verifying your Docyra account..." />
      ) : verified ? (
        <div className="card-docyra p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-docyra-text-primary">Email Verified Successfully!</h1>
          <p className="text-xs text-docyra-text-secondary leading-relaxed">
            Your account is now fully active. You can log in and schedule your doctor appointments immediately.
          </p>
          <div className="pt-2">
            <Link to="/login" className="btn-accent inline-flex items-center space-x-1.5 text-xs py-2.5 px-6">
              <span>Continue to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-docyra p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-docyra-text-primary">Verification Failed</h1>
          <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link to="/login" className="btn-primary inline-block text-xs py-2 px-6">
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;
