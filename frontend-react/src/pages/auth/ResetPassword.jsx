import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      return setError('Invalid or missing password reset token.');
    }

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
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
        <h1 className="text-2xl font-bold text-docyra-text-primary">Password Reset Successful!</h1>
        <p className="text-xs text-docyra-text-secondary leading-relaxed">
          Your new password has been set. You can now log in to your account.
        </p>
        <div className="pt-4">
          <Link to="/login" className="btn-primary text-xs py-2.5 px-6">Proceed to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Badge variant="primary">Set New Password</Badge>
        <h1 className="text-3xl font-extrabold text-docyra-text-primary">Reset Your Password</h1>
        <p className="text-xs text-docyra-text-secondary">Enter a strong, secure password for your Docyra account.</p>
      </div>

      <form onSubmit={handleSubmit} className="card-docyra p-8 space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-700">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md"
        >
          {loading ? <span>Resetting Password...</span> : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
