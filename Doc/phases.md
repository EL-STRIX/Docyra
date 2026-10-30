# Build Phases — Docyra

**Companion documents:** PRD v3, `design.md`, `TRD.md`, `architecture.md`
**Purpose of this document:** A complete, ordered, execution-ready breakdown of every phase needed to take Docyra from an empty repo to a deployed, staging-ready, professional product — sized so each phase is a self-contained unit of work (clear start state, task list, definition of done) that can be picked up independently, including by an AI coding agent across multiple sessions.

**How to use this file:** Phases are strictly ordered within each Stage, and Stages are ordered top to bottom — later phases assume everything in earlier phases is done. Each phase lists its prerequisites explicitly so a new session (human or agent) can verify the starting state before continuing.

---

## Stage A — Foundation

### Phase 0: Project Initialization & Environment Setup
**Prerequisites:** None (starting point).
**Goal:** A working, empty-but-runnable skeleton for all three apps, with CI wired up.
**Tasks:**
- Initialize monorepo per `architecture.md` Section 3.2 folder structure (`backend/`, `frontend-react/`, `frontend-angular/`).
- Scaffold backend: Express app skeleton (`app.js`, `server.js`), install core deps (express, mongoose, dotenv, cors, helmet, morgan).
- Scaffold frontend-react via Vite + Tailwind config.
- Scaffold frontend-angular via Angular CLI (standalone components, Angular Material added).
- Set up local environment config and database connection (`.env.example` per TRD Section 4.2; `config/env.js` with Zod validation).
- Set up ESLint + Prettier (backend, React) and Angular ESLint (Angular).
- Set up GitHub Actions `ci.yml` skeleton (install + lint only for now — tests come later).
- Create `/api/v1/health` endpoint.
**Definition of Done:** Backend connects to Mongo locally and starts via `npm start` / `npm run dev`; `GET /api/v1/health` returns 200; both frontend apps run locally (`npm run dev`) showing a default page; CI passes on an empty PR.

---

## Stage B — Backend Core

### Phase 1: Data Models & Database Layer
**Prerequisites:** Phase 0.
**Goal:** Every Mongoose schema from `architecture.md`/PRD Section 9 exists, indexed, and migration-managed.
**Tasks:**
- Create all models: `User`, `Clinic`, `DoctorProfile`, `Specialization`, `AvailabilityRule`, `AppointmentSlot`, `Appointment`, `Dependent`, `Review`, `Waitlist`, `AuditLog`, `SystemSettings`.
- Add all indexes listed in `TRD.md` Section 5 (including the critical unique compound index on `AppointmentSlot`).
- Set up `migrate-mongo`, write the initial migration creating indexes.
- Write a seed script (`scripts/seed.js`) with synthetic data: a few clinics, specializations, doctors, patients — needed for all later manual/local testing.
**Definition of Done:** `migrate-mongo up` runs cleanly against local Mongo; seed script populates usable test data; a quick script confirms the unique index rejects a duplicate `{doctorId, slotStart, slotEnd}` insert.

