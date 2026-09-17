import React from 'react';
import Badge from '../../components/common/Badge';

export const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="primary">Legal & Compliance</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-docyra-text-primary">
          Docyra Privacy Policy & Data Rights
        </h1>
        <p className="text-xs text-docyra-text-secondary">Effective Date: September 1, 2026 • Version 1.0</p>
      </div>

      <div className="card-docyra p-8 sm:p-12 space-y-8 text-sm text-docyra-text-secondary leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">1. Information We Collect</h2>
          <p>
            When you register and book medical appointments on Docyra, we collect your name, contact email, telephone number, time zone, and appointment history. For bookings made on behalf of family members, dependent names and relationship disclosures are collected solely to facilitate clinical care.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">2. Clinical Data & Scoping</h2>
          <p>
            Docyra enforces strict clinic and provider data scoping. Medical doctors and clinic administrative staff can only view appointment information for patients booked under their specific practice. Cross-clinic data leakage is strictly blocked by our architectural security layers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">3. GDPR & Patient Data Rights</h2>
          <p>
            In compliance with international data protection standards and GDPR requirements, every authenticated patient has the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Export Personal Data:</strong> Download a comprehensive machine-readable JSON bundle of your profile, appointments, dependents, reviews, and audit logs via your account dashboard.</li>
            <li><strong>Right to Erasure (Deletion):</strong> Request account deactivation and data anonymization.</li>
            <li><strong>Audit Trail:</strong> All sensitive access to Protected Health Information (PHI) is permanently logged in immutable audit records.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-docyra-text-primary">4. Security & Encryption</h2>
          <p>
            All data in transit is protected using TLS 1.3 encryption. Passwords are salted and hashed using bcrypt with 12 rounds. Multi-factor authentication (2FA) is supported for all users and mandatory for privileged clinical staff.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
