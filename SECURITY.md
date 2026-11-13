# Security Policy & Procedures

Security and patient data privacy are core foundations of the Docyra healthcare platform. This document outlines our vulnerability disclosure policies, architectural security controls, and data protection practices.

---

## 1. Supported Versions

Security patches and dependency updates are applied to the active `main` branch.

| Version | Supported |
| :--- | :--- |
| `1.x` (main branch) | :white_check_mark: Active |
| `< 1.0` | :x: Not Supported |

---

## 2. Reporting a Vulnerability

If you discover a potential security vulnerability within Docyra, **do not open a public GitHub issue**. Instead, follow responsible disclosure:

1. Send an email to **`security@docyra.app`** with:
   - Description of the vulnerability.
   - Step-by-step instructions or Proof of Concept (PoC) to reproduce the issue.
   - Affected endpoints, components, or dependencies.
   - Potential impact on patient privacy or system integrity.
2. The core engineering team will acknowledge receipt within **24 hours**.
3. We will provide an assessment and timeline for a patch within **72 hours**.
4. Once resolved, a security advisory and attribution will be published upon mutual agreement.

---

## 3. Core Architectural Security Controls

### Authentication & Token Management
- **HttpOnly Cookies**: Session tokens (access and refresh JWTs) are transmitted exclusively via `HttpOnly`, `Secure`, and `SameSite: Strict/Lax` cookies, shielding them from Cross-Site Scripting (XSS) extraction.
- **CSRF Defense**: All state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) enforce a Double Submit Cookie CSRF token validated via custom `X-CSRF-Token` headers.
- **Two-Factor Authentication (2FA)**: Mandatory TOTP (RFC 6238) support for high-privilege accounts (Platform Admins and Clinic Admins).
- **Password Hashing**: User credentials are encrypted using `bcrypt` with a minimum of 12 work factor salt rounds.

### Access Control & Multi-Tenant Isolation
- **Role-Based Access Control (RBAC)**: Strict role boundaries enforced at the gateway and route middleware:
  - `patient`: Discovery, personal appointment booking, family dependents, and privacy controls.
  - `doctor`: Clinical schedule, patient consultation history, and emergency unavailability triggers.
  - `clinic_admin`: Scoped strictly to their affiliated clinic facility and physician roster.
  - `admin`: Global facility onboarding, audit logs, and system settings.
- **Portal Segregation**: Patients interact solely via the React web application; staff and administrators authenticate through the Angular Operations Portal.

### Concurrency & Data Integrity
- **Atomic Slot Locking**: Appointment bookings utilize database transactions with strict ACID guarantees. This prevents race conditions, preventing two concurrent requests from securing the same slot.
- **Strict Input Validation**: All inbound HTTP payloads, URL parameters, and queries are parsed through **Zod** schema validators to mitigate SQL/NoSQL injection and parameter tampering.
- **Rate Limiting**: IP-based rate limiting safeguards public authentication routes (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/forgot-password`) against credential stuffing and brute-force attacks.

---

## 4. Privacy & Regulatory Alignment

- **GDPR / HIPAA Alignment**: Patients have full self-service rights to inspect, export, and request erasure of their personal healthcare profile and consultation records.
- **Immutable Audit Logging**: Every critical security and clinical action (authentication attempts, appointment status changes, emergency overrides, and medical profile access) is immutably logged with actor ID, timestamp, IP address, and changed parameters.

