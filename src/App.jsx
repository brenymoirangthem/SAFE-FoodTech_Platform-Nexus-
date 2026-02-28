import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ConsumerDashboard from './pages/ConsumerDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import EmergencyDashboard from './pages/EmergencyDashboard';

// --- Protected Route Component ---
// This checks if the user is logged in AND has the right permission
const ProtectedRoute = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('foodtech_user');
  
  if (!userStr) {
    // If not logged in, go to Login
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    // If role is restricted (e.g., Consumer trying to access Supplier)
    if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'admin') {
      return <Navigate to="/login" replace />;
    }

    return children;
  } catch (error) {
    // If JSON is invalid, clear it and redirect to login
    localStorage.removeItem('foodtech_user');
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />
        
        {/* Protected Consumer Route */}
        <Route 
          path="/consumer" 
          element={
            <ProtectedRoute allowedRoles={['consumer']}>
              <ConsumerDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Supplier Route */}
        <Route 
          path="/supplier" 
          element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Emergency Route */}
        <Route 
          path="/emergency" 
          element={
            <ProtectedRoute allowedRoles={['emergency']}>
              <EmergencyDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;