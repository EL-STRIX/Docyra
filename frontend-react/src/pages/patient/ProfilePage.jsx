import { useState } from 'react';
import { User, KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import usersApi from '../../services/users.api.js';
import authApi from '../../services/auth.api.js';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // 2FA state
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null); // { secret, qrCodeUrl }
  const [totpCode, setTotpCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);

    try {
      const res = await usersApi.updateProfile({ name, phone, timezone });
      if (res.success) {
        setProfileSuccess(true);
        refreshProfile();
      }
    } catch (err) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStart2FASetup = async () => {
    setTwoFactorError(null);
    setTwoFactorLoading(true);

    try {
      const res = await authApi.setup2FA();
      if (res.success) {
        setTwoFactorSetupData(res.data);
      }
    } catch (err) {
      setTwoFactorError(err.response?.data?.error?.message || 'Failed to initialize 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorLoading(true);

    try {
      const res = await authApi.verify2FA({
        code: totpCode,
        secret: twoFactorSetupData?.secret,
      });

      if (res.success) {
        setTwoFactorSuccess(true);
        setTwoFactorSetupData(null);
        setTotpCode('');
        refreshProfile();
      }
    } catch (err) {
      setTwoFactorError(err.response?.data?.error?.message || 'Invalid 2FA verification code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter your 6-digit TOTP code to disable 2FA:');
    if (!code) return;

    try {
      const res = await authApi.disable2FA({ code });
      if (res.success) {
        alert('Two-factor authentication disabled.');
        refreshProfile();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to disable 2FA');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm space-y-1">
        <span className="badge-primary text-[10px]">Account Settings</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
          Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-neutral-text-secondary">
          Update your contact details, timezone preferences, and Two-Factor Authentication (2FA).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Details Form */}
        <div className="card-docyra p-8 space-y-6 bg-white">
          <h2 className="text-lg font-bold text-neutral-text-primary border-b border-neutral-border pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-primary" />
            <span>Personal Information</span>
          </h2>

          {profileSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-text-primary">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs bg-neutral-bg text-neutral-text-secondary cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-text-primary">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-text-primary">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-text-primary">Preferred Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (GMT +0:00)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary text-xs py-2.5 px-5 mt-2"
            >
              {savingProfile ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Security & 2FA Section */}
        <div className="card-docyra p-8 space-y-6 bg-white">
          <h2 className="text-lg font-bold text-neutral-text-primary border-b border-neutral-border pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-primary" />
            <span>Two-Factor Authentication (2FA)</span>
          </h2>

          {twoFactorSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Two-Factor Authentication is now active on your account!</span>
            </div>
          )}

          {twoFactorError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{twoFactorError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-bg border border-neutral-border">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-neutral-text-primary block">
                  TOTP Authenticator Protection
                </span>
                <span className="text-[11px] text-neutral-text-secondary">
                  Protects your account with Google Authenticator or 1Password.
                </span>
              </div>
              <div>
                {user?.twoFactorEnabled ? (
                  <span className="badge-success text-[10px]">Active</span>
                ) : (
                  <span className="badge-warning text-[10px]">Disabled</span>
                )}
              </div>
            </div>

            {user?.twoFactorEnabled ? (
              <div className="pt-2">
                <button
                  onClick={handleDisable2FA}
                  className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2 px-4"
                >
                  Disable 2FA
                </button>
              </div>
            ) : twoFactorSetupData ? (
              /* QR Code Enrollment View */
              <div className="p-4 rounded-2xl border border-teal-200 bg-brand-primary-light/30 space-y-4">
                <span className="text-xs font-bold text-neutral-text-primary block">
                  Scan with Authenticator App
                </span>

                <div className="flex justify-center bg-white p-3 rounded-xl border border-neutral-border w-fit mx-auto">
                  <img
                    src={twoFactorSetupData.qrCodeUrl}
                    alt="2FA QR Code"
                    className="w-40 h-40"
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] text-neutral-text-secondary block">Manual Entry Secret:</span>
                  <code className="text-xs font-mono font-bold text-brand-primary bg-white px-2.5 py-1 rounded border border-neutral-border">
                    {twoFactorSetupData.secret}
                  </code>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">
                      Enter 6-Digit Code from App
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-center text-base font-mono tracking-widest text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorSetupData(null)}
                      className="btn-outline text-xs py-2 px-3 flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={twoFactorLoading || totpCode.length !== 6}
                      className="btn-accent text-xs py-2 px-4 flex-1"
                    >
                      {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  onClick={handleStart2FASetup}
                  disabled={twoFactorLoading}
                  className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Set Up 2FA</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
