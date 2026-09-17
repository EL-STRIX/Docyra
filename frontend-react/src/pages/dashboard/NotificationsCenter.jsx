import React from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Zap,
  Trash2,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function NotificationsCenter() {
  const { notifications, clearNotifications } = useSocket();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-docyra-text-primary">Notifications Center</h1>
          <p className="text-xs text-docyra-text-secondary mt-1">
            Real-time alerts, appointment reminders, and waitlist slot triggers
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-docyra-neutral-border text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-docyra-text-primary">No Notifications Yet</h3>
          <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto mt-1">
            You will receive instant real-time alerts here when appointment confirmations, reminders, status updates, or waitlist slots are triggered.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-docyra-neutral-border shadow-sm divide-y divide-docyra-neutral-border overflow-hidden">
          {notifications.map((notif, index) => {
            const isWaitlist = notif.type === 'waitlist:slotAvailable';
            const isCancelled = notif.type === 'appointment:cancelled';

            return (
              <div
                key={index}
                className="p-5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isWaitlist
                        ? 'bg-emerald-100 text-emerald-600'
                        : isCancelled
                        ? 'bg-red-100 text-red-600'
                        : 'bg-docyra-primary-light text-docyra-primary'
                    }`}
                  >
                    {isWaitlist ? (
                      <Zap className="w-5 h-5" />
                    ) : isCancelled ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-docyra-text-primary">{notif.title}</div>
                    <p className="text-xs text-docyra-text-secondary mt-0.5">
                      {typeof notif.data === 'string'
                        ? notif.data
                        : notif.data?.message || 'Update on your clinical appointment schedule.'}
                    </p>
                    <div className="text-2xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.time ? new Date(notif.time).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Link
                    to={isWaitlist ? '/dashboard/waitlist' : '/dashboard'}
                    className="p-2 rounded-xl text-docyra-primary hover:bg-docyra-primary-light transition-colors inline-block"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
