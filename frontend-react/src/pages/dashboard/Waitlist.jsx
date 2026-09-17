import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Clock,
  Calendar,
  Building2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  BellRing,
  CalendarPlus,
  Zap
} from 'lucide-react';

export default function Waitlist() {
  const { socket } = useSocket();
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/waitlist/my');
      setWaitlist(res.data?.waitlist || []);
    } catch (err) {
      console.error('Failed to load waitlist:', err);
      setErrorMsg('Failed to load your waitlist entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  // Listen for waitlist slot notifications
  useEffect(() => {
    if (!socket) return;
    const handleSlotAvailable = (data) => {
      setSuccessMsg('⚡ A slot has opened up for your waitlist request! Claim it now.');
      fetchWaitlist();
    };

    socket.on('waitlist:slotAvailable', handleSlotAvailable);
    return () => {
      socket.off('waitlist:slotAvailable', handleSlotAvailable);
    };
  }, [socket]);

  const handleLeave = async (id) => {
    if (!window.confirm('Are you sure you want to leave this waitlist?')) return;
    try {
      setDeletingId(id);
      setErrorMsg('');
      await apiClient.delete(`/waitlist/${id}`);
      setSuccessMsg('You have been removed from the waitlist.');
      fetchWaitlist();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove waitlist entry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-docyra-text-primary">My Waitlist Entries</h1>
        <p className="text-xs text-docyra-text-secondary mt-1">
          FIFO automated queue that notifies you the second a cancelled slot opens up
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

      {/* Content */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-docyra-text-secondary mt-3">Loading waitlist entries...</p>
        </div>
      ) : waitlist.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-docyra-neutral-border text-center">
          <div className="w-16 h-16 rounded-full bg-docyra-primary-light text-docyra-primary flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-docyra-text-primary">No Active Waitlists</h3>
          <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto mt-1 mb-6">
            When a doctor has no available slots for your preferred date, you can join their waitlist. If another patient cancels, you'll be alerted immediately with a 30-minute priority window.
          </p>
          <Link to="/doctors" className="btn-primary text-xs inline-flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4" /> Browse Doctors
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {waitlist.map((item) => {
            const doctor = item.doctorId?.userId || {};
            const clinic = item.doctorId?.clinicId || {};
            const isNotified = item.status === 'notified';

            return (
              <div
                key={item._id}
                className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between space-y-4 transition-all ${
                  isNotified
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                    : 'border-docyra-neutral-border'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase ${
                        isNotified
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : item.status === 'claimed'
                          ? 'bg-blue-50 text-blue-700'
                          : item.status === 'expired'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {isNotified ? '⚡ Slot Available Now!' : item.status}
                    </span>

                    {item.status === 'active' && (
                      <button
                        onClick={() => handleLeave(item._id)}
                        disabled={deletingId === item._id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Leave Waitlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-docyra-text-primary">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <div className="text-xs text-docyra-text-secondary flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {clinic.name || 'Partner Clinic'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preferred Date:</span>
                      <span className="font-semibold text-docyra-text-primary">
                        {item.preferredDate ? new Date(item.preferredDate).toLocaleDateString() : 'Any Available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Joined Queue:</span>
                      <span className="text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {isNotified && (
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Claim window active:</span> You have a 30-minute window to claim the opened appointment slot before it goes to the next patient.
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  {isNotified ? (
                    <Link
                      to={`/book/${item.doctorId?._id || item.doctorId}`}
                      className="btn-accent text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Zap className="w-3.5 h-3.5" /> Claim Slot & Book Now
                    </Link>
                  ) : (
                    <span className="text-2xs text-slate-400">
                      We will notify you via email, SMS & push when a slot frees up.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
