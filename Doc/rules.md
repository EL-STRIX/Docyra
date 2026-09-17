# Project Rules — Docyra

**Companion documents:** PRD v3, `design.md`, `TRD.md`, `architecture.md`, `phases.md`
**Purpose:** The non-negotiable rules and strong conventions that keep Docyra consistent, stable, and secure across every phase and every build session — whether that session is you or an AI coding agent. Every other document says *what* to build; this document says *how to behave while building it*.

Rules are split into two tiers:
- 🔴 **Hard Rule** — never break this. Breaking it introduces a real bug, security hole, or inconsistency that compounds across later phases.
- 🟡 **Convention** — follow by default; deviating requires a stated reason, not silence.

---

## 1. Source-of-Truth Rules

🔴 **R1.1** — `PRD_v3`, `design.md`, `TRD.md`, and `architecture.md` are the source of truth. If code and a doc disagree, the doc wins until the doc is deliberately updated — never silently code around a documented decision.
🔴 **R1.2** — Any deviation from an established decision (a different library, a different field name, a different flow) must be called out explicitly in the response/commit, not made silently. If you (or an agent) genuinely believe a documented decision is wrong, say so and propose the change — don't just build it differently.
🟡 **R1.3** — When a new decision is made that isn't in any doc yet (e.g. Phase 10's React Query choice), it should be added back into `architecture.md` or the relevant doc, not left to live only in code.

---

## 2. Session & Phase Discipline (for `phases.md` execution)

🔴 **R2.1** — Before starting any phase, verify its "Prerequisites" line against actual repo state — don't assume a previous session finished cleanly. Run the previous phase's Definition of Done checks first if there's any doubt.
🔴 **R2.2** — Never mark a phase done, or move to the next phase, until its Definition of Done in `phases.md` is actually satisfied — including tests, not just "the feature seems to work."
🔴 **R2.3** — Don't modify a file inside an already-completed phase's scope while working on a later phase, unless the later phase's task list explicitly calls for it (e.g. Phase 8 wiring real notification channels into Phase 6's booking service is expected; an unrelated refactor of Phase 6 while doing Phase 14 is not).
🟡 **R2.4** — If a phase turns out to be bigger than expected once you're in it, split it rather than silently cutting scope — update `phases.md` to reflect the split so the document stays trustworthy for the next session.

---

## 3. Code Organization Rules

🔴 **R3.1** — Follow the folder structure in `architecture.md` Section 3.2 (backend) and Sections 4–5 (frontends) exactly. New files go where the architecture says they go, not wherever is convenient in the moment.
🔴 **R3.2** — Respect the layering rule: controllers never touch Mongoose directly; services never touch `req`/`res`; dependencies point downward only (Route → Middleware → Controller → Service → Model). This is what keeps business logic testable — violating it once tends to cascade.
🟡 **R3.3** — One file, one responsibility. If a service file is handling two unrelated domains (e.g. `doctorService` starting to contain clinic logic), split it.

---

## 4. Naming Conventions

🟡 **R4.1** — Files: `camelCase.js` for backend modules, `PascalCase.jsx`/`.tsx` for React/Angular components, `kebab-case` for Angular file names per Angular CLI convention (`doctor-dashboard.component.ts`).
🟡 **R4.2** — API routes: plural nouns, kebab-case where multi-word (`/api/v1/clinic-admin/doctors`), never verbs in the path (`/approve` as a sub-resource action is fine — `PATCH /admin/doctors/:id/approve` — but avoid `/getDoctors`).
🟡 **R4.3** — MongoDB fields: `camelCase`, matching the schemas already defined in PRD Section 9 and `architecture.md` — don't introduce a second casing style anywhere in the same collection.
🔴 **R4.4** — Error codes (`AppError.code`) are `SCREAMING_SNAKE_CASE` and must be unique, documented constants in `config/constants.js` — never a raw string typed inline at the throw site, since that guarantees drift between what's thrown and what the frontend checks for.
🟡 **R4.5** — Git branches: `feature/<phase-number>-<short-description>` (e.g. `feature/06-booking-transaction`), matching `phases.md` numbering so history is traceable back to the plan.

