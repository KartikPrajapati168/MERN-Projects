// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setErrors({});

    try {
      console.log('Sending signup request to:', `${API.defaults.baseURL}/auth/signup`);
      console.log('Request data:', {
        name: formData.name,
        email: formData.email,
        password: '***',
        role: formData.role,
      });

      const res = await API.post('/auth/signup', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      console.log('Signup response:', res.data);

      if (res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Redirect based on role
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/register-company');
        }
      } else {
        setErrors({ general: res.data.msg || 'Signup failed' });
      }
    } catch (err) {
      console.error('Signup error details:', err);
      
      if (err.response) {
        // Server responded with error
        console.error('Server response:', err.response.data);
        setErrors({ 
          general: err.response.data?.msg || 
                   err.response.data?.message || 
                   'Signup failed. Please try again.' 
        });
      } else if (err.request) {
        // No response from server
        setErrors({ 
          general: 'Cannot connect to server. Please ensure the backend is running on port 5000.' 
        });
        console.error('No response from server. Check if backend is running.');
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-bg-gradient" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid-overlay" />

      <div className="login-container" style={{ maxWidth: '420px', padding: '0.8rem' }}>
        <div className="login-card" style={{ padding: '1.8rem 1.5rem', borderRadius: '16px' }}>
          <Link to="/" className="back-button" style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>← Back</Link>
          <div className="login-logo" style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>♻️ WasteExchange AI</div>
          <h2 className="login-title" style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>Create Account</h2>
          <p className="login-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>Join the circular economy</p>

          {errors.general && (
            <div className="login-error" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" style={{ gap: '0.7rem' }}>
            <div className="form-group" style={{ gap: '0.15rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
              />
              {errors.name && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.name}</small>}
            </div>

            <div className="form-group" style={{ gap: '0.15rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
              />
              {errors.email && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.email}</small>}
            </div>

            <div className="form-group" style={{ gap: '0.15rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
              />
              {errors.password && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.password}</small>}
            </div>

            <div className="form-group" style={{ gap: '0.15rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
              />
              {errors.confirmPassword && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.confirmPassword}</small>}
            </div>

            <div className="form-group" style={{ gap: '0.15rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>I am a...</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px', appearance: 'auto' }}
              >
                <option value="buyer">Buyer (purchase waste)</option>
                <option value="generator">Generator (sell waste)</option>
                <option value="admin">Admin (Platform Manager)</option>
              </select>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              style={{ fontSize: '0.9rem', padding: '0.55rem', borderRadius: '8px', marginTop: '0.2rem' }}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <div className="login-footer" style={{ fontSize: '0.85rem', marginTop: '0.8rem' }}>
            Already have an account? <Link to="/login" className="signup-link">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;