import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Users,
  User,
  ShieldCheck,
  Star,
  CheckCheck,
  ExternalLink,
  Inbox,
  Filter,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import useSocket from '../../context/useSocket.js';

export function NotificationsPage() {
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useSocket() || {};

  const [activeTab, setActiveTab] = useState('all');

  const getIcon = (type, category) => {
    switch (type) {
      case 'appointment:created':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'appointment:cancelled':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'appointment:statusChanged':
        return <Clock className="w-5 h-5 text-teal-600" />;
      case 'appointment:reminder':
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      case 'waitlist:slotAvailable':
      case 'waitlist:joined':
      case 'waitlist:removed':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'dependent:created':
      case 'dependent:deleted':
        return <Users className="w-5 h-5 text-indigo-600" />;
      case 'profile:updated':
      case 'profile:consent_updated':
        return <User className="w-5 h-5 text-sky-600" />;
      case 'security:2fa_enabled':
      case 'security:2fa_disabled':
      case 'security:tip':
      case 'gdpr:exported':
        return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case 'review:submitted':
        return <Star className="w-5 h-5 text-amber-500" />;
      default:
        if (category === 'appointment') return <Calendar className="w-5 h-5 text-emerald-600" />;
        if (category === 'family') return <Users className="w-5 h-5 text-indigo-600" />;
        if (category === 'security') return <ShieldCheck className="w-5 h-5 text-purple-600" />;
        if (category === 'profile') return <User className="w-5 h-5 text-sky-600" />;
        if (category === 'waitlist') return <Clock className="w-5 h-5 text-amber-600" />;
        return <Bell className="w-5 h-5 text-brand-primary" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'appointment':
        return { label: 'Appointment', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'family':
        return { label: 'Family Profile', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'security':
        return { label: 'Security & Privacy', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'profile':
        return { label: 'Personal Profile', style: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'waitlist':
        return { label: 'Waitlist', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'review':
        return { label: 'Feedback', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'System Alert', style: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
  };

  const formatTimestamp = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return `Today at ${format(date, 'hh:mm a')}`;
      }
      if (isYesterday(date)) {
        return `Yesterday at ${format(date, 'hh:mm a')}`;
      }
      return format(date, 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'Recent';
    }
  };

  // Filter tabs logic
  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'appointment') return notif.category === 'appointment';
    if (activeTab === 'family') return notif.category === 'family';
    if (activeTab === 'account') return notif.category === 'profile' || notif.category === 'security';
    if (activeTab === 'waitlist') return notif.category === 'waitlist' || notif.category === 'review';
    return true;
  });

  const appointmentCount = notifications.filter((n) => n.category === 'appointment').length;
  const familyCount = notifications.filter((n) => n.category === 'family').length;
  const accountCount = notifications.filter((n) => n.category === 'profile' || n.category === 'security').length;
  const waitlistCount = notifications.filter((n) => n.category === 'waitlist' || n.category === 'review').length;

  const tabs = [
    { id: 'all', label: 'All Alerts', count: notifications.length },
    { id: 'appointment', label: 'Appointments', count: appointmentCount },
    { id: 'family', label: 'Family Members', count: familyCount },
    { id: 'account', label: 'Profile & Security', count: accountCount },
    { id: 'waitlist', label: 'Waitlist & Reviews', count: waitlistCount },
    { id: 'unread', label: 'Unread', count: unreadCount },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge-primary text-[10px]">Real-Time Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary max-w-xl">
            Live updates for appointments, family members, profile changes, and doctor waitlists.
          </p>
        </div>

        {/* Global Feed Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
            >
              <CheckCheck className="w-4 h-4 text-brand-primary" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your notifications feed?')) {
                  clearNotifications();
                }
              }}
              className="btn-outline text-xs py-2 px-3.5 text-neutral-text-secondary hover:text-rose-600 hover:border-rose-200 flex items-center gap-1.5 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="p-1 rounded-2xl bg-white border border-neutral-border flex items-center gap-1 shrink-0 shadow-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-text-secondary hover:text-neutral-text-primary hover:bg-neutral-bg'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-neutral-bg text-neutral-text-secondary'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification Cards List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-neutral-bg border border-neutral-border flex items-center justify-center mx-auto text-neutral-text-secondary">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-text-primary">
              {activeTab === 'unread' ? 'All Caught Up!' : 'No Notifications in this Category'}
            </h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              {activeTab === 'unread'
                ? 'You have read all your alerts. New updates will appear here live during your session.'
                : 'Any activity related to this category will automatically populate here.'}
            </p>
          </div>
          {activeTab !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="btn-outline text-xs py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Show All Notifications</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const badge = getCategoryBadge(notif.category);
            return (
              <div
                key={notif.id}
                className={`card-docyra p-5 sm:p-6 bg-white border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 animate-fadeIn ${
                  !notif.read
                    ? 'border-brand-primary/40 bg-teal-50/20 shadow-sm'
                    : 'border-neutral-border hover:border-neutral-border/80'
                }`}
              >
                {/* Left icon & content */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-3 rounded-2xl bg-neutral-bg border border-neutral-border shrink-0 mt-0.5">
                    {getIcon(notif.type, notif.category)}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.style}`}
                      >
                        {badge.label}
                      </span>

                      {!notif.read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                          <span>Unread</span>
                        </span>
                      )}

                      <span className="text-[11px] text-neutral-text-secondary ml-auto sm:ml-0">
                        {formatTimestamp(notif.timestamp)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-text-primary">{notif.title}</h4>
                    <p className="text-xs text-neutral-text-secondary leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Action button if link provided */}
                    {notif.link && (
                      <div className="pt-2">
                        <Link
                          to={notif.link}
                          onClick={() => markAsRead?.(notif.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary-light/60 hover:bg-brand-primary-light px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <span>{notif.actionLabel || 'View Details'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right individual controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1 sm:pt-0">
                  {!notif.read ? (
                    <button
                      type="button"
                      onClick={() => markAsRead?.(notif.id)}
                      className="p-2 text-neutral-text-secondary hover:text-brand-primary hover:bg-brand-primary-light rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Mark as Read"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                      <span className="text-[11px] hidden sm:inline">Read</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => deleteNotification?.(notif.id)}
                    className="p-2 text-neutral-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
