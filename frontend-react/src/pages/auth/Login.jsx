import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await login(email, password);

      if (res.requires2FA) {
        setRequires2FA(true);
        setTempToken(res.tempToken);
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await verify2FA(totpCode, tempToken);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Badge variant="primary">{requires2FA ? 'Two-Factor Challenge' : 'Patient Portal Login'}</Badge>
        <h1 className="text-3xl font-extrabold text-docyra-text-primary">
          {requires2FA ? 'Enter Security Code' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-docyra-text-secondary">
          {requires2FA ? 'Enter the 6-digit code from your authenticator app' : 'Log in to manage your appointments and records'}
        </p>
      </div>

      {requires2FA ? (
        /* 2FA Verification Step */
        <form onSubmit={handle2FASubmit} className="card-docyra p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-xs text-stone-600">
              Two-Factor Authentication is enabled on your account.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700">6-Digit Authenticator Code</label>
            <input
              type="text"
              required
              maxLength="6"
              placeholder="123456"
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full text-center tracking-[0.5em] text-xl font-bold py-3 rounded-xl border border-docyra-neutral-border focus:ring-2 focus:ring-docyra-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || totpCode.length < 6}
            className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md disabled:opacity-50"
          >
            {loading ? <span>Verifying...</span> : <span>Verify & Continue</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTempToken(null);
            }}
            className="w-full text-center text-xs text-stone-500 hover:text-stone-800"
          >
            ← Back to password login
          </button>
        </form>
      ) : (
        /* Standard Email + Password Login */
        <form onSubmit={handlePasswordLogin} className="card-docyra p-8 space-y-5">
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

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-docyra-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md"
          >
            {loading ? <span>Signing In...</span> : (
              <>
                <span>Sign In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-docyra-text-secondary pt-2">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-docyra-primary hover:underline">
              Create one now
            </Link>
          </p>
        </form>
      )}
    </div>
  );
};

export default Login;
