import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';


export function PrivacyPage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <section className="bg-white border-b border-neutral-border py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <span className="badge-primary text-xs font-bold">Legal & Data Protection</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Docyra Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Version 2.0 &bull; Effective Date: September 2026 &bull; Compliant with GDPR Article 20 & HIPAA Privacy Principles
          </p>
        </div>
      </section>

      {/* Policy Text Container */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-docyra p-8 sm:p-12 space-y-8 bg-white text-sm text-neutral-text-primary leading-relaxed">
          <div className="p-4 rounded-2xl bg-brand-primary-light/50 border border-teal-200 flex items-start gap-3 text-xs text-brand-primary">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              <strong>Our Commitment to Data Sovereignty:</strong> At Docyra, we treat medical and personal data with stringent confidentiality. We never sell patient contact information or share scheduling history with unauthorized third parties.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">1. Information We Collect</h2>
            <p className="text-neutral-text-secondary">
              To facilitate appointment bookings and clinic communications, Docyra collects:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-text-secondary pl-2">
              <li><strong>Account Information:</strong> Name, verified email address, phone number, hashed passwords, and 2FA secrets.</li>
              <li><strong>Appointment Data:</strong> Doctor selected, clinic location, appointment slot times, reasons for visit, and status transitions.</li>
              <li><strong>Family Dependent Information:</strong> Names, relationships, and birth dates of family members added under patient profiles.</li>
              <li><strong>Technical Logs:</strong> IP addresses, browser user agents, and security audit logs strictly recorded for fraud prevention and compliance.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">2. How Your Information is Used</h2>
            <p className="text-neutral-text-secondary">
              We utilize collected information exclusively for:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-text-secondary pl-2">
              <li>Securing and executing atomic appointment reservations with partner clinics.</li>
              <li>Transmitting transactional notifications, email verification tokens, and 24h / 1h appointment reminders.</li>
              <li>Enforcing role-based access control (RBAC) to ensure doctors and clinic admins view only authorized records.</li>
              <li>Generating immutable audit logs on PHI-adjacent access touchpoints.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">3. GDPR Article 20: Right to Data Portability</h2>
            <p className="text-neutral-text-secondary">
              Every registered user on Docyra maintains complete ownership of their data. In compliance with GDPR Article 20, you may at any time export a comprehensive, structured JSON file of all personal records, family dependents, historical appointments, reviews, and audit logs.
            </p>
            <div className="p-4 rounded-xl bg-neutral-bg border border-neutral-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xs text-neutral-text-primary">Ready to export your account data?</h4>
                <p className="text-[11px] text-neutral-text-secondary">Download an instant machine-readable archive.</p>
              </div>
              <Link to="/profile" className="btn-outline text-xs py-2 px-4 shrink-0">
                Go to Data Privacy Center
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">4. Data Security & Storage</h2>
            <p className="text-neutral-text-secondary">
              Docyra employs industry-leading security practices:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-text-secondary pl-2">
              <li>Bcrypt 12-round password hashing with progressive lockout protection after failed attempts.</li>
              <li>Encrypted TOTP-based Two-Factor Authentication (2FA) for all medical practitioners and platform staff.</li>
              <li>Strict Content Security Policy (CSP), double-submit CSRF defense tokens, and HTTP-only SameSite cookies.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">5. Contact Our Privacy Officer</h2>
            <p className="text-neutral-text-secondary">
              For privacy questions, data export queries, or account deletion requests under applicable law, please email our Data Privacy Officer at <a href="mailto:privacy@docyra.test" className="text-brand-primary font-semibold hover:underline">privacy@docyra.test</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PrivacyPage;
