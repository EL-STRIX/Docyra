# Contributing to Docyra

Thank you for your interest in contributing to Docyra! As a healthcare platform handling clinical schedules, patient records, and real-time appointment locking, maintaining code quality, data integrity, and security standards is essential.

Please review this guide before submitting issues or pull requests.

---

## 1. Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally and configure the environment:
   ```bash
   git clone https://github.com/<your-username>/Docyra.git
   cd Docyra
   ```
3. Follow the complete installation, database seeding, and execution guide in **[SETUP.md](./SETUP.md)**.

---

## 2. Branching Strategy

All development branches should branch off `main` and use standard semantic prefixes:

- `feat/<feature-name>`: New features (e.g., `feat/telehealth-links`)
- `fix/<bug-description>`: Bug fixes (e.g., `fix/slot-timezone-offset`)
- `refactor/<scope>`: Code cleanup or refactoring without functional changes
- `docs/<scope>`: Documentation updates (e.g., `docs/api-guide`)
- `test/<scope>`: Adding or updating test suites

---

## 3. Commit Message Conventions

Docyra follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in imperative present tense>

[optional body]

[optional footer(s)]
```

### Examples:
- `feat(doctor): add custom weekly availability rules`
- `fix(booking): prevent duplicate reservations during concurrent requests`
- `refactor(portal): optimize sidebar navigation with sticky position`
- `docs(readme): clarify multi-tenant clinic onboarding steps`

---

## 4. Coding Standards

### Backend (Node.js & Express)
- Use **ES Modules** (`import` / `export`).
- Validate all incoming route inputs using **Zod** schemas in `backend/src/validators/`.
- Keep controllers thin; encapsulate all business rules and database mutations inside `backend/src/services/`.
- Wrap asynchronous controller methods in `asyncHandler`.
- Throw typed errors from `backend/src/utils/AppError.js` (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ConflictError`, `ForbiddenError`).
- Log operational events using the structured Winston logger (`logger.info`, `logger.warn`, `logger.error`), never bare `console.log`.

### Patient Portal (React 18 + Vite)
- Use functional components with React Hooks.
- Style with **Tailwind CSS** utility classes; avoid inline styles.
- Use `formatAddress` from `src/utils/formatAddress.js` for safe clinic address rendering.
- Maintain error boundary safety; ensure components handle loading, empty, and error states gracefully.

### Operations Portal (Angular 17)
- Use **Standalone Components** (`standalone: true`).
- Manage async data with RxJS Observables and the `async` pipe.
- Follow strict TypeScript typing; avoid `any` wherever possible.
- Use Angular Material components with custom portal styling consistent with Docyra design standards.

---

## 5. Quality Checklist & Verification

Before opening a pull request, verify that all linters, tests, and production builds pass locally:

```bash
# 1. Backend Lint & Tests
cd backend
npm run lint
npm test

# 2. React Patient App Lint & Build
cd ../frontend-react
npm run lint
npm run build

# 3. Angular Operations Portal Lint & Build
cd ../frontend-angular
npm run lint
npm run build
```

---

## 6. Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin <your-branch-name>
   ```
2. Open a Pull Request against the `main` branch of the upstream repository.
3. Provide a clear PR description detailing:
   - What changes were made and why.
   - Any relevant issue numbers or screenshots (for UI changes).
   - Confirmation that all unit tests, linters, and builds pass.
4. CI checks (GitHub Actions) will automatically run and must pass before review.
