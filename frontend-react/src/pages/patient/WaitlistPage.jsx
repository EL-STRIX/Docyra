import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, Calendar, AlertCircle, Plus, ArrowRight, Trash2 } from 'lucide-react';
import waitlistApi from '../../services/waitlist.api.js';
import doctorsApi from '../../services/doctors.api.js';

export function WaitlistPage() {
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId') || '';

  const [waitlists, setWaitlists] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showJoinModal, setShowJoinModal] = useState(!!preselectedDoctorId);
  const [doctorId, setDoctorId] = useState(preselectedDoctorId);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const [wRes, dRes] = await Promise.allSettled([
        waitlistApi.getMyWaitlists(),
        doctorsApi.getDoctors(),
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

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await waitlistApi.joinWaitlist({
        doctorId,
        desiredDateRangeStart: startDate,
        desiredDateRangeEnd: endDate,
      });

      if (res.success) {
        setShowJoinModal(false);
        loadData();
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
            const docUser = docObj.userId || {};
            const docName = docObj.name || docUser.name || 'Doctor';
            const spec = docObj.specializationId || {};
            const specName = docObj.specializationName || spec.name || 'Specialist';
            const clinic = docObj.clinicName || docObj.clinicId?.name || '';
            const isNotified = !!w.notifiedAt;

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
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
                      {docName.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-neutral-text-primary">{docName}</h3>
                      <p className="text-xs font-semibold text-brand-primary">
                        {specName} {clinic ? `• ${clinic}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-bg border border-neutral-border text-xs space-y-1">
                    <span className="text-[10px] font-bold text-neutral-text-secondary uppercase">
                      Desired Date Range
                    </span>
                    <div className="flex items-center gap-2 font-semibold text-neutral-text-primary">
                      <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                      <span>
                        {format(new Date(w.desiredDateRangeStart), 'MMM dd, yyyy')} &rarr;{' '}
                        {format(new Date(w.desiredDateRangeEnd), 'MMM dd, yyyy')}
                      </span>
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
                <label className="text-xs font-bold text-neutral-text-primary">Select Doctor</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                >
                  <option value="">Choose a physician...</option>
                  {doctors.map((doc) => {
                    const docName = doc.name || doc.userId?.name || 'Doctor';
                    const specName = doc.specializationName || doc.specializationId?.name || '';
                    const clinic = doc.clinicName || doc.clinicId?.name || '';
                    const details = [specName, clinic].filter(Boolean).join(' • ');
                    return (
                      <option key={doc._id} value={doc._id}>
                        {docName} {details ? `(${details})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
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
