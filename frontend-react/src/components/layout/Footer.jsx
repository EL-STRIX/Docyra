import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Heart, Lock, Mail, ArrowRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#0B3D3D] text-white pt-16 pb-12 border-t border-docyra-primary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Newsletter / Trust Strip */}
        <div className="bg-docyra-primary/60 backdrop-blur-md rounded-3xl p-8 mb-16 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center lg:text-left">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center lg:justify-start gap-2">
              <ShieldCheck className="w-6 h-6 text-docyra-accent" />
              Verified Clinic Healthcare Network
            </h3>
            <p className="text-sm text-stone-200">
              Only verified medical clinics and licensed practitioners are onboarded onto Docyra.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <input
                type="email"
                placeholder="Enter your email for health updates"
                className="w-full pl-4 pr-10 py-3 rounded-full bg-white/10 text-white placeholder-stone-300 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-docyra-accent"
              />
              <Mail className="w-4 h-4 text-stone-300 absolute right-4 top-3.5" />
            </div>
            <button className="btn-accent text-sm w-full sm:w-auto flex items-center justify-center space-x-1.5 py-3 whitespace-nowrap">
              <span>Subscribe</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Footer Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 pb-12 border-b border-white/10 text-sm">
          {/* Brand Info */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                <Activity className="w-6 h-6 text-docyra-accent" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Docyra</span>
            </Link>
            <p className="text-stone-300 text-sm leading-relaxed max-w-sm">
              The premier clinic-partnered doctor appointment platform. Connecting patients with verified medical centers, specialists, and transparent scheduling.
            </p>
            <div className="flex items-center space-x-4 pt-2 text-stone-300">
              <div className="flex items-center space-x-1 text-xs">
                <Lock className="w-3.5 h-3.5 text-docyra-accent" />
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Providers</span>
              </div>
            </div>
          </div>

          {/* Discovery */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-docyra-accent uppercase tracking-wider">Discovery</h4>
            <ul className="space-y-2 text-stone-300">
              <li><Link to="/clinics" className="hover:text-white transition-colors">Find a Clinic</Link></li>
              <li><Link to="/doctors" className="hover:text-white transition-colors">Find a Doctor</Link></li>
              <li><Link to="/specializations" className="hover:text-white transition-colors">All Specializations</Link></li>
              <li><Link to="/doctors/apply" className="hover:text-white transition-colors">Doctor Partnership</Link></li>
            </ul>
          </div>

          {/* About & Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-docyra-accent uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-stone-300">
              <li><Link to="/about" className="hover:text-white transition-colors">About Docyra</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Health & Articles</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><a href="https://portal.docyra.app" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Doctor / Clinic Portal ↗</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-docyra-accent uppercase tracking-wider">Legal & Trust</h4>
            <ul className="space-y-2 text-stone-300">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">GDPR Data Rights</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Security Disclosures</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>© {new Date().getFullYear()} Docyra Technologies Inc. All rights reserved.</p>
          <div className="flex items-center space-x-1">
            <span>Built with care for patients & healthcare providers</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 inline fill-rose-400" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
