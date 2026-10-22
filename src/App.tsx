import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AuthRoute } from './components/auth/AuthRoute'
import { PageLayout } from './components/layout/PageLayout'
import { AccountAreaPage } from './pages/AccountAreaPage'
import { AstrologerBookingsPage } from './pages/AstrologerBookingsPage'
import { AstrologerProfilePage } from './pages/AstrologerProfilePage'
import { AstrologersPage } from './pages/AstrologersPage'
import { BookConsultationPage } from './pages/BookConsultationPage'
import { CustomerBookingsPage } from './pages/CustomerBookingsPage'
import { CustomerComingSoonPage } from './pages/CustomerComingSoonPage'
import { CustomerDashboardPage } from './pages/CustomerDashboardPage'
import { CustomerProfilePage } from './pages/CustomerProfilePage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { SearchPage } from './pages/SearchPage'
import { ServicesPage } from './pages/ServicesPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
      <Route element={<PageLayout />}>
        <Route index element={<HomePage />} />
        <Route path="astrologers" element={<AstrologersPage />} />
        <Route path="astrologers/:id" element={<AstrologerProfilePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route
          path="about"
          element={
            <PlaceholderPage
              title="About Nakshtra"
              description="A quieter place for astrology consultations — still being written. Return home to explore the current design."
            />
          }
        />
        <Route
          path="blog"
          element={
            <PlaceholderPage
              title="Journal"
              description="Essays and notes will live here. This route exists so every navigation item has a destination."
            />
          }
        />
        <Route path="how-it-works" element={<Navigate to="/#how-it-works" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="signup" element={<Navigate to="/register" replace />} />
        <Route
          path="customer"
          element={
            <AuthRoute require="customer">
              <CustomerDashboardPage />
            </AuthRoute>
          }
        />
        <Route
          path="customer/book"
          element={
            <AuthRoute require="customer">
              <BookConsultationPage />
            </AuthRoute>
          }
        />
        <Route
          path="customer/bookings"
          element={
            <AuthRoute require="customer">
              <CustomerBookingsPage />
            </AuthRoute>
          }
        />
        <Route
          path="customer/saved"
          element={
            <AuthRoute require="customer">
              <CustomerComingSoonPage
                title="Saved Astrologers"
                description="Saving astrologers is not available yet. Use the directory to browse sample profiles until a private list exists."
              />
            </AuthRoute>
          }
        />
        <Route
          path="customer/history"
          element={
            <AuthRoute require="customer">
              <CustomerComingSoonPage
                title="Consultation History"
                description="Past consultations will be listed here after live sessions exist. No history is stored yet."
              />
            </AuthRoute>
          }
        />
        <Route
          path="customer/profile"
          element={
            <AuthRoute require="customer">
              <CustomerProfilePage />
            </AuthRoute>
          }
        />
        <Route
          path="astrologer"
          element={
            <AuthRoute require="astrologer">
              <AccountAreaPage role="astrologer" />
            </AuthRoute>
          }
        />
        <Route
          path="astrologer/bookings"
          element={
            <AuthRoute require="astrologer">
              <AstrologerBookingsPage />
            </AuthRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AuthRoute require="admin">
              <AccountAreaPage role="admin" />
            </AuthRoute>
          }
        />
        <Route
          path="privacy"
          element={
            <PlaceholderPage
              title="Privacy"
              description="A full privacy notice will be published before live accounts exist. This page holds the destination for the footer link."
            />
          }
        />
        <Route
          path="terms"
          element={
            <PlaceholderPage
              title="Terms"
              description="Terms of use will be published before consultations go live. This page holds the destination for the footer link."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </AuthProvider>
  )
}
