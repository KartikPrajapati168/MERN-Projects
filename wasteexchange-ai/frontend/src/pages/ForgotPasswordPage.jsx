// src/pages/ForgetPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.post('/auth/forgot-password', { email });
      setMessage(res.data.msg || 'Password reset link sent to your email.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid-overlay" />
      <div className="login-container" style={{ maxWidth: '440px' }}>
        <div className="login-card">
          <Link to="/login" className="back-button">← Back to Login</Link>
          <div className="login-logo">WasteExchange AI</div>
          <h2 className="login-title" style={{ fontSize: '1.6rem' }}>Reset Password</h2>
          <p className="login-subtitle" style={{ fontSize: '1rem' }}>Enter your email and we'll send you a reset link.</p>
          {error && <div className="login-error">{error}</div>}
          {message && <div style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.5rem' }}>{message}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label style={{ fontSize: '0.9rem' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" style={{ fontSize: '0.95rem' }} required />
            </div>
            <button type="submit" className="login-submit-btn" disabled={loading} style={{ fontSize: '1rem' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;