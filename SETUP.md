# Docyra — Local Setup & Execution Guide

Follow these steps to run the complete Docyra ecosystem on your local machine from scratch.

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: `v20.x` or higher (verify with `node -v`)
- **npm**: `v10.x` or higher (verify with `npm -v`)
- **Git**: (verify with `git -v`)
- **MongoDB**: Community Server running locally on `mongodb://localhost:27017` or a cloud MongoDB Atlas URI.

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/Docyra.git
cd Docyra
```

---

## Step 2: Configure & Start the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy the example environment file:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```
   *(The default `.env.example` comes pre-configured for local development on port `5000` and `mongodb://localhost:27017/docyra`).*

4. Seed the database with sample clinics, doctors, admins, and availability:
   ```bash
   npm run seed
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will start at: **`http://localhost:5000`**  
   Health check endpoint: **`http://localhost:5000/api/v1/health`**

---

## Step 3: Start the Patient Portal (React)

Open a **new terminal tab or window**:

1. Navigate to the `frontend-react` directory:
   ```bash
   cd frontend-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```
   *(Defaults to `VITE_API_BASE_URL=http://localhost:5000/api/v1`)*

4. Start the React development server:
   ```bash
   npm run dev
   ```
   The Patient Portal will be running at: **`http://localhost:5173`**

---

## Step 4: Start the Operations Portal (Angular)

Open another **new terminal tab or window**:

1. Navigate to the `frontend-angular` directory:
   ```bash
   cd frontend-angular
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Angular portal server:
   ```bash
   npm start
   ```
   *(Or `npm run dev` to explicitly bind to port `4200`)*

   The Operations Portal will be running at: **`http://localhost:4200`**

---

## Pre-Seeded Demo Accounts

All pre-seeded demo accounts share the default password: **`Password@123`**

| Role | Email Address | Password | Portal Access URL |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@docyra.app` | `Password@123` | `http://localhost:4200/login` |
| **Clinic Admin** | `apollo.admin@docyra.app` | `Password@123` | `http://localhost:4200/login` |
| **Clinic Admin** | `metrocare.admin@docyra.app` | `Password@123` | `http://localhost:4200/login` |
| **Doctor** | `sarah.jenkins@docyra.app` | `Password@123` | `http://localhost:4200/login` |
| **Doctor** | `rajesh.kumar@docyra.app` | `Password@123` | `http://localhost:4200/login` |
| **Patient** | `patient.john@example.com` | `Password@123` | `http://localhost:5173/login` |
| **Patient** | `patient.priya@example.com` | `Password@123` | `http://localhost:5173/login` |

> [!NOTE]
> Patient accounts log in exclusively through the **React App (`http://localhost:5173`)**.  
> Doctor, Clinic Admin, and Platform Admin accounts log in through the **Angular Portal (`http://localhost:4200`)**.

---

## Verifying the Build & Running Tests

### Backend Unit & Integration Tests
```bash
cd backend
npm test
npm run lint
```

### Patient App (React) Production Build & Lint
```bash
cd frontend-react
npm run lint
npm run build
```

### Operations Portal (Angular) Production Build & Lint
```bash
cd frontend-angular
npm run lint
npm run build
```

---

## Common Troubleshooting

- **Port in Use (`EADDRINUSE`)**: If port `5000`, `5173`, or `4200` is already in use, stop previous Node background instances or close lingering terminals.
- **MongoDB Connection**: Ensure your MongoDB service is running (`mongod` or Docker container) before starting the backend server or running `npm run seed`.

