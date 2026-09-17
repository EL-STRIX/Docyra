import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Activity,
  Bell
} from 'lucide-react';

export const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Clinics', path: '/clinics' },
    { name: 'Doctors', path: '/doctors' },
    { name: 'Specializations', path: '/specializations' },
    { name: 'About', path: '/about' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-docyra-neutral-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-docyra-primary flex items-center justify-center text-white shadow-md shadow-docyra-primary/20 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-6 h-6 text-docyra-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-docyra-primary tracking-tight font-sans">
                Docyra
              </span>
              <span className="text-[10px] text-docyra-text-secondary font-medium tracking-wide uppercase -mt-1">
                Verified Care
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                  isActive(link.path)
                    ? 'bg-docyra-primary-light text-docyra-primary font-semibold'
                    : 'text-docyra-text-secondary hover:text-docyra-primary hover:bg-stone-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3.5">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full hover:bg-stone-100 transition-colors border border-docyra-neutral-border focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-docyra-primary text-white flex items-center justify-center font-semibold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-docyra-text-primary max-w-[120px] truncate">
                    {user.name || 'Account'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-docyra-text-secondary" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-docyra-neutral-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs text-docyra-text-secondary">Signed in as</p>
                      <p className="text-sm font-semibold text-docyra-text-primary truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-docyra-text-secondary hover:text-docyra-primary hover:bg-docyra-primary-light/50 font-medium"
                    >
                      <Calendar className="w-4 h-4 mr-2.5 text-docyra-primary" />
                      My Appointments
                    </Link>

                    <Link
                      to="/dashboard/dependents"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-docyra-text-secondary hover:text-docyra-primary hover:bg-docyra-primary-light/50 font-medium"
                    >
                      <User className="w-4 h-4 mr-2.5 text-docyra-primary" />
                      Dependents
                    </Link>

                    <Link
                      to="/dashboard/notifications"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-docyra-text-secondary hover:text-docyra-primary hover:bg-docyra-primary-light/50 font-medium"
                    >
                      <Bell className="w-4 h-4 mr-2.5 text-docyra-primary" />
                      Notifications
                    </Link>

                    <div className="border-t border-stone-100 my-1"></div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      <LogOut className="w-4 h-4 mr-2.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-docyra-text-primary hover:text-docyra-primary px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-docyra-primary hover:bg-docyra-primary-light px-4 py-2 rounded-full border border-docyra-primary/30 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}

            <Link
              to="/doctors"
              className="btn-accent text-sm flex items-center space-x-1.5 !py-2.5 shadow-md hover:shadow-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-docyra-text-secondary hover:text-docyra-primary hover:bg-stone-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-docyra-neutral-border bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  isActive(link.path)
                    ? 'bg-docyra-primary-light text-docyra-primary font-semibold'
                    : 'text-docyra-text-secondary hover:bg-stone-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-docyra-primary hover:bg-docyra-primary-light rounded-lg"
                >
                  My Appointments
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-full border border-docyra-neutral-border text-sm font-semibold text-docyra-text-primary"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-full bg-docyra-primary text-white text-sm font-semibold"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <Link
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-accent w-full text-center flex items-center justify-center space-x-2 mt-3"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
