import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  ShieldCheck,
  KeyRound,
  Lock,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone
} from 'lucide-react';

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | '2fa'

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || 'USA'
    }
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // 2FA Setup State
  const [twoFAStep, setTwoFAStep] = useState(1); // 1: prompt, 2: scan QR, 3: success
  const [twoFAData, setTwoFAData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setErrorMsg('');
      await apiClient.patch('/users/me', profileData);
      setSuccessMsg('Profile information updated successfully!');
      if (refreshUser) await refreshUser();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInitiate2FA = async () => {
    try {
      setErrorMsg('');
      const res = await apiClient.post('/auth/2fa/setup');
      setTwoFAData(res.data?.data || res.data);
      setTwoFAStep(2);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate 2FA secret.');
    }
  };

  const handleVerify2FACode = async (e) => {
    e.preventDefault();
    try {
      setVerifying2FA(true);
      setErrorMsg('');
      await apiClient.post('/auth/2fa/verify', { token: totpCode });
      setSuccessMsg('Two-Factor Authentication successfully enabled!');
      setTwoFAStep(3);
      if (refreshUser) await refreshUser();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid 6-digit TOTP code. Please try again.');
    } finally {
      setVerifying2FA(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-docyra-text-primary">Profile & Security Settings</h1>
        <p className="text-xs text-docyra-text-secondary mt-1">
          Manage your personal details, contact preferences, and two-factor authentication
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-docyra-neutral-border pb-3">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-docyra-primary text-white shadow-sm'
              : 'bg-white text-docyra-text-secondary hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" /> Personal Information
        </button>

        <button
          onClick={() => setActiveTab('2fa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === '2fa'
              ? 'bg-docyra-primary text-white shadow-sm'
              : 'bg-white text-docyra-text-secondary hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Two-Factor Auth (2FA)
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-docyra-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Email Address (Primary Login)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-docyra-primary"
                />
              </div>
            </div>

            {/* Address fields */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider">
                Home Address
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={profileData.address.street}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, street: e.target.value }
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileData.address.city}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, city: e.target.value }
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={profileData.address.state}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, state: e.target.value }
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                    Zip / Postal Code
                  </label>
                  <input
                    type="text"
                    value={profileData.address.zipCode}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, zipCode: e.target.value }
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Two-Factor Authentication */}
      {activeTab === '2fa' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-docyra-text-primary">
                Two-Factor Authentication (TOTP)
              </h3>
              <p className="text-xs text-docyra-text-secondary mt-0.5">
                Add an extra layer of security to your Docyra account using Google Authenticator, Authy, or 1Password.
              </p>
            </div>
          </div>

          {user?.twoFactorEnabled ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-900">2FA is Currently Active</div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your account is safeguarded with TOTP two-factor security codes required on login.
                  </p>
                </div>
              </div>
            </div>
          ) : twoFAStep === 1 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <p className="text-xs text-docyra-text-secondary">
                Two-factor authentication adds a second verification step when logging in. When enabled, you will be prompted to enter a 6-digit code from your authenticator app.
              </p>
              <button
                type="button"
                onClick={handleInitiate2FA}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" /> Setup 2FA Now
              </button>
            </div>
          ) : twoFAStep === 2 && twoFAData ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6 animate-in fade-in">
              <div>
                <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider">
                  Step 1: Scan QR Code
                </h4>
                <p className="text-xs text-docyra-text-secondary mt-1">
                  Open your Authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200">
                {twoFAData.qrCode ? (
                  <img
                    src={twoFAData.qrCode}
                    alt="2FA QR Code"
                    className="w-44 h-44 rounded-xl border p-2 bg-white shadow-sm"
                  />
                ) : (
                  <div className="w-44 h-44 rounded-xl border flex items-center justify-center text-xs text-slate-400">
                    QR Code
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase text-2xs">Manual Entry Secret:</span>
                  <div className="p-3 bg-slate-100 rounded-xl font-mono text-docyra-primary font-bold select-all break-all text-xs">
                    {twoFAData.secret || 'N/A'}
                  </div>
                  <p className="text-2xs text-slate-400">
                    If you cannot scan the QR code, type the secret key manually into your authenticator app.
                  </p>
                </div>
              </div>

              {/* Step 2: Verify code */}
              <form onSubmit={handleVerify2FACode} className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-docyra-text-primary uppercase tracking-wider mb-1">
                    Step 2: Enter 6-Digit Code
                  </h4>
                  <p className="text-xs text-docyra-text-secondary mb-3">
                    Enter the code shown on your authenticator app to complete activation:
                  </p>
                  <input
                    type="text"
                    maxLength="6"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-48 px-4 py-3 text-center tracking-widest text-lg font-mono font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTwoFAStep(1)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={totpCode.length !== 6 || verifying2FA}
                    className="btn-primary text-xs disabled:opacity-50"
                  >
                    {verifying2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div className="text-xs font-bold text-emerald-900">
                2FA has been successfully activated on your account.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
