import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layouts & Guards
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Specializations from './pages/public/Specializations';
import Clinics from './pages/public/Clinics';
import ClinicDetail from './pages/public/ClinicDetail';
import Doctors from './pages/public/Doctors';
import DoctorProfile from './pages/public/DoctorProfile';
import DoctorApply from './pages/public/DoctorApply';
import Blog from './pages/public/Blog';
import BlogDetail from './pages/public/BlogDetail';
import Contact from './pages/public/Contact';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import TermsOfService from './pages/public/TermsOfService';
import NotFound from './pages/public/NotFound';

// Auth Pages
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Patient Dashboard & Booking Pages
import Dashboard from './pages/dashboard/Dashboard';
import BookingFlow from './pages/booking/BookingFlow';
import AppointmentDetail from './pages/dashboard/AppointmentDetail';
import Dependents from './pages/dashboard/Dependents';
import MyReviews from './pages/dashboard/MyReviews';
import Waitlist from './pages/dashboard/Waitlist';
import NotificationsCenter from './pages/dashboard/NotificationsCenter';
import ProfileSettings from './pages/dashboard/ProfileSettings';
import PrivacyData from './pages/dashboard/PrivacyData';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public Pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/specializations" element={<Specializations />} />
            <Route path="/clinics" element={<Clinics />} />
            <Route path="/clinics/:id" element={<ClinicDetail />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
            <Route path="/doctors/apply" element={<DoctorApply />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Route>

          {/* Auth Pages (Standalone Layout) */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Patient Authenticated Dashboard Pages */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/book/:doctorId" element={<BookingFlow />} />
            <Route path="/dashboard/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/dashboard/dependents" element={<Dependents />} />
            <Route path="/dashboard/reviews" element={<MyReviews />} />
            <Route path="/dashboard/waitlist" element={<Waitlist />} />
            <Route path="/dashboard/notifications" element={<NotificationsCenter />} />
            <Route path="/dashboard/profile" element={<ProfileSettings />} />
            <Route path="/dashboard/privacy" element={<PrivacyData />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
