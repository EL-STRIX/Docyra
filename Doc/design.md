# Design Specification — Docyra
## UI/UX Design System & Full Page Inventory

**Companion to:** `Doctor_Booking_System_PRD_v3_FINAL.md`
**Project name:** Docyra
**Visual reference:** Dentoi (Framer template) — structure, tone, and visual language adapted from `https://philosophical-pages-578596.framer.app/`

---

## 0. Reference Note (read before implementing)

The reference site was read via text/structure extraction, not a rendered screenshot — so this spec captures its **layout pattern, section order, tone, and inferred visual language** (confirmed by image alt-text: a gradient hero background, a hospital photo, icon-based stat badges, quote-icon testimonials, a "verified" trust badge) rather than pixel-exact hex codes or font files. The palette and spacing below are a professional, faithful interpretation of that same visual language, built for a multi-clinic platform instead of a single dental practice. If you can share a screenshot later, I can tighten any of this to match exactly.

---

## 1. Brand Identity

| Element | Value |
|---|---|
| Name | **Docyra** |
| Tagline | *"Find your clinic. Book your care."* |
| Tone | Clean, calm, trustworthy, modern — not clinical-cold, not playful. Same register as the reference site. |
| Logo direction | Wordmark, medium-weight sans-serif, lowercase or sentence case ("Docyra"), paired with a simple abstract mark (e.g. a rounded cross, pulse line, or calendar-check glyph) — avoid literal stethoscope/red-cross clichés. |

---

## 2. Visual Design System

### 2.1 Color Palette

Following the reference site's pattern — a soft neutral base, one deep trust-building primary, one warm accent for CTAs, plus semantic status colors (needed for appointment statuses, which the reference site doesn't have but Docyra does).

```
Primary (trust/brand):     #0F5C5C   deep teal        — headers, nav, primary buttons
Primary Light:              #E6F2F1   pale teal tint   — section backgrounds, hover states
Accent (CTA/energy):        #F2A93B   warm amber/gold  — "Book Now" buttons, highlights, badges
Neutral Background:         #FAFAF8   warm off-white   — page background (not stark white)
Neutral Surface:            #FFFFFF   white            — cards, forms
Neutral Border:             #E7E5E0   soft warm grey   — dividers, card borders
Text Primary:                #1A2E2E   near-black teal  — headings
Text Secondary:              #5C6B6B   muted grey-teal  — body copy
Gradient (hero backgrounds): teal-to-transparent radial blur, matching the reference's "Background Gradient" hero treatment

Semantic (Docyra-specific, not in reference):
  Success / Confirmed:       #2E9E6B
  Warning / Pending:         #F2A93B  (reuse accent)
  Error / Cancelled:         #D9534F
  Info / No-show:            #6C757D
```

### 2.2 Typography

- **Font family:** A modern geometric/humanist sans-serif in the same family as the reference (Poppins, Manrope, or Inter — pick one and use consistently across React + Angular for brand cohesion).
- **Scale:**
  - H1 (hero): 44–56px, semi-bold, tight line-height (1.1)
  - H2 (section titles): 32–36px, semi-bold
  - H3 (card titles): 20–22px, medium
  - Body: 16px, regular, 1.6 line-height
  - Small/meta (badges, timestamps): 13–14px, medium
- **Eyebrow labels** (small caps or icon+label above section headings, e.g. "Services", "Testimonials" in the reference) — reuse this pattern for Docyra sections ("Clinics", "Specializations", "Patient Stories").

### 2.3 Layout & Spacing

- 12-column responsive grid, max content width ~1280px, generous side padding (80px desktop / 24px mobile).
- Section vertical rhythm: 96–120px between major sections on desktop, 56–64px on mobile — matches the reference's spacious, uncluttered feel.
- Cards: white surface, 16–20px border-radius, soft shadow (`0 8px 24px rgba(15,92,92,0.08)`), 1px soft border.
- Buttons: pill or 12px-rounded, primary teal fill for main actions, amber fill for high-priority CTAs ("Book Appointment"), outline style for secondary actions.

### 2.4 Imagery & Iconography

