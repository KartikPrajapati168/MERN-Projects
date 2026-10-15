// src/pages/SignupPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const SignupPage = () => {
  const navigate = useNavigate();

  // step: 1 = form, 2 = OTP, 3 = success
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverMsg, setServerMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 2 && otpInputRef.current) otpInputRef.current.focus();
  }, [step]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------- STEP 1: Send OTP ---------- */
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (formData.role === 'admin' || !['buyer', 'generator'].includes(formData.role)) {
      setErrors({ general: 'Invalid role. Please select Buyer or Generator.' });
      return;
    }
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    setServerMsg('');

    try {
      const res = await API.post('/auth/send-signup-otp', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      setServerMsg(res.data?.msg || 'OTP sent to your email.');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      if (err.response) {
        setErrors({ general: err.response.data?.msg || 'Signup failed. Please try again.' });
      } else if (err.request) {
        setErrors({ general: 'Cannot connect to server. Please ensure the backend is running.' });
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------- STEP 2: Verify OTP ---------- */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP.' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await API.post('/auth/verify-signup-otp', {
        email: formData.email.trim().toLowerCase(),
        otp,
      });

      const { token, user } = res.data;
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('currentUser', JSON.stringify(user));

      setStep(3);
      setTimeout(() => {
        if (user?.role === 'admin') navigate('/admin');
        else navigate('/register-company');
      }, 1400);
    } catch (err) {
      setErrors({ otp: err.response?.data?.msg || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Resend OTP ---------- */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrors({});
    try {
      await API.post('/auth/send-signup-otp', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });
      setServerMsg('New OTP sent to your email.');
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      setErrors({ otp: err.response?.data?.msg || 'Failed to resend OTP' });
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

          {/* ============ STEP 1 — FORM ============ */}
          {step === 1 && (
            <>
              <h2 className="login-title" style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>Create Account</h2>
              <p className="login-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                Join the circular economy
              </p>

              {errors.general && (
                <div className="login-error" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="login-form" style={{ gap: '0.7rem' }}>
                <div className="form-group" style={{ gap: '0.15rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Full Name</label>
                  <input
                    type="text" name="name" placeholder="John Doe"
                    value={formData.name} onChange={handleChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
                  />
                  {errors.name && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.name}</small>}
                </div>

                <div className="form-group" style={{ gap: '0.15rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Email</label>
                  <input
                    type="email" name="email" placeholder="you@example.com"
                    value={formData.email} onChange={handleChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
                  />
                  {errors.email && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.email}</small>}
                </div>

                <div className="form-group" style={{ gap: '0.15rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Password</label>
                  <input
                    type="password" name="password" placeholder="Create a password"
                    value={formData.password} onChange={handleChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
                  />
                  {errors.password && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.password}</small>}
                </div>

                <div className="form-group" style={{ gap: '0.15rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Confirm Password</label>
                  <input
                    type="password" name="confirmPassword" placeholder="Confirm password"
                    value={formData.confirmPassword} onChange={handleChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px' }}
                  />
                  {errors.confirmPassword && <small style={{ color: '#f87171', fontSize: '0.7rem' }}>{errors.confirmPassword}</small>}
                </div>

                <div className="form-group" style={{ gap: '0.15rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>I am a...</label>
                  <select
                    name="role" value={formData.role} onChange={handleChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', borderRadius: '8px', appearance: 'auto' }}
                  >
                    <option value="buyer">Buyer (purchase waste)</option>
                    <option value="generator">Generator (sell waste)</option>
                  </select>
                </div>

                <button
                  type="submit" className="login-submit-btn" disabled={loading}
                  style={{ fontSize: '0.9rem', padding: '0.55rem', borderRadius: '8px', marginTop: '0.2rem' }}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP & Continue'}
                </button>
              </form>
            </>
          )}

          {/* ============ STEP 2 — OTP ============ */}
          {step === 2 && (
            <>
              <h2 className="login-title" style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>Verify Your Email</h2>
              <p className="login-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                We sent a 6-digit code to <strong style={{ color: '#a78bfa' }}>{formData.email}</strong>
              </p>

              {serverMsg && (
                <div style={{
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  padding: '0.6rem 0.9rem', borderRadius: '10px',
                  fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center',
                }}>📧 {serverMsg}</div>
              )}

              <form onSubmit={handleVerifyOTP} className="login-form" style={{ gap: '0.9rem' }}>
                <div className="form-group" style={{ gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', display: 'block' }}>
                    Enter 6-Digit OTP
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text" inputMode="numeric" maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
                    placeholder="• • • • • •"
                    className="form-input"
                    style={{
                      fontSize: '1.7rem', padding: '0.9rem 1rem', borderRadius: '8px',
                      textAlign: 'center', letterSpacing: '12px',
                      fontFamily: 'monospace', fontWeight: 800,
                    }}
                  />
                  <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', display: 'block' }}>
                    Check your inbox (and spam folder) for the code
                  </small>
                </div>

                {errors.otp && (
                  <div style={{
                    background: 'rgba(248,113,113,0.15)', color: '#f87171',
                    padding: '0.6rem 0.9rem', borderRadius: '10px',
                    fontSize: '0.82rem', textAlign: 'center',
                  }}>⚠️ {errors.otp}</div>
                )}

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading || otp.length !== 6}
                  style={{
                    fontSize: '0.9rem', padding: '0.6rem', borderRadius: '8px',
                    background: otp.length === 6 && !loading
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : undefined,
                    opacity: otp.length === 6 && !loading ? 1 : 0.6,
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); setErrors({}); setServerMsg(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                  >
                    ← Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      background: 'transparent', border: 'none',
                      color: resendCooldown > 0 ? 'rgba(255,255,255,0.3)' : '#a78bfa',
                      fontSize: '0.78rem', fontWeight: 600,
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      padding: 0,
                    }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ============ STEP 3 — SUCCESS ============ */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: 78, height: 78, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))',
                border: '2px solid rgba(34,197,94,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', margin: '0 auto 1rem',
              }}>✅</div>
              <h2 className="login-title" style={{ fontSize: '1.2rem', color: '#22c55e', marginBottom: '0.4rem' }}>
                Account Created!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', margin: 0 }}>
                Redirecting you to company registration...
              </p>
            </div>
          )}

          {step !== 3 && (
            <div className="login-footer" style={{ fontSize: '0.85rem', marginTop: '0.8rem' }}>
              Already have an account? <Link to="/login" className="signup-link">Log In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupPage;