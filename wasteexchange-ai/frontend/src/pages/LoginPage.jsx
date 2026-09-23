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
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (token && user) {
      // Already logged in – redirect based on status
      if (user.isCompanyRegistered && user.isCompanyVerified) {
        const dashboardPath = user.role === 'generator' ? '/generator' : '/buyer';
        navigate(dashboardPath);
      } else if (user.isCompanyRegistered && !user.isCompanyVerified) {
        navigate('/waiting');
      } else {
        navigate('/register-company');
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
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (formData.remember) {
          localStorage.setItem('rememberEmail', formData.email);
        } else {
          localStorage.removeItem('rememberEmail');
        }

        // Redirect based on user status
        if (user.isCompanyRegistered && user.isCompanyVerified) {
          const dashboardPath = user.role === 'generator' ? '/generator' : '/buyer';
          navigate(dashboardPath);
        } else if (user.isCompanyRegistered && !user.isCompanyVerified) {
          navigate('/waiting');
        } else {
          navigate('/company-registration');
        }
      } else {
        setError(response.data.msg || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        setError(err.response.data?.msg || 'Invalid credentials');
      } else if (err.request) {
        setError('Cannot connect to server. Please check your network.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
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
            Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;