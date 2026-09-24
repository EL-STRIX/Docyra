import { useState } from 'react';
import { format } from 'date-fns';
import { Download, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import usersApi from '../../services/users.api.js';
import useAuth from '../../context/useAuth.js';

export function PrivacyDataPage() {
  const { user, refreshProfile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [consentUpdating, setConsentUpdating] = useState(false);
  const [consentSuccess, setConsentSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleExportData = async () => {
    setError(null);
    setDownloading(true);

    try {
      const res = await usersApi.exportMyData();
      if (res.success) {
        // Create downloadable JSON blob
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `docyra-patient-archive-${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err) {
      setError('Failed to generate GDPR data export');
    } finally {
      setDownloading(false);
    }
  };

  const handleUpdateConsent = async () => {
    setConsentUpdating(true);
    try {
      const res = await usersApi.updateConsent('2.0');
      if (res.success) {
        setConsentSuccess(true);
        refreshProfile();
      }
    } catch (err) {
      setError('Failed to update consent');
    } finally {
      setConsentUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm space-y-1">
        <span className="badge-primary text-[10px]">Data Sovereignty</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
          Privacy & Data Rights
        </h1>
        <p className="text-xs sm:text-sm text-neutral-text-secondary">
          Exercise your GDPR Article 20 data portability rights and manage terms of service consent.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* GDPR Export Card */}
        <div className="card-docyra p-8 space-y-6 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-text-primary">
                Export Complete Data Archive
              </h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                Download a structured, machine-readable JSON file containing your account profile, registered dependents, appointment history, reviews, waitlist entries, and security audit logs.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-bg border border-neutral-border text-[11px] text-neutral-text-secondary space-y-1">
              <p><strong>Format:</strong> Standard JSON (UTF-8)</p>
              <p><strong>Legal Framework:</strong> GDPR Article 20 &bull; HIPAA Alignment</p>
            </div>
          </div>

          <button
            onClick={handleExportData}
            disabled={downloading}
            className="btn-accent text-xs py-3 w-full justify-center"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Preparing Archive...' : 'Download JSON Data Export'}</span>
          </button>
        </div>

        {/* Consent & Terms Versioning */}
        <div className="card-docyra p-8 space-y-6 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-text-primary">
                Consent Versioning & Agreement
              </h3>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                View your current accepted terms version and timestamp of recorded consent.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-bg border border-neutral-border text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Accepted Terms:</span>
                <span className="font-bold text-neutral-text-primary">
                  Version {user?.acceptedTermsVersion || '1.0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-text-secondary">Consent Recorded:</span>
                <span className="font-semibold text-neutral-text-primary">
                  {user?.acceptedTermsAt ? format(new Date(user.acceptedTermsAt), 'MMM dd, yyyy') : 'On registration'}
                </span>
              </div>
            </div>

            {consentSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Consent refreshed to latest platform version 2.0.</span>
              </div>
            )}
          </div>

          <button
            onClick={handleUpdateConsent}
            disabled={consentUpdating}
            className="btn-outline text-xs py-3 w-full justify-center"
          >
            {consentUpdating ? 'Updating Consent...' : 'Re-confirm Terms & Privacy Consent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyDataPage;
