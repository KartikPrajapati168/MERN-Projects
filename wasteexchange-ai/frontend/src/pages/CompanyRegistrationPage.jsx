// src/pages/CompanyRegistrationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import LocationPicker from '../components/LocationPicker';
import '../App.css';

const CompanyRegistrationPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    companyRegistrationNo: '',
    gstNumber: '',
    panNumber: '',
    companyType: 'private',
    website: '',
    yearEstablished: '',
    businessDescription: '',

    // Address - these will be auto-filled by LocationPicker
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyPincode: '',
    country: 'India',
    latitude: '',
    longitude: '',

    // Contact
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Auth guard and redirect logic
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

    // Pre-fill contact email from user
    setFormData(prev => ({
      ...prev,
      contactEmail: currentUser.email || ''
    }));

    // Check if company is already registered
    if (currentUser.isCompanyRegistered) {
      // If verified, go to dashboard
      if (currentUser.isCompanyVerified) {
        const dashboardPath = currentUser.role === 'generator' ? '/generator' : '/buyer';
        navigate(dashboardPath);
        return;
      } else {
        // If not verified, go to waiting page
        navigate('/waiting');
        return;
      }
    }
  }, [navigate]);

  // Handle location selection from LocationPicker
  // const handleLocationSelect = (locationData) => {
  //   console.log('Location data received:', locationData);

  //   // Extract data from LocationPicker response
  //   const address = locationData.address || '';
  //   const city = locationData.city || '';
  //   const state = locationData.state || '';
  //   const pincode = locationData.pincode || '';
  //   const country = locationData.country || 'India';
  //   const lat = locationData.coordinates?.[0]?.toString() || '';
  //   const lng = locationData.coordinates?.[1]?.toString() || '';

  //   setFormData(prev => ({
  //     ...prev,
  //     companyAddress: address || prev.companyAddress,
  //     companyCity: city || prev.companyCity,
  //     companyState: state || prev.companyState,
  //     companyPincode: pincode || prev.companyPincode,
  //     country: country || prev.country,
  //     latitude: lat || prev.latitude,
  //     longitude: lng || prev.longitude,
  //   }));

  //   // Clear location error if exists
  //   if (errors.location) {
  //     setErrors(prev => ({ ...prev, location: '' }));
  //   }
  // };

  // src/pages/CompanyRegistrationPage.jsx me ye function update karo
  const handleLocationSelect = (locationData) => {
    console.log('Location data received:', locationData);

    const { address, city, state, pincode, country, coordinates } = locationData;

    setFormData(prev => ({
      ...prev,
      companyAddress: address || prev.companyAddress,
      companyCity: city || prev.companyCity,         // ✅ Ab sahi se fill hoga
      companyState: state || prev.companyState,       // ✅ Ab sahi se fill hoga
      companyPincode: pincode || prev.companyPincode, // ✅ Ab sahi se fill hoga
      country: country || prev.country || 'India',
      latitude: coordinates?.[0]?.toString() || prev.latitude,
      longitude: coordinates?.[1]?.toString() || prev.longitude,
    }));

    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }));
    }
  };

  // Manual input for address fields
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Pure function for field validation
  const getFieldError = (fieldName, value) => {
    switch (fieldName) {
      case 'companyName':
        return !value || value.trim().length < 2
          ? 'Company name must be at least 2 characters'
          : '';
      case 'companyRegistrationNo':
        return !value || value.trim().length < 5
          ? 'Valid registration number is required'
          : '';
      case 'gstNumber':
        return !value || !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(value)
          ? 'Invalid GST number format (e.g., 22AAAAA0000A1Z5)'
          : '';
      case 'panNumber':
        return !value || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)
          ? 'Invalid PAN number format (e.g., ABCDE1234F)'
          : '';
      case 'companyAddress':
        return !value || value.trim().length < 5 ? 'Address is required' : '';
      case 'companyCity':
        return !value || value.trim().length < 2 ? 'City is required' : '';
      case 'companyState':
        return !value || value.trim().length < 2 ? 'State is required' : '';
      case 'companyPincode':
        return !value || !/^[1-9][0-9]{5}$/.test(value)
          ? 'Valid 6-digit pincode is required'
          : '';
      case 'contactPerson':
        return !value || value.trim().length < 2
          ? 'Contact person name is required'
          : '';
      case 'contactPhone':
        return !value || !/^[0-9]{10}$/.test(value)
          ? 'Valid 10-digit phone number is required'
          : '';
      case 'contactEmail':
        return !value || !/\S+@\S+\.\S+/.test(value)
          ? 'Valid email is required'
          : '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = getFieldError(name, value);
    setErrors(prev => {
      const next = { ...prev };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  };

  const validateStep = (step) => {
    const fieldsToValidate = {
      1: ['companyName', 'companyRegistrationNo', 'gstNumber', 'panNumber'],
      2: ['companyAddress', 'companyCity', 'companyState', 'companyPincode'],
      3: ['contactPerson', 'contactPhone', 'contactEmail']
    };

    const currentFields = fieldsToValidate[step] || [];
    const newErrors = { ...errors };
    let stepValid = true;

    // Mark all fields as touched for this step
    currentFields.forEach(field => {
      setTouched(prev => ({ ...prev, [field]: true }));
      const error = getFieldError(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        stepValid = false;
      } else {
        delete newErrors[field];
      }
    });

    // Step 2 also requires location
    if (step === 2) {
      if (!formData.latitude || !formData.longitude) {
        newErrors.location = 'Please select a location on the map';
        stepValid = false;
      } else {
        delete newErrors.location;
      }
    }

    setErrors(newErrors);
    return stepValid;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateForm = () => {
    const fields = [
      'companyName',
      'companyRegistrationNo',
      'gstNumber',
      'panNumber',
      'companyAddress',
      'companyCity',
      'companyState',
      'companyPincode',
      'contactPerson',
      'contactPhone',
      'contactEmail',
    ];

    const newErrors = {};
    fields.forEach(field => {
      const error = getFieldError(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Please select a location on the map';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setServerError('');
    setSuccessMessage('');

    try {
      // Prepare data for backend - match the User model fields
      const registrationData = {
        companyName: formData.companyName.trim(),
        companyRegistrationNo: formData.companyRegistrationNo.trim(),
        gstNumber: formData.gstNumber.trim(),
        panNumber: formData.panNumber.trim(),
        companyType: formData.companyType,
        website: formData.website.trim(),
        yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
        businessDescription: formData.businessDescription.trim(),
        companyAddress: formData.companyAddress.trim(),
        companyCity: formData.companyCity.trim(),
        companyState: formData.companyState.trim(),
        companyPincode: formData.companyPincode.trim(),
        country: formData.country || 'India',
        latitude: formData.latitude,
        longitude: formData.longitude,
        contactPerson: formData.contactPerson.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim(),
        role: user?.role || 'buyer'
      };

      console.log('Submitting registration data:', registrationData);

      const response = await API.post('/auth/register-company', registrationData);

      console.log('Registration response:', response.data);

      // Update localStorage with new user data
      const updatedUser = {
        ...user,
        ...response.data.user,
        isCompanyRegistered: true,
        isCompanyVerified: false,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      setSuccessMessage('Company registered successfully! Redirecting to verification...');

      // Redirect to waiting page after 2 seconds
      setTimeout(() => {
        navigate('/waiting');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setServerError(
        err.response?.data?.msg ||
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // Step configuration
  const steps = [
    { id: 1, label: 'Company Info', icon: '🏢' },
    { id: 2, label: 'Address & Location', icon: '📍' },
    { id: 3, label: 'Contact & Review', icon: '✅' }
  ];

  return (
    <div className="login-page" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <Link to="/" style={styles.logoLink}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>♻️</span>
              <span style={styles.logoText}>WasteExchange AI</span>
            </div>
          </Link>

          {user && (
            <div style={styles.userSection}>
              <div style={styles.userInfo}>
                <div style={styles.userAvatar}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={styles.userDetails}>
                  <div style={styles.userName}>{user.name || 'User'}</div>
                  <div style={styles.userRole}>
                    {user.role === 'generator' ? 'Generator' : 'Buyer'}
                  </div>
                </div>
              </div>
              <button onClick={logout} style={styles.logoutBtn}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Background Elements */}
      <div className="login-bg-gradient" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-grid-overlay" />

      <div className="login-container" style={{ maxWidth: '800px', paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        <h1 style={styles.pageTitle}>🏢 Company Registration</h1>
        <p style={styles.pageSubtitle}>
          As a {user?.role === 'generator' ? 'Generator' : 'Buyer'}, register your company to start trading.
        </p>

        {/* Progress Steps */}
        <div style={styles.progress}>
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} style={styles.progressStep}>
                <div
                  style={{
                    ...styles.stepCircle,
                    ...(isCompleted ? styles.stepCircleCompleted : isActive ? styles.stepCircleActive : {}),
                  }}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>
                <div
                  style={{
                    ...styles.stepLabel,
                    ...(isCompleted || isActive ? styles.stepLabelActive : {}),
                  }}
                >
                  {step.label}
                </div>
                {step.id < steps.length && <div style={styles.stepConnector} />}
              </div>
            );
          })}
        </div>

        <div className="login-card" style={{ padding: '2rem' }}>
          {serverError && <div className="login-error">{serverError}</div>}
          {successMessage && <div className="login-success">{successMessage}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {/* Step 1: Company Information */}
            <section style={{ ...styles.section, display: currentStep === 1 ? 'block' : 'none' }}>
              <h2 style={styles.sectionTitle}>🏢 Company Information</h2>
              <div style={styles.infoBox}>
                <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>
                    Tell us about your company
                  </p>
                  <small style={{ color: 'rgba(255,255,255,0.6)' }}>
                    This helps us verify your business before you start trading.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Company Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  className="form-input"
                  value={formData.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="ABC Industries Pvt Ltd"
                />
                {errors.companyName && touched.companyName && (
                  <small style={{ color: '#f87171' }}>{errors.companyName}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  Registration Number <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="companyRegistrationNo"
                  className="form-input"
                  value={formData.companyRegistrationNo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="U12345GJ2025ABC123"
                />
                {errors.companyRegistrationNo && touched.companyRegistrationNo && (
                  <small style={{ color: '#f87171' }}>{errors.companyRegistrationNo}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  GST Number <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  className="form-input"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="22AAAAA0000A1Z5"
                />
                {errors.gstNumber && touched.gstNumber && (
                  <small style={{ color: '#f87171' }}>{errors.gstNumber}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  PAN Number <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="panNumber"
                  className="form-input"
                  value={formData.panNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                />
                {errors.panNumber && touched.panNumber && (
                  <small style={{ color: '#f87171' }}>{errors.panNumber}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  Company Type <span style={styles.required}>*</span>
                </label>
                <select
                  name="companyType"
                  className="form-input"
                  value={formData.companyType}
                  onChange={handleChange}
                >
                  <option value="private">Private Limited</option>
                  <option value="public">Public Limited</option>
                  <option value="partnership">Partnership</option>
                  <option value="sole">Sole Proprietorship</option>
                  <option value="llp">LLP</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Year Established</label>
                <input
                  type="number"
                  name="yearEstablished"
                  className="form-input"
                  value={formData.yearEstablished}
                  onChange={handleChange}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="form-group">
                <label>Business Description</label>
                <textarea
                  name="businessDescription"
                  className="form-input"
                  value={formData.businessDescription}
                  onChange={handleChange}
                  placeholder="Brief description of your business..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Website (Optional)</label>
                <input
                  type="url"
                  name="website"
                  className="form-input"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.example.com"
                />
              </div>

              <button type="button" onClick={handleNextStep} className="login-submit-btn">
                Next Step →
              </button>
            </section>

            {/* Step 2: Address & Location */}
            <section style={{ ...styles.section, display: currentStep === 2 ? 'block' : 'none' }}>
              <h2 style={styles.sectionTitle}>📍 Address & Location</h2>

              <div style={styles.infoBox}>
                <span style={{ fontSize: '1.2rem' }}>🗺️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>
                    Pin your company location
                  </p>
                  <small style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Click on the map to set your company's exact location. All address fields will auto-fill.
                  </small>
                </div>
              </div>

              {/* Location Picker - Same as in BuyerDashboard */}
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                defaultLocation={[23.0225, 72.5714]}
                placeholder="Search or click on map to set location"
              />

              {errors.location && (
                <small style={{ color: '#f87171', display: 'block', marginTop: '0.5rem' }}>
                  {errors.location}
                </small>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label>
                    Company Address <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    name="companyAddress"
                    className="form-input"
                    value={formData.companyAddress}
                    onChange={handleAddressChange}
                    onBlur={handleBlur}
                    placeholder="Auto-filled from map selection"
                    rows="2"
                  />
                  {errors.companyAddress && touched.companyAddress && (
                    <small style={{ color: '#f87171' }}>{errors.companyAddress}</small>
                  )}
                </div>

                <div style={styles.grid2}>
                  <div className="form-group">
                    <label>
                      City <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="companyCity"
                      className="form-input"
                      value={formData.companyCity}
                      onChange={handleAddressChange}
                      onBlur={handleBlur}
                      placeholder="Auto-filled from map"
                    />
                    {errors.companyCity && touched.companyCity && (
                      <small style={{ color: '#f87171' }}>{errors.companyCity}</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      State <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="companyState"
                      className="form-input"
                      value={formData.companyState}
                      onChange={handleAddressChange}
                      onBlur={handleBlur}
                      placeholder="Auto-filled from map"
                    />
                    {errors.companyState && touched.companyState && (
                      <small style={{ color: '#f87171' }}>{errors.companyState}</small>
                    )}
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div className="form-group">
                    <label>
                      Pincode <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="companyPincode"
                      className="form-input"
                      value={formData.companyPincode}
                      onChange={handleAddressChange}
                      onBlur={handleBlur}
                      placeholder="Auto-filled from map"
                      maxLength="6"
                    />
                    {errors.companyPincode && touched.companyPincode && (
                      <small style={{ color: '#f87171' }}>{errors.companyPincode}</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      Country <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="country"
                      className="form-input"
                      value={formData.country}
                      onChange={handleAddressChange}
                      placeholder="Auto-filled from map"
                    />
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      className="form-input"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="Auto-filled from map"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="text"
                      name="longitude"
                      className="form-input"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="Auto-filled from map"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button type="button" onClick={handlePrevStep} style={styles.secondaryBtn}>
                  ← Previous
                </button>
                <button type="button" onClick={handleNextStep} className="login-submit-btn">
                  Next Step →
                </button>
              </div>
            </section>

            {/* Step 3: Contact & Review */}
            <section
              style={{
                ...styles.section,
                borderBottom: 'none',
                display: currentStep === 3 ? 'block' : 'none',
              }}
            >
              <h2 style={styles.sectionTitle}>📞 Contact & Review</h2>

              <div className="form-group">
                <label>
                  Contact Person <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  className="form-input"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Full name of contact person"
                />
                {errors.contactPerson && touched.contactPerson && (
                  <small style={{ color: '#f87171' }}>{errors.contactPerson}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  Contact Phone <span style={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  className="form-input"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="9876543210"
                  maxLength="10"
                />
                {errors.contactPhone && touched.contactPhone && (
                  <small style={{ color: '#f87171' }}>{errors.contactPhone}</small>
                )}
              </div>

              <div className="form-group">
                <label>
                  Contact Email <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  className="form-input"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="contact@company.com"
                />
                {errors.contactEmail && touched.contactEmail && (
                  <small style={{ color: '#f87171' }}>{errors.contactEmail}</small>
                )}
              </div>

              {/* Review Section */}
              <div style={styles.reviewSection}>
                <h3 style={styles.reviewTitle}>📋 Review Your Details</h3>

                <div style={styles.reviewCard}>
                  <h4>Company Information</h4>
                  <p><strong>Name:</strong> {formData.companyName || 'Not provided'}</p>
                  <p><strong>Registration No:</strong> {formData.companyRegistrationNo || 'Not provided'}</p>
                  <p><strong>GST Number:</strong> {formData.gstNumber || 'Not provided'}</p>
                  <p><strong>PAN Number:</strong> {formData.panNumber || 'Not provided'}</p>
                  <p><strong>Type:</strong> {formData.companyType || 'Not provided'}</p>
                </div>

                <div style={styles.reviewCard}>
                  <h4>Address</h4>
                  <p><strong>Address:</strong> {formData.companyAddress || 'Not provided'}</p>
                  <p><strong>City:</strong> {formData.companyCity || 'Not provided'}</p>
                  <p><strong>State:</strong> {formData.companyState || 'Not provided'}</p>
                  <p><strong>Pincode:</strong> {formData.companyPincode || 'Not provided'}</p>
                  <p><strong>Country:</strong> {formData.country || 'Not provided'}</p>
                  {formData.latitude && formData.longitude && (
                    <p><strong>Location:</strong> {formData.latitude}, {formData.longitude}</p>
                  )}
                </div>

                <div style={styles.reviewCard}>
                  <h4>Contact</h4>
                  <p><strong>Contact Person:</strong> {formData.contactPerson || 'Not provided'}</p>
                  <p><strong>Phone:</strong> {formData.contactPhone || 'Not provided'}</p>
                  <p><strong>Email:</strong> {formData.contactEmail || 'Not provided'}</p>
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button type="button" onClick={handlePrevStep} style={styles.secondaryBtn}>
                  ← Previous
                </button>
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? 'Registering...' : '✅ Register Company'}
                </button>
              </div>

              <p
                style={{
                  marginTop: '1rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              >
                Your company will be verified by our team after submission.
              </p>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  header: {
    position: 'relative',
    zIndex: 2,
    padding: '0.8rem 1.5rem',
    background: 'transparent',
  },
  headerContainer: {
    display: 'flex',
    gap: '610px',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  logoLink: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  logoIcon: {
    fontSize: '1.8rem',
    filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px',
    textShadow: '0 2px 20px rgba(0,0,0,0.3)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#fff',
    background: 'rgba(255,255,255,0.08)',
    padding: '0.4rem 0.8rem 0.4rem 0.4rem',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#fff',
    fontSize: '0.9rem',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
  },
  userDetails: {
    lineHeight: 1.2,
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#fff',
  },
  userRole: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '8px 18px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  pageTitle: {
    textAlign: 'center',
    color: '#fff',
    fontSize: '2rem',
    marginBottom: '0.3rem',
  },
  pageSubtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '2rem',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  progressStep: {
    display: 'flex',
    alignItems: 'center',
  },
  stepCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
    border: '2px solid rgba(255,255,255,0.15)',
  },
  stepCircleActive: {
    background: '#6366f1',
    color: '#fff',
    borderColor: '#6366f1',
  },
  stepCircleCompleted: {
    background: '#22c55e',
    color: '#fff',
    borderColor: '#22c55e',
  },
  stepLabel: {
    marginLeft: '0.5rem',
    marginRight: '1rem',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.85rem',
  },
  stepLabelActive: {
    color: '#fff',
    fontWeight: 600,
  },
  stepConnector: {
    width: '60px',
    height: '2px',
    background: 'rgba(255,255,255,0.15)',
    marginRight: '1rem',
  },
  section: {
    marginBottom: '1rem',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '1.15rem',
    marginBottom: '1rem',
  },
  infoBox: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '10px',
    padding: '0.9rem 1rem',
    marginBottom: '1.2rem',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  required: { color: '#f87171' },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  reviewSection: {
    marginTop: '1.5rem',
  },
  reviewTitle: {
    color: '#fff',
    marginBottom: '1rem',
  },
  reviewCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1rem',
  },
};

export default CompanyRegistrationPage;