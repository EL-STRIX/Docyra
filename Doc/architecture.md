# System Architecture — Docyra

**Companion documents:** PRD v3 (product), `design.md` (UI/UX), `TRD.md` (tech stack, deployment, environments)
**Scope of this document:** The internal engineering architecture — how the system is structured, how data and requests flow through it, what patterns are used and why, and how every component fits together. This is implementation-ready, not conceptual.

---

## 0. Document Control

| Version | Date | Notes |
|---|---|---|
| v1.0 | Current | Aligned to PRD v3.0, design.md, TRD v1.0 |

---

## 1. Architectural Style & Principles

- **Style:** Modular monolith backend (single Express service, internally layered and domain-separated) serving two independent single-page frontends. Not microservices — unnecessary operational overhead for this scale, and PRD/TRD already commit to one Node service.
- **Communication:** REST over HTTPS for all request/response operations; Socket.IO (WebSocket) as a real-time *accelerant* layered on top, never the source of truth (state is always reconcilable via REST — established in PRD Edge Cases).
- **Statelessness:** The API holds no server-side session; all auth state travels in the JWT. This is what allows horizontal scaling later without sticky sessions.
- **Separation of concerns:** Each backend request passes through distinct, single-responsibility layers (Section 3.2). Each frontend keeps UI, state, and data-fetching in separate, replaceable layers (Sections 4–5).
- **Domain boundaries (internal, not microservices):** `Auth`, `Users/Patients`, `Doctors`, `Clinics`, `Appointments`, `Reviews`, `Notifications`, `Admin/Audit` — each has its own model(s), service(s), controller(s), and routes folder. This is what makes a future microservices split possible later without a rewrite, even though it isn't one now.

---

## 2. High-Level System Architecture

```
┌──────────────────┐        ┌──────────────────┐
│  React (Patient)   │        │ Angular (Doctor/    │
│  patient.docyra.app│        │ Clinic/Admin)       │
│                     │        │ portal.docyra.app   │
└─────────┬─────────┘        └─────────┬─────────┘
          │      HTTPS REST /api/v1 + WSS           │
          └───────────────────┬────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Express App Entry     │
                    │   (app.js / server.js)  │
                    │  ┌───────────────────┐  │
                    │  │ Global middleware    │  │  ← helmet, cors, rate-limit,
                    │  │ chain                │  │     body-parser, morgan
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Route layer (v1)     │  │  ← /auth /doctors /clinics
                    │  └─────────┬─────────┘  │     /appointments /admin ...
                    │  ┌─────────▼─────────┐  │
                    │  │ Auth + RBAC          │  │
                    │  │ middleware            │  │
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Zod validation       │  │
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Controllers           │  │  ← thin, orchestration only
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Services (business    │  │  ← all business logic lives here
                    │  │ logic layer)           │  │
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Models / Repositories  │  │  ← Mongoose schemas + query layer
                    │  └─────────┬─────────┘  │
                    │  ┌─────────▼─────────┐  │
                    │  │ Central error handler │  │  ← catches everything, formats
                    │  └───────────────────┘  │     standard error response
                    │  Socket.IO server (attached to same HTTP server)
                    │  node-cron jobs (in-process scheduler)
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                       │                       │
┌───────▼───────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│ MongoDB Atlas    │    │ AWS S3 (files)     │    │ External services  │
│                   │    │                     │    │ MSG91 / SMTP / reCAPTCHA / Sentry │
└─────────────────┘    └───────────────────┘    └───────────────────┘
```

---

## 3. Backend Architecture

### 3.1 Layering principle

Each layer only talks to the layer directly beneath it, and dependencies point downward only — controllers never touch Mongoose directly, services never touch `req`/`res`. This is what keeps business logic (e.g. the booking transaction) testable without spinning up Express at all.

| Layer | Responsibility | May depend on |
|---|---|---|
| Routes | URL → controller wiring, per-route middleware attachment | Controllers, middleware |
| Middleware | Cross-cutting concerns (auth, RBAC, validation, rate-limit, audit) | Services (sparingly — e.g. audit middleware calls `auditService`) |
| Controllers | Parse request → call service → shape response. **No business logic.** | Services only |
| Services | All business rules, orchestration, transactions | Models/repositories, other services (e.g. `appointmentService` calls `notificationService`) |
| Models | Mongoose schemas, static query helpers | Database only |

