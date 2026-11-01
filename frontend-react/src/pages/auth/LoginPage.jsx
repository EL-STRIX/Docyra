import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import Logo from '../../components/common/Logo.jsx';

export function LoginPage() {
  const { user, login, login2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from
    ? typeof location.state.from === 'object'
      ? `${location.state.from.pathname}${location.state.from.search || ''}`
      : location.state.from
    : '/dashboard';

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorData, setTwoFactorData] = useState(null); // { tempToken, user }
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email, password });
      if (res.requires2FA) {
        setTwoFactorData({ tempToken: res.tempToken, user: res.user });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login2FA({
        tempToken: twoFactorData.tempToken,
        code: totpCode,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Invalid 2FA code');
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
            {twoFactorData ? 'Two-Factor Authentication' : 'Welcome Back to Docyra'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            {twoFactorData
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in to manage appointments, dependents, and medical care.'}
          </p>
        </div>

        <div className="card-docyra p-8 bg-white shadow-docyra-card space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {twoFactorData ? (
            /* 2FA Challenge Form */
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-primary-light/50 border border-teal-200 text-xs text-brand-primary flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Two-Factor Authentication is enabled for your account.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">6-Digit TOTP Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-border text-center text-lg font-mono tracking-widest text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="btn-accent w-full justify-center text-sm py-3"
              >
                {loading ? 'Verifying Code...' : 'Authenticate & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorData(null);
                  setTotpCode('');
                }}
                className="text-xs text-neutral-text-secondary hover:text-brand-primary text-center w-full block pt-1"
              >
                &larr; Back to password sign in
              </button>
            </form>
          ) : (
            /* Standard Password Form */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Email Address</label>
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

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-text-primary">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-primary font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full justify-center text-sm py-3 mt-2"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-neutral-border text-center text-xs text-neutral-text-secondary">
            Don&apos;t have a patient account?{' '}
            <Link to="/register" className="text-brand-primary font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
