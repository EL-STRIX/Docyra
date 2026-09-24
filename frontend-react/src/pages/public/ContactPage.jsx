import { useState } from 'react';
import { Mail, Phone, MapPin, Building2, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Support & Partner Desk
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Contact Docyra Support
          </h1>
          <p className="text-base sm:text-lg text-neutral-text-secondary leading-relaxed max-w-2xl mx-auto">
            Have questions about booking appointments, clinic onboarding, or data management? Our support team is here to assist.
          </p>
        </div>
      </section>

      {/* Emergency Alert Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            <strong>Emergency Notice:</strong> Docyra is an appointment reservation platform and does not handle emergency triage. If you are experiencing a medical emergency, please contact your local emergency response service (112 / 911) or visit the nearest emergency room immediately.
          </span>
        </div>
      </div>

      {/* Main Grid: Form + Contact Info */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="card-docyra p-8 space-y-6 bg-brand-primary text-white lg:col-span-1">
            <h3 className="text-xl font-bold text-white">Get in Touch</h3>
            <p className="text-xs text-teal-100 leading-relaxed">
              We respond to all platform and clinic partner inquiries within one business day.
            </p>

            <div className="space-y-4 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-teal-200 block">General Support</span>
                  <span className="font-semibold text-white">support@docyra.test</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-teal-200 block">Clinic Partnerships</span>
                  <span className="font-semibold text-white">partnerships@docyra.test</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-teal-200 block">Help Desk Phone</span>
                  <span className="font-semibold text-white">+91 (080) 4567-8900</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-teal-200 block">Headquarters</span>
                  <span className="font-semibold text-white">Docyra Health Labs, Tech Park, Bangalore</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-teal-800 text-[11px] text-teal-200/90 space-y-1">
              <p><strong>Support Hours:</strong></p>
              <p>Mon – Sat: 8:00 AM – 8:00 PM IST</p>
            </div>
          </div>

          {/* Form */}
          <div className="card-docyra p-8 sm:p-10 lg:col-span-2">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-bold text-neutral-text-primary">Thank you for reaching out!</h3>
                <p className="text-sm text-neutral-text-secondary max-w-sm mx-auto">
                  Your inquiry has been received. Our support desk will reply to <strong>{formData.email}</strong> shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-outline text-xs mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold text-neutral-text-primary border-b border-neutral-border pb-3">
                  Send a Message
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Your Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Inquiry Topic</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Booking Assistance">Booking Assistance</option>
                      <option value="Clinic Partnership">Clinic Partnership / Onboarding</option>
                      <option value="Data & Privacy Request">Data & Privacy Request</option>
                      <option value="Technical Feedback">Technical Feedback</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe how our team can help..."
                    className="w-full p-3 rounded-xl border border-neutral-border text-sm text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center text-sm py-3">
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ContactPage;
