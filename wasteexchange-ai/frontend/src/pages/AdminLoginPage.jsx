import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const AdminLoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const savedUser = localStorage.getItem('currentUser');

//     if (token && savedUser) {
//       try {
//         const user = JSON.parse(savedUser);

//         if (user.role === 'admin') {
//           navigate('/admin', { replace: true });
//         }
//       } catch (err) {
//         console.error('Invalid stored user data');
//       }
//     }
//   }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await API.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (!res.data.success) {
        setError(res.data.msg || 'Login failed');
        setLoading(false);
        return;
      }

      const user = res.data.user;

      // IMPORTANT:
      // Only admin accounts can use this page
      if (user.role !== 'admin') {
        setError('Access denied. This page is for administrators only.');
        setLoading(false);
        return;
      }

      // Save admin authentication
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('currentUser', JSON.stringify(user));

      // Remember email
      if (formData.remember) {
        localStorage.setItem('rememberAdminEmail', formData.email);
      } else {
        localStorage.removeItem('rememberAdminEmail');
      }

      // Admin dashboard
      navigate('/admin', { replace: true });

    } catch (err) {
      console.error('Admin login error:', err);

      setError(
        err.response?.data?.msg ||
        'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load remembered admin email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberAdminEmail');

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

          <Link to="/login" className="back-button">
            ← Back to User Login
          </Link>

          <div className="login-logo">
            🛡️ WasteExchange AI
          </div>

          <h2 className="login-title">
            Admin Login
          </h2>

          <p className="login-subtitle">
            Authorized administrators only
          </p>

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
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter admin password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                  required
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

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#6366f1'
                  }}
                />

                Remember me
              </label>

              <Link
                to="/forgot-password"
                style={{
                  color: '#60a5fa',
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Admin Sign In'}
            </button>

          </form>

          <div
            className="login-footer"
            style={{ marginTop: '1.5rem' }}
          >
            Not an administrator?{' '}
            <Link
              to="/login"
              className="signup-link"
            >
              User Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;