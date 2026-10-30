# Technical Requirements Document (TRD)
## Docyra — Doctor Booking Platform

**Companion documents:** `Doctor_Booking_System_PRD_v3_FINAL.md` (product/business requirements), `design.md` (UI/UX system)
**Scope of this document:** How Docyra is actually built, configured, and deployed. The PRD defines *what* and *why*; this defines *how*. Business rationale, user stories, and compliance reasoning are not repeated here — see the PRD.

---

## 0. Document Control

| Version | Date | Notes |
|---|---|---|
| v1.0 | Current | First TRD, aligned to PRD v3.0 and design.md |

---

## 1. Technology Stack (Locked Versions)

| Layer | Technology | Version |
|---|---|---|
| Patient frontend | React | 18.x (via Vite, not CRA) |
| Patient frontend styling | Tailwind CSS | 3.x |
| Patient frontend routing | React Router | 6.x |
| Patient frontend HTTP | Axios | 1.x |
| Doctor/Clinic/Admin frontend | Angular | 17.x (standalone components, no NgModules) |
| Angular UI kit | Angular Material | matching Angular 17.x |
| Backend | Node.js | 20.x LTS |
| Backend framework | Express.js | 4.x |
| Language (backend) | JavaScript (ES2022+) | — |
| Database | MongoDB | 7.x (Atlas-managed) |
| ODM | Mongoose | 8.x |
| Real-time | Socket.IO | 4.x |
| Validation | Zod | 3.x |
| Auth | JWT (`jsonwebtoken`) + bcrypt + `speakeasy` (2FA TOTP) | — |
| Job scheduling | `node-cron` | 3.x |
| Email | Nodemailer (SMTP) — SendGrid/Postmark swap-in ready | — |
| SMS | MSG91 SDK (default; Twilio as fallback) | — |
| File storage | AWS S3 (or S3-compatible: Cloudflare R2) | — |
| Error tracking | Sentry (backend + both frontends) | — |
| CI/CD | GitHub Actions | — |

---

## 2. System Architecture

```
                        ┌────────────────────────┐
                        │        DNS / CDN          │
                        │  (Cloudflare, in front of │
                        │   both frontend apps)     │
                        └────────────┬─────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                             │                             │
┌───────▼────────┐          ┌────────▼─────────┐                    │
│ React (Patient)  │          │ Angular (Doctor/   │                    │
│ Hosted: Vercel    │          │ Clinic/Admin)      │                    │
│ patient.docyra.app│          │ Hosted: Netlify    │                    │
│                    │          │ portal.docyra.app  │                    │
└───────┬────────┘          └────────┬─────────┘                    │
        │        HTTPS / REST v1 + WSS (JWT cookie)                 │
        └────────────────────────────┼────────────────────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │   Node.js + Express API     │
                        │   Hosted: Render (staging)  │
                        │   api.docyra.app            │
                        │   - REST controllers (v1)   │
                        │   - Socket.IO server         │
                        │   - node-cron jobs           │
                        │   - Sentry SDK                │
                        └──┬───────────┬────────────┘
                           │           │
              ┌────────────▼──┐   ┌────▼─────────────┐
              │ MongoDB Atlas   │   │ AWS S3 (license    │
              │ (M0 dev/staging │   │ docs, photos,       │
              │ → M10+ prod)    │   │ server-side AES256) │
              └────────────────┘   └────────────────────┘

External services: MSG91 (SMS) · SMTP provider (email) · Google reCAPTCHA v3 · Sentry
```

---

## 3. Repository Structure (Monorepo)

```
docyra/
├── backend/
│   ├── src/
│   │   ├── config/          # env loading, db connection, constants
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/
│   │   ├── routes/          # versioned: routes/v1/*
│   │   ├── middleware/      # auth, rbac, validation, rateLimit, audit
│   │   ├── services/        # email, sms, s3, captcha, socket
│   │   ├── jobs/            # cron: slot-generation, reminders, waitlist-sweep
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── frontend-react/
│   ├── src/
│   │   ├── components/ pages/ context/ hooks/ services/ routes/
│   └── package.json
├── frontend-angular/
│   ├── src/app/
│   │   ├── core/ (services, guards, interceptors)
│   │   ├── features/ (patient N/A here — doctor/, clinic-admin/, admin/, auth/)
│   │   └── shared/ (components, pipes, directives)
│   └── package.json
├── .env.example
├── .github/workflows/        # ci.yml
└── docs/                      # PRD, design.md, this TRD
```

