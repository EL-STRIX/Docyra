import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Calendar, User, Stethoscope } from 'lucide-react';
import Logo from '../common/Logo.jsx';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Clinics', path: '/clinics' },
    { name: 'Doctors', path: '/doctors' },
    { name: 'Specializations', path: '/specializations' },
    { name: 'Articles', path: '/blog' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-neutral-border sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Logo />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'text-brand-primary'
                    : 'text-neutral-text-secondary hover:text-brand-primary'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Right CTA / Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/doctors/apply"
            className="text-xs font-semibold text-neutral-text-secondary hover:text-brand-primary px-3 py-2 rounded-full hover:bg-brand-primary-light transition-colors flex items-center gap-1.5"
          >
            <Stethoscope className="w-3.5 h-3.5 text-brand-primary" />
            <span>Join as Doctor</span>
          </Link>
          <Link
            to="/login"
            className="btn-outline text-sm py-2 px-4.5"
          >
            <User className="w-4 h-4 text-brand-primary" />
            <span>Sign In</span>
          </Link>
          <Link
            to="/doctors"
            className="btn-accent text-sm py-2 px-5"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Now</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/doctors"
            className="btn-accent text-xs py-1.5 px-3 md:hidden"
          >
            Book
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-neutral-text-secondary hover:text-brand-primary hover:bg-brand-primary-light transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-neutral-border bg-white px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-primary-light text-brand-primary font-semibold'
                      : 'text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          <div className="pt-3 border-t border-neutral-border flex flex-col gap-2.5">
            <Link
              to="/doctors/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-outline w-full justify-center text-sm py-2.5"
            >
              <Stethoscope className="w-4 h-4 text-brand-primary" />
              Apply as Independent Doctor
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-outline w-full justify-center text-sm py-2.5"
            >
              <User className="w-4 h-4 text-brand-primary" />
              Sign In to Patient Portal
            </Link>
            <Link
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-accent w-full justify-center text-sm py-2.5"
            >
              <Calendar className="w-4 h-4" />
              Find & Book Doctor
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
