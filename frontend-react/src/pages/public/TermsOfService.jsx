import React from 'react';
import Badge from '../../components/common/Badge';

export const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="primary">Legal Agreement</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-docyra-text-primary">
          Terms of Service
        </h1>
        <p className="text-xs text-docyra-text-secondary">Effective Date: September 1, 2026 • Version 1.0</p>
      </div>

      <div className="card-docyra p-8 sm:p-12 space-y-8 text-sm text-docyra-text-secondary leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">1. Acceptance of Terms</h2>
          <p>
            By creating an account or scheduling an appointment through Docyra, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">2. Medical Disclaimer & Emergency Care</h2>
          <p className="text-rose-700 bg-rose-50 p-4 rounded-xl border border-rose-200 text-xs font-medium">
            <strong>CRITICAL:</strong> Docyra is a scheduling and appointment booking platform, not an emergency medical dispatcher. If you are experiencing a life-threatening medical emergency, please call 911 (or your local emergency services) immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">3. Appointment Booking & Cancellation Policy</h2>
          <p>
            Patients may schedule confirmed or pending appointments with verified practitioners. To respect practitioner schedules, cancellations must be initiated at least 2 hours prior to the scheduled appointment start time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">4. Patient Conduct & Reviews</h2>
          <p>
            Only verified patients with completed appointments are permitted to leave public reviews and star ratings. Reviews containing profanity or abusive language will be automatically flagged and held for administrative moderation.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
