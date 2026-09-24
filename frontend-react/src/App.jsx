import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

import PublicLayout from './components/layout/PublicLayout.jsx';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout.jsx';

// Public Marketing & Discovery Pages
import HomePage from './pages/public/HomePage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import SpecializationsPage from './pages/public/SpecializationsPage.jsx';
import ClinicsPage from './pages/public/ClinicsPage.jsx';
import ClinicDetailPage from './pages/public/ClinicDetailPage.jsx';
import DoctorsPage from './pages/public/DoctorsPage.jsx';
import DoctorProfilePage from './pages/public/DoctorProfilePage.jsx';
import DoctorApplyPage from './pages/public/DoctorApplyPage.jsx';
import BlogPage from './pages/public/BlogPage.jsx';
import BlogDetailPage from './pages/public/BlogDetailPage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import PrivacyPage from './pages/public/PrivacyPage.jsx';
import TermsPage from './pages/public/TermsPage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';

// Auth Pages
import RegisterPage from './pages/auth/RegisterPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Patient Portal Pages (Screen 20 to Screen 28)
import DashboardPage from './pages/patient/DashboardPage.jsx';
import BookingFlowPage from './pages/patient/BookingFlowPage.jsx';
import AppointmentDetailPage from './pages/patient/AppointmentDetailPage.jsx';
import WaitlistPage from './pages/patient/WaitlistPage.jsx';
import DependentsPage from './pages/patient/DependentsPage.jsx';
import ReviewsPage from './pages/patient/ReviewsPage.jsx';
import NotificationsPage from './pages/patient/NotificationsPage.jsx';
import ProfilePage from './pages/patient/ProfilePage.jsx';
import PrivacyDataPage from './pages/patient/PrivacyDataPage.jsx';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Marketing & Discovery Routes with PublicLayout */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/specializations" element={<SpecializationsPage />} />
              <Route path="/clinics" element={<ClinicsPage />} />
              <Route path="/clinics/:id" element={<ClinicDetailPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/doctors/apply" element={<DoctorApplyPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Auth Routes */}
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Authenticated Patient Portal Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/book" element={<BookingFlowPage />} />
              <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
              <Route path="/dependents" element={<DependentsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/privacy-data" element={<PrivacyDataPage />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