---

## 4. Environment & Configuration

### 4.1 Environments

| Env | Purpose | Data | Hosting |
|---|---|---|---|
| `local` | Individual dev machine | Synthetic/seed | Local Node.js + MongoDB |
| `staging` | Shared testing, demo, academic submission | Synthetic only | Render + Vercel + Netlify + Atlas M0 |
| `production` (future) | Real clinics/patients | Real (PHI) | AWS/GCP + Atlas Dedicated (BAA) — per PRD Section 6.2 migration plan, not built now |

### 4.2 Environment Variables (`.env.example` — backend)

```
# Server
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000/api/v1

# Database
MONGODB_URI=mongodb://localhost:27017/docyra

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_SALT_ROUNDS=12

# 2FA
TOTP_ISSUER=Docyra

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@docyra.app

# SMS (MSG91)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=

# File storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=docyra-uploads
AWS_REGION=ap-south-1

# CAPTCHA
RECAPTCHA_SECRET_KEY=

# Monitoring
SENTRY_DSN=

# CORS
ALLOWED_ORIGINS=https://patient.docyra.app,https://portal.docyra.app
```

Frontend apps get their own minimal `.env` (API base URL, reCAPTCHA site key, Sentry DSN) — never secrets that must stay server-side.

### 4.3 Secrets Management
- `local`/`staging`: `.env` files, git-ignored.
- `production` (future): AWS Secrets Manager / GCP Secret Manager — no plaintext env files once real credentials/PHI are involved (per PRD 6.1).

---

## 5. Database Design

Collections and fields are fully specified in PRD v3 Section 9 — this section adds the technical layer PRD doesn't cover: indexes and constraints.

| Collection | Key Indexes |
|---|---|
| `users` | unique `email`; `role`; `clinicId` |
| `doctorprofiles` | `clinicId`; `specializationId`; `isApproved` |
| `appointmentslots` | **unique compound** `{ doctorId, slotStart, slotEnd }`; `{ doctorId, isBooked, slotStart }` for fast availability queries |
| `appointments` | `{ patientId, status }`; `{ doctorId, slotStart }`; `{ clinicId }` |
| `clinics` | unique `name`; `subscriptionStatus` |
| `reviews` | `{ doctorId, status }` |
| `auditlogs` | `{ actorId, timestamp }`; TTL not applied (retained per PRD 6.5) |
| `waitlists` | `{ doctorId, desiredDateRangeStart }` |

**Migrations:** `migrate-mongo` for versioned schema/index migrations — avoids manual, undocumented index changes in production.