### 3.2 Folder-to-Responsibility Map

```
backend/src/
├── config/
│   ├── db.js                # Mongoose connection (singleton)
│   ├── env.js                # validated env var loading (fail fast on missing vars)
│   └── constants.js          # role enums, status enums, error codes
├── models/
│   ├── User.js Clinic.js DoctorProfile.js Specialization.js
│   ├── AvailabilityRule.js AppointmentSlot.js Appointment.js
│   ├── Dependent.js Review.js Waitlist.js AuditLog.js SystemSettings.js
├── middleware/
│   ├── auth.js                # verifies JWT, attaches req.user
│   ├── rbac.js                # requireRole([...]), clinic-scoping check
│   ├── validate.js            # Zod schema wrapper
│   ├── rateLimit.js
│   ├── csrf.js
│   ├── auditLogger.js         # writes to AuditLog on PHI-adjacent routes
│   └── errorHandler.js        # final middleware, formats standard error shape
├── routes/v1/
│   ├── auth.routes.js clinics.routes.js doctors.routes.js
│   ├── appointments.routes.js reviews.routes.js
│   ├── clinicAdmin.routes.js admin.routes.js health.routes.js
├── controllers/                # 1:1 with routes files above
├── services/
│   ├── authService.js         # register/login/2FA/token issuance
│   ├── doctorService.js clinicService.js
│   ├── appointmentService.js  # booking transaction lives here
│   ├── notificationService.js # fan-out: socket + email + SMS (Section 12)
│   ├── auditService.js waitlistService.js reviewService.js
│   ├── storageService.js      # S3 upload/download
│   └── captchaService.js
├── jobs/
│   ├── slotGeneration.job.js reminder.job.js
├── sockets/
│   └── index.js                # room join logic, event emitters
├── utils/
│   ├── AppError.js             # custom error class hierarchy
│   └── asyncHandler.js         # wraps async controllers, forwards errors
├── app.js                      # Express app assembly (middleware + routes)
└── server.js                   # HTTP server bootstrap, attaches Socket.IO + cron
```

### 3.3 Request Lifecycle (concrete example — booking)

```
POST /api/v1/appointments
  → rateLimit middleware (100/min check)
  → auth middleware (verify JWT, attach req.user)
  → csrf middleware (validate X-CSRF-Token header)
  → validate middleware (Zod: doctorId, slotId, bookedForType, reasonForVisit)
  → captchaService.verify(token) — inline in controller or its own middleware
  → appointmentController.create(req, res, next)
      → appointmentService.bookSlot({ patientId, slotId, ... })
          → starts Mongoose session/transaction
          → AppointmentSlot.findOneAndUpdate (atomic isBooked flip)
          → Appointment.create
          → commits transaction
          → notificationService.notifyBookingCreated(appointment)  [fire-and-forget, doesn't block response]
          → auditService.log({ actor: patientId, action: 'APPOINTMENT_CREATED', ... })
      → returns created Appointment
  → controller sends { success: true, data: appointment }
  (any thrown AppError at any layer is caught by asyncHandler → passed to errorHandler middleware → standard error JSON)
```

---

## 4. Frontend Architecture — React (Patient App)

### 4.1 Component/data-flow model

```
App.jsx
 ├─ PublicLayout (nav + footer)  →  Home, About, Specializations, Clinics,
 │                                    ClinicDetail, DoctorSearch, DoctorProfile,
 │                                    Blog, Contact, Legal pages, Auth pages
 └─ PatientLayout (auth-gated, via <ProtectedRoute>)
        → Dashboard, BookingFlow, AppointmentDetail, Waitlist,
          Dependents, Reviews, Notifications, Profile, PrivacyData

Data flow (unidirectional):
  Page component
    → custom hook (e.g. useDoctors(), useAppointments())
        → services/api/*.js (Axios instance, one file per domain: doctors.api.js, appointments.api.js)
            → backend REST
    ← hook returns { data, isLoading, error } (React Query recommended — see 4.2)
  Page renders from hook state; mutations (booking, cancel) go through the same hook's mutate function, which invalidates the relevant cached query on success.
```

### 4.2 State management decision

