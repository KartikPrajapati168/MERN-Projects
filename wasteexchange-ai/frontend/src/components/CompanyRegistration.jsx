// src/pages/CompanyRegistrationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { validateCompany } from '../utils/validation';
import '../App.css';

const CompanyRegistrationPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    companyRegistrationNo: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyPincode: '',
    gstNumber: '',
    companyType: 'private',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

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
    // If already registered, redirect accordingly
    if (currentUser.isCompanyRegistered) {
      if (currentUser.isCompanyVerified) {
        navigate(`/${currentUser.role}`); // /buyer or /generator
      } else {
        navigate('/waiting');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateCompany(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await API.post('/auth/register-company', formData);
      // Update local user data
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const updatedUser = { ...currentUser, isCompanyRegistered: true, isCompanyVerified: false };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      // Redirect to waiting page
      navigate('/waiting');
    } catch (err) {
      setServerError(err.response?.data?.msg || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: '100vh' }}>
      <div className="login-bg-gradient"></div>
      <div className="login-orb login-orb-1"></div>
      <div className="login-orb login-orb-2"></div>
      <div className="login-orb login-orb-3"></div>
      <div className="login-grid-overlay"></div>
      <div className="login-container" style={{ maxWidth: '600px' }}>
        <div className="login-card">
          <h2 className="login-title">🏢 Company Registration</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
            As a {user?.role === 'generator' ? 'Generator' : 'Buyer'}, register your company to start trading.
          </p>
          {serverError && <div className="login-error">{serverError}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            {/* ... (same form fields as before) ... */}
            <div className="form-group">
              <label>Company Name *</label>
              <input type="text" name="companyName" className="form-input" value={formData.companyName} onChange={handleChange} placeholder="ABC Industries Pvt Ltd" />
              {errors.companyName && <small style={{ color: '#f87171' }}>{errors.companyName}</small>}
            </div>
            <div className="form-group">
              <label>Registration Number *</label>
              <input type="text" name="companyRegistrationNo" className="form-input" value={formData.companyRegistrationNo} onChange={handleChange} placeholder="U12345GJ2025ABC123" />
              {errors.companyRegistrationNo && <small style={{ color: '#f87171' }}>{errors.companyRegistrationNo}</small>}
            </div>
            <div className="form-group">
              <label>GST Number (Optional)</label>
              <input type="text" name="gstNumber" className="form-input" value={formData.gstNumber} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group">
              <label>Company Address *</label>
              <textarea name="companyAddress" className="form-input" value={formData.companyAddress} onChange={handleChange} placeholder="123, Industrial Area, Phase-1" rows="2" />
              {errors.companyAddress && <small style={{ color: '#f87171' }}>{errors.companyAddress}</small>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>City *</label>
                <input type="text" name="companyCity" className="form-input" value={formData.companyCity} onChange={handleChange} placeholder="Ahmedabad" />
                {errors.companyCity && <small style={{ color: '#f87171' }}>{errors.companyCity}</small>}
              </div>
              <div className="form-group">
                <label>State *</label>
                <input type="text" name="companyState" className="form-input" value={formData.companyState} onChange={handleChange} placeholder="Gujarat" />
                {errors.companyState && <small style={{ color: '#f87171' }}>{errors.companyState}</small>}
              </div>
            </div>
            <div className="form-group">
              <label>Pincode *</label>
              <input type="text" name="companyPincode" className="form-input" value={formData.companyPincode} onChange={handleChange} placeholder="380054" maxLength="6" />
              {errors.companyPincode && <small style={{ color: '#f87171' }}>{errors.companyPincode}</small>}
            </div>
            <div className="form-group">
              <label>Company Type</label>
              <select name="companyType" className="form-input" value={formData.companyType} onChange={handleChange}>
                <option value="private">Private Limited</option>
                <option value="public">Public Limited</option>
                <option value="partnership">Partnership</option>
                <option value="sole">Sole Proprietorship</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="login-submit-btn" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Registering...' : 'Register Company'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyRegistrationPage;