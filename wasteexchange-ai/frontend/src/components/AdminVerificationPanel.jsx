import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const AdminVerificationPanel = () => {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const fetchPendingCompanies = async () => {
    setLoading(true);
    try {
      const res = await API.get('/auth/unverified-companies');
      setPendingCompanies(res.data);
    } catch (err) {
      alert('❌ Failed to fetch pending companies: ' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    setProcessingId(userId);
    try {
      await API.put(`/auth/verify-company/${userId}`);
      alert('✅ Company verified successfully!');
      // Remove from list or refresh
      setPendingCompanies(pendingCompanies.filter(u => u._id !== userId));
    } catch (err) {
      alert('❌ Failed to verify: ' + (err.response?.data?.msg || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <p style={{ color: '#aaa' }}>Loading pending requests...</p>;

  if (pendingCompanies.length === 0) {
    return <p style={{ color: '#22c55e' }}>✅ No pending company verification requests.</p>;
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ color: '#fbbf24', marginBottom: '1.5rem' }}>📋 Pending Company Verifications</h3>
      
      {pendingCompanies.map((user) => (
        <div 
          key={user._id} 
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'start' }}>
            {/* Left: Company Details */}
            <div>
              <h4 style={{ color: 'white' }}>{user.companyName}</h4>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                <strong>Role:</strong> {user.role.toUpperCase()} | 
                <strong> Reg No:</strong> {user.companyRegistrationNo}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                📍 {user.companyAddress}, {user.companyCity}, {user.companyState} - {user.companyPincode}
              </p>
              {user.gstNumber && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  <strong>GST:</strong> {user.gstNumber}
                </p>
              )}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                User: {user.name} ({user.email})
              </p>
            </div>

            {/* Right: Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button 
                onClick={() => handleVerify(user._id)}
                disabled={processingId === user._id}
                style={{
                  padding: '0.5rem 2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: processingId === user._id ? '#666' : '#22c55e',
                  color: 'white',
                  cursor: processingId === user._id ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  width: '100%'
                }}
              >
                {processingId === user._id ? 'Processing...' : '✅ Verify Company'}
              </button>
              <button 
                style={{
                  padding: '0.4rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  background: 'transparent',
                  color: '#f87171',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onClick={() => alert('Reject functionality to be implemented')}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminVerificationPanel;