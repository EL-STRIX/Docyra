# Product Requirements Document (PRD) — v3.0 (FINAL)
## Docyra — Doctor Booking System — Full Stack Web Application

**Status:** Ready for development
**Supersedes:** v1.0 and v2.0 (full change history below)

---

## 0. Document Control

| Version | Date | Change Summary |
|---|---|---|
| v1.0 | Initial | First draft from project brief |
| v2.0 | Revision | Closed security/compliance/format gaps found in senior-dev review; added healthcare-compliance architecture, user-story format, fixed-slot booking model |
| **v3.0 (this doc)** | Final | Pivoted to **clinic-based B2B model** (platform owner onboards clinics; patients browse only onboarded clinics, no geo-search); added landing/marketing page; closed all remaining gaps: 2FA, CSRF, CAPTCHA, dependency scanning, secrets management, backup/DR, GDPR export, consent versioning, doctor license verification, dependent booking, reminders, SMS channel, waitlist, emergency cancellation, calendar export, review moderation, load/accessibility testing tooling, CSP, document governance (this section, stakeholders, assumptions, risk register, glossary), currency/locale |

---

## 1. Stakeholders

| Role | Who | Responsibility |
|---|---|---|
| Product Owner / Developer | You | Owns scope, architecture, and build decisions |
| Academic Advisor / Evaluator | Your faculty guide | Reviews project against academic requirements |
| End Users | Patients, doctors, clinic staff | Use the deployed system; feedback informs iteration |
| Platform Admin (in-system role) | You, operating the admin portal | Onboards clinics, approves independent doctors, manages platform-wide settings |

---

## 2. Project Overview

**Docyra** is a full-stack healthcare appointment platform built around a **clinic partnership model**: the platform owner (admin) onboards clinics as customers/partners. Patients only discover and book with clinics (and independent doctors) that are officially part of the platform — there is **no open marketplace and no geo-based "doctors near me" search** by design; discovery is scoped to the platform's own onboarded network.

Two client applications share one backend API:
- **Patient Web App (React JS)** — public marketing/landing page + doctor/clinic search, booking, and appointment management.
- **Doctor, Clinic & Admin Portal (Angular, TypeScript, standalone components)** — used by doctors, clinic admins (per-clinic staff accounts), and the platform admin.

