import useSocket from '../../context/useSocket.js';
import { Bell, Calendar, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function NotificationsPage() {
  const { notifications, clearNotifications } = useSocket() || {
    notifications: [],
    clearNotifications: () => {},
  };

  const getIcon = (type) => {
    switch (type) {
      case 'appointment:created':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'appointment:statusChanged':
        return <Clock className="w-5 h-5 text-brand-primary" />;
      case 'appointment:cancelled':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'waitlist:slotAvailable':
        return <Calendar className="w-5 h-5 text-brand-accent" />;
      default:
        return <Bell className="w-5 h-5 text-brand-primary" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="badge-primary text-[10px]">Real-Time Feed</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Live updates regarding your appointment bookings, cancellations, and waitlist claims.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="btn-outline text-xs py-2 px-3.5 text-neutral-text-secondary hover:text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Feed</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4">
          <Bell className="w-12 h-12 text-neutral-text-secondary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-text-primary">No New Notifications</h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              Real-time socket alerts and appointment reminders will appear here live during your session.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card-docyra p-5 flex items-start gap-4 bg-white border border-neutral-border animate-fadeIn"
            >
              <div className="p-2.5 rounded-xl bg-neutral-bg border border-neutral-border shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-neutral-text-primary">{n.title}</h4>
                  <span className="text-[10px] text-neutral-text-secondary">
                    {format(new Date(n.timestamp), 'hh:mm a')}
                  </span>
                </div>
                <p className="text-xs text-neutral-text-secondary leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
