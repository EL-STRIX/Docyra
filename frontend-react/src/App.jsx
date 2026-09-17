import { useEffect, useState } from 'react';
import apiClient from './services/apiClient';
import { ShieldCheck, Clock, Award, Building2, ChevronRight } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/health')
      .then(res => {
        setHealth(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Health check failed:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-docyra-neutral-bg">
      {/* Navigation */}
      <header className="bg-white border-b border-docyra-neutral-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-docyra-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
              D
            </div>
            <div>
              <span className="text-2xl font-bold text-docyra-primary tracking-tight">Docyra</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-docyra-primary-light text-docyra-primary">
                Clinic Network
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-docyra-text-secondary">
            <a href="#clinics" className="hover:text-docyra-primary transition-colors">Clinics</a>
            <a href="#doctors" className="hover:text-docyra-primary transition-colors">Doctors</a>
            <a href="#specializations" className="hover:text-docyra-primary transition-colors">Specializations</a>
            <a href="#about" className="hover:text-docyra-primary transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold text-docyra-primary hover:text-docyra-primary-dark">
              Sign In
            </a>
            <a href="#book" className="btn-accent text-sm flex items-center gap-1.5">
              Book Appointment <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 hero-gradient">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-docyra-primary-light border border-docyra-primary/20 text-docyra-primary text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4" /> Verified Partner Clinics Only
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-docyra-text-primary leading-tight mb-6">
              Find your clinic. <br />
              <span className="text-docyra-primary">Book your care in minutes.</span>
            </h1>
            <p className="text-lg text-docyra-text-secondary leading-relaxed mb-8 max-w-2xl">
              Docyra connects you directly with verified healthcare clinics and independent practitioners. Guaranteed scheduled slots with zero double-booking.
            </p>

            {/* Quick Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-docyra-neutral-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-docyra-primary-light text-docyra-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-docyra-text-primary">100% Vetted</div>
                  <div className="text-xs text-docyra-text-secondary">Onboarded Clinics</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-docyra-accent">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-docyra-text-primary">Real-Time</div>
                  <div className="text-xs text-docyra-text-secondary">Fixed Duration Slots</div>
                </div>
              </div>

              <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-docyra-success">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-docyra-text-primary">
                    {loading ? 'Checking...' : health?.status === 'healthy' ? 'API Online' : 'API Standby'}
                  </div>
                  <div className="text-xs text-docyra-text-secondary">Backend System v1.0</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-docyra-neutral-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-docyra-text-secondary">
          Docyra Clinic Appointment Booking Platform &copy; {new Date().getFullYear()}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
