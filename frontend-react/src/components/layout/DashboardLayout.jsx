import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Star,
  Clock,
  Bell,
  User,
  Shield,
  LogOut,
  Activity,
  Home,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'My Appointments', path: '/dashboard', icon: Calendar },
    { name: 'Dependents', path: '/dashboard/dependents', icon: Users },
    { name: 'My Reviews', path: '/dashboard/reviews', icon: Star },
    { name: 'Active Waitlist', path: '/dashboard/waitlist', icon: Clock },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: notifications.length },
    { name: 'Profile & Security', path: '/dashboard/profile', icon: User },
    { name: 'Privacy & Data (GDPR)', path: '/dashboard/privacy', icon: Shield }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col md:flex-row text-docyra-text-primary">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-docyra-neutral-border flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 px-3 py-2">
            <div className="w-9 h-9 rounded-xl bg-docyra-primary flex items-center justify-center text-white shadow-md">
              <Activity className="w-5 h-5 text-docyra-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-docyra-primary tracking-tight font-sans">
                Docyra
              </span>
              <span className="text-[10px] text-docyra-text-secondary font-semibold uppercase -mt-1">
                Patient Portal
              </span>
            </div>
          </Link>

          {/* User Profile Summary */}
          <div className="px-3 py-3 rounded-2xl bg-stone-50 border border-stone-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-docyra-primary text-white flex items-center justify-center font-bold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-docyra-text-primary truncate">{user?.name || 'Patient'}</p>
              <p className="text-[11px] text-stone-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-docyra-primary text-white shadow-md shadow-docyra-primary/20'
                      : 'text-docyra-text-secondary hover:bg-stone-100 hover:text-docyra-primary'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white text-docyra-primary' : 'bg-docyra-accent text-stone-900'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-stone-100 space-y-1">
          <Link
            to="/"
            className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-docyra-text-secondary hover:bg-stone-100 hover:text-docyra-primary"
          >
            <Home className="w-4 h-4" />
            <span>Public Home</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-docyra-neutral-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <span>Patient Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-docyra-text-primary capitalize">
              {location.pathname.replace('/dashboard', '').replace('/', '') || 'Appointments'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/doctors"
              className="btn-accent text-xs py-2 px-4 shadow-sm flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book New Appointment</span>
            </Link>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
