// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in and redirect accordingly
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);

        if (user.role === 'admin') {
          navigate('/admin-login', { replace: true });
          return;
        }

        if (user.isCompanyRegistered && user.isCompanyVerified) {
          const dashboardPath =
            user.role === 'generator' ? '/generator' : '/buyer';

          navigate(dashboardPath);
        } else if (
          user.isCompanyRegistered &&
          !user.isCompanyVerified
        ) {
          navigate('/waiting');
        } else {
          navigate('/register-company');
        }

      } catch (error) {
        console.error('Invalid stored user data');
        localStorage.removeItem('currentUser');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await API.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (!res.data.success) {
        setError(res.data.msg || 'Login failed');
        setLoading(false);
        return;
      }

      // ✅ Save token + user
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('currentUser', JSON.stringify(res.data.user));

      const { role, isCompanyVerified, isCompanyRegistered } = res.data.user;

      // ✅ ROLE-BASED REDIRECT (correct priority)
      if (role === 'generator') {
        if (isCompanyVerified) {
          navigate('/generator', { replace: true });
        } else if (isCompanyRegistered) {
          navigate('/waiting', { replace: true });
        } else {
          navigate('/register-company', { replace: true });
        }

      } else if (role === 'buyer') {
        if (isCompanyVerified) {
          navigate('/buyer', { replace: true });
        } else if (isCompanyRegistered) {
          navigate('/waiting', { replace: true });
        } else {
          navigate('/register-company', { replace: true });
        }

      } else {
        setError('Admin accounts must use the Admin Login page.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        remember: true
      }));
    }
  }, []);

  return (
    <div className="login-page" style={{ minHeight: '100vh' }}>
      <div className="login-bg-gradient" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid-overlay" />

      <div className="login-container">
        <div className="login-card">
          <Link to="/" className="back-button">← Back</Link>

          <div className="login-logo">♻️ WasteExchange AI</div>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to continue trading</p>

          {error && (
            <div className="login-error">
              <span style={{ marginRight: '8px' }}>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            Don't have an account?{' '}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </div>

          <div
            style={{
              marginTop: '1.2rem',
              paddingTop: '1.2rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: '0.85rem'
              }}
            >
              Are you an administrator?{' '}
            </span>

            <Link
              to="/admin-login"
              style={{
                color: '#a78bfa',
                fontSize: '0.85rem',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Login as Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;