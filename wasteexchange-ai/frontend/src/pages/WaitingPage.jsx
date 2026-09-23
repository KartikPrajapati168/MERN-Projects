// src/pages/WaitingPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const WaitingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    if (currentUser.isCompanyVerified) {
      navigate(`/${currentUser.role}`);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  return (
    <div
      className="login-page"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="login-bg-gradient" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid-overlay" />

      <div style={styles.card}>
        <div style={styles.iconCircle}>⏳</div>
        <h2 style={styles.title}>Application Under Review</h2>
        <p style={styles.subtitle}>
          Thank you for submitting your company details. Our admin team is reviewing your application.
        </p>

        <div style={styles.badge}>⏳ Status: Pending Admin Review</div>

        {user?.companyName && (
          <div style={styles.details}>
            <p style={styles.detailRow}><strong>Company:</strong> {user.companyName}</p>
            <p style={styles.detailRow}>
              <strong>Role:</strong> {user.role === 'generator' ? 'Generator' : 'Buyer'}
            </p>
          </div>
        )}

        <p style={styles.note}>
          You will receive a notification once your company is verified and approved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button onClick={handleLogout} style={styles.secondaryBtn}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    position: 'relative',
    zIndex: 2,
    background: 'rgba(20, 20, 35, 0.7)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '3rem 2.5rem',
    maxWidth: '480px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(251, 191, 36, 0.15)',
    border: '2px solid rgba(251, 191, 36, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.2rem',
    margin: '0 auto 1.5rem',
  },
  title: { color: '#fff', fontSize: '1.6rem', marginBottom: '0.75rem' },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', lineHeight: 1.5 },
  badge: {
    display: 'inline-block',
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(251, 191, 36, 0.4)',
    borderRadius: '999px',
    padding: '0.5rem 1.25rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  details: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
    textAlign: 'left',
  },
  detailRow: { color: 'rgba(255,255,255,0.75)', margin: '0.3rem 0', fontSize: '0.9rem' },
  note: { color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' },
  secondaryBtn: {
    padding: '0.6rem 2rem',
    borderRadius: '8px',
    border: '1px solid #f87171',
    background: 'transparent',
    color: '#f87171',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default WaitingPage;