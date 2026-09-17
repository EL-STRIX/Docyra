import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  User,
  Building2,
  CalendarPlus,
  AlertCircle,
  FileDown,
  XCircle,
  Star,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  BellRing
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ upcoming: 0, completed: 0, cancelled: 0, total: 0 });
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/appointments/my');
      const data = res.data?.appointments || [];
      setAppointments(data);

      const upcoming = data.filter((a) => ['booked', 'confirmed'].includes(a.status)).length;
      const completed = data.filter((a) => a.status === 'completed').length;
      const cancelled = data.filter((a) => ['cancelled_by_patient', 'cancelled_by_doctor', 'cancelled_by_admin', 'cancelled_emergency'].includes(a.status)).length;

      setStats({
        upcoming,
        completed,
        cancelled,
        total: data.length
      });
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setErrorMsg('Failed to load your appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchAppointments();
    };

    socket.on('appointment:created', handleUpdate);
    socket.on('appointment:statusChanged', handleUpdate);
    socket.on('appointment:cancelled', handleUpdate);

    return () => {
      socket.off('appointment:created', handleUpdate);
      socket.off('appointment:statusChanged', handleUpdate);
      socket.off('appointment:cancelled', handleUpdate);
    };
  }, [socket]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingId) return;

    try {
      setSubmittingCancel(true);
      setErrorMsg('');
      await apiClient.patch(`/appointments/${cancellingId}/cancel`, {
        cancellationReason: cancelReason || 'Cancelled by patient from dashboard'
      });
      setSuccessMsg('Appointment cancelled successfully.');
      setCancellingId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel appointment. You may be past the allowed cancellation window.';
      setErrorMsg(msg);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleDownloadIcs = (id) => {
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/appointments/${id}/ics`;
    window.open(url, '_blank');
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'upcoming') return ['booked', 'confirmed'].includes(apt.status);
    if (filter === 'completed') return apt.status === 'completed';
    if (filter === 'cancelled') return apt.status.startsWith('cancelled') || apt.status === 'rejected';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-docyra-primary to-docyra-primary-dark rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-3">
              Patient Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.firstName || 'Patient'}!
            </h1>
            <p className="text-docyra-primary-light/90 text-sm mt-2 max-w-xl">
              Track your upcoming clinical visits, consult records, and manage doctor appointments in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-docyra-accent hover:bg-docyra-accent-hover text-white font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <CalendarPlus className="w-4 h-4" /> Book Appointment
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-docyra-text-primary">{stats.upcoming}</div>
            <div className="text-xs font-medium text-docyra-text-secondary">Upcoming Appointments</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-docyra-text-primary">{stats.completed}</div>
            <div className="text-xs font-medium text-docyra-text-secondary">Completed Visits</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-docyra-text-primary">{stats.total}</div>
            <div className="text-xs font-medium text-docyra-text-secondary">Total Bookings</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-docyra-text-primary">{stats.cancelled}</div>
            <div className="text-xs font-medium text-docyra-text-secondary">Cancelled / Missed</div>
          </div>
        </div>
      </div>

      {/* Appointments List Section */}
      <div className="bg-white rounded-2xl border border-docyra-neutral-border shadow-sm overflow-hidden">
        {/* Header & Tabs */}
        <div className="p-6 border-b border-docyra-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-docyra-text-primary">Your Appointments</h2>
            <p className="text-xs text-docyra-text-secondary mt-1">
              Synchronized real-time schedule with partner clinics
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'upcoming', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filter === tab
                    ? 'bg-docyra-primary text-white shadow-sm'
                    : 'bg-docyra-neutral-bg text-docyra-text-secondary hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={fetchAppointments}
              className="p-2 rounded-xl bg-docyra-neutral-bg hover:bg-slate-200 text-docyra-text-secondary transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-docyra-text-secondary mt-3">Loading your appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-docyra-neutral-bg text-docyra-text-secondary flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-bold text-docyra-text-primary">No appointments found</h3>
            <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto mt-1 mb-6">
              {filter === 'upcoming'
                ? "You don't have any scheduled upcoming visits."
                : 'No appointments match the selected filter.'}
            </p>
            <Link to="/doctors" className="btn-primary text-xs inline-flex items-center gap-1.5">
              <CalendarPlus className="w-4 h-4" /> Book New Appointment
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-docyra-neutral-border">
            {filteredAppointments.map((apt) => {
              const doctor = apt.doctorSnapshot || apt.doctorId;
              const clinic = apt.clinicSnapshot || apt.clinicId;
              const slot = apt.slotId || {};
              const slotStart = slot.slotStart ? new Date(slot.slotStart) : null;
              const isUpcoming = ['booked', 'confirmed'].includes(apt.status);
              const isCompleted = apt.status === 'completed';

              return (
                <div
                  key={apt._id}
                  className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-docyra-primary-light text-docyra-primary flex-shrink-0 flex items-center justify-center font-bold text-lg border border-docyra-primary/20">
                      {doctor?.fullName ? doctor.fullName.charAt(0) : 'D'}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-docyra-text-primary">
                          {doctor?.fullName || 'Doctor'}
                        </span>
                        <Badge status={apt.status} />
                        {apt.dependentSnapshot?.fullName && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-2xs font-semibold">
                            For: {apt.dependentSnapshot.fullName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-docyra-text-secondary flex-wrap">
                        <div className="flex items-center gap-1 font-medium text-docyra-primary">
                          <Building2 className="w-3.5 h-3.5" />
                          {clinic?.name || 'Partner Clinic'}
                        </div>
                        {slotStart && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {slotStart.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}{' '}
                            at{' '}
                            {slotStart.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>

                      {apt.reason && (
                        <p className="text-xs text-docyra-text-secondary italic line-clamp-1">
                          "{apt.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                    <button
                      onClick={() => handleDownloadIcs(apt._id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-docyra-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Add to Google / Apple Calendar"
                    >
                      <FileDown className="w-3.5 h-3.5" /> .ics
                    </button>

                    <Link
                      to={`/dashboard/appointments/${apt._id}`}
                      className="px-4 py-2 rounded-xl bg-docyra-primary-light hover:bg-docyra-primary/20 text-docyra-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    {isCompleted && !apt.hasReview && (
                      <Link
                        to={`/dashboard/appointments/${apt._id}?action=review`}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Review
                      </Link>
                    )}

                    {isUpcoming && (
                      <button
                        onClick={() => setCancellingId(apt._id)}
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-docyra-text-primary">Cancel Appointment</h3>
              <p className="text-xs text-docyra-text-secondary mt-1">
                Are you sure you want to cancel this booking? Once cancelled, the slot will be released to patients on the waitlist.
              </p>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase tracking-wider mb-1.5">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  required
                  placeholder="e.g. Schedule conflict, feeling better, or needing to reschedule..."
                  className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingId(null)}
                  disabled={submittingCancel}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-docyra-text-primary text-xs font-semibold"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