**Booking transaction (critical path):**
```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  const slot = await AppointmentSlot.findOneAndUpdate(
    { _id: slotId, isBooked: false },
    { isBooked: true },
    { session, new: true }
  );
  if (!slot) throw new AppError('SLOT_ALREADY_BOOKED', 409);
  await Appointment.create([{ ...appointmentData, slotId }], { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

## 6. API Contract Standards

- **Base path:** `/api/v1` — all routes versioned; breaking changes ship as `/api/v2` alongside, not in place.
- **Auth header:** JWT delivered via HTTP-only cookie (`accessToken`); CSRF token delivered via a separate readable cookie (`csrfToken`) and required in the `X-CSRF-Token` header on every state-changing request.
- **Standard success shape:** `{ "success": true, "data": {...}, "meta": { "page", "limit", "total" } }` (meta only on list endpoints).
- **Standard error shape:** `{ "success": false, "error": { "code": "SLOT_ALREADY_BOOKED", "message": "..." } }`.
- **HTTP status conventions:** 200 (OK), 201 (created), 204 (no content/delete), 400 (validation), 401 (auth), 403 (forbidden/RBAC), 404 (not found), 409 (conflict — e.g. slot race), 422 (business-rule violation), 429 (rate-limited), 500 (server error, generic message only — never leak stack traces to the client).
- **Pagination:** `?page=1&limit=10` query params, `limit` max 50, default 10.
- Full endpoint list: see PRD v3 Section 10 (unchanged, this TRD does not repeat it).

---

## 7. Security Implementation Details

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds |
| Access token | JWT, 15 min expiry, HTTP-only/`Secure`/`SameSite=Strict` cookie |
| Refresh token | JWT, 7 days, rotated on every use, same cookie flags; old token invalidated server-side on rotation |
| CSRF | Double-submit cookie pattern — `csrf-csrf` npm package or equivalent middleware |
| 2FA | `speakeasy` for TOTP generation/verification + `qrcode` for enrollment QR; mandatory for `doctor`/`clinic_admin`/`admin` roles |
| Rate limiting | `express-rate-limit`: 5 req/15min on `/auth/*`, 100 req/min general, backed by a shared store (Redis) if scaled beyond a single instance |
| CAPTCHA | Google reCAPTCHA v3 on `/auth/register` and `/appointments` (booking) |
| Headers | `helmet()` with explicit `contentSecurityPolicy` directives (script-src/style-src/img-src/connect-src restricted to known origins) |
| Input validation | Zod schema per route, rejected before touching controllers |
| Dependency scanning | GitHub Dependabot enabled; `npm audit --audit-level=high` as a required CI check (fails the build on high/critical) |
| Audit logging | Middleware on all `appointments`/`users` PHI-adjacent routes, writes to `auditlogs` (actor, action, target, timestamp, IP) |

---

## 8. Real-Time Architecture (Socket.IO)

- Client connects with the access-token cookie; server authenticates the socket handshake using the same JWT verification as REST.
- Rooms: `user:{userId}` (personal) and `clinic:{clinicId}` (for Clinic Admin dashboards to see live clinic-wide activity).
- Events emitted: `appointment:created`, `appointment:statusChanged`, `appointment:cancelled`, `waitlist:slotAvailable`.
- On emit, the same event triggers the email/SMS fallback service in parallel (not sequentially dependent on socket delivery).
- Client reconnect strategy: on reconnect, re-fetch current state via REST to reconcile — sockets are a UX accelerant, never the source of truth (per PRD Edge Cases).

---

## 9. Background Jobs (`node-cron`)

| Job | Schedule | Purpose |
|---|---|---|
| Slot generation | Nightly, 00:00 | Roll each doctor's `AvailabilityRule` forward into bookable `AppointmentSlot` documents, 60-day horizon |
| Reminder sweep | Every 15 min | Find appointments 24h/1h out with `reminder24hSent`/`reminder1hSent` false; send email+SMS, flip flag |
| Waitlist sweep | On appointment cancellation (event-driven, not polled) | Notify earliest waitlisted patient, open a claim window |
| Audit log retention check | Weekly | No-op in dev; placeholder for future archival once retention policy (PRD 6.5) is enforced in production |

---

## 10. CI/CD Pipeline (GitHub Actions)

**`ci.yml`** — runs on every PR:
1. Install dependencies (backend, frontend-react, frontend-angular — matrix job)
2. Lint (ESLint/Prettier for JS; Angular ESLint for TS)
3. Unit + integration tests (Jest/Supertest backend, Jest/RTL React, Jasmine/Karma Angular)
4. `npm audit --audit-level=high` (fails build on high/critical vulnerabilities)
5. Cypress E2E (core booking flow + axe-core accessibility check) against a preview build

**`deploy-staging.yml`** — runs on merge to `main`, after CI passes:
1. Deploy backend to Render (auto-deploy via GitHub integration, or `render-cli` step)
2. Deploy React app to Vercel (`vercel --prod` via CLI action)
3. Deploy Angular app to Netlify (`netlify deploy --prod` via CLI action)
4. Run `migrate-mongo up` against staging DB
5. Post-deploy smoke test: hit `/api/v1/health`, fail the workflow if non-200

---

## 11. Deployment (Staging — build this now)

| Component | Steps |
|---|---|
| MongoDB | Create Atlas M0 cluster → whitelist Render's IP (or 0.0.0.0/0 for staging only) → create DB user → copy `MONGODB_URI` into Render env vars |
| Backend | New Render Web Service → connect GitHub repo, root `backend/` → build `npm install`, start `npm start` → set all env vars from Section 4.2 → enable auto-deploy on push to `main` |
| React app | New Vercel project → root `frontend-react/` → framework preset: Vite → set `VITE_API_BASE_URL=https://api.docyra.app/api/v1` and reCAPTCHA site key → connect custom subdomain `patient.docyra.app` |
| Angular app | New Netlify site → root `frontend-angular/` → build `ng build --configuration production` → publish `dist/frontend-angular/browser` → set env replacement for `apiBaseUrl` → connect custom subdomain `portal.docyra.app` |
| DNS | Point `docyra.app` (or chosen domain) A/CNAME records: `patient.` → Vercel, `portal.` → Netlify, `api.` → Render |
| SSL | Auto-provisioned by Vercel/Netlify/Render (Let's Encrypt) — no manual cert management needed at this stage |

## 12. Deployment (Production — documented for later, per PRD 6.2)

Not built now. When real patient data is in scope: migrate MongoDB to Atlas Dedicated (M10+, BAA signed), migrate backend to AWS ECS/GCP Cloud Run (BAA-eligible), move secrets to AWS/GCP Secret Manager, enable VPC/private networking between backend and DB, re-run full security review.

---

## 13. Monitoring, Logging & Alerting

- **Sentry:** one project per app (backend, React, Angular) — captures unhandled exceptions + performance traces.
- **Logging:** Winston (structured JSON) for application logs, Morgan for HTTP access logs, both shipped to Render's log stream (staging) — no separate log aggregator needed at this scale.
- **Uptime:** UptimeRobot (free tier) pinging `/api/v1/health` every 5 min, alert via email on failure.
- **Alert thresholds:** Sentry alert on >10 errors/hour; UptimeRobot alert on 2 consecutive failed health checks.

---

## 14. Testing Strategy (Technical)

| Layer | Tooling | CI Gate |
|---|---|---|
| Backend unit/integration | Jest + Supertest | ≥70% coverage on controllers/services, required to pass PR |
| React | Jest + React Testing Library | Component + hook tests on core booking flow |
| Angular | Jasmine + Karma (default) | Component/service tests on availability + booking-status logic |
| E2E | Cypress | Full booking journey + concurrent double-booking race test |
| Load | k6 | Script simulating concurrent booking requests against one slot; run manually pre-submission, not on every PR |
| Accessibility | axe-core (via `cypress-axe`) | Runs inside the Cypress E2E suite, fails on WCAG 2.1 AA violations |

---

## 15. Coding Standards & Git Workflow

- **Branching:** `main` (deployable) ← `feature/*` branches via PR. No direct commits to `main`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) for a clean, gradeable history.
- **Linting:** ESLint + Prettier (backend, React); Angular ESLint (Angular) — enforced in CI, not just editor config.
- **PR requirement:** CI must pass (lint, test, audit) before merge.

---

## 16. Pre-Deployment Checklist

- [ ] All env vars set in Render/Vercel/Netlify dashboards (Section 4.2)
- [ ] Atlas cluster created, IP-whitelisted, connection string verified
- [ ] `migrate-mongo up` run against target DB
- [ ] Health check (`/api/v1/health`) returns 200 from the deployed backend URL
- [ ] CORS `ALLOWED_ORIGINS` matches actual deployed frontend URLs
- [ ] reCAPTCHA site/secret keys are the **production** keys, not test keys
- [ ] Sentry DSNs set for all three apps
- [ ] SMTP + MSG91 credentials verified with a real test send
- [ ] SSL active on all three subdomains (auto, but confirm no mixed-content warnings)
- [ ] Cypress E2E suite passing against the staging URL, not just localhost