- Real, warm photography for hero/team sections (not stock-clinical) — matches the reference's approach.
- Line-style icons (not filled) for services/specialization cards, consistent stroke width.
- Avatar photos (circular, consistent crop) for doctor/team cards and testimonials, same as reference.
- Trust badges as small icon+number stat chips (the reference's "2000+ Reviews", "4.5+ Rating", "MDCO Verified" pattern) — Docyra equivalents: "X+ Clinics Onboarded", "X+ Verified Doctors", "4.x+ Patient Rating".

### 2.5 Motion / Animation

Matching the reference template's subtle, professional motion language (typical of Framer sites):
- Fade-up on scroll for section content (elements enter at ~20px offset + opacity 0→1).
- Card hover: slight lift (`translateY(-4px)`) + shadow deepen, 200ms ease.
- Button hover: background darken/lighten 10%, 150ms ease.
- Testimonial/logo strips: slow auto-scrolling marquee (as seen in the reference's repeating testimonial cards).
- Page transitions: simple crossfade, no heavy parallax — keep it calm, not flashy, appropriate for a healthcare context.

### 2.6 Cross-Framework Consistency (React + Angular)

Since Docyra ships two frontends (React patient app, Angular clinic/doctor/admin portal — per PRD v3), define this palette and type scale **once as design tokens** and implement in both:
- **React:** Tailwind config (`tailwind.config.js`) — extend theme with the exact hex values above as named colors (`teal-primary`, `amber-accent`, etc.).
- **Angular:** SCSS variables/Angular Material custom theme using the same hex values, so the internal portal doesn't feel like a different product from the patient-facing site, even though it's a more utilitarian dashboard UI (denser tables, Material components) rather than a marketing site.

---

## 3. Full Page Inventory (Sitemap)

Calculated directly from every feature in PRD v3 — organized by app, then by access level. Nothing in the PRD is left without a page.

### 3.1 React — Patient App (Public Marketing + Patient Portal)

**Public (unauthenticated) — marketing/discovery, styled per Section 2 above**

| # | Page | Purpose |
|---|---|---|
| 1 | **Home / Landing** | Hero, how-it-works, featured clinics/specializations, trust stats, testimonials, CTA — directly modeled on the reference site's structure (Section 4 below has the layout breakdown) |
| 2 | **About** | Platform story, mission, how clinic partnerships work |
| 3 | **Specializations** | Grid of specializations covered (equivalent of reference's "Services" page) |
| 4 | **Clinics** | Browse all onboarded, active clinics (search/filter by name, city, specialization — no map) |
| 5 | **Clinic Detail** | Clinic profile, address, contact, roster of doctors at that clinic |
| 6 | **Doctors / Find a Doctor** | Search/filter independent + clinic doctors by specialization/name/rating |
| 7 | **Doctor Profile** | Bio, qualifications, fee, clinic affiliation, rating/reviews, live availability calendar |
| 8 | **Independent Doctor Application** | Form + license document upload for doctors applying without a clinic |
| 9 | **Blog / Health Articles** | Listing page (optional content marketing, mirrors reference's blog section) |
| 10 | **Blog Article Detail** | Single article view |
| 11 | **Contact** | General inquiries (separate from booking) |
| 12 | **Privacy Policy** | Legal |
| 13 | **Terms of Service** | Legal |
| 14 | **Register** | Patient signup |
| 15 | **Login** | Patient login (+2FA prompt if enabled) |
| 16 | **Verify Email** | Token-based verification landing |
| 17 | **Forgot Password** | Request reset link |
| 18 | **Reset Password** | Set new password via token |
| 19 | **404 / Not Found** | Error page |

**Authenticated (Patient Portal)**

| # | Page | Purpose |
|---|---|---|
| 20 | **Dashboard / My Appointments** | Upcoming + past appointments, status badges |
| 21 | **Book Appointment (flow)** | Select slot → self/dependent → reason → CAPTCHA → confirm (multi-step) |
| 22 | **Appointment Detail** | View/cancel/reschedule, calendar export (.ics), leave review after completion |
| 23 | **Waitlist** | View/manage active waitlist entries |
| 24 | **Dependents** | Add/manage family member profiles |
| 25 | **Reviews (My Reviews)** | View/edit submitted reviews within edit window |
| 26 | **Notifications Center** | In-app history of real-time + email/SMS notifications |
| 27 | **Profile & Settings** | Contact info, timezone, password change, 2FA setup |
| 28 | **Privacy & Data** | GDPR data export request, account deletion request |

**React total: 28 pages**

---

### 3.2 Angular — Doctor, Clinic & Admin Portal

**Shared (all roles)**

| # | Page | Purpose |
|---|---|---|
| 1 | **Login** | Role-aware login (+ mandatory 2FA verify step) |
| 2 | **2FA Setup / Verify** | TOTP enrollment + code entry |
| 3 | **Forgot / Reset Password** | Recovery flow |

**Doctor role**

| # | Page | Purpose |
|---|---|---|
| 4 | **Doctor Dashboard** | Today's appointments, quick stats |
| 5 | **Availability Management** | Set weekly recurring availability rules |
| 6 | **Schedule / Calendar** | Full appointment calendar/list view |
| 7 | **Appointment Detail** | Accept/reject (if manual mode), mark complete/no-show |
| 8 | **Emergency Unavailable** | Trigger same-day cancellation flow |
| 9 | **Patient History** | Per-patient visit history |
| 10 | **Doctor Profile & Settings** | Bio, fee, qualifications, photo |

**Clinic Admin role**

| # | Page | Purpose |
|---|---|---|
| 11 | **Clinic Dashboard** | Clinic-level overview stats |
| 12 | **Manage Doctors** | Add/edit/deactivate doctors under own clinic (auto-approved) |
| 13 | **Clinic Appointments** | All appointments across the clinic's doctors |
| 14 | **Clinic Profile & Settings** | Clinic contact info, address |

**Platform Admin role**

| # | Page | Purpose |
|---|---|---|
| 15 | **Admin Dashboard** | Platform-wide analytics summary |
| 16 | **Manage Clinics** | Onboard new clinics, edit/suspend existing ones |
| 17 | **Doctor Applications** | Review independent-doctor applications + license documents, approve/reject |
| 18 | **Manage Specializations** | CRUD specialization list |
| 19 | **Manage Patients** | Search/view/deactivate patient accounts |
| 20 | **Audit Log Viewer** | Searchable log of PHI-adjacent access/changes |
| 21 | **Analytics & Reports** | Platform + per-clinic breakdowns, trends |
| 22 | **System Settings** | Slot duration, cancellation window, currency, other global config |

**Angular total: 22 pages**

---

### 3.3 Grand Total

**28 (React) + 22 (Angular) = 50 pages/views**, covering every functional requirement, role, and edge case defined in PRD v3 — nothing in the PRD is without a corresponding screen.

---

## 4. Home / Landing Page — Detailed Layout (primary reference-matched page)

This is the page most directly modeled on the Dentoi reference, section-for-section, re-purposed for Docyra's multi-clinic model:

1. **Nav bar** — logo, Home / Clinics / Doctors / Specializations / Blog, "Book Appointment" CTA button (amber), Login link
2. **Hero** — gradient-blurred background (teal), large headline ("Find the right doctor. Book in minutes."), sub-copy, primary CTA ("Find a Clinic"), trust-stat chips (clinics onboarded, verified doctors, patient rating) — mirrors the reference's "1500+ Trusted Patients" chip row
3. **"How it Works"** — 3-step visual (Browse a clinic → Pick a doctor & slot → Get instant confirmation) — replaces the reference's single-clinic value props with the platform's actual flow
4. **Specializations grid** — icon cards (6–8 specializations), each linking to filtered doctor search — direct equivalent of the reference's "Services" grid
5. **Featured Clinics** — card carousel of onboarded clinics (name, city, doctor count, rating) — new section, not in reference, but necessary for the clinic-based model
6. **Stats band** — "X+ Clinics", "X+ Doctors", "X+ Appointments Booked" — equivalent of reference's stats section
7. **Testimonials** — patient review cards with quote icon, name, role/city — same pattern as reference
8. **Trust section** ("Why Docyra") — 4 feature callouts (Verified Clinics Only, Real-Time Booking, Secure & Private, Reminders Built In) — Docyra-specific replacement of the reference's "Reputation Since 2017" block
9. **Blog preview** — 3 latest articles (optional)
10. **CTA band** — "Ready to book your appointment?" + button, before footer
11. **Footer** — logo blurb, contact, quick links (About, Clinics, Privacy, Terms), social icons

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stacked cards, bottom-sheet style booking flow |
| Tablet | 640–1024px | 2-column grids for cards/specializations |
| Desktop | > 1024px | Full grid layouts as described above |
| Angular portal | Desktop-first | Doctor/Clinic/Admin portal optimized for desktop use (dashboards, tables); tablet-usable, mobile not a priority per PRD |

---

## 6. Accessibility Tie-In

Per PRD v3 Section 12 (WCAG 2.1 AA target): all interactive elements need visible focus states in the primary teal color, color contrast checked for text-on-teal and text-on-amber combinations specifically (amber-on-white for CTA text needs verification — dark text on amber is safer than white-on-amber), and the fade-up scroll animations must respect `prefers-reduced-motion`.

---

## 7. Next Steps

1. Confirm the palette/typography direction above (or share a screenshot of the reference site so I can tighten exact values).
2. I can generate the actual Home page as a coded React component next, using this design system.
3. Component-by-component build order would typically follow the page inventory in Section 3, starting with Home → Clinics → Doctor Profile → Booking flow.
