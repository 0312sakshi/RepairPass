import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Customer Protected Pages
import CustomerDashboard from './pages/CustomerDashboard';
import AppliancesPage from './pages/AppliancesPage';
import NewAppliancePage from './pages/NewAppliancePage';
import AppliancePassportPage from './pages/AppliancePassportPage';
import RequestsPage from './pages/RequestsPage';
import NewRequestPage from './pages/NewRequestPage';
import RequestDetailPage from './pages/RequestDetailPage';
import ServiceHistoryPage from './pages/ServiceHistoryPage';

// Technician Protected Pages
import TechnicianDashboard from './pages/TechnicianDashboard';
import TechnicianJobDetailPage from './pages/TechnicianJobDetailPage';

// Admin Protected Pages
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Protected Routes */}
          <Route
            path="/customer"
            element={<Navigate to="/customer/dashboard" replace />}
          />
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute requiredRole="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/appliances"
            element={
              <ProtectedRoute requiredRole="customer">
                <AppliancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/appliances/new"
            element={
              <ProtectedRoute requiredRole="customer">
                <NewAppliancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/appliances/:id/passport"
            element={
              <ProtectedRoute requiredRole="customer">
                <AppliancePassportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/requests"
            element={
              <ProtectedRoute requiredRole="customer">
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/requests/new"
            element={
              <ProtectedRoute requiredRole="customer">
                <NewRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/requests/:id"
            element={
              <ProtectedRoute requiredRole={['customer', 'admin']}>
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/history"
            element={
              <ProtectedRoute requiredRole="customer">
                <ServiceHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Technician Protected Routes */}
          <Route
            path="/technician"
            element={<Navigate to="/technician/dashboard" replace />}
          />
          <Route
            path="/technician/dashboard"
            element={
              <ProtectedRoute requiredRole="technician">
                <TechnicianDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technician/jobs/:id"
            element={
              <ProtectedRoute requiredRole="technician">
                <TechnicianJobDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route
            path="*"
            element={
              <main className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
                <h1>Page Not Found (404)</h1>
                <p>The requested page does not exist in RepairPass.</p>
                <div style={{ marginTop: '20px' }}>
                  <a className="button" href="/">
                    Return to Home
                  </a>
                </div>
              </main>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
