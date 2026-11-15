import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, AlertCircle, Plus, ArrowRight, Trash2 } from 'lucide-react';
import waitlistApi from '../../services/waitlist.api.js';
import doctorsApi from '../../services/doctors.api.js';
import useSocket from '../../context/useSocket.js';

/**
 * Format doctor name ensuring professional "Dr." title
 */
const formatDoctorName = (doc) => {
  if (!doc) return 'Doctor';
  const rawName =
    doc.name ||
    (typeof doc.userId === 'object' && doc.userId !== null ? doc.userId.name : '') ||
    doc.doctorName ||
    '';
  if (!rawName) return 'Doctor';
  const trimmed = rawName.trim();
  if (/^(dr\.?|prof\.?)\s+/i.test(trimmed)) {
    return trimmed;
  }
  const title = (doc.title || 'Dr.').trim();
  return `${title} ${trimmed}`;
};

/**
 * Extract specialization and clinic details for dropdown subtitle
 */
const getDoctorSubtitle = (doc) => {
  const spec =
    doc.specializationName ||
    (typeof doc.specializationId === 'object' && doc.specializationId !== null ? doc.specializationId.name : '') ||
    '';
  const clinic =
    doc.clinicName ||
    (typeof doc.clinicId === 'object' && doc.clinicId !== null ? doc.clinicId.name : '') ||
    (doc.clinicAddress ? `Independent (${doc.clinicAddress})` : (doc.isIndependent ? 'Independent Practice' : ''));
  return [spec, clinic].filter(Boolean).join(' • ');
};

export function WaitlistPage() {
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId') || '';
  const { addNotification } = useSocket() || {};

  const [waitlists, setWaitlists] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showJoinModal, setShowJoinModal] = useState(!!preselectedDoctorId);
  const [doctorId, setDoctorId] = useState(preselectedDoctorId);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const [wRes, dRes] = await Promise.allSettled([
        waitlistApi.getMyWaitlists(),
        doctorsApi.getDoctors({ limit: 500, all: true }),
      ]);

      if (wRes.status === 'fulfilled' && wRes.value.success) {
        setWaitlists(wRes.value.data.waitlists || []);
      }
      if (dRes.status === 'fulfilled' && dRes.value.success) {
        setDoctors(dRes.value.data.doctors || []);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sort doctors alphabetically by name so user can quickly locate any doctor
  const sortedDoctors = useMemo(() => {
    return [...doctors].sort((a, b) => {
      const nameA = formatDoctorName(a).toLowerCase();
      const nameB = formatDoctorName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [doctors]);

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await waitlistApi.joinWaitlist({
        doctorId,
      });

      if (res.success) {
        setShowJoinModal(false);
        const selectedDoc = doctors.find((d) => d._id === doctorId);
        const docName = formatDoctorName(selectedDoc);
        loadData();
        if (addNotification) {
          addNotification({
            type: 'waitlist:joined',
            category: 'waitlist',
            title: 'Waitlist Joined',
            message: `You are queued for upcoming openings with ${docName}.`,
            link: '/waitlist',
            actionLabel: 'View Waitlist',
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to join waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWaitlist = async (id) => {
    if (!window.confirm('Are you sure you want to remove this doctor from your waitlist?')) {
      return;
    }
    setRemovingId(id);
    try {
      const res = await waitlistApi.cancelWaitlist(id);
      if (res.success) {
        setWaitlists((prev) => prev.filter((item) => item._id !== id));
        if (addNotification) {
          addNotification({
            type: 'waitlist:removed',
            category: 'waitlist',
            title: 'Waitlist Cancelled',
            message: 'You have left the waitlist for the requested doctor.',
            link: '/waitlist',
          });
        }
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove from waitlist');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="badge-primary text-[10px]">Priority Queue</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Waitlist Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Get automatically notified the moment an appointment slot opens up with your preferred doctor.
          </p>
        </div>

        <button
          onClick={() => setShowJoinModal(true)}
          className="btn-accent text-xs py-2.5 px-5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Join Doctor Waitlist</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-text-secondary">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading waitlist entries...</p>
        </div>
      ) : waitlists.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4">
          <Clock className="w-12 h-12 text-neutral-text-secondary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-text-primary">No Active Waitlists</h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              You are not currently in any doctor queues. If your preferred specialist has no immediate openings, join their waitlist.
            </p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-primary text-xs py-2 px-4 inline-flex"
          >
            Join a Waitlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {waitlists.map((w) => {
            const docObj = w.doctorId || {};
            const docUser = typeof docObj.userId === 'object' && docObj.userId !== null ? docObj.userId : {};
            const docName = formatDoctorName({
              name: docObj.name,
              userId: docUser,
              title: docObj.title,
            });
            const spec = typeof docObj.specializationId === 'object' && docObj.specializationId !== null ? docObj.specializationId : {};
            const specName = docObj.specializationName || spec.name || 'Specialist';
            const clinic = docObj.clinicName || (typeof docObj.clinicId === 'object' ? docObj.clinicId?.name : '') || (docObj.clinicAddress ? 'Independent Practice' : '');
            const isNotified = !!w.notifiedAt;
            const avatarInitial = docName.replace(/^(dr\.?|prof\.?)\s+/i, '').charAt(0) || 'D';

            return (
              <div
                key={w._id}
                className="card-docyra p-6 flex flex-col justify-between space-y-5 bg-white"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {isNotified ? (
                      <span className="badge-success text-[10px]">Slot Available - Claim Now!</span>
                    ) : (
                      <span className="badge-warning text-[10px]">Queue Active &bull; Waiting for Opening</span>
                    )}
                    <span className="text-[10px] text-neutral-text-secondary">
                      Joined {w.createdAt ? format(new Date(w.createdAt), 'MMM dd') : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-sm uppercase">
                      {avatarInitial}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-neutral-text-primary">{docName}</h3>
                      <p className="text-xs font-semibold text-brand-primary">
                        {specName} {clinic ? `• ${clinic}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-border flex items-center justify-between gap-3">
                  <Link
                    to={`/doctors/${docObj._id || w.doctorId}`}
                    className="btn-accent text-xs py-1.5 px-4"
                  >
                    <span>View Calendar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleRemoveWaitlist(w._id)}
                    disabled={removingId === w._id}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{removingId === w._id ? 'Removing...' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Waitlist Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-docyra-elevated animate-fadeIn">
            <h3 className="text-lg font-bold text-neutral-text-primary border-b border-neutral-border pb-3">
              Join Doctor Waitlist
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoinWaitlist} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">
                  Select Doctor ({sortedDoctors.length} Available)
                </label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                >
                  <option value="">Choose a physician...</option>
                  {sortedDoctors.map((doc) => {
                    const docName = formatDoctorName(doc);
                    const details = getDoctorSubtitle(doc);
                    return (
                      <option key={doc._id} value={doc._id}>
                        {docName} {details ? `(${details})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !doctorId}
                  className="btn-accent text-xs py-2 px-5"
                >
                  {submitting ? 'Joining Queue...' : 'Join Waitlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaitlistPage;