- **Server state** (doctors, appointments, clinics — anything from the API): **React Query (TanStack Query)** — not raw `useState`/`useEffect` fetching. This wasn't explicit in the PRD but is the correct professional default for API-backed state: automatic caching, refetch-on-reconnect (directly solves the "reconcile after socket disconnect" requirement from PRD Edge Cases), and loading/error states without hand-rolled boilerplate.
- **Client/UI state** (form inputs, modal open/close, booking-flow step): local `useState`/`useReducer`.
- **Auth/session state**: `AuthContext` (Context API) — holds current user + role, wraps the app, read by `ProtectedRoute` and nav.
- **Socket connection**: a single `SocketContext` provider, established once at the authenticated-layout level, exposes `useSocketEvent(eventName, handler)` for pages to subscribe to relevant events (e.g. `AppointmentDetail` listens for `appointment:statusChanged` scoped to its own ID).

### 4.3 Services layer

```
src/services/
├── apiClient.js       # Axios instance: baseURL, withCredentials, response interceptor
│                        (401 → silent refresh attempt → retry original request once → else redirect to login)
├── doctors.api.js clinics.api.js appointments.api.js
├── reviews.api.js waitlist.api.js users.api.js
```

---

## 5. Frontend Architecture — Angular (Doctor/Clinic/Admin Portal)

### 5.1 Standalone component tree

```
main.ts → bootstrapApplication(AppComponent, appConfig)
appConfig: providers = [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor, csrfInterceptor]))]

routes (app.routes.ts):
  /login /2fa-setup /forgot-password  (public)
  /doctor/**    → canActivate: [authGuard, roleGuard(['doctor'])]
  /clinic/**    → canActivate: [authGuard, roleGuard(['clinic_admin'])]
  /admin/**     → canActivate: [authGuard, roleGuard(['admin'])]
```

### 5.2 Feature folder structure

```
frontend-angular/src/app/
├── core/
│   ├── services/         # AuthService, AppointmentService, DoctorService,
│   │                        ClinicService, AdminService — all HttpClient-based,
│   │                        injected via constructor DI (root-provided singletons)
│   ├── guards/            # authGuard, roleGuard (functional guards)
│   ├── interceptors/      # authInterceptor (attach cookie is automatic;
│   │                        this attaches CSRF header + handles 401→refresh),
│   │                        errorInterceptor (global error toast + Sentry capture)
│   └── models/             # TypeScript interfaces mirroring backend schemas
├── features/
│   ├── auth/               # Login, 2FA setup/verify, password reset components
│   ├── doctor/              # Dashboard, Availability, Schedule, AppointmentDetail,
│   │                          EmergencyUnavailable, PatientHistory, ProfileSettings
│   ├── clinic-admin/        # Dashboard, ManageDoctors, ClinicAppointments, ClinicProfile
│   └── admin/                # Dashboard, ManageClinics, DoctorApplications,
│                                Specializations, Patients, AuditLog, Analytics, Settings
└── shared/
    ├── components/           # AppointmentStatusBadge, DataTable, ConfirmDialog, etc.
    ├── pipes/                 # timezone-aware date pipe
    └── directives/            # appHighlightStatus (structural/attribute directive per PRD)
```

### 5.3 State management decision

