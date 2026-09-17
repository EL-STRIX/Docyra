import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  FileDown,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lock,
  Download
} from 'lucide-react';

export default function PrivacyData() {
  const { user, logout } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleExportData = async () => {
    try {
      setExporting(true);
      setErrorMsg('');
      const res = await apiClient.get('/users/me/export');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `docyra-patient-export-${user?._id || 'data'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Your personal data archive has been generated and downloaded.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to export your personal data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      setErrorMsg('Please type DELETE to confirm account deactivation.');
      return;
    }

    try {
      setDeleting(true);
      setErrorMsg('');
      await apiClient.delete('/users/me');
      alert('Your account has been deactivated per GDPR retention rules. You will now be logged out.');
      if (logout) await logout();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-docyra-text-primary">Privacy & GDPR Data Rights</h1>
        <p className="text-xs text-docyra-text-secondary mt-1">
          Export your complete healthcare record footprint or exercise your right to account deactivation
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GDPR Data Export Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-docyra-neutral-border shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold">
              <Download className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-docyra-text-primary">Download Data Archive</h3>
              <p className="text-xs text-docyra-text-secondary mt-1 leading-relaxed">
                Receive a complete machine-readable JSON export of your personal information, consultation history, dependent records, reviews, and audit logs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-2xs text-slate-500 space-y-1">
              <div>• Profile metadata & consent history</div>
              <div>• Complete appointment and clinic references</div>
              <div>• Registered family members / dependents</div>
              <div>• Verified reviews & feedback submissions</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="btn-primary text-xs flex items-center justify-center gap-2 w-full shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Generating JSON Archive...' : 'Download My Data (.JSON)'}
          </button>
        </div>

        {/* Account Deletion / Soft Delete Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-red-900">Deactivate Docyra Account</h3>
              <p className="text-xs text-docyra-text-secondary mt-1 leading-relaxed">
                Permanently disable your patient profile and remove your credentials. Completed clinical visit logs will be anonymized in compliance with healthcare data retention laws.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 text-2xs text-red-700">
              <span className="font-bold">Warning:</span> This action cannot be undone. All active upcoming appointments will be cancelled and waitlists removed.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Deactivate Account
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-docyra-text-primary">Confirm Account Deactivation</h3>
              <p className="text-xs text-docyra-text-secondary mt-1">
                To confirm you want to deactivate your account, please type <span className="font-mono font-bold text-red-600">DELETE</span> in the box below:
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                required
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 rounded-xl border border-red-200 text-center font-mono font-bold text-sm focus:ring-2 focus:ring-red-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {deleting ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
