// src/App.jsx
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// ✅ Lazy load all pages — each becomes a separate chunk
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const CompanyRegistrationPage = lazy(() => import('./pages/CompanyRegistrationPage'));
const WaitingPage = lazy(() => import('./pages/WaitingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const GeneratorDashboard = lazy(() => import('./pages/GeneratorDashboard'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));

// ✅ Reusable loading fallback (matches app theme)
const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#a78bfa',
      fontFamily: 'Inter, sans-serif',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 52,
          height: 52,
          margin: '0 auto 16px',
          border: '4px solid rgba(139,92,246,0.15)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'adPageSpin 0.8s linear infinite',
        }}
      />
      <div style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.3px' }}>
        Loading...
      </div>
      <style>{`@keyframes adPageSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register-company" element={<CompanyRegistrationPage />} />
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/buyer" element={<BuyerDashboard />} />
        <Route path="/generator" element={<GeneratorDashboard />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;