---

## 5. API Contract Rules

🔴 **R5.1** — Every response follows the standard shape from `TRD.md` Section 6 — `{ success, data, meta }` or `{ success: false, error: { code, message } }`. No endpoint returns a bare object or array outside this envelope.
🔴 **R5.2** — All routes live under `/api/v1`. A breaking change to an existing endpoint's contract means adding `/api/v2` alongside it, not mutating `/v1` in place.
🔴 **R5.3** — Every mutating (POST/PATCH/PUT/DELETE) route must pass through: rate limiter → auth → CSRF check → RBAC → Zod validation, in that order, before reaching the controller. Skipping any of these "just for this one route" is a security hole, not a shortcut.
🟡 **R5.4** — Pagination defaults (10/page, 50 max) are applied to every list endpoint, no exceptions without a documented reason.

---

## 6. Security Rules (non-negotiable — these protect real patient data eventually)

🔴 **R6.1** — Never log or expose a password hash, JWT secret, API key, or any `.env` value — not in console logs, not in error messages returned to the client, not in commit history.
🔴 **R6.2** — Never disable CSRF, rate limiting, or CAPTCHA "temporarily for testing" in a way that could ship — use environment-based conditionals (`if (env !== 'test')`) instead of commenting out security middleware.
🔴 **R6.3** — Every route touching `Appointment`, `User`, or license-document data must go through the `auditLogger` middleware — this is a compliance requirement (PRD Section 6), not optional logging.
🔴 **R6.4** — RBAC checks happen server-side, always — a frontend route guard hiding a button is UX, never the actual security boundary. Never build a feature that relies on the frontend to enforce access control.
🔴 **R6.5** — `clinicId` scoping for Clinic Admins is always derived from `req.user.clinicId` (from the verified JWT), never accepted from request body/params/query — this is the exact rule that prevents one clinic from reading another's data.
🟡 **R6.6** — Any new third-party dependency is checked against `npm audit` before merging, per the CI gate in `TRD.md` Section 10.

---

## 7. Database & Data Integrity Rules

🔴 **R7.1** — The booking write path (`AppointmentSlot.isBooked` flip + `Appointment.create`) must always run inside a MongoDB transaction, exactly as specified in `architecture.md` Section 3.3. This is the single most important stability rule in the entire project — do not "simplify" it, even temporarily.
🔴 **R7.2** — Never query `AppointmentSlot`/`Appointment` without going through `appointmentService` — no controller or other service should hand-roll its own booking logic that bypasses the transaction.
🔴 **R7.3** — Schema changes (new field, new index, renamed field) always go through a `migrate-mongo` migration — never a manual one-off script against a live database, and never a silent schema drift where code assumes a field that no migration created.
🟡 **R7.4** — Prefer soft-delete/status fields (`status: 'deactivated'`) over hard deletes for `User`, except where PRD Section 6.4 explicitly requires hard deletion (GDPR erasure requests) — audit trails depend on records persisting by default.

---

## 8. Frontend Consistency Rules

🔴 **R8.1** — Colors, type scale, spacing, and radii come from the design tokens in `design.md` Section 2 — no hardcoded hex values or arbitrary pixel values scattered in components. Tailwind config (React) and SCSS variables (Angular) are the single source for these values in each app.
🟡 **R8.2** — Server state in React goes through React Query (`architecture.md` Section 4.2); Angular shared state goes through service-level `BehaviorSubject`s. Don't introduce a second state-management pattern (e.g. Redux, NgRx) without updating `architecture.md` first — that's a real architectural decision, not a local one.
🔴 **R8.3** — Every new page must be added to `design.md` Section 3's page inventory (or already exist there) — a page that isn't in the sitemap is either scope creep or a doc that needs updating; it shouldn't just silently appear.
🟡 **R8.4** — Every interactive element needs a visible focus state and passes contrast checks per `design.md` Section 6 — accessibility isn't a final-pass cleanup, it's checked as each component is built.

