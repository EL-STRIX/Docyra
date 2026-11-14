import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Star,
  Clock,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Lock,
  CheckCheck,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import useSocket from '../../context/useSocket.js';
import Logo from '../common/Logo.jsx';
import Footer from './Footer.jsx';
import ToastContainer from '../common/ToastContainer.jsx';

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
  } = useSocket() || {};

  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setBellDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'My Appointments', path: '/dashboard', icon: Calendar },
    { name: 'Find Doctors', path: '/doctors', icon: Stethoscope },
    { name: 'Family Dependents', path: '/dependents', icon: Users },
    { name: 'My Reviews', path: '/reviews', icon: Star },
    { name: 'Waitlists', path: '/waitlist', icon: Clock },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile & 2FA', path: '/profile', icon: User },
    { name: 'Privacy & Data', path: '/privacy-data', icon: Lock },
  ];

  const getDropdownIcon = (type, category) => {
    switch (type) {
      case 'appointment:created':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'appointment:cancelled':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'dependent:created':
      case 'dependent:deleted':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'profile:updated':
        return <User className="w-4 h-4 text-sky-600" />;
      case 'security:2fa_enabled':
      case 'security:2fa_disabled':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default:
        if (category === 'appointment') return <Calendar className="w-4 h-4 text-emerald-600" />;
        if (category === 'family') return <Users className="w-4 h-4 text-indigo-600" />;
        if (category === 'waitlist') return <Clock className="w-4 h-4 text-amber-600" />;
        return <Bell className="w-4 h-4 text-brand-primary" />;
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-bg">
      {/* Top Authenticated Header */}
      <header className="bg-white border-b border-neutral-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo to="/" />
            <span className="hidden md:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-teal-100">
              Patient Portal
            </span>
          </div>

          {/* User Profile Summary & Notification Bell */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setBellDropdownOpen(!bellDropdownOpen)}
                className={`relative p-2.5 rounded-full transition-colors ${
                  bellDropdownOpen
                    ? 'bg-brand-primary-light text-brand-primary'
                    : 'text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg'
                }`}
                title="Notifications"
                aria-label="Toggle notifications dropdown"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown Menu */}
              {bellDropdownOpen && (
                <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-2xl shadow-docyra-elevated border border-neutral-border overflow-hidden z-50 animate-fadeIn">
                  <div className="p-4 border-b border-neutral-border flex items-center justify-between bg-neutral-bg/60">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-neutral-text-primary">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          markAllAsRead?.();
                        }}
                        className="text-[11px] font-semibold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-border">
                    {recentNotifications.length === 0 ? (
                      <div className="p-8 text-center text-neutral-text-secondary space-y-1">
                        <Bell className="w-8 h-8 mx-auto text-neutral-border mb-2" />
                        <p className="text-xs font-semibold text-neutral-text-primary">No Notifications Yet</p>
                        <p className="text-[11px]">Updates regarding your bookings and profile will appear here.</p>
                      </div>
                    ) : (
                      recentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsRead?.(notif.id);
                            if (notif.link) {
                              navigate(notif.link);
                              setBellDropdownOpen(false);
                            }
                          }}
                          className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-neutral-bg ${
                            !notif.read ? 'bg-teal-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-neutral-bg border border-neutral-border shrink-0 mt-0.5">
                            {getDropdownIcon(notif.type, notif.category)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-xs font-bold text-neutral-text-primary truncate">
                                {notif.title}
                              </h5>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-text-secondary line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 bg-neutral-bg/60 border-t border-neutral-border text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setBellDropdownOpen(false)}
                      className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5"
                    >
                      <span>View All in Notifications Center</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-neutral-border"></div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-neutral-text-primary block truncate max-w-[130px]">
                  {user?.name || 'Patient'}
                </span>
                <span className="text-[10px] text-neutral-text-secondary truncate max-w-[130px] block">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors ml-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/notifications"
              className="relative p-2 text-neutral-text-secondary"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl text-neutral-text-secondary hover:text-brand-primary"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Sub-nav horizontal strip for Desktop */}
        <div className="hidden lg:block border-t border-neutral-border bg-white px-4 sm:px-6 lg:px-8">
          <nav className="max-w-7xl mx-auto flex items-center gap-6 h-12 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `text-xs font-bold transition-all py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-neutral-text-secondary hover:text-brand-primary'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                  {item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-neutral-border bg-white p-4 space-y-2 animate-fadeIn">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
                      isActive
                        ? 'bg-brand-primary-light text-brand-primary'
                        : 'text-neutral-text-secondary hover:bg-neutral-bg'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}

            <div className="pt-3 border-t border-neutral-border">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Authenticated Page Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Floating Real-Time Toast Container */}
      <ToastContainer />

      <Footer />
    </div>
  );
}

export default AuthenticatedLayout;
