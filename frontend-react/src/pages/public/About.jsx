import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, Building2, Award, CheckCircle2 } from 'lucide-react';
import Badge from '../../components/common/Badge';

export const About = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">About Docyra</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Transforming Clinic Healthcare Access
        </h1>
        <p className="text-lg text-docyra-text-secondary leading-relaxed">
          Docyra was created to solve healthcare fragmentation. We partner directly with certified medical clinics to bring verified doctor schedules to patients transparently and securely.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card-docyra p-8 sm:p-10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-docyra-text-primary">Our Mission</h2>
          <p className="text-docyra-text-secondary leading-relaxed text-sm">
            To empower patients with verified healthcare schedules, eliminate waiting room anxiety, and give clinics robust digital coordination tools without marketplace gouging.
          </p>
        </div>

        <div className="card-docyra p-8 sm:p-10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-docyra-text-primary">Clinic B2B Partnership Model</h2>
          <p className="text-docyra-text-secondary leading-relaxed text-sm">
            Unlike open directory aggregators, Docyra works on strict clinic verification. Every clinic onboarded undergoes license verification, and all practicing doctors are vetted before accepting bookings.
          </p>
        </div>
      </div>

      {/* Core Values */}
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-bold text-docyra-text-primary">Why Patients Trust Docyra</h2>
          <p className="text-docyra-text-secondary text-sm">Built with non-negotiable security, clinical accuracy, and patient privacy.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card-docyra p-6 space-y-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <h3 className="font-bold text-lg text-docyra-text-primary">Strict Medical Verification</h3>
            <p className="text-xs text-docyra-text-secondary leading-relaxed">
              Every doctor license and clinic accreditation is reviewed and audited before listing.
            </p>
          </div>

          <div className="card-docyra p-6 space-y-3">
            <Award className="w-8 h-8 text-docyra-primary" />
            <h3 className="font-bold text-lg text-docyra-text-primary">Real-Time Slot Locking</h3>
            <p className="text-xs text-docyra-text-secondary leading-relaxed">
              Transactional booking guarantees zero double-bookings with instant calendar sync.
            </p>
          </div>

          <div className="card-docyra p-6 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-amber-600" />
            <h3 className="font-bold text-lg text-docyra-text-primary">Verified Reviews Only</h3>
            <p className="text-xs text-docyra-text-secondary leading-relaxed">
              Only patients with completed appointments can submit ratings, preventing review manipulation.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-stone-100 rounded-3xl p-12 space-y-4">
        <h3 className="text-2xl font-bold text-docyra-text-primary">Looking to find a specialist near you?</h3>
        <p className="text-sm text-docyra-text-secondary max-w-md mx-auto">
          Search over 15+ partner clinics and 85+ verified medical doctors.
        </p>
        <div className="pt-2">
          <Link to="/doctors" className="btn-accent inline-block text-sm px-8 py-3">
            Browse Doctors
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
