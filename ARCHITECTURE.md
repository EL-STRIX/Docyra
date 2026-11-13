# System Architecture & Technical Design

This document details the internal engineering architecture of Docyra: how requests flow through the system, how data boundaries are enforced, how the atomic scheduling engine eliminates double-booking, and how real-time events propagate to frontends.

---

## 1. Architectural Style & Principles

Docyra is structured as a **Modular Monolith** backend serving two independent single-page frontend applications:

- **Single Deployment Unit, Strict Domain Boundaries**: The backend runs as a single Node.js Express service, internally partitioned into domain-specific modules (`Auth`, `Clinics`, `Doctors`, `Appointments`, `Reviews`, `Waitlist`, `Audit`).
- **Twin Dedicated Frontends**:
  - **Patient Portal (`frontend-react`)**: Optimized for discovery, SEO, public booking, and patient account management.
  - **Operations Portal (`frontend-angular`)**: Optimized for high-density administrative workflows, real-time schedule calendars, and clinic management.
- **Stateless REST + Real-Time Layer**: The primary source of truth is REST over HTTPS. A synchronized Socket.IO WebSocket layer provides instant push updates without relying on polling.

---

## 2. High-Level Component Topology

```
                  ┌────────────────────────┐         ┌────────────────────────┐
                  │      React App         │         │      Angular App       │
                  │   (Patient Portal)     │         │  (Operations Portal)   │
                  │    localhost:5173      │         │     localhost:4200     │
                  └───────────┬────────────┘         └───────────┬────────────┘
                              │                                  │
                              │     HTTPS REST + WSS (Socket.io) │
                              └─────────────────┬────────────────┘
                                                │
                                    ┌───────────▼────────────┐
                                    │      Express API       │
                                    │     localhost:5000     │
                                    └───────────┬────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 │                              │                              │
        ┌────────▼─────────┐           ┌────────▼─────────┐           ┌────────▼─────────┐
        │  Middleware Pipe │           │  Domain Services │           │ Background Jobs  │
        │  • Helmet / CORS │           │  • Auth / RBAC   │           │  • Nightly Slot  │
        │  • Rate Limiting │           │  • Appointment   │           │    Generation    │
        │  • CSRF / Cookie │           │  • Slot Engine   │           │  • 24h & 1h      │
        │  • Zod Validate  │           │  • Audit Logging │           │    Reminders     │
        └──────────────────┘           └────────┬─────────┘           └──────────────────┘
                                                │
                                       ┌────────▼─────────┐
                                       │     MongoDB      │
                                       │ (Mongoose Models)│
                                       └──────────────────┘
```

---

## 3. Backend Request Lifecycle & Pipeline

Every inbound HTTP request traverses a standardized layered pipeline:

```
[Inbound Request]
       │
       ▼
1. Security & Hygiene     → Helmet, CORS whitelist, Cookie-Parser, JSON Parser
       │
       ▼
2. Rate Limiting          → IP rate limiter on sensitive authentication routes
       │
       ▼
3. Authentication         → Reads JWT from HttpOnly cookie; verifies signature & expiry
       │
       ▼
4. Authorization (RBAC)   → Checks user role (patient, doctor, clinic_admin, admin)
       │
       ▼
5. Request Validation     → Zod schema validation (sanitizes & validates body, query, params)
       │
       ▼
6. Controller (Thin)      → Orchestrates request data; delegates to service layer
       │
       ▼
7. Service Layer          → Enforces business logic & transactional integrity
       │
       ▼
8. Model / Database       → Mongoose schemas execute queries & transactional commits
       │
       ▼
9. Centralized Error      → Catches AppError instances; formats consistent JSON response
```

---

## 4. Atomic Concurrency Engine (Zero Double-Booking)

The most critical technical challenge in appointment scheduling is concurrent slot reservation. When two patients attempt to book the exact same slot milliseconds apart, Docyra prevents race conditions using **database-level transactional isolation**:

```
Patient A ──[POST /appointments/book]──┐
                                       ├──► [MongoDB ACID Transaction]
Patient B ──[POST /appointments/book]──┘     │
                                             ├─► 1. Query AppointmentSlot by ID
                                             ├─► 2. Check isBooked === false
                                             ├─► 3. If false:
                                             │      Set isBooked = true, reservedBy = Patient A
                                             │      Commit Transaction (201 Created)
                                             │
                                             └─► 4. Concurrent request evaluates isBooked === true:
                                                    Abort Transaction
                                                    Return ConflictError (409 SLOT_ALREADY_BOOKED)
```

- **Two-Phase Slot Transition**: Slots transition atomically from `available` to `booked`.
- **System Cancellation Window**: If an appointment is cancelled, the slot is made available again, and an event is published to notify matching patients on the **Waitlist**.

---

## 5. Domain Boundaries & Services

| Domain | Key Models | Service Responsibilities |
| :--- | :--- | :--- |
| **Auth** | `User` | Login, registration, 2FA TOTP verification, password resets, refresh tokens. |
| **Clinics** | `Clinic` | Facility onboarding, address normalization, subscription states, doctor roster scoping. |
| **Doctors** | `DoctorProfile`, `Specialization` | Specialty assignment, bio credentials, fee structure, independent vs. clinic practice. |
| **Availability & Slots** | `AvailabilityRule`, `AppointmentSlot` | Weekly availability matrix, slot generation engine (30m intervals), emergency overrides. |
| **Appointments** | `Appointment` | Transactional bookings, dependent tracking, status state machine (`pending` → `confirmed` → `completed` / `cancelled`). |
| **Waitlist** | `Waitlist` | Captures patient preferences for fully booked doctors; triggers priority alerts upon slot opening. |
| **Audit Logs** | `AuditLog` | Structured immutable audit ledger tracking user IDs, actions, resource types, and IP addresses. |

---

## 6. Real-Time WebSocket Infrastructure

Docyra utilizes **Socket.IO** connected directly to the Node.js HTTP server:

- **Client Connections**: Patients and operations staff authenticate during the WebSocket handshake using their session cookie.
- **Private Rooms**: Users join room channels scoped by their User ID (`user:<id>`) and Clinic ID (`clinic:<id>`).
- **Core Event Channels**:
  - `appointment:created`: Alert sent to doctor and patient upon confirmation.
  - `appointment:statusChanged`: Triggers instant UI update when an appointment is marked completed or cancelled.
  - `waitlist:slotAvailable`: Instant notification delivered to waitlisted patients when a slot opens up.

---

## 7. Database Indexing Strategy

To guarantee rapid queries under high volume, compound indexes are maintained on high-traffic collections:

- **`AppointmentSlot`**:
  - `{ doctorId: 1, slotStart: 1 }` — Fast lookup for doctor availability calendars.
  - `{ doctorId: 1, isBooked: 1, slotStart: 1 }` — Accelerated available slot querying.
- **`Appointment`**:
  - `{ patientId: 1, appointmentDate: -1 }` — Patient consultation timeline.
  - `{ doctorId: 1, appointmentDate: -1 }` — Doctor daily schedule queries.
- **`AuditLog`**:
  - `{ action: 1, createdAt: -1 }` — Real-time administrative audit filtering.
  - `{ actorId: 1, createdAt: -1 }` — User action traceability.