### Phase 2: Auth Foundation
**Prerequisites:** Phase 1.
**Goal:** Registration, login, email verification, password reset, JWT issuance/refresh — no 2FA yet (Phase 5).
**Tasks:**
- `authService`: register (bcrypt hash, unverified status, verification email), login (credential check, lockout counter), refresh-token rotation, forgot/reset password.
- `authController` + `routes/v1/auth.routes.js`: `/register`, `/verify-email`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`.
- `auth` middleware (JWT verification, attaches `req.user`).
- Cookie config exactly per TRD Section 7 (HTTP-only, Secure, SameSite=Strict).
- `notificationService` stub (email-only for now — full fan-out comes in Phase 8): verification email, reset email.
- Zod validation schemas for every auth route.
**Definition of Done:** Full register → verify → login → refresh → logout cycle works via Postman/curl against local dev; failed-login lockout triggers correctly after 5 attempts; unit tests (Jest + Supertest) cover the happy path and key failure cases for every route.

### Phase 3: RBAC & Middleware Chain
**Prerequisites:** Phase 2.
**Goal:** Role + clinic-scoped authorization working exactly per `architecture.md` Section 10.
**Tasks:**
- `rbac` middleware: `requireRole([...])` and clinic-scoping check (Clinic Admin queries auto-filtered by their own `clinicId`, never trusted from request body/params).
- `csrf` middleware (double-submit cookie pattern).
- `rateLimit` middleware (auth routes 5/15min, general 100/min).
- `errorHandler` + `AppError` class + `asyncHandler` wrapper — wire into `app.js` as the final middleware.
- Retrofit Phase 2's auth routes with CSRF + rate limiting.
**Definition of Done:** A test hitting a role-protected route with the wrong role gets 403; a Clinic Admin token cannot read another clinic's data even if they guess/forge a different `clinicId` in the request; CSRF-missing requests on state-changing routes are rejected; rate-limit triggers correctly under repeated requests. All covered by integration tests.

---

## Stage C — Backend Domain Logic

### Phase 4: Clinics, Doctors & Specializations
**Prerequisites:** Phase 3.
**Goal:** Full CRUD + application/approval workflow for clinics, doctors, and specializations.
**Tasks:**
- `clinicService`/`clinicController`: Platform Admin-only clinic onboarding CRUD (`/admin/clinics`).
- `doctorService`/`doctorController`: public doctor search/filter (`/doctors`), doctor profile detail, independent-doctor application with S3 license upload (`storageService` + `/doctors/apply`), admin approval (`/admin/doctors/:id/approve`).
- Clinic Admin doctor management (`/clinic-admin/doctors`) — auto-approved, `clinicId` forced from `req.user.clinicId` per architecture Section 7.8.
- Specialization CRUD (`/admin/specializations`).
- `storageService`: S3 upload/download wrapper.
**Definition of Done:** All roles' CRUD paths tested (public search, independent application + admin approval, clinic-admin doctor add with clinic-scoping enforced); license documents upload/retrieve correctly from S3 (or local-stack equivalent in dev).

### Phase 5: Availability & Slot Generation
**Prerequisites:** Phase 4.
**Goal:** The nightly slot-generation job and availability rule management, exactly per `architecture.md` Section 7.10.
**Tasks:**
- `PUT /doctors/:id/availability` — `AvailabilityRule` CRUD for doctors.
- `jobs/slotGeneration.job.js` — idempotent, 60-day rolling generation, wired into `node-cron`.
- `GET /doctors/:id/slots?date=` — availability lookup for patients.
- `SystemSettings` singleton doc + `PUT /admin/settings` (default slot duration, cancellation window, currency).
**Definition of Done:** Running the job twice doesn't create duplicate slots; changing a doctor's availability rule reflects in tomorrow night's generated slots; `/doctors/:id/slots` returns correct open slots for a given date, timezone-correct (UTC storage, per PRD).

### Phase 6: Booking Engine (Core of the Project)
**Prerequisites:** Phase 5.
**Goal:** The transactional booking flow — this is the architectural centerpiece per `architecture.md` Section 3.3.
**Tasks:**
- `appointmentService.bookSlot()` — the full Mongoose transaction (atomic `isBooked` flip + `Appointment.create`).
- `POST /appointments` (patient, dependent support via `Dependent` model, reCAPTCHA check via `captchaService`).
- `GET /appointments/my`, `GET /appointments/doctor`, `GET /clinic-admin/appointments`.
- `PATCH /appointments/:id/status` (doctor accept/reject/complete/no-show), `PATCH /appointments/:id/cancel` (patient/admin, cancellation-window enforcement).
- `POST /doctors/:id/emergency-unavailable` (architecture Section 7.7 — bulk same-day cancellation).
- `GET /appointments/:id/ics` — calendar export.
**Definition of Done:** Concurrent-booking test (two simultaneous requests for the same slot) — exactly one succeeds, the other gets `SLOT_ALREADY_BOOKED`; full status-transition lifecycle tested; emergency-unavailable correctly cancels only today's confirmed appointments and notifies affected patients (notification wiring stubbed until Phase 8 if needed).

### Phase 7: Reviews, Waitlist & Audit Logging
**Prerequisites:** Phase 6.
**Goal:** The remaining domain features and the compliance-critical audit trail.
**Tasks:**
- `reviewService`: submission (only for `completed` appointments), profanity-filter moderation flagging, `avgRating` recalculation on save, edit window.
- `waitlistService`: join waitlist, FIFO claim-on-cancellation trigger (architecture Section 7.6).
- `auditService` + `auditLogger` middleware wired onto all `appointments`/`users` PHI-adjacent routes.
- `GET /admin/audit-logs` (searchable/paginated).
**Definition of Done:** Review can't be submitted before completion; rating recalculates correctly; waitlist claim triggers on cancellation and expires correctly if unclaimed; every PHI-adjacent action produces a queryable audit log entry.

---

## Stage D — Backend Hardening & Real-Time

### Phase 8: Notifications, Real-Time & Background Jobs
**Prerequisites:** Phase 7.
**Goal:** Full fan-out notification architecture (socket + email + SMS) and the reminder job.
**Tasks:**
- `sockets/index.js`: JWT-authenticated Socket.IO handshake, room joining (`user:{id}`, `clinic:{id}`).
- `notificationService.dispatch()` — the Factory-pattern fan-out described in `architecture.md` Section 12; wire in real `emailChannel` (Nodemailer) and `smsChannel` (MSG91).
- Emit real events (`appointment:created`, `statusChanged`, `cancelled`, `waitlist:slotAvailable`) from all relevant service methods built in Phases 6–7.
- `jobs/reminder.job.js` — 24h/1h reminder sweep, idempotent via `reminder24hSent`/`reminder1hSent` flags.
**Definition of Done:** Booking a slot triggers a real-time socket event, an email, and (for booking/cancellation) an SMS, verified against a real MSG91/SMTP test account; reminder job correctly fires once per threshold and never duplicates.

### Phase 9: 2FA, GDPR & Security Hardening Pass
**Prerequisites:** Phase 8.
**Goal:** Close every remaining item from `TRD.md` Section 7 and PRD Section 6.
**Tasks:**
- 2FA (`speakeasy` + `qrcode`): `/auth/2fa/setup`, `/auth/2fa/verify`; enforce mandatory for `doctor`/`clinic_admin`/`admin` at login (architecture Section 7.2).
- `GET /users/me/export` — GDPR data export.
- Consent versioning fields on `User` + acceptance check at registration/ToS update.
- Explicit CSP directives in `helmet()` config (not defaults).
- Dependabot config + `npm audit --audit-level=high` added as a required CI step.
- Full security review pass against `TRD.md` Section 7 checklist item by item.
**Definition of Done:** Every control in TRD Section 7 is implemented and has at least one test; 2FA-enabled accounts cannot log in with password alone; data export returns a complete, correct JSON of a test user's data.

---

## Stage E — React Patient App

### Phase 10: React Shell, Design System & Public Marketing Pages
**Prerequisites:** Phase 0 (backend phases run in parallel where possible, but public pages need at least Phase 4's clinic/doctor read endpoints).
**Goal:** Landing page and all public marketing/discovery pages, styled per `design.md`.
**Tasks:**
- Implement Tailwind config with Docyra design tokens (`design.md` Section 2).
- Build `PublicLayout` (nav + footer), `apiClient.js` (Axios + interceptor).
- Build: Home/Landing (full section-by-section per `design.md` Section 4), About, Specializations, Clinics (list), Clinic Detail, Doctor Search, Doctor Profile, Blog list/detail, Contact, Privacy Policy, Terms of Service, 404.
**Definition of Done:** Every public page in `design.md` Section 3.1 exists, is responsive at all three breakpoints, pulls real data from the backend (clinics/doctors/specializations — not hardcoded), and passes a basic axe-core accessibility scan.

### Phase 11: React Auth Flow
**Prerequisites:** Phase 10, backend Phase 2/9.
**Goal:** Full patient authentication UI.
**Tasks:**
- Register, Login, Verify Email (landing), Forgot Password, Reset Password pages.
- `AuthContext`, `ProtectedRoute` wrapper.
- Axios interceptor: silent refresh-on-401 with single retry, redirect to login on refresh failure.
**Definition of Done:** Full auth lifecycle usable end-to-end in the browser; protected routes correctly redirect unauthenticated users; token refresh is invisible to the user during normal use.

### Phase 12: React Booking & Patient Dashboard
**Prerequisites:** Phase 11, backend Phase 6/7/8.
**Goal:** Everything an authenticated patient can do.
**Tasks:**
- Set up React Query (`architecture.md` Section 4.2) as the server-state layer.
- Dashboard/My Appointments, multi-step Booking Flow (slot select → dependent/self → CAPTCHA → confirm), Appointment Detail (cancel/reschedule/.ics export/review), Dependents management, My Reviews, Waitlist, Notifications Center, Profile & Settings, Privacy & Data (export/delete request).
- `SocketContext` + `useSocketEvent` hook; wire real-time updates into Dashboard and Appointment Detail.
**Definition of Done:** A patient can complete registration → book → get a real-time + email/SMS confirmation → cancel/reschedule → leave a review, entirely through the UI, matching every page in `design.md` Section 3.1's authenticated list.

---

## Stage F — Angular Portal

### Phase 13: Angular Shell, Auth & Core Services
**Prerequisites:** Phase 0, backend Phase 2/3/9.
**Goal:** The Angular app boots, authenticates all three privileged roles, and routes correctly.
**Tasks:**
- `appConfig` (standalone bootstrap), `authInterceptor`, `csrfInterceptor`, `errorInterceptor`.
- `AuthService`, `authGuard`, `roleGuard` (functional guards).
- Login, 2FA setup/verify, Forgot/Reset Password components.
- `core/models/` — TypeScript interfaces mirroring backend schemas.
**Definition of Done:** All three roles (doctor, clinic_admin, admin) can log in (with mandatory 2FA) and are routed to the correct feature area; wrong-role access attempts are blocked client-side (and confirmed still blocked server-side from Phase 3).

### Phase 14: Angular — Doctor Features
**Prerequisites:** Phase 13, backend Phase 5/6/7/8.
**Goal:** Every doctor-facing page from `design.md` Section 3.2.
**Tasks:**
- Doctor Dashboard, Availability Management, Schedule/Calendar, Appointment Detail (accept/reject/status update), Emergency Unavailable, Patient History, Profile & Settings.
- Wire `AppointmentService`/`DoctorService` (RxJS `BehaviorSubject` pattern per `architecture.md` Section 5.3).
- Socket subscription for real-time schedule updates.
**Definition of Done:** A doctor can set availability, see it reflected in patient-side slot search (cross-app manual test), manage appointment statuses, and trigger emergency unavailability with correct downstream cancellations.

### Phase 15: Angular — Clinic Admin Features
**Prerequisites:** Phase 14.
**Goal:** Every clinic-admin page.
**Tasks:**
- Clinic Dashboard, Manage Doctors (add/edit/deactivate, auto-approved), Clinic Appointments, Clinic Profile & Settings.
**Definition of Done:** A Clinic Admin can fully manage their own clinic's doctors and see only their own clinic's appointments — verified with two test clinics to confirm no data leakage.

### Phase 16: Angular — Platform Admin Features
**Prerequisites:** Phase 15.
**Goal:** Every admin page — the largest single feature set in the portal.
**Tasks:**
- Admin Dashboard, Manage Clinics (onboarding UI), Doctor Applications (review + license document viewer + approve/reject), Manage Specializations, Manage Patients, Audit Log Viewer, Analytics & Reports (with per-clinic breakdown), System Settings.
**Definition of Done:** A Platform Admin can onboard a new clinic, approve an independent doctor application (viewing the uploaded license document), and see it correctly reflected on the patient-facing app — full cross-app manual verification.

---

## Stage G — Quality, Security & Deployment

### Phase 17: Automated Testing Pass
**Prerequisites:** All of Stages B–F functionally complete.
**Goal:** Meet every testing target in `TRD.md` Section 14.
**Tasks:**
- Backend: bring Jest/Supertest coverage to ≥70% on controllers/services (gap-fill anything skipped during earlier phases).
- React: Jest + React Testing Library on core booking flow components/hooks.
- Angular: Jasmine/Karma on availability + booking-status logic.
- Cypress E2E: full booking journey, the concurrent double-booking race test, `cypress-axe` accessibility checks.
- k6 script: concurrent booking load test against a single slot (manual run, per TRD).
**Definition of Done:** All CI-gated test suites pass; k6 report shows zero double-bookings under concurrent load; Cypress accessibility checks show no WCAG 2.1 AA violations on core flows.

### Phase 18: CI Pipeline Completion
**Prerequisites:** Phase 17.
**Goal:** `ci.yml` verifies lint, test, and build workflows across all apps.
**Tasks:**
- Maintain `ci.yml`: full test matrix, linter, and build checks for backend and frontends.
**Definition of Done:** Pull requests and pushes trigger automated CI runs validating code quality, test suites, and production bundles.

### Phase 19: Staging Deployment & Infra Setup
**Prerequisites:** Phase 18.
**Goal:** Docyra is live on staging URLs, exactly per `TRD.md` Section 11.
**Tasks:**
- Provision Atlas M0 cluster, Render service, Vercel project, Netlify site.
- Set all environment variables (TRD Section 4.2) in each platform's dashboard.
- Configure DNS (`patient.docyra.app`, `portal.docyra.app`, `api.docyra.app` or chosen domain), confirm SSL auto-provisioned.
- Set up Sentry projects (3), UptimeRobot health check.
- Run the full `TRD.md` Section 16 pre-deployment checklist.
**Definition of Done:** All three apps reachable at their staging URLs over HTTPS, talking to each other correctly, with monitoring/alerting active.

### Phase 20: End-to-End UAT & Bug-Fix Pass
**Prerequisites:** Phase 19.
**Goal:** A full manual walkthrough of every user story in PRD v3 Section 8, against the live staging environment, by every role.
**Tasks:**
- Walk every P-, D-, CA-, A-, L- user story from PRD v3 as a manual test script against staging.
- Log and fix any defects found.
- Re-run Phase 17's automated suites against staging as a final regression check.
**Definition of Done:** Every user story in the PRD is demonstrably working on the actual deployed staging environment, not just locally — this is the point at which the project is genuinely "deployment ready," matching your original request.

---

## Stage H — Documented, Not Built (Future Roadmap)

These are intentionally **out of this build's scope**, per PRD v3 Section 13, but listed here so nothing is silently dropped:

- **Phase 21 (future): Production Compliance Migration** — Atlas Dedicated + BAA, AWS/GCP HIPAA-eligible hosting, secrets manager migration, formal security/risk review (`TRD.md` Section 12, PRD Section 6.2).
- **Phase 22 (future): Payments & Video Consultation** — Phase 2 features per PRD Section 3.
- **Phase 23 (future): Scale-out Infrastructure** — Redis (rate-limit store + Socket.IO adapter + BullMQ job queue), load balancing, DB read replicas (`architecture.md` Sections 6.4, 11, 13).

---

## Summary Table

| Stage | Phases | Focus |
|---|---|---|
| A | 0 | Setup |
| B | 1–3 | Backend core: data, auth, RBAC |
| C | 4–7 | Backend domain: clinics/doctors, availability, booking, reviews/waitlist/audit |
| D | 8–9 | Real-time, notifications, 2FA/security hardening |
| E | 10–12 | React patient app |
| F | 13–16 | Angular portal (auth, doctor, clinic admin, platform admin) |
| G | 17–20 | Testing, CI/CD, staging deployment, UAT |
| H | 21–23 | Documented future roadmap (not built) |

**Total core phases: 21 (0 through 20).** Each is independently resumable — start any new working session by reading this file's "Prerequisites" line for the next incomplete phase, confirming that state actually exists, then executing that phase's task list.
