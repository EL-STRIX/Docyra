import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import Badge from '../../components/common/Badge';

export const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">Get in Touch</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Contact Docyra Support & Partnerships
        </h1>
        <p className="text-lg text-docyra-text-secondary leading-relaxed">
          Have a question regarding your booking or interested in onboarding your clinic? We are here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          <div className="card-docyra p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-docyra-text-primary">Email Support</h3>
            <p className="text-xs text-docyra-text-secondary">Our response time is typically under 4 business hours.</p>
            <p className="text-xs font-bold text-docyra-primary">support@docyra.app</p>
          </div>

          <div className="card-docyra p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-docyra-text-primary">Phone Assistance</h3>
            <p className="text-xs text-docyra-text-secondary">Monday through Friday, 8:00 AM – 6:00 PM EST.</p>
            <p className="text-xs font-bold text-docyra-text-primary">+1 (800) 555-DOCYRA</p>
          </div>

          <div className="card-docyra p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-docyra-text-primary">Headquarters</h3>
            <p className="text-xs text-docyra-text-secondary">Docyra Technologies, 100 Medical Plaza, Suite 400, Boston, MA 02115</p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="card-docyra p-8 sm:p-10">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-bold text-docyra-text-primary">Message Received!</h3>
                <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto">
                  Thank you for reaching out. A Docyra support representative will respond to your email shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-primary text-xs py-2 px-6"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane.doe@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Inquiry Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs bg-white focus:ring-2 focus:ring-docyra-primary/20"
                    >
                      <option value="general">General Question</option>
                      <option value="appointment">Appointment Support</option>
                      <option value="clinic">Clinic Partnership</option>
                      <option value="billing">Feedback & Technical</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="Brief summary of your inquiry"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">Message</label>
                  <textarea
                    required
                    rows="5"
                    placeholder="How can we help you today?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-docyra-neutral-border text-xs focus:ring-2 focus:ring-docyra-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-accent w-full py-3 text-sm flex items-center justify-center space-x-2 font-bold shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