The system is designed with healthcare-data discipline (Section 6) from day one, since it is intended to eventually serve real patients, while staying realistically scoped for a final-year academic build (Section 13 marks what's core-build vs. documented-for-completeness).

---

## 3. Goals & Objectives

- Give patients a single, trustworthy place to find and book appointments only with vetted, platform-partnered clinics and doctors.
- Give clinics a lightweight way to manage their own doctors' schedules once onboarded, without needing platform-admin involvement for routine operations.
- Give the platform admin full control over who joins the network (clinics onboarded manually; independent doctors reviewed via application).
- Present the project professionally to a visiting user via a public landing page before they ever log in.
- Demonstrate professional full-stack architecture and healthcare-appropriate engineering discipline suitable for both academic evaluation and a credible portfolio piece.

### Explicitly Out of Scope (by design, not a gap)
- Geo-based / map "near me" search — replaced entirely by the clinic-onboarding model.
- Self-service clinic signup — clinics are onboarded manually by the platform admin only.
- Online payments, video consultation, native mobile apps, multi-language UI (Phase 2 / future).
- Full legal HIPAA certification (engineering foundation only — Section 6.6).

---

## 4. Assumptions & Dependencies

- Clinic partnerships are negotiated **offline** (sales conversation between you and the clinic) — the system only needs to *record* an already-agreed partnership, not facilitate the sales process itself.
- An email-sending service will be available (Nodemailer + Gmail SMTP for dev/free tier; SendGrid/Postmark if scaling).
- An SMS gateway account will be provisioned before Phase 4 — **MSG91 assumed as default** (India-focused, cost-effective) with Twilio as an international fallback option; this is a stated assumption, swap freely if you have a preference.
- MongoDB Atlas free tier is sufficient through development and academic submission; production migration (Section 6.2) is a documented future step, not a build requirement.
- You (the developer) are the sole engineering resource — phase estimates assume solo, part-time academic-project pacing, not a team sprint velocity.

---

## 5. User Roles & Permissions (RBAC)

| Role | Access |
|---|---|
| **Patient** | Register/login/verify email, enable optional 2FA, browse platform clinics & independent doctors, view availability, book (self or a linked dependent), cancel/reschedule, join a waitlist, receive reminders, review after completed visits, export/delete own data. |
| **Doctor** | Login (2FA required), set weekly availability, mark emergency unavailability, manage appointment status, view own schedule/patient history, edit own profile. May belong to a Clinic (`clinicId` set) or operate independently (`clinicId` null). |
| **Clinic Admin** *(new role)* | Login (2FA required), scoped entirely to their own `clinicId` — add/edit/deactivate doctors under their clinic, view their clinic's appointments and basic analytics. **Cannot** see other clinics' data or platform-wide settings. Account created by Platform Admin during/after clinic onboarding. |
| **Platform Admin** | Login (2FA required), full control: onboard/manage clinics, approve independent-doctor applications (with license document review), manage specializations, override any appointment, manage system settings, view platform-wide analytics and the audit log. |

**Authentication:** JWT access token (15 min) + rotating refresh token (7 days), HTTP-only/`Secure`/`SameSite=Strict` cookies. bcrypt (12 rounds). Email verification required before activation. Lockout after 5 failed logins/15 min. **TOTP-based 2FA required for Doctor, Clinic Admin, and Platform Admin** (PHI-adjacent roles); optional, encouraged for Patient.

**CSRF protection:** Since auth relies on cookies, all state-changing requests require a CSRF token issued at login and validated via the double-submit-cookie pattern — cookie-based JWT alone is not CSRF-safe, so this is a mandatory pairing, not optional hardening.

**Authorization:** Role + `clinicId` claim in JWT; Express middleware enforces both role AND clinic-data scoping (a Clinic Admin's queries are always filtered by their own `clinicId` at the query level, never trusted from client input).

---

## 6. Data Privacy, Security & Compliance

### 6.1 Core measures
- **Encryption in transit:** TLS 1.2+ everywhere, HSTS, WSS-only sockets.
- **Encryption at rest:** MongoDB Atlas AES-256; file storage (license docs, profile photos) via S3 with server-side encryption.
- **CSP (Content Security Policy):** Explicit policy via Helmet's `contentSecurityPolicy` — restricts script/style/img/connect sources to known origins only; not left to Helmet's defaults alone.
- **CAPTCHA:** Google reCAPTCHA v3 on public registration and booking forms to prevent bot abuse and fake-account spam.
- **2FA:** TOTP (e.g. via `speakeasy` + authenticator app QR enrollment) mandatory for Doctor/Clinic Admin/Platform Admin.
- **Access control:** Least-privilege, clinic-scoped queries as above; audit logging on all PHI-adjacent reads/writes.
- **Dependency security:** GitHub Dependabot alerts enabled + `npm audit --audit-level=high` as a required CI check — dependency vulnerabilities are a real, common breach vector and must be a standing check, not a one-time review.
- **Secrets management:** Local/staging uses `.env` files (git-ignored); **production uses a managed secrets store** (AWS Secrets Manager or GCP Secret Manager) — plain env files are not acceptable once real credentials/PHI are in play.
- **Session security:** Auto-logout after 30 min idle on the Angular portal.

### 6.2 Hosting implication
Free-tier hosts (Render/Netlify/Atlas M0) don't offer a BAA and aren't appropriate for real patient data. Staged plan: build/test on free tiers now → migrate to AWS/GCP/Azure (BAA-eligible) + Atlas Dedicated (M10+, BAA) before any real patient ever uses the system. This is a **documented future migration**, not a day-one build requirement.

### 6.3 Backup & Disaster Recovery
- MongoDB Atlas automated daily backups (free/shared tier) with point-in-time recovery on paid tiers.
- Target: **RPO ≤ 24h** during development/staging, **RPO ≤ 1h** in production (continuous backups); **RTO ≤ 4h** to restore service from a major failure.

### 6.4 Data subject rights (GDPR-aware)
- **Right to erasure:** account deletion hard-deletes PHI-adjacent fields; anonymized counts may remain for analytics.
- **Right to data portability:** `GET /api/v1/users/me/export` returns the user's full data (profile, appointments, reviews) as downloadable JSON — this was missing in v2 and is now a first-class requirement, not just a deletion path.
- **Consent versioning:** `User.acceptedTermsVersion` + `acceptedTermsAt` recorded at signup and re-recorded whenever ToS/Privacy Policy changes and the user re-accepts — needed to prove *what* a user agreed to and *when*, for any real compliance audit.

### 6.5 Retention & legal pages
- Audit logs retained ≥6 years in a real HIPAA context (noted now, enforced later).
- Privacy Policy / Terms of Service static pages required before real launch (legal review needed, outside engineering scope).

### 6.6 Honest scope boundary
Engineering measures alone ≠ certified HIPAA compliance. Real compliance additionally needs signed BAAs, a formal risk assessment, workforce training, and an incident response plan. This PRD builds the correct technical foundation so that step is additive later.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Double-booking race condition | Low | High | MongoDB transaction + unique index on fixed slots (Section 9) |
| Scope creep vs. academic timeline | Medium | Medium | Phased build (Section 14); Section 13 marks core-build vs. documented-only items |
| Third-party service costs exceed free tier | Medium | Low | Monitor usage; MSG91/SendGrid free tiers sized for demo-scale traffic |
| Fraudulent doctor license/credentials | Low | High | Mandatory document upload + manual Platform Admin review before approval (Section 8, D-App) |
| Data breach / unauthorized access | Low | Critical | Encryption, RBAC + clinic scoping, audit log, 2FA on privileged roles |
| Single-developer bus factor | High | Medium | This PRD + inline code documentation serve as the continuity record |
| Clinic subscription/relationship goes stale (no data sync with real-world status) | Medium | Low | `Clinic.subscriptionStatus` field, admin-editable, reviewed periodically |

---

## 8. Functional Requirements (User Stories)

### 8.1 Public Landing Page (React, unauthenticated) — *new in v3*

**L-1: Landing/home page**
> As a visitor, I want to understand what Docyra is and see it's a real, professional service before I sign up.
- Hero section: platform name (**Docyra**), tagline, primary CTA ("Find a Clinic" / "Book Now").
- "How it works" 3-step explainer (Find a clinic → Choose a doctor & slot → Get confirmed instantly).
- Section showcasing onboarded clinics/specializations covered (pulled live from `GET /api/v1/clinics` — not hardcoded, so it stays accurate as clinics are added).
- Footer with links to Privacy Policy, Terms of Service, and contact info.
- Fully responsive; this is the first thing any evaluator or visitor sees, so it carries real weight for the "professional" bar.

### 8.2 Patient App (React)

**P-1 Registration & email verification** — as v2 (unchanged).
**P-2 Password reset** — as v2 (unchanged).

**P-3: Browse clinics & doctors** *(revised for clinic model)*
> As a patient, I want to browse clinics and doctors that are actually part of this platform.
- `GET /api/v1/clinics` lists only clinics with `subscriptionStatus: 'active'`, with name/city/specializations-offered shown.
- Within a clinic, patients see its roster of doctors; independent doctors (no `clinicId`) appear in a separate "Independent Practitioners" section of search.
- Filters: specialization, clinic name, doctor name, rating — **no map/geolocation**, by design.

**P-4 View doctor profile & availability** — as v2, plus: profile now shows clinic affiliation (name + address) if applicable.

**P-5 Book an appointment** — as v2 (atomic transaction, fixed slots), plus:
- **P-5a Book for a dependent** *(new)*: patient can add a dependent profile (`name`, `relationship`, `dateOfBirth`) under their account and book on the dependent's behalf; `Appointment.bookedFor` references either the patient or a dependent.
- **P-5b CAPTCHA on booking** *(new)*: booking submission is reCAPTCHA-protected to prevent scripted slot-hoarding.

**P-6 View, cancel, reschedule appointments** — as v2, plus:
- **P-6a Join waitlist** *(new)*: if a desired date/doctor is fully booked, patient can join a waitlist; when a slot opens (via cancellation), the earliest waitlisted patient is notified first (FIFO) with a short claim window before it's opened to general search.
- **P-6b Calendar export** *(new)*: `GET /api/v1/appointments/:id/ics` — downloadable calendar file, also attached to the confirmation email.

**P-7 Notifications & reminders** *(expanded)*
> As a patient, I want to be reminded, not just notified at booking time.
- Real-time (Socket.IO) + email fallback for status changes (as v2).
- **Automated reminders** *(new)*: email + SMS sent 24h and 1h before the appointment (a scheduled job checks upcoming slots and flips `reminder24hSent`/`reminder1hSent` flags to avoid duplicates).
- **SMS channel** *(new)*: via MSG91 (assumed default, Section 4) for reminders and critical status changes (booked/cancelled), since email alone is an unreliable single channel for time-sensitive medical appointments.

**P-8 Reviews** — as v2, plus:
- **P-8a Moderation** *(new)*: review text passes through an automated profanity filter (`bad-words` or equivalent) on submission; flagged reviews are held as `status: 'flagged'` for Platform Admin review before appearing publicly, rather than auto-publishing all text unmoderated.

**P-9: Data rights** *(new)*
> As a patient, I want to control my own data.
- `GET /api/v1/users/me/export` — full data export as JSON.
- Account deletion request, honoring Section 6.4.

### 8.3 Doctor, Clinic & Admin Portal (Angular)

**D-1 Availability management** — as v2 (fixed-duration slots, nightly generation job).

**D-2 Appointment management** — as v2, plus:
- **D-2a Emergency unavailability** *(new)*: doctor can toggle "Unavailable today" mid-day; system auto-cancels remaining today's confirmed slots, notifies affected patients immediately (email + SMS + socket) with an apology message and a direct rebooking link — this is materially different from planned leave (D-1), which doesn't touch already-booked appointments.

**D-App: Independent doctor application** *(revised)*
> As an independent doctor (no clinic), I want to apply to join the platform.
- Application includes **mandatory license/qualification document upload** (PDF/image, stored encrypted in S3).
- Application sits `isApproved: false`, invisible to search, until Platform Admin manually reviews the uploaded document and approves/rejects — this closes the v2 gap where "license info" was collected but never actually verified.

**CA-1: Clinic Admin manages own doctors** *(new — Clinic Admin role)*
> As a Clinic Admin, I want to add and manage doctors under my own clinic without needing the Platform Admin's involvement for routine staffing.
- `POST /api/v1/clinic-admin/doctors` — doctor is created with `clinicId` set to the Clinic Admin's own clinic and **auto-approved** (the clinic itself was already vetted by Platform Admin during onboarding, so per-doctor re-review isn't required — this is a deliberate design decision to keep clinic operations lightweight; flag if you'd rather require Platform Admin sign-off per doctor too).
- Clinic Admin can view/edit only doctors and appointments where `clinicId` matches their own — enforced server-side, not just hidden in the UI.

**A-1: Clinic onboarding** *(new — replaces self-service clinic signup)*
> As Platform Admin, I want to add a clinic that I've partnered with offline.
- `POST /api/v1/admin/clinics` — creates the `Clinic` record (name, address, contact info, `subscriptionStatus`).
- Platform Admin also creates the first Clinic Admin login for that clinic (or the clinic self-manages via a Platform-Admin-issued invite — either works; default assumed is Platform Admin creates it directly for simplicity).

**A-2: Independent doctor approval** — as D-App above, admin side.
**A-3: Analytics dashboard** — as v2, plus a clinic-level breakdown (bookings per clinic).
**A-4: Audit log** — as v2 (unchanged, still mandatory per Section 6).

---

## 9. Data Model (MongoDB Collections)

**Clinic** *(new)*
```
{
  _id, name, address, city, contactEmail, contactPhone,
  subscriptionStatus: 'active' | 'suspended' | 'trial',
  onboardedByAdminId, createdAt
}
```

**User**
```
{
  _id, name, email, passwordHash, role: 'patient'|'doctor'|'clinic_admin'|'admin',
  clinicId,               // set for doctor/clinic_admin tied to a clinic; null for independent doctor/patient/platform admin
  phone, profilePhotoUrl, status: 'unverified'|'active'|'locked'|'deactivated',
  emailVerifiedAt, failedLoginCount, lockedUntil,
  twoFactorEnabled, twoFactorSecret,
  timezone,
  acceptedTermsVersion, acceptedTermsAt,
  createdAt, updatedAt
}
```

**Dependent** *(new)*
```
{ _id, patientId, name, relationship, dateOfBirth, createdAt }
```

**DoctorProfile**
```
{
  _id, userId, clinicId,   // null = independent
  specializationId, qualifications, bio, licenseDocumentUrl,
  consultationFee, feeCurrency: 'INR',   // locale default
  clinicAddress,           // used only when clinicId is null
  yearsExperience, avgRating, totalReviews,
  isApproved, manualApprovalMode, createdAt
}
```

**Specialization** — unchanged.
**AvailabilityRule** — unchanged.

**AppointmentSlot**
```
{ _id, doctorId, availabilityRuleId, slotStart, slotEnd, isBooked }
```
*Unique index on `{ doctorId, slotStart, slotEnd }`.*

**Appointment**
```
{
  _id, patientId, bookedForType: 'self'|'dependent', bookedForId,
  doctorId, clinicId, slotId, slotStart, slotEnd,
  status: 'pending'|'confirmed'|'completed'|'cancelled'|'no-show',
  reasonForVisit, reminder24hSent, reminder1hSent,
  createdAt, cancelledBy, cancellationReason
}
```

**Waitlist** *(new)*
```
{ _id, patientId, doctorId, desiredDateRangeStart, desiredDateRangeEnd, notifiedAt, createdAt }
```

**Review**
```
{ _id, appointmentId, patientId, doctorId, rating, comment, status: 'published'|'flagged'|'rejected', createdAt, editableUntil }
```

**AuditLog** — unchanged.
**SystemSettings** — unchanged, plus `defaultCurrency: 'INR'`.

---

## 10. Core API Endpoints (REST, versioned `/api/v1`)

Standard error format unchanged from v2: `{ "success": false, "error": { "code", "message" } }`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register (email verification sent) |
| GET | `/api/v1/auth/verify-email` | Public | Verify account |
| POST | `/api/v1/auth/login` | Public | Login (checks 2FA if enabled) |
| POST | `/api/v1/auth/2fa/setup` | Auth | Generate TOTP secret + QR |
| POST | `/api/v1/auth/2fa/verify` | Auth | Confirm 2FA code |
| POST | `/api/v1/auth/refresh` | Public (cookie) | Rotate access token |
| POST | `/api/v1/auth/logout` | Auth | Clear session |
| POST | `/api/v1/auth/forgot-password` / `reset-password` | Public | Password recovery |
| GET | `/api/v1/health` | Public | Health check |
| GET | `/api/v1/clinics` | Public | List active, onboarded clinics |
| GET | `/api/v1/clinics/:id` | Public | Clinic detail + doctor roster |
| GET | `/api/v1/doctors` | Public | Search (clinic/specialization/name/rating — no geo) |
| GET | `/api/v1/doctors/:id/slots?date=` | Public | Open slots |
| POST | `/api/v1/doctors/apply` | Public | Independent doctor application (+ license upload) |
| PUT | `/api/v1/doctors/:id/availability` | Doctor | Set availability rules |
| POST | `/api/v1/doctors/:id/emergency-unavailable` | Doctor | Trigger same-day emergency cancellation flow |
| POST | `/api/v1/dependents` | Patient | Add a dependent profile |
| POST | `/api/v1/appointments` | Patient | Book (atomic, CAPTCHA-protected) |
| GET | `/api/v1/appointments/my` | Patient | Own + dependents' appointments |
| GET | `/api/v1/appointments/:id/ics` | Patient | Calendar export |
| POST | `/api/v1/waitlist` | Patient | Join a waitlist |
| PATCH | `/api/v1/appointments/:id/status` | Doctor/Clinic Admin/Admin | Update status |
| PATCH | `/api/v1/appointments/:id/cancel` | Patient/Admin | Cancel |
| POST | `/api/v1/reviews` | Patient | Submit (auto-moderated) |
| GET | `/api/v1/users/me/export` | Auth | GDPR data export |
| POST | `/api/v1/clinic-admin/doctors` | Clinic Admin | Add doctor to own clinic (auto-approved) |
| GET | `/api/v1/clinic-admin/appointments` | Clinic Admin | Own clinic's appointments |
| POST | `/api/v1/admin/clinics` | Admin | Onboard a new clinic |
| PATCH | `/api/v1/admin/doctors/:id/approve` | Admin | Approve/reject independent doctor |
| GET | `/api/v1/admin/audit-logs` | Admin | Audit trail |
| GET | `/api/v1/admin/analytics` | Admin | Platform + per-clinic metrics |
| PUT | `/api/v1/admin/settings` | Admin | System settings |

**Real-time + fallback:** unchanged from v2 (Socket.IO + email), **now also SMS** for booking/cancellation/reminder events.

---

## 11. Frontend Architecture

### 11.1 React JS — Patient App
As v2 (Tailwind, `date-fns-tz`, React Router, Axios interceptor), plus a **public/marketing route group** (landing page, Privacy/ToS) that renders without auth, separate from the authenticated app shell.

### 11.2 Angular — Doctor, Clinic & Admin Portal
As v2 (Angular 17+ standalone, Angular Material, RxJS services), plus **route-level scoping** for the new Clinic Admin role — `roleGuard` now checks both role and, where relevant, that the requested resource's `clinicId` matches the logged-in Clinic Admin's own.

---

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | <500ms p95 on search/availability; pagination everywhere (10 default/50 max) |
| Load testing *(new)* | **k6** script simulating concurrent booking requests against a single slot (validates the transaction fix under real concurrency, not just unit tests) plus a general peak-traffic simulation on search endpoints |
| Accessibility | WCAG 2.1 AA target, enforced via **axe-core integrated into Cypress E2E runs** *(new — closes the "stated but unverified" gap)* |
| Security | Helmet + explicit CSP, CORS restricted, Zod validation, CSRF double-submit tokens, rate limiting (5/15min auth, 100/min general), CAPTCHA on public forms, 2FA on privileged roles, Dependabot + `npm audit` in CI |
| Availability | 99.5% target; `/api/v1/health` for uptime monitoring |
| Data integrity | Transactional booking (unchanged) |
| Browser support | Last 2 versions Chrome/Firefox/Safari/Edge; iOS Safari 15+ |
| Observability | Winston + Morgan + Sentry (all 3 apps) |
| Testing | ≥70% backend coverage; Jest/RTL (React); Jasmine/Karma (Angular); Cypress E2E incl. race-condition + a11y checks |
| Backup/DR | See Section 6.3 (RPO/RTO targets) |

---

## 13. Build Scope: Core vs. Documented-Only

Given this is a final-year academic build, not every item above needs to be *fully implemented* to submit a professional, complete project — but per your instruction, all of it stays *fully specified* in this PRD. Suggested split when you get to implementation:

- **Core build (do these):** Clinic/doctor/patient CRUD, auth incl. email verification + password reset, fixed-slot booking with transaction safety, RBAC incl. Clinic Admin scoping, landing page, reviews, real-time notifications, basic analytics, local dev, core test suite.
- **Strong-to-have (do if time allows):** 2FA, SMS reminders, waitlist, emergency-cancellation flow, calendar export, GDPR export endpoint, CSRF hardening, CI dependency scanning.
- **Documented-for-completeness (describe in your report, don't need to fully build):** Production BAA hosting migration, formal load testing at scale, full incident-response plan, legal review of Privacy Policy/ToS.

This split is a suggestion, not a constraint — it exists so the PRD stays honest about what "final year project" realistically means without pretending the compliance content isn't there.

---

## 14. Project Phases

| Phase | Scope | Duration |
|---|---|---|
| 0 — Setup | Repo, local dev environment, CI (lint/test/`npm audit`), `.env.example` | 2–3 days |
| 1 — Foundation | Auth (incl. 2FA, verification, reset), RBAC incl. Clinic Admin scoping, Clinic/Doctor/Specialization CRUD, audit log | 2–2.5 weeks |
| 2 — Patient App + Landing Page | Landing page, clinic/doctor search, timezone-aware slots, booking (txn + CAPTCHA), dependents, reviews (moderated) | 2.5 weeks |
| 3 — Doctor/Clinic/Admin Portal | Availability + nightly slot gen, clinic-admin doctor management, doctor approval + license review, emergency-unavailable flow, analytics, audit viewer | 3 weeks |
| 4 — Real-time & Notifications | Socket.IO, email + SMS, reminders (24h/1h), waitlist, calendar export | 1–1.5 weeks |
| 5 — Compliance, Testing & Deployment | Privacy/ToS pages, GDPR export, Sentry, k6 + axe-core in CI, staging deploy, documented production-migration plan | 1.5–2 weeks |

---

## 15. Success Criteria

- Zero double-bookings under `k6` concurrent load testing.
- A patient can complete registration → verification → clinic/doctor discovery → booking → reminder → review, entirely without needing platform-admin intervention.
- A Clinic Admin can manage their own clinic's doctors and appointments with zero visibility into other clinics' data (verified via automated test, not just manual check).
- Landing page presents Docyra credibly to a first-time visitor/evaluator with no login required.
- Audit log captures every PHI-adjacent read/write.
- The system can migrate from staging to BAA-covered production infrastructure via the documented path without an architecture rewrite.

---

## 16. Glossary

- **PHI** — Protected Health Information.
- **BAA** — Business Associate Agreement (a contract required under HIPAA with any vendor handling PHI).
- **RBAC** — Role-Based Access Control.
- **RPO / RTO** — Recovery Point/Time Objective (how much data loss / downtime is acceptable in a disaster).
- **JWT** — JSON Web Token (used here for stateless auth).
- **CSRF** — Cross-Site Request Forgery (an attack this PRD defends against via double-submit cookie tokens).
- **2FA / TOTP** — Two-Factor Authentication / Time-based One-Time Password.
- **WCAG** — Web Content Accessibility Guidelines.
- **CSP** — Content Security Policy (browser-enforced source restrictions).
- **ICS** — the standard calendar file format (`.ics`) for importing events into Google/Outlook calendars.
