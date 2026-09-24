import { Clock } from 'lucide-react';


export function TermsPage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <section className="bg-white border-b border-neutral-border py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <span className="badge-primary text-xs font-bold">User Agreement</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Docyra Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Version 2.0 &bull; Last Updated: September 2026 &bull; Legally Binding Terms of Use
          </p>
        </div>
      </section>

      {/* Terms Body */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-docyra p-8 sm:p-12 space-y-8 bg-white text-sm text-neutral-text-primary leading-relaxed">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">1. Platform Services Overview</h2>
            <p className="text-neutral-text-secondary">
              Docyra operates as a specialized medical appointment reservation platform connecting verified patients with independent medical practitioners and accredited partner clinics. Docyra is not a healthcare provider and does not furnish medical diagnoses or emergency triage services.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">2. Patient Appointment Scheduling & Concurrency</h2>
            <p className="text-neutral-text-secondary">
              When scheduling an appointment via Docyra:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-text-secondary pl-2">
              <li>Your reservation is processed atomically to guarantee slot exclusivity.</li>
              <li>You agree to provide truthful information for yourself or registered family dependents.</li>
              <li>Appointments are subject to doctor confirmation if the practitioner operates in manual approval mode.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">3. Cancellation & Rescheduling Policy</h2>
            <p className="text-neutral-text-secondary">
              To respect practitioner schedules and ensure fair slot availability for waitlisted patients:
            </p>
            <div className="p-4 rounded-xl bg-neutral-bg border border-neutral-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-neutral-text-primary">
                <Clock className="w-4 h-4 text-brand-primary" />
                <span>24-Hour Notice Window</span>
              </div>
              <p className="text-xs text-neutral-text-secondary leading-relaxed">
                Patients may cancel or reschedule confirmed appointments up to 24 hours prior to the scheduled slotStart time without penalty. Cancellations within 24 hours require contacting the clinic directly.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">4. Practitioner Obligations & Emergency Leave</h2>
            <p className="text-neutral-text-secondary">
              Doctors and partner clinics agree to maintain accurate availability calendars. In case of unexpected medical emergencies, doctors may trigger same-day emergency unavailability, which automatically cancels affected slots and notifies patients via SMS and email with priority rebooking links.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">5. Reviews & Community Moderation</h2>
            <p className="text-neutral-text-secondary">
              Patient reviews are permitted only for completed consultations. To prevent harassment or defamatory content, all submissions undergo automated profanity screening. Patients may edit their submitted reviews within a 48-hour window from publication.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-text-primary">6. Changes to Terms</h2>
            <p className="text-neutral-text-secondary">
              Docyra may update these Terms of Service periodically. Users will be prompted to review and re-accept significant term revisions upon login or booking.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TermsPage;