---

## 9. Error Handling & Logging Rules

🔴 **R9.1** — Every async controller is wrapped in `asyncHandler`; every thrown business error is an `AppError` with a code from `constants.js` — never a bare `throw new Error('something broke')` in service code.
🔴 **R9.2** — The client never receives a raw stack trace or internal error message — unknown/unexpected errors always return the generic 500 shape from `TRD.md` Section 6, with the real detail going to Winston/Sentry only.
🟡 **R9.3** — Use the shared Winston logger (`utils/logger.js`) everywhere — no stray `console.log` left in committed code.

---

## 10. Testing Rules

🔴 **R10.1** — No phase in `phases.md` is complete without its stated tests passing — a feature that "works when I click through it manually" is not done per this project's definition.
🔴 **R10.2** — The booking transaction (Phase 6) requires an explicit concurrent-request test proving only one of two simultaneous bookings for the same slot succeeds — this is the one test that must never be skipped or weakened.
🟡 **R10.3** — New backend logic includes a test in the same PR/session that adds it — tests are not a separate later phase for individual features, only for the project-wide testing pass (Phase 17) that catches gaps.

---

## 11. Git & Change Management Rules

🔴 **R11.1** — No direct commits to `main`. All work happens on `feature/*` branches, merged via PR, per `TRD.md` Section 15.
🔴 **R11.2** — CI (lint, tests, `npm audit`) must pass before merge — no merging with a known-broken pipeline "to fix later."
🟡 **R11.3** — Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) so history stays readable and traceable to phases.

---

## 12. Environment & Configuration Rules

🔴 **R12.1** — `.env` files are never committed. `.env.example` is kept in sync with every variable actually used in code — an undocumented required variable is a bug in the docs, fix it immediately when found.
🔴 **R12.2** — Test/reCAPTCHA/sandbox keys are used in `local`/`staging`; production keys are never used outside the real production environment (per `TRD.md` Section 16 checklist).
🟡 **R12.3** — New config values are validated in `config/env.js` (Zod), not read ad hoc via `process.env.X` scattered through the codebase.

---

## 13. Documentation Upkeep Rules

🟡 **R13.1** — If a phase introduces a genuinely new architectural decision (a new library, a new pattern) not already documented, update `architecture.md` or `TRD.md` in the same session — don't let the docs silently go stale while code moves on.
🟡 **R13.2** — Complex, non-obvious logic (the booking transaction, the waitlist FIFO claim, the emergency-cancellation fan-out) gets inline comments explaining *why*, not just *what* — the code should be understandable without re-reading `architecture.md` every time.

---

## 14. Scope Discipline

🔴 **R14.1** — Stage H items (payments, video consultation, production BAA migration, Redis/BullMQ scale-out) stay out of the build unless explicitly re-scoped — per PRD Section 13 and `phases.md` Stage H, these are documented, not built, by design. Don't let an agent "helpfully" start building them.
🟡 **R14.2** — If a genuinely useful idea comes up mid-build that isn't in any doc, don't silently build it — surface it first (same pattern as every clarifying question asked throughout this project's planning), then add it to the right doc if approved.

---

## Quick Reference — The 10 Rules That Matter Most

If nothing else is remembered, these are the ones that actually keep the project stable:

1. Booking always goes through the transaction (R7.1).
2. RBAC and clinic-scoping are enforced server-side, from the JWT, always (R6.4, R6.5).
3. Every mutating route passes through the full security middleware chain (R5.3).
4. No phase is "done" without its tests passing (R10.1).
5. No direct commits to `main`, CI must pass (R11.1, R11.2).
6. Standard API response envelope, always (R5.1).
7. Design tokens only — no hardcoded styling values (R8.1).
8. Secrets never logged, never committed (R6.1, R12.1).
9. Docs are source of truth — deviations are surfaced, not silent (R1.1, R1.2).
10. Stage H stays out of scope unless explicitly re-opened (R14.1).
