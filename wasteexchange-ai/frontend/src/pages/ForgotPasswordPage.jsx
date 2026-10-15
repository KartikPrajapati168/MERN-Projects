// src/pages/ForgetPasswordPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../App.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  // step: 1 = email, 2 = OTP + new password, 3 = success
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  /* ---------- STEP 1: request reset OTP ---------- */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return; }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setMessage(res.data?.msg || 'Reset OTP sent to your email.');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- STEP 2: verify OTP + new password ---------- */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setMessage(res.data?.msg || 'Password reset successfully!');
      setStep(3);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Resend OTP ---------- */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setMessage('New OTP sent to your email.');
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to resend OTP.');
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

          {/* ============ STEP 1 — Email ============ */}
          {step === 1 && (
            <>
              <h2 className="login-title" style={{ fontSize: '1.6rem' }}>Reset Password</h2>
              <p className="login-subtitle" style={{ fontSize: '1rem' }}>
                Enter your email and we'll send you a reset OTP.
              </p>

              {error && <div className="login-error">{error}</div>}
              {message && (
                <div style={{
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  padding: '0.75rem', borderRadius: '10px', marginBottom: '1.5rem',
                }}>{message}</div>
              )}

              <form onSubmit={handleSendOTP} className="login-form">
                <div className="form-group">
                  <label style={{ fontSize: '0.9rem' }}>Email</label>
                  <input
                    type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="form-input" style={{ fontSize: '0.95rem' }}
                    required
                  />
                </div>
                <button type="submit" className="login-submit-btn" disabled={loading} style={{ fontSize: '1rem' }}>
                  {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                </button>
              </form>
            </>
          )}

          {/* ============ STEP 2 — OTP + New Password ============ */}
          {step === 2 && (
            <>
              <h2 className="login-title" style={{ fontSize: '1.6rem' }}>Enter OTP & New Password</h2>
              <p className="login-subtitle" style={{ fontSize: '0.95rem' }}>
                We sent a 6-digit code to <strong style={{ color: '#a78bfa' }}>{email}</strong>
              </p>

              {message && (
                <div style={{
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  padding: '0.6rem 0.9rem', borderRadius: '10px',
                  fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center',
                }}>📧 {message}</div>
              )}

              {error && <div className="login-error">{error}</div>}

              <form onSubmit={handleResetPassword} className="login-form">
                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', textAlign: 'center', display: 'block' }}>
                    Enter 6-Digit OTP
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text" inputMode="numeric" maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    placeholder="• • • • • •"
                    className="form-input"
                    style={{
                      fontSize: '1.6rem', textAlign: 'center', letterSpacing: '12px',
                      fontFamily: 'monospace', fontWeight: 800, padding: '0.9rem 1rem',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.9rem' }}>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    className="form-input" style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.9rem' }}>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="form-input" style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading || otp.length !== 6 || newPassword.length < 6}
                  style={{
                    fontSize: '1rem',
                    background: otp.length === 6 && newPassword.length >= 6 && !loading
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : undefined,
                    opacity: otp.length === 6 && newPassword.length >= 6 && !loading ? 1 : 0.6,
                  }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); setNewPassword(''); setConfirmPassword(''); setError(''); setMessage(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      background: 'transparent', border: 'none',
                      color: resendCooldown > 0 ? 'rgba(255,255,255,0.3)' : '#a78bfa',
                      fontSize: '0.8rem', fontWeight: 600,
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

          {/* ============ STEP 3 — Success ============ */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: 78, height: 78, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))',
                border: '2px solid rgba(34,197,94,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', margin: '0 auto 1rem',
              }}>🔓</div>
              <h2 className="login-title" style={{ fontSize: '1.2rem', color: '#22c55e', marginBottom: '0.4rem' }}>
                Password Reset!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                Redirecting you to login...
              </p>
              <Link to="/login" className="login-submit-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', padding: '0.6rem 1.4rem' }}>
                Go to Login →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;