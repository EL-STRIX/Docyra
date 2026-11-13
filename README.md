# Docyra — Healthcare Clinic Management & Appointment Platform

Docyra is a full-stack, multi-tenant healthcare platform that connects patients directly with verified partner clinics and licensed medical specialists. Built with an atomic concurrency-locking scheduling engine, it guarantees zero double-booking and provides dedicated, role-specific portals for patients, doctors, clinic administrators, and platform admins.

---

## Architecture Overview

Docyra separates patient-facing discovery and booking from clinic operations:

```
                  ┌──────────────────────────────────────────────┐
                  │                 Docyra Core                  │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     ┌──────────────────────┐                        ┌──────────────────────┐
     │    Patient Portal    │                        │  Operations Portal   │
     │   (React 18 + Vite)  │                        │     (Angular 17)     │
     │  port: 5173          │                        │  port: 4200          │
     │                      │                        │                      │
     │  • Patients          │                        │  • Doctors           │
     │  • Public Visitors   │                        │  • Clinic Admins     │
     │  • Doctor Applicants │                        │  • Platform Admins   │
     └──────────┬───────────┘                        └──────────┬───────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │ HTTP / REST / WebSockets
                                        ▼
                             ┌──────────────────────┐
                             │    Backend Server    │
                             │ (Node.js / Express)  │
                             │ port: 5000           │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │       MongoDB        │
                             │ (Mongoose / Replica) │
                             └──────────────────────┘
```

- **Backend API (`backend`)**: Node.js & Express RESTful API with MongoDB, JWT (HttpOnly cookies + CSRF protection), WebSockets (Socket.io), and Winston audit logging.
- **Patient Portal (`frontend-react`)**: React 18, Vite, Tailwind CSS, TanStack Query, and Lucide icons.
- **Operations Portal (`frontend-angular`)**: Angular 17 (Standalone Components), Angular Material, RxJS, and Tailwind CSS.

---

## User Roles & Capabilities

### 1. Patient Portal (`http://localhost:5173`)
- **Discovery Directory**: Search and filter partner clinics, medical specializations, and verified doctors with transparent consultation fees.
- **Atomic Slot Booking**: Reserve live appointment slots with database-level concurrency protection against simultaneous bookings.
- **Family Dependents**: Add and manage family members to book appointments on their behalf.
- **Waitlist Alerts**: Join automated waitlists for fully booked doctors and receive instant notifications when cancellations open up slots.
- **Appointment Management**: View booking details, calendar `.ics` exports, and policy-compliant appointment cancellations.
- **Verified Reviews & GDPR**: Submit ratings and reviews for completed consultations and manage data export or erasure requests.
- **Doctor Applications**: Apply to join partner clinic rosters directly with credential and medical license uploads.

### 2. Doctor Workspace (`http://localhost:4200`)
- **Clinical Schedule**: Sticky viewport calendar with daily and weekly appointment views and consultation status tags.
- **Recurring Availability Engine**: Define weekly availability rules and custom slot duration intervals (e.g., 15m, 30m, 60m).
- **Emergency Unavailability**: Instantly declare emergency leave, auto-cancelling affected visits with automated patient notification alerts.
- **Patient History**: Access past consultation history and clinical notes for booked patients.
- **Profile Management**: Update professional bio, qualifications, and consultation fee structure.

### 3. Clinic Administrator Workspace (`http://localhost:4200`)
- **Clinic Dashboard**: Live operational metrics, daily appointment load, and physician status overview.
- **Doctor Application Review**: Review incoming doctor applications submitted for their clinic facility; inspect credentials and accept or reject candidates.
- **Physician Roster**: Onboard new doctors, assign specialties, and manage clinic-affiliated practitioner profiles.
- **Facility Profile**: Manage clinic operating hours, location details, desk phone, and contact information.

### 4. Platform Administrator Workspace (`http://localhost:4200`)
- **Platform Analytics**: Global KPIs across onboarded partner clinics, registered doctors, and total patient bookings.
- **Partner Clinic Onboarding**: Review, onboard, edit, and toggle subscription statuses (Active / Suspended) for medical facilities.
- **Specialization Catalog**: Create and maintain medical departments, specialties, icons, and descriptions.
- **Patient User Management**: View registered patients, track account status, and manage access permissions.
- **Immutable Audit Logs**: Real-time searchable log records tracking all critical platform events (auth, appointments, emergency triggers, role changes) by actor and IP.
- **System Settings**: Configure global policies including appointment cancellation lock windows, currency parameters, and slot horizon days.

---

## Core Platform Principles

1. **Atomic Concurrency Protection**: Database-level locking guarantees two patients can never reserve the same time slot, even during millisecond-close concurrent submissions.
2. **Multi-Tenant Clinic Facility Boundary**: Doctors practice under affiliated partner clinics. Applications flow directly to the specific clinic administrator for vetting.
3. **Strict Portal Separation**: Patients operate exclusively through the React application; healthcare staff (Doctors, Clinic Admins, Platform Admins) authenticate through the Angular Operations Portal.
4. **Real-Time Collaboration**: Socket.io event channels instantly propagate appointment status updates, waitlist activations, and emergency schedule changes.

---

## Getting Started

To run Docyra locally on your machine, follow the step-by-step instructions in the setup guide:

👉 **[SETUP.md](./SETUP.md)**

---

## Repository Structure

```
Docyra/
├── backend/                  # Node.js Express API, MongoDB models, business services, test suites
├── frontend-react/           # React 18 patient-facing portal and public discovery site
├── frontend-angular/         # Angular 17 operations portal for doctors, clinic admins & platform admins
├── Doc/                      # Architecture specifications, PRD, TRD, and design documentation
├── .github/workflows/        # Automated CI/CD pipeline (linting, tests, production builds)
├── README.md                 # Project summary and role architecture
└── SETUP.md                  # Local installation, database seeding, and execution guide
```

---

## License

This project is licensed under the MIT License.
