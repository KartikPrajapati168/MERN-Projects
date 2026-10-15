// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import RequirementCard from '../components/RequirementCard';
import MatchCard from '../components/MatchCard';
import DealCard from '../components/DealCard';
import CompanyRegistration from '../components/CompanyRegistration';
import AdminVerificationPanel from '../components/AdminVerificationPanel';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import API from '../utils/api';
import { wasteCategories, mainCategories } from '../utils/wasteData';
import '../utils/mongodb';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [deals, setDeals] = useState([]);
  const [adminStats, setAdminStats] = useState({
    totalRevenue: 0,
    totalDeals: 0,
    totalGenerators: 0,
    totalBuyers: 0,
    totalUsers: 0,
  });

  // Form states (for create tabs)
  const [listingForm, setListingForm] = useState({
    material: '',
    materialSubtype: '',
    quantity: '',
    price: '',
    location: '',
    locationCoordinates: [0, 0],
    description: '',
  });
  const [listingErrors, setListingErrors] = useState({});
  const [reqForm, setReqForm] = useState({
    material: '',
    materialSubtype: '',
    minQty: '',
    maxQty: '',
    maxPrice: '',
    location: '',
    locationCoordinates: [0, 0],
  });
  const [reqErrors, setReqErrors] = useState({});

  // Company registration states
  const [showCompanyRegistration, setShowCompanyRegistration] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  // ===== LOAD DATA =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        setUser(currentUser);

        // Check company registration status (for non-admin)
        if (currentUser.role !== 'admin') {
          if (!currentUser.isCompanyRegistered) {
            setShowCompanyRegistration(true);
            setActiveTab('register');
          } else if (!currentUser.isCompanyVerified) {
            setShowVerificationMessage(true);
            setActiveTab('waiting');
          }
        }

        // Fetch data based on role
        if (currentUser.role === 'admin') {
          setActiveTab('admin');
          const statsRes = await API.get('/admin/stats');
          setAdminStats(statsRes.data);
        } else {
          // Only fetch if company is verified
          if (currentUser.isCompanyVerified) {
            const [listingsRes, reqRes, dealsRes] = await Promise.all([
              API.get('/listings/user'),
              API.get('/requirements/user'),
              API.get('/deals/user'),
            ]);
            setListings(listingsRes.data);
            setRequirements(reqRes.data);
            setDeals(dealsRes.data);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        if (err.response?.status === 401) navigate('/login');
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // ===== COMPANY REGISTRATION COMPLETE =====
  const handleCompanyRegistrationComplete = () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    setUser(currentUser);
    setShowCompanyRegistration(false);
    if (currentUser.isCompanyRegistered && !currentUser.isCompanyVerified) {
      setShowVerificationMessage(true);
      setActiveTab('waiting');
    }
    // Reload user data from backend
    window.location.reload();
  };

  // ===== CRUD FUNCTIONS (Listings / Requirements / Deals) =====
  // (Same as before – kept brief for space)
  const validateListing = () => {
    const err = {};
    if (!listingForm.material.trim()) err.material = 'Required';
    if (!listingForm.quantity || Number(listingForm.quantity) <= 0) err.quantity = '> 0';
    if (!listingForm.price || Number(listingForm.price) <= 0) err.price = '> 0';
    if (!listingForm.location.trim()) err.location = 'Required';
    setListingErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!validateListing()) return;
    try {
      const res = await API.post('/listings', {
        material: listingForm.material,
        materialSubtype: listingForm.materialSubtype,
        quantity: Number(listingForm.quantity),
        price: Number(listingForm.price),
        location: listingForm.location,
        locationCoordinates: listingForm.locationCoordinates,
        description: listingForm.description,
      });
      setListings([...listings, res.data]);
      setListingForm({ material: '', materialSubtype: '', quantity: '', price: '', location: '', locationCoordinates: [0, 0], description: '' });
      setListingErrors({});
      alert('✅ Listing added!');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const deleteListing = async (id) => {
    try {
      await API.delete(`/listings/${id}`);
      setListings(listings.filter(l => l._id !== id));
    } catch (err) {
      alert('❌ Delete failed');
    }
  };

  const validateRequirement = () => {
    const err = {};
    if (!reqForm.material.trim()) err.material = 'Required';
    if (!reqForm.minQty || Number(reqForm.minQty) <= 0) err.minQty = '> 0';
    if (!reqForm.maxQty || Number(reqForm.maxQty) <= 0) err.maxQty = '> 0';
    if (Number(reqForm.minQty) > Number(reqForm.maxQty)) err.maxQty = 'Min <= Max';
    if (!reqForm.maxPrice || Number(reqForm.maxPrice) <= 0) err.maxPrice = '> 0';
    if (!reqForm.location.trim()) err.location = 'Required';
    setReqErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    if (!validateRequirement()) return;
    try {
      const res = await API.post('/requirements', {
        material: reqForm.material,
        materialSubtype: reqForm.materialSubtype,
        minQty: Number(reqForm.minQty),
        maxQty: Number(reqForm.maxQty),
        maxPrice: Number(reqForm.maxPrice),
        location: reqForm.location,
        locationCoordinates: reqForm.locationCoordinates,
      });
      setRequirements([...requirements, res.data]);
      setReqForm({ material: '', materialSubtype: '', minQty: '', maxQty: '', maxPrice: '', location: '', locationCoordinates: [0, 0] });
      setReqErrors({});
      alert('✅ Requirement added!');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const deleteRequirement = async (id) => {
    try {
      await API.delete(`/requirements/${id}`);
      setRequirements(requirements.filter(r => r._id !== id));
    } catch (err) {
      alert('❌ Delete failed');
    }
  };

  const sendRequest = async (listingId) => {
    try {
      const res = await API.post('/deals', { listingId });
      setDeals([...deals, res.data]);
      alert('✅ Request sent to Generator!');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const acceptDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/accept`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Accepted!');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const completeDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/complete`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Completed!');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // ===== SIDEBAR NAVIGATION ITEMS =====
  const sidebarItems = () => {
    if (user?.role === 'admin') {
      return [
        { id: 'admin', label: '📊 Dashboard', icon: '📊' },
        { id: 'admin-verifications', label: '✅ Verifications', icon: '✅' },
        { id: 'admin-users', label: '👥 Users', icon: '👥' },
        { id: 'admin-deals', label: '💰 Deals', icon: '💰' },
      ];
    } else {
      return [
        { id: 'listings', label: '📄 My Items', icon: '📄' },
        { id: 'create', label: '➕ Create', icon: '➕' },
        { id: 'matches', label: '🤖 AI Matches', icon: '🤖' },
        { id: 'deals', label: '🤝 My Deals', icon: '🤝' },
        { id: 'profile', label: '👤 Profile', icon: '👤' },
      ];
    }
  };

  // ===== RENDER TAB CONTENT =====
  const renderContent = () => {
    // Special screens
    if (showCompanyRegistration) {
      return <CompanyRegistration user={user} onComplete={handleCompanyRegistrationComplete} />;
    }
    if (showVerificationMessage) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2 style={{ color: '#fbbf24' }}>⏳ Awaiting Admin Verification</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Your company details are under review. You will be notified once verified.
          </p>
        </div>
      );
    }

    // Normal tabs
    switch (activeTab) {
      case 'listings':
        return (
          <div>
            <h3 style={{ color: '#60a5fa' }}>
              {user?.role === 'generator' ? '📤 My Waste Listings' : '🛒 My Requirements'}
            </h3>
            {user?.role === 'generator'
              ? listings.filter(l => l.generatorId === user._id).map(l => (
                  <ListingCard key={l._id} listing={l} onDelete={deleteListing} />
                ))
              : requirements.filter(r => r.buyerId === user._id).map(r => (
                  <RequirementCard key={r._id} req={r} onDelete={deleteRequirement} />
                ))}
            {user?.role === 'generator' &&
              listings.filter(l => l.generatorId === user._id).length === 0 && (
                <p style={{ color: '#666' }}>No listings yet. Create one!</p>
              )}
            {user?.role === 'buyer' &&
              requirements.filter(r => r.buyerId === user._id).length === 0 && (
                <p style={{ color: '#666' }}>No requirements yet. Create one!</p>
              )}
          </div>
        );

      case 'create':
        if (user?.role === 'generator') {
          return (
            <div style={{ maxWidth: '600px' }}>
              <h4 style={{ color: '#a78bfa' }}>📤 Post Waste (Generator)</h4>
              <form onSubmit={handleAddListing}>
                {/* Material category dropdown */}
                <div className="form-group">
                  <label>Material Category *</label>
                  <select
                    className="form-input"
                    value={listingForm.material}
                    onChange={(e) =>
                      setListingForm({ ...listingForm, material: e.target.value, materialSubtype: '' })
                    }
                  >
                    <option value="">Select Category</option>
                    {mainCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {listingErrors.material && <small style={{ color: '#f87171' }}>{listingErrors.material}</small>}
                </div>
                {listingForm.material && (
                  <div className="form-group">
                    <label>Material Subtype</label>
                    <select
                      className="form-input"
                      value={listingForm.materialSubtype}
                      onChange={(e) =>
                        setListingForm({ ...listingForm, materialSubtype: e.target.value })
                      }
                    >
                      <option value="">Select Subtype</option>
                      {wasteCategories[listingForm.material]?.subtypes.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Quantity (kg) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={listingForm.quantity}
                    onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
                    placeholder="500"
                  />
                  {listingErrors.quantity && <small style={{ color: '#f87171' }}>{listingErrors.quantity}</small>}
                </div>
                <div className="form-group">
                  <label>Price (₹/kg) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={listingForm.price}
                    onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                    placeholder="35"
                  />
                  {listingErrors.price && <small style={{ color: '#f87171' }}>{listingErrors.price}</small>}
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    className="form-input"
                    value={listingForm.location}
                    onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
                    placeholder="Ahmedabad"
                  />
                  {listingErrors.location && <small style={{ color: '#f87171' }}>{listingErrors.location}</small>}
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    value={listingForm.description}
                    onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
                    placeholder="Condition..."
                    rows="2"
                  />
                </div>
                <button type="submit" className="login-submit-btn" style={{ width: '100%' }}>
                  Add Listing
                </button>
              </form>
            </div>
          );
        } else if (user?.role === 'buyer') {
          return (
            <div style={{ maxWidth: '600px' }}>
              <h4 style={{ color: '#60a5fa' }}>🛒 Create Requirement (Buyer)</h4>
              <form onSubmit={handleAddRequirement}>
                <div className="form-group">
                  <label>Material Category *</label>
                  <select
                    className="form-input"
                    value={reqForm.material}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, material: e.target.value, materialSubtype: '' })
                    }
                  >
                    <option value="">Select Category</option>
                    {mainCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {reqErrors.material && <small style={{ color: '#f87171' }}>{reqErrors.material}</small>}
                </div>
                {reqForm.material && (
                  <div className="form-group">
                    <label>Material Subtype</label>
                    <select
                      className="form-input"
                      value={reqForm.materialSubtype}
                      onChange={(e) =>
                        setReqForm({ ...reqForm, materialSubtype: e.target.value })
                      }
                    >
                      <option value="">Select Subtype</option>
                      {wasteCategories[reqForm.material]?.subtypes.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Min Qty *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={reqForm.minQty}
                      onChange={(e) => setReqForm({ ...reqForm, minQty: e.target.value })}
                      placeholder="500"
                    />
                    {reqErrors.minQty && <small style={{ color: '#f87171' }}>{reqErrors.minQty}</small>}
                  </div>
                  <div className="form-group">
                    <label>Max Qty *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={reqForm.maxQty}
                      onChange={(e) => setReqForm({ ...reqForm, maxQty: e.target.value })}
                      placeholder="1000"
                    />
                    {reqErrors.maxQty && <small style={{ color: '#f87171' }}>{reqErrors.maxQty}</small>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Max Price (₹/kg) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={reqForm.maxPrice}
                    onChange={(e) => setReqForm({ ...reqForm, maxPrice: e.target.value })}
                    placeholder="40"
                  />
                  {reqErrors.maxPrice && <small style={{ color: '#f87171' }}>{reqErrors.maxPrice}</small>}
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    className="form-input"
                    value={reqForm.location}
                    onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })}
                    placeholder="Surat"
                  />
                  {reqErrors.location && <small style={{ color: '#f87171' }}>{reqErrors.location}</small>}
                </div>
                <button
                  type="submit"
                  className="login-submit-btn"
                  style={{ width: '100%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}
                >
                  Add Requirement
                </button>
              </form>
            </div>
          );
        }
        return <p style={{ color: '#f87171' }}>⛔ Access Denied</p>;

      case 'matches':
        const matches = (() => {
          if (!user) return [];
          if (user.role === 'buyer') {
            const myReqs = requirements.filter(r => r.buyerId === user._id && r.status === 'open');
            const activeListings = listings.filter(l => l.status === 'active');
            const results = [];
            myReqs.forEach(req => {
              activeListings.forEach(listing => {
                const score = calculateMatch(listing, req);
                if (score > 30) results.push({ ...listing, reqId: req._id, reqMaterial: req.material, matchScore: score });
              });
            });
            return results.sort((a, b) => b.matchScore - a.matchScore);
          } else {
            const myListings = listings.filter(l => l.generatorId === user._id && l.status === 'active');
            const openReqs = requirements.filter(r => r.status === 'open');
            const results = [];
            myListings.forEach(listing => {
              openReqs.forEach(req => {
                const score = calculateMatch(listing, req);
                if (score > 30) results.push({ ...req, listingId: listing._id, listingMaterial: listing.material, matchScore: score });
              });
            });
            return results.sort((a, b) => b.matchScore - a.matchScore);
          }
        })();

        return (
          <div>
            <h3 style={{ color: '#a78bfa' }}>🤖 AI Recommended Matches</h3>
            {matches.length === 0 && <p style={{ color: '#666' }}>No high-confidence matches found.</p>}
            {matches.map((item, idx) => (
              <MatchCard key={idx} item={item} type={user.role} onSendRequest={sendRequest} />
            ))}
          </div>
        );

      case 'deals':
        const myDeals = deals.filter(d => d.buyerId === user?._id || d.generatorId === user?._id);
        return (
          <div>
            <h3 style={{ color: '#eab308' }}>🤝 My Deals</h3>
            {myDeals.length === 0 && <p style={{ color: '#666' }}>No deals yet.</p>}
            {myDeals.map(d => (
              <DealCard
                key={d._id}
                deal={d}
                userRole={user?.role}
                onAccept={acceptDeal}
                onComplete={completeDeal}
              />
            ))}
          </div>
        );

      case 'profile':
        return (
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ color: '#a78bfa' }}>👤 My Profile</h3>
            <ProfilePictureUpload currentUser={user} onUpdate={(newPic) => {
              const updatedUser = { ...user, profilePicture: newPic };
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
              setUser(updatedUser);
            }} />
            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px' }}>
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {user?.role}</p>
              {user?.isCompanyVerified && <p style={{ color: '#22c55e' }}>✅ Company Verified</p>}
            </div>
          </div>
        );

      case 'admin':
        return (
          <div>
            <h3 style={{ color: '#fbbf24' }}>📊 Admin Dashboard</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem', margin: '1rem 0' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h2 style={{ color: '#fbbf24' }}>₹{adminStats.totalRevenue}</h2>
                <p>Revenue</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h2 style={{ color: '#22c55e' }}>{adminStats.totalDeals}</h2>
                <p>Deals</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h2 style={{ color: '#60a5fa' }}>{adminStats.totalGenerators}</h2>
                <p>Generators</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <h2 style={{ color: '#a78bfa' }}>{adminStats.totalBuyers}</h2>
                <p>Buyers</p>
              </div>
            </div>
          </div>
        );

      case 'admin-verifications':
        return <AdminVerificationPanel />;

      case 'admin-users':
        return <div style={{ color: '#aaa' }}>User management coming soon...</div>;

      case 'admin-deals':
        return <div style={{ color: '#aaa' }}>Deals overview coming soon...</div>;

      default:
        return <div>Select a tab</div>;
    }
  };

  // ===== MATCH CALCULATOR =====
  const calculateMatch = (listing, req) => {
    // (same as before – kept short)
    const text1 = (listing.material + ' ' + (listing.description || '')).toLowerCase();
    const text2 = req.material.toLowerCase();
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const common = words1.filter(w => words2.includes(w) && w.length > 2);
    const textSim = Math.min(100, (common.length / Math.max(1, words2.length)) * 100);

    const qty = listing.quantity;
    let qtyScore = 0;
    if (qty >= req.minQty && qty <= req.maxQty) qtyScore = 100;
    else if (qty > req.maxQty) qtyScore = Math.max(0, 100 - ((qty - req.maxQty) / req.maxQty) * 50);
    else qtyScore = Math.max(0, 100 - ((req.minQty - qty) / req.minQty) * 50);

    const priceScore = listing.price <= req.maxPrice ? 100 : Math.max(0, 100 - ((listing.price - req.maxPrice) / req.maxPrice) * 100);
    const locScore = listing.location.toLowerCase() === req.location.toLowerCase() ? 100 : 50;
    const condScore = listing.description?.toLowerCase().includes('good') ? 100 : 70;

    const weights = { text: 0.30, qty: 0.25, price: 0.20, loc: 0.15, cond: 0.10 };
    return Math.round((textSim * weights.text) + (qtyScore * weights.qty) + (priceScore * weights.price) + (locScore * weights.loc) + (condScore * weights.cond));
  };

  // ===== LOADING =====
  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳ Loading...</div>;

  // ===== MAIN LAYOUT (with Sidebar) =====
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: 'white', display: 'flex', fontFamily: 'sans-serif' }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: '240px', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>♻️ WasteExchange</h2>
        </div>
        <nav style={{ flex: 1 }}>
          {sidebarItems().map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === item.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.95rem',
                marginBottom: '0.25rem',
              }}
              onMouseEnter={(e) => { if (activeTab !== item.id) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (activeTab !== item.id) e.target.style.background = 'transparent'; }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem' }}>Welcome, {user?.name}!</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.role.toUpperCase()} Dashboard</p>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;