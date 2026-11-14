import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  User,
  ShieldCheck,
  Star,
  Bell,
  X,
  ExternalLink,
} from 'lucide-react';
import useSocket from '../../context/useSocket.js';

export function ToastContainer() {
  const { toasts, dismissToast } = useSocket() || { toasts: [], dismissToast: () => {} };

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type, category) => {
    switch (type) {
      case 'appointment:created':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'appointment:cancelled':
        return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'appointment:statusChanged':
        return <Clock className="w-5 h-5 text-teal-600 shrink-0" />;
      case 'waitlist:slotAvailable':
      case 'waitlist:joined':
        return <Clock className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'dependent:created':
      case 'dependent:deleted':
        return <Users className="w-5 h-5 text-indigo-600 shrink-0" />;
      case 'profile:updated':
      case 'profile:consent_updated':
        return <User className="w-5 h-5 text-sky-600 shrink-0" />;
      case 'security:2fa_enabled':
      case 'security:2fa_disabled':
      case 'security:tip':
        return <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />;
      case 'review:submitted':
        return <Star className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        if (category === 'appointment') return <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />;
        if (category === 'family') return <Users className="w-5 h-5 text-indigo-600 shrink-0" />;
        if (category === 'security') return <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />;
        return <Bell className="w-5 h-5 text-brand-primary shrink-0" />;
    }
  };

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'appointment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'family':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'security':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'profile':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'waitlist':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'review':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white rounded-2xl p-4 shadow-docyra-elevated border border-neutral-border flex items-start gap-3 animate-slideInRight transition-all duration-200 hover:shadow-lg"
          role="alert"
        >
          <div className="p-2 rounded-xl bg-neutral-bg border border-neutral-border shrink-0 mt-0.5">
            {getIcon(toast.type, toast.category)}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(
                  toast.category
                )}`}
              >
                {toast.category || 'Alert'}
              </span>
              <span className="text-[10px] text-neutral-text-secondary">Just now</span>
            </div>

            <h4 className="text-xs font-bold text-neutral-text-primary truncate">
              {toast.title}
            </h4>
            <p className="text-[11px] text-neutral-text-secondary leading-snug line-clamp-2">
              {toast.message}
            </p>

            {toast.link && (
              <div className="pt-1">
                <Link
                  to={toast.link}
                  onClick={() => dismissToast(toast.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:text-brand-primary-hover underline underline-offset-2"
                >
                  <span>{toast.actionLabel || 'View details'}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-neutral-text-secondary hover:text-neutral-text-primary rounded-lg hover:bg-neutral-bg transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
