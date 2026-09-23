// src/components/ProfilePictureUpload.jsx
import React, { useState, useRef } from 'react';
import API from '../utils/api';

const ProfilePictureUpload = ({ currentUser, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const imageUrl = currentUser?.profilePicture || '';
  const firstLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?';

  const handleImageClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) handleUpload(selected);
  };

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('profilePicture', selectedFile);
    try {
      const res = await API.put('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdate(res.data.profilePicture);
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div onClick={handleImageClick} style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #6366f1',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        fontSize: '2.5rem',
        fontWeight: '600',
        color: '#a78bfa',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {imageUrl ? <img src={imageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{firstLetter}</span>}
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      {loading && <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Uploading...</span>}
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', cursor: 'pointer' }} onClick={handleImageClick}>Change Photo</span>
    </div>
  );
};

export default ProfilePictureUpload;