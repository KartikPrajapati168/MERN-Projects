// src/components/Sidebar.jsx
import React, { useState, useRef } from 'react';
import API from '../utils/api';

const Sidebar = ({ user, items, activeTab, onTabChange, onLogout, onUserUpdate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', file);
    try {
      const res = await API.put('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = { ...user, profilePicture: res.data.profilePicture };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
    } catch (err) {
      alert('❌ Failed to upload: ' + (err.response?.data?.msg || err.message));
    } finally {
      setUploading(false);
    }
  };

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || '?';
  const imageUrl = user?.profilePicture || '';

  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      <div
        style={{
          width: isOpen ? '220px' : '0px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.03)',
          borderRight: isOpen ? '1px solid rgba(255,255,255,0.05)' : 'none',
          padding: isOpen ? '1.2rem 0.8rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'width 0.3s ease, padding 0.3s ease, border 0.3s ease',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {isOpen && (
          <>
            {/* Profile Section */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                onClick={handleAvatarClick}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #6366f1',
                  background: '#1a1a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  margin: '0 auto',
                  transition: 'transform 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.8rem', fontWeight: '600', color: '#a78bfa' }}>{firstLetter}</span>
                )}
                {uploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: 'white',
                    }}
                  >
                    ⏳
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: '0.4rem', color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                {user?.role || ''}
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1 }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeTab === item.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.85rem',
                    marginBottom: '0.15rem',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== item.id) e.target.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== item.id) e.target.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span> {item.label}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div style={{ marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(248,113,113,0.3)',
                  background: 'rgba(248,113,113,0.1)',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.background = 'rgba(248,113,113,0.2)')}
                onMouseLeave={(e) => (e.target.style.background = 'rgba(248,113,113,0.1)')}
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          top: '50%',
          left: isOpen ? '220px' : '0px',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0 6px 6px 0',
          color: 'white',
          padding: '0.4rem 0.2rem',
          cursor: 'pointer',
          transition: 'left 0.3s ease',
          fontSize: '0.8rem',
          width: '16px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.1)')}
        onMouseLeave={(e) => (e.target.style.background = 'rgba(255,255,255,0.05)')}
      >
        {isOpen ? '◀' : '▶'}
      </button>
    </div>
  );
};

export default Sidebar;