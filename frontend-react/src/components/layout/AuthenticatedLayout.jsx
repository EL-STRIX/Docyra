import { useState } from 'react';
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
} from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import useSocket from '../../context/useSocket.js';
import Logo from '../common/Logo.jsx';
import Footer from './Footer.jsx';

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const { notifications } = useSocket() || { notifications: [] };
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'My Appointments', path: '/dashboard', icon: Calendar },
    { name: 'Find Doctors', path: '/doctors', icon: Stethoscope },
    { name: 'Family Dependents', path: '/dependents', icon: Users },
    { name: 'My Reviews', path: '/reviews', icon: Star },
    { name: 'Waitlists', path: '/waitlist', icon: Clock },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: notifications.length },
    { name: 'Profile & 2FA', path: '/profile', icon: User },
    { name: 'Privacy & Data', path: '/privacy-data', icon: Lock },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-bg">
      {/* Top Authenticated Header */}
      <header className="bg-white border-b border-neutral-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo to="/dashboard" />
            <span className="hidden md:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-teal-100">
              Patient Portal
            </span>
          </div>

          {/* User Profile Summary & Logout */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/notifications"
              className="relative p-2 rounded-full text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse"></span>
              )}
            </Link>

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
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-accent"></span>
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
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-brand-accent text-neutral-text-primary">
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
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-accent text-neutral-text-primary">
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

      <Footer />
    </div>
  );
}

export default AuthenticatedLayout;
