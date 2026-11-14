import { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  HeartPulse,
  Activity,
  Droplet,
  Phone,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import useAuth from '../../context/useAuth.js';
import useSocket from '../../context/useSocket.js';
import usersApi from '../../services/users.api.js';
import authApi from '../../services/auth.api.js';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { addNotification } = useSocket() || {};

  // Personal Information
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Medical & Diagnosis Information (Vital for Doctor Consultations)
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : ''
  );
  const [gender, setGender] = useState(user?.gender || 'prefer_not_to_say');
  const [allergies, setAllergies] = useState(user?.allergies || '');
  const [chronicConditions, setChronicConditions] = useState(user?.chronicConditions || '');
  const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.emergencyContactPhone || '');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user.weightKg) : '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // 2FA state
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null); // { secret, qrCodeUrl }
  const [totpCode, setTotpCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  // Sync state when user object updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBloodGroup(user.bloodGroup || '');
      setDateOfBirth(
        user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : ''
      );
      setGender(user.gender || 'prefer_not_to_say');
      setAllergies(user.allergies || '');
      setChronicConditions(user.chronicConditions || '');
      setEmergencyContactName(user.emergencyContactName || '');
      setEmergencyContactPhone(user.emergencyContactPhone || '');
      setHeightCm(user.heightCm ? String(user.heightCm) : '');
      setWeightKg(user.weightKg ? String(user.weightKg) : '');
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);

    try {
      const payload = {
        name,
        phone,
        timezone: 'Asia/Kolkata',
        bloodGroup: bloodGroup || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        allergies: allergies.trim(),
        chronicConditions: chronicConditions.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        heightCm: heightCm ? parseFloat(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
      };

      const res = await usersApi.updateProfile(payload);
      if (res.success) {
        setProfileSuccess(true);
        refreshProfile();
        if (addNotification) {
          addNotification({
            type: 'profile:updated',
            category: 'profile',
            title: 'Medical Profile Updated',
            message: 'Your personal and diagnostic medical details have been saved successfully.',
            link: '/profile',
            actionLabel: 'View Profile',
          });
        }
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
        if (addNotification) {
          addNotification({
            type: 'security:2fa_enabled',
            category: 'security',
            title: '2FA Protection Enabled',
            message: 'Two-factor authenticator app protection is now active on your account.',
            link: '/profile',
            actionLabel: 'Security Settings',
          });
        }
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
        if (addNotification) {
          addNotification({
            type: 'security:2fa_disabled',
            category: 'security',
            title: '2FA Disabled',
            message: 'Two-factor authentication has been turned off for your account.',
            link: '/profile',
            actionLabel: 'Security Settings',
          });
        }
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to disable 2FA');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-primary text-[10px]">Patient Sovereignty</span>
            {user?.bloodGroup && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <Droplet className="w-3 h-3 text-rose-600" />
                <span>Blood Group: {user.bloodGroup}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Profile & Medical Information
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Manage your personal data, medical diagnosis records, and account security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.twoFactorEnabled ? (
            <span className="badge-success text-xs py-1 px-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2FA Protected</span>
            </span>
          ) : (
            <span className="badge-warning text-xs py-1 px-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2FA Disabled</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form: Personal & Medical Diagnosis Information (2 Columns on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-docyra p-6 sm:p-8 bg-white border border-neutral-border space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-primary-light text-brand-primary">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-text-primary">
                    Personal & Contact Details
                  </h2>
                  <p className="text-[11px] text-neutral-text-secondary">
                    Basic identification information used across clinic facilities.
                  </p>
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profile and medical diagnostic information updated successfully!</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-6">
              {/* Account Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">
                    Email Address <span className="text-[10px] text-neutral-text-secondary">(Read-only)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs bg-neutral-bg text-neutral-text-secondary cursor-not-allowed font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-neutral-text-secondary absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Diagnostic & Clinical Vitals Section */}
              <div className="pt-4 border-t border-neutral-border space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-text-primary">
                      Medical Diagnosis & Clinical Records
                    </h3>
                    <p className="text-[11px] text-neutral-text-secondary">
                      Helps doctors accurately diagnose conditions, evaluate contraindications, and prescribe treatment.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Blood Group */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blood Group</span>
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+ (A Positive)</option>
                      <option value="A-">A- (A Negative)</option>
                      <option value="B+">B+ (B Positive)</option>
                      <option value="B-">B- (B Negative)</option>
                      <option value="AB+">AB+ (AB Positive)</option>
                      <option value="AB-">AB- (AB Negative)</option>
                      <option value="O+">O+ (O Positive)</option>
                      <option value="O-">O- (O Negative)</option>
                      <option value="unknown">Unknown / Not Tested</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Date of Birth</span>
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Biological Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Vitals: Height & Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Height (in cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 172"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Weight (in kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="2"
                      max="300"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g. 68.5"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Known Allergies */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center justify-between">
                    <span>Known Drug & Food Allergies</span>
                    <span className="text-[10px] text-neutral-text-secondary font-normal">Essential for prescription safety</span>
                  </label>
                  <textarea
                    rows={2}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Aspirin, Peanuts, Sulfa drugs, Latex (or None)"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Chronic Conditions & History */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center justify-between">
                    <span>Pre-Existing Conditions & Medical History</span>
                    <span className="text-[10px] text-neutral-text-secondary font-normal">Assists differential diagnosis</span>
                  </label>
                  <textarea
                    rows={2}
                    value={chronicConditions}
                    onChange={(e) => setChronicConditions(e.target.value)}
                    placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma, Hypothyroidism (or None)"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Emergency Contact Information */}
              <div className="pt-4 border-t border-neutral-border space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-50 text-brand-primary">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-text-primary">
                      Emergency Contact
                    </h3>
                    <p className="text-[11px] text-neutral-text-secondary">
                      Point of contact in case of unexpected medical emergencies.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Contact Name</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Rajiv Sharma (Spouse / Parent)"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Emergency Phone</label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile & Medical Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security & 2FA Column */}
        <div className="space-y-6">
          <div className="card-docyra p-6 sm:p-8 space-y-6 bg-white border border-neutral-border">
            <h2 className="text-base font-bold text-neutral-text-primary border-b border-neutral-border pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <span>Two-Factor Authentication</span>
            </h2>

            <p className="text-xs text-neutral-text-secondary leading-relaxed">
              Require an authenticator app (Google Authenticator, Authy, or 1Password) to enter a 6-digit TOTP code upon login.
            </p>

            {twoFactorSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2FA enabled successfully!</span>
              </div>
            )}

            {twoFactorError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{twoFactorError}</span>
              </div>
            )}

            {user?.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">2FA is Currently Active</h4>
                    <p className="text-[11px] text-emerald-700">Your account is guarded with TOTP multi-factor verification.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisable2FA}
                  className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-2 px-4 w-full"
                >
                  Disable Two-Factor Authentication
                </button>
              </div>
            ) : twoFactorSetupData ? (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-bg border border-neutral-border text-center space-y-3">
                  <p className="text-xs font-bold text-neutral-text-primary">
                    1. Scan QR code in Authenticator:
                  </p>
                  <img
                    src={twoFactorSetupData.qrCodeUrl}
                    alt="2FA QR Code"
                    className="w-40 h-40 mx-auto rounded-xl border border-neutral-border"
                  />
                  <p className="text-[10px] text-neutral-text-secondary">
                    Or enter secret manually: <code className="bg-white p-1 rounded font-mono select-all">{twoFactorSetupData.secret}</code>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">
                    2. Enter 6-digit TOTP verification code:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-center font-mono tracking-widest text-lg font-bold text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                    {twoFactorLoading ? 'Verifying...' : 'Activate 2FA'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleStart2FASetup}
                disabled={twoFactorLoading}
                className="btn-outline text-xs py-2.5 px-4 w-full flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-brand-primary" />
                <span>{twoFactorLoading ? 'Loading QR...' : 'Enable Authenticator 2FA'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
