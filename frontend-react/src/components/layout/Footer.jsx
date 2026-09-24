import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, HeartHandshake, ArrowUpRight } from 'lucide-react';
import Logo from '../common/Logo.jsx';

export function Footer() {
  return (
    <footer className="bg-brand-primary text-white pt-16 pb-12 border-t border-teal-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-teal-800/80">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Logo isLight className="text-white" />
            <p className="text-sm text-teal-100/90 leading-relaxed max-w-sm">
              Docyra is a next-generation healthcare platform connecting patients directly with vetted partner clinics and licensed specialists. Built on real-time atomic scheduling with zero double-booking risk.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/60 border border-teal-700/60 text-xs text-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
                <span>Vetted Clinics</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/60 border border-teal-700/60 text-xs text-teal-200">
                <Lock className="w-3.5 h-3.5 text-brand-accent" />
                <span>GDPR & HIPAA Aligned</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Discovery
            </h4>
            <ul className="space-y-2 text-sm text-teal-100">
              <li>
                <Link to="/clinics" className="hover:text-white transition-colors">
                  Partner Clinics
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-white transition-colors">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link to="/specializations" className="hover:text-white transition-colors">
                  Medical Specializations
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Health Articles
                </Link>
              </li>
            </ul>
          </div>

          {/* Clinicians & Partners */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              For Practitioners
            </h4>
            <ul className="space-y-2 text-sm text-teal-100">
              <li>
                <Link to="/doctors/apply" className="hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>Doctor Application</span>
                  <ArrowUpRight className="w-3 h-3 text-brand-accent" />
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Clinic Onboarding Inquiry
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:4200"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Doctor & Clinic Portal</span>
                  <ArrowUpRight className="w-3 h-3 text-brand-accent" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-sm text-teal-100">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Our Mission
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-teal-200/80">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand-accent" />
            <span>&copy; {new Date().getFullYear()} Docyra Healthcare Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Scheduling Network: Active
            </span>
            <span>Default Locale: INR (₹)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
