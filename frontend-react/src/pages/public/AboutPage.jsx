import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, CheckCircle2, Lock, Clock, Users, ArrowRight } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="pt-12 pb-16 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Our Mission & Story
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-neutral-text-primary tracking-tight">
            Restoring Trust & Simplicity to Healthcare Booking
          </h1>
          <p className="text-lg sm:text-xl text-neutral-text-secondary leading-relaxed">
            Docyra was founded on a singular conviction: booking a medical appointment should never be a lottery of stale directories, ghost slots, or spammy aggregate search.
          </p>
        </div>
      </section>

      {/* The Docyra Problem / Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="badge-accent uppercase tracking-wider text-[11px]">
              Why We Are Different
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-text-primary tracking-tight">
              A Direct B2B Clinic Partnership Model
            </h2>
            <p className="text-sm sm:text-base text-neutral-text-secondary leading-relaxed">
              Traditional healthcare platforms rely on scraper-driven geo-search that lists unvetted doctors without clinic consent, resulting in incorrect availability and frustrating cancellations.
            </p>
            <p className="text-sm sm:text-base text-neutral-text-secondary leading-relaxed">
              At Docyra, we partner directly with licensed healthcare clinics and vetted independent practitioners. Every schedule is live, synchronized, and locked with database-level concurrency protection so your reserved slot is 100% yours.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-text-primary font-medium">
                  <strong>Zero Ghost Bookings:</strong> Every doctor schedule is managed in real-time by the clinic or physician.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-text-primary font-medium">
                  <strong>Strict Vetting:</strong> Independent practitioners upload verified medical registration licenses reviewed by Platform Admins.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-text-primary font-medium">
                  <strong>Full Patient Data Rights:</strong> Comprehensive GDPR Article 20 data portability and complete audit trails.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-border shadow-docyra-card space-y-6">
            <h3 className="text-xl font-bold text-neutral-text-primary border-b border-neutral-border pb-4">
              Core Architectural Pillars
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-text-primary">Atomic Transactions</h4>
                  <p className="text-xs text-neutral-text-secondary">Strict two-phase locking prevents double-booking concurrency races.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-brand-accent-hover shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-text-primary">Role-Based Clinic Isolation</h4>
                  <p className="text-xs text-neutral-text-secondary">Clinic Admins manage their own staff and view only their clinic&apos;s records.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-text-primary">HIPAA / GDPR Ready</h4>
                  <p className="text-xs text-neutral-text-secondary">Immutable audit logging on every PHI touchpoint with exportable user archives.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-text-primary">Family Dependent Care</h4>
                  <p className="text-xs text-neutral-text-secondary">Manage and book appointments seamlessly for children and elder dependents.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-primary rounded-3xl p-8 sm:p-14 text-white text-center space-y-6">
          <HeartPulse className="w-12 h-12 text-brand-accent mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto">
            Experience Healthcare Scheduling Built on Precision
          </h2>
          <p className="text-teal-100 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of patients and leading medical practitioners using Docyra every day.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/doctors" className="btn-accent px-8 py-3.5 text-sm">
              <span>Find a Doctor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/contact" className="btn-outline text-white bg-transparent border-white/30 hover:bg-white/10 hover:text-white px-7 py-3.5 text-sm">
              <span>Contact Our Team</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
