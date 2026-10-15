// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage';
import WaitingPage from './pages/WaitingPage';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import GeneratorDashboard from './pages/GeneratorDashboard';
import './App.css';
import AdminLoginPage from './pages/AdminLoginPage';

function App() {
  return (
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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;