- Each feature service exposes a `BehaviorSubject`-backed observable for its own domain state (e.g. `AppointmentService.appointments$`), components subscribe via the `async` pipe — standard Angular reactive pattern, no NgRx needed at this complexity (matches PRD's stated "NgRx only if it outgrows this").
- Cross-cutting state (current user/role) lives in `AuthService`, injected wherever needed via DI — this is the concrete demonstration of Angular's dependency injection the original project brief asked for.

---

## 6. Cross-Cutting Concerns

### 6.1 Error handling architecture
- Custom `AppError` class (`code`, `httpStatus`, `message`) thrown anywhere in services.
- Every controller wrapped in `asyncHandler(fn)` — forwards any thrown/rejected error to `next(err)` without repetitive try/catch in every controller.
- Single `errorHandler` middleware at the end of the middleware chain: known `AppError` → formatted response with its status/code; unknown errors → logged to Sentry + generic 500, **never** leak stack traces to the client.

### 6.2 Logging architecture
- Winston logger instance (`utils/logger.js`), structured JSON output, log levels (`error`, `warn`, `info`, `debug`) — imported wherever needed, not `console.log`.
- Morgan for HTTP access logs, piped through Winston's stream so both land in the same log destination.

### 6.3 Configuration architecture
- `config/env.js` validates all required env vars at boot using Zod — **the app fails to start immediately** with a clear message if a required var is missing, rather than failing confusingly at first use.

### 6.4 Caching (new, not previously specified — flagging as an addition)
- No caching layer in the initial build (MongoDB queries are indexed and fast enough at this scale). If `rateLimit` or Socket.IO horizontal scaling is ever needed across multiple backend instances, **Redis** is the documented next step (shared rate-limit store + Socket.IO adapter) — not built now, noted so the architecture doesn't block it later.

---

## 7. Key Sequence Flows

**7.1 Registration → Verification**
`Register form → POST /auth/register → authService creates User(status: unverified) → emits verification token (JWT, short-lived) → notificationService sends verification email → user clicks link → GET /auth/verify-email?token= → authService validates token → User.status = active`

**7.2 Login with 2FA (doctor/clinic_admin/admin)**
`POST /auth/login (email+password) → credentials valid → if twoFactorEnabled: respond 200 with { requires2FA: true, tempToken } (no full session yet) → client prompts for TOTP code → POST /auth/2fa/verify (tempToken + code) → speakeasy verifies → full JWT pair issued as cookies`

**7.3 Booking (already detailed in 3.3)** — the transaction is the architectural centerpiece; everything else in the flow is orchestration around it.

**7.4 Doctor accepts/rejects a pending appointment**
`PATCH /appointments/:id/status (doctor, manual-approval mode) → rbac middleware confirms req.user.id === appointment.doctorId → appointmentService.updateStatus → if rejected, slot.isBooked reset to false (re-opens it) → notificationService fans out to patient`

**7.5 Notification fan-out (Section 12 detail)**
`Any status-changing service call → notificationService.dispatch(event, payload) → in parallel: (a) socket.io emit to user:{userId} room, (b) emailService.send(...), (c) if event is booking/cancellation/reminder: smsService.send(...) — none block on the others; failures in one channel are logged but don't fail the request`

**7.6 Waitlist claim**
`Appointment cancelled → appointmentService emits internal event → waitlistService.findEarliest(doctorId, dateRange) → if found: notify that patient with a claim link (short expiry) → patient claims → re-runs the same booking transaction as 3.3 → if claim expires unclaimed: slot simply becomes generally bookable again (no further waitlist cascade in v1 — documented simplification)`

**7.7 Emergency unavailability**
`POST /doctors/:id/emergency-unavailable → doctorService finds all today's status:'confirmed' appointments for that doctor → transactionally cancels each, sets cancelledBy: 'doctor-emergency' → notificationService fans out to every affected patient immediately`

**7.8 Clinic Admin adds a doctor**
`POST /clinic-admin/doctors → rbac confirms role clinic_admin → clinicId taken from req.user.clinicId (never from request body — prevents a Clinic Admin from injecting another clinic's ID) → doctorService.create({ ...body, clinicId, isApproved: true })` — auto-approval per PRD's stated design decision.

**7.9 Independent doctor application → approval**
`POST /doctors/apply (public, + S3 license upload) → DoctorProfile.isApproved = false → appears in admin queue → PATCH /admin/doctors/:id/approve → on approve: isApproved = true, notify doctor; on reject: notify doctor with reason, record stays for audit trail (not deleted)`

**7.10 Nightly slot generation (cron)**
`node-cron @ 00:00 → jobs/slotGeneration.job.js → for each active AvailabilityRule → generate AppointmentSlot documents 60 days forward at SystemSettings.defaultSlotDurationMinutes increments → skip any that already exist (idempotent, safe to re-run)`

---

## 8. Design Patterns Applied

| Pattern | Where | Why |
|---|---|---|
| Layered architecture | Backend (Section 3.1) | Testability, separation of business logic from HTTP concerns |
| Repository-ish query layer | Mongoose models with static query methods | Keeps raw queries out of services, centralizes query logic per collection |
| Middleware chain | Express request pipeline | Composable, reusable cross-cutting concerns |
| Factory | `notificationService` channel selection (socket/email/SMS) | One call site, channel logic encapsulated and swappable |
| Strategy | `rbac` middleware (`requireRole([...])`, clinic-scoping check) | Same middleware shape, different authorization rules per route |
| Singleton | DB connection (`config/db.js`), Winston logger instance | One connection pool, one logger instance app-wide |
| Observer/Pub-Sub | Socket.IO event emission, internal waitlist trigger on cancellation | Decouples the triggering action from what reacts to it |
| Dependency Injection | Angular services/guards/interceptors throughout | Framework-native, exactly what the original project brief wanted demonstrated |
| Custom error hierarchy | `AppError` + centralized `errorHandler` | Predictable, standardized error responses across every route |

---

## 9. Data Architecture & Consistency Model

- **Strong consistency required:** the booking write path (`AppointmentSlot.isBooked` flip + `Appointment.create`) — enforced via MongoDB multi-document transactions (Section 3.3), because this is the one place where a race condition has real-world consequences (double-booking a patient into a doctor's time).
- **Eventual consistency acceptable:** `avgRating`/`totalReviews` on `DoctorProfile` (recalculated via aggregation on review save, small delay acceptable), analytics dashboards (Section pulled on-demand, not real-time-guaranteed).
- **Read-heavy paths** (doctor search, availability lookup) are optimized via the indexes defined in TRD Section 5 rather than caching, at this scale.

---

## 10. Security Architecture (layered view)

```
Request →  [1] CORS check  →  [2] Rate limiter  →  [3] Helmet/CSP headers
        →  [4] JWT verification (auth middleware)  →  [5] CSRF token check (state-changing only)
        →  [6] RBAC + clinic-scoping  →  [7] Zod input validation  →  [8] Controller/Service
        →  [9] Audit log write (PHI-adjacent routes only, async, non-blocking)
```
Each layer can reject the request independently; a failure at any layer short-circuits before reaching business logic. Full control-by-control detail (bcrypt rounds, 2FA library, etc.) is in TRD Section 7 — this section is the *ordering and flow*, not the control inventory.

---

## 11. Scalability Path (documented, not built now)

1. **Current (staging/academic build):** single Render instance, stateless API — already horizontally scalable in principle since there's no server-side session.
2. **If load increases:** add a second Render/AWS instance behind a load balancer; move rate-limit store and Socket.IO adapter to Redis (Section 6.4) so both work correctly across multiple instances.
3. **If DB becomes the bottleneck:** Atlas read replicas for search/availability read traffic, keep booking transactions on the primary.
4. **If file storage grows:** already on S3 (Section 3.2), scales natively — no architectural change needed.

---

## 12. Notification Architecture (Fan-Out Detail)

```
notificationService.dispatch(eventType, payload)
        ├── socketChannel.emit(payload)        (always attempted, best-effort)
        ├── emailChannel.send(payload)          (always attempted for the events listed in PRD P-7)
        └── smsChannel.send(payload)             (only for booking/cancellation/reminders — not every event)

Each channel is its own module implementing a common `send(payload)` interface — 
swapping SMS providers (MSG91 → Twilio) or email providers (SMTP → SendGrid) later 
means changing one module, not call sites throughout the codebase.
```

---

## 13. Background Job Architecture

- `node-cron` runs **in-process** with the main Express server for this build's scale (simpler than a separate worker process/queue).
- **Documented future step, not built now:** if job volume grows (e.g. SMS reminders at real scale), migrate to a proper job queue (BullMQ + Redis) so jobs survive a server restart and can be retried/monitored independently — flagged here so the architecture doesn't have to be redesigned later, consistent with the Redis note in Section 6.4 and 11.

---

## 14. Deployment Architecture (summary)

Full step-by-step deployment procedure is in TRD Sections 10–12. Architecturally: three independently deployable units (backend, React app, Angular app) behind their own subdomains, DNS-routed, each with its own CI/CD pipeline stage — a failure or redeploy of one frontend never requires redeploying the others or the backend.

---

## 15. Appendix: Module Responsibility Quick Reference

| Module | One-line responsibility |
|---|---|
| `authService` | Registration, login, token issuance/refresh, 2FA, password reset |
| `doctorService` | Doctor profile CRUD, application review, availability rules |
| `clinicService` | Clinic CRUD, clinic-scoped doctor management |
| `appointmentService` | Booking transaction, status updates, cancellation, emergency-unavailable |
| `notificationService` | Fan-out to socket/email/SMS |
| `waitlistService` | Waitlist enrollment + claim-on-cancellation logic |
| `reviewService` | Review submission, moderation flagging, rating recalculation |
| `auditService` | Writes to `AuditLog` on PHI-adjacent actions |
| `storageService` | S3 upload/download for license docs and photos |
| `captchaService` | reCAPTCHA token verification |
