// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import RequirementCard from '../components/RequirementCard';
import MatchCard from '../components/MatchCard';
import DealCard from '../components/DealCard';
import '../utils/mongodb';
import API from '../utils/api';


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('listings');
  const [loading, setLoading] = useState(true);

  // Data States
  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [deals, setDeals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminStats, setAdminStats] = useState({
    totalRevenue: 0, totalDeals: 0, totalUsers: 0,
    totalGenerators: 0, totalBuyers: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Form States
  const [listingForm, setListingForm] = useState({ material: '', quantity: '', price: '', location: '', description: '' });
  const [listingErrors, setListingErrors] = useState({});
  const [reqForm, setReqForm] = useState({ material: '', minQty: '', maxQty: '', maxPrice: '', location: '' });
  const [reqErrors, setReqErrors] = useState({});

  // ===== LOAD DATA =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        setUser(currentUser);

        // If user is not admin and company not registered, show registration
        if (currentUser.role !== 'admin' && !currentUser.isCompanyRegistered) {
          setShowCompanyRegistration(true);
        } else if (currentUser.role !== 'admin' && currentUser.isCompanyRegistered && !currentUser.isCompanyVerified) {
          // Show waiting for verification message
          setShowVerificationMessage(true);
        }

        // Fetch listings
        const listingsRes = await API.get('/listings/user');
        setListings(listingsRes.data);

        // Fetch requirements
        const reqRes = await API.get('/requirements/user');
        setRequirements(reqRes.data);

        // Fetch deals
        const dealsRes = await API.get('/deals/user');
        setDeals(dealsRes.data);

        // Fetch users for admin
        const usersRes = await API.get('/admin/users'); // You need to add this route
        // Or keep allUsers from localStorage temporarily

        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        if (err.response?.status === 401) navigate('/login');
      }
    };
    fetchData();
  }, [navigate]);

  // console.log("set listing is", setListings)
  // console.log(setRequirements)

  // ===== SAVE HELPERS =====
  const saveListings = (data) => { setListings(data); localStorage.setItem('listings', JSON.stringify(data)); };
  const saveRequirements = (data) => { setRequirements(data); localStorage.setItem('requirements', JSON.stringify(data)); };
  const saveDeals = (data) => { setDeals(data); localStorage.setItem('deals', JSON.stringify(data)); };

  // ===== LISTING CRUD =====
  const validateListing = () => {
    const err = {};
    if (!listingForm.material.trim()) err.material = 'Material is required';
    if (!listingForm.quantity || Number(listingForm.quantity) <= 0) err.quantity = 'Quantity must be greater than 0';
    if (!listingForm.price || Number(listingForm.price) <= 0) err.price = 'Price must be greater than 0';
    if (!listingForm.location.trim()) err.location = 'Location is required';
    setListingErrors(err);
    console.log('🔍 Validation Errors:', err);
    return Object.keys(err).length === 0;
  };

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!validateListing()) return;

    try {
      const res = await API.post('/listings', {
        material: listingForm.material,
        quantity: Number(listingForm.quantity),
        price: Number(listingForm.price),
        location: listingForm.location,
        description: listingForm.description
      });
      setListings([...listings, res.data]);
      setListingForm({ material: '', quantity: '', price: '', location: '', description: '' });
      setListingErrors({});
      alert('✅ Listing added!');
    } catch (err) {
      alert('❌ Failed to add listing: ' + err.response?.data?.msg);
    }
  };

  const deleteListing = async (id) => {
    await API.delete(`/listings/${id}`);
    setListings(listings.filter(l => l._id !== id));
    console.log('🗑️ Deleted listing:', id);
  };

  // ===== REQUIREMENT CRUD =====
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
    if (!validateRequirement()) return;  // Add validation

    try {
      const res = await API.post('/requirements', {
        material: reqForm.material,
        minQty: Number(reqForm.minQty),
        maxQty: Number(reqForm.maxQty),
        maxPrice: Number(reqForm.maxPrice),
        location: reqForm.location
      });
      setRequirements([...requirements, res.data]);
      // Reset form
      setReqForm({ material: '', minQty: '', maxQty: '', maxPrice: '', location: '' });
      setReqErrors({});
      alert('✅ Requirement added!');
    } catch (err) {
      alert('❌ Failed to add requirement: ' + (err.response?.data?.msg || err.message));
    }
  };

  const deleteRequirement = async (id) => {
    await API.delete(`/requirements/${id}`);
    setRequirements(requirements.filter(r => r._id !== id));
  };

  // ===== AI MATCHING =====
  const calculateMatch = (listing, req) => {
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
    const total = (textSim * weights.text) + (qtyScore * weights.qty) + (priceScore * weights.price) + (locScore * weights.loc) + (condScore * weights.cond);
    console.log(`🧠 AI Match: "${listing.material}" vs "${req.material}" -> ${Math.round(total)}%`);
    return Math.round(total);
  };

  const getMatches = () => {
    if (!user) return [];
    if (user.role === 'buyer') {
      const myReqs = requirements.filter(r => r.buyerId === user.id && r.status === 'open');
      const activeListings = listings.filter(l => l.status === 'active');
      const results = [];
      myReqs.forEach(req => {
        activeListings.forEach(listing => {
          const score = calculateMatch(listing, req);
          if (score > 30) results.push({ ...listing, reqId: req.id, reqMaterial: req.material, matchScore: score });
        });
      });
      return results.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      const myListings = listings.filter(l => l.generatorId === user.id && l.status === 'active');
      const openReqs = requirements.filter(r => r.status === 'open');
      const results = [];
      myListings.forEach(listing => {
        openReqs.forEach(req => {
          const score = calculateMatch(listing, req);
          if (score > 30) results.push({ ...req, listingId: listing.id, listingMaterial: listing.material, matchScore: score });
        });
      });
      return results.sort((a, b) => b.matchScore - a.matchScore);
    }
  };

  // ===== DEAL WORKFLOW =====
  const sendRequest = async (listingId) => {
    try {
      const res = await API.post('/deals', { listingId });
      setDeals([...deals, res.data]);
      alert('✅ Request sent to Generator!');
    } catch (err) {
      alert('❌ Failed to send request: ' + (err.response?.data?.msg || err.message));
    }
  };

  const acceptDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/accept`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Accepted!');
    } catch (err) {
      alert('❌ Failed to accept: ' + (err.response?.data?.msg || err.message));
    }
  };

  const completeDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/complete`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Completed!');
    } catch (err) {
      alert('❌ Failed to complete: ' + (err.response?.data?.msg || err.message));
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    console.log('🚪 Logout');
    navigate('/login');
  };

  // ===== RENDER TAB CONTENT =====
  const renderTabContent = () => {
    if (!user) return <p>Loading...</p>;

    switch (activeTab) {
      case 'listings':
        if (user.role === 'admin') {
          return <p style={{ color: '#666' }}>This tab is not available for admin.</p>;
        }
        return (
          <div>
            <h3 style={{ color: '#60a5fa' }}>{user.role === 'generator' ? '📤 My Waste Listings' : '🛒 My Requirements'}</h3>
            {user.role === 'generator'
              ? listings.filter(l => l.generatorId === user._id).map(l => <ListingCard key={l._id} listing={l} onDelete={deleteListing} />)
              : requirements.filter(r => r.buyerId === user._id).map(r => <RequirementCard key={r._id} req={r} onDelete={deleteRequirement} />)
            }
            {user.role === 'generator' && listings.filter(l => l.generatorId === user._id).length === 0 && <p style={{ color: '#666' }}>No listings yet. Create one!</p>}
            {user.role === 'buyer' && requirements.filter(r => r.buyerId === user._id).length === 0 && <p style={{ color: '#666' }}>No requirements yet. Create one!</p>}
          </div>
        );

      case 'create':
        if (user.role === 'admin') {
          return <p style={{ color: '#666' }}>This tab is not available for admin.</p>;
        }
        if (user.role === 'generator') {
          return (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px' }}>
                <h4 style={{ color: '#a78bfa' }}>📤 Post Waste (Generator)</h4>
                <form onSubmit={handleAddListing}>
                  <div className="form-group"><label>Material *</label><input className="form-input" value={listingForm.material} onChange={(e) => setListingForm({ ...listingForm, material: e.target.value })} placeholder="PET Scrap" />{listingErrors.material && <small style={{ color: '#f87171' }}>{listingErrors.material}</small>}</div>
                  <div className="form-group"><label>Quantity (kg) *</label><input type="number" className="form-input" value={listingForm.quantity} onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })} placeholder="500" />{listingErrors.quantity && <small style={{ color: '#f87171' }}>{listingErrors.quantity}</small>}</div>
                  <div className="form-group"><label>Price (₹/kg) *</label><input type="number" className="form-input" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} placeholder="35" />{listingErrors.price && <small style={{ color: '#f87171' }}>{listingErrors.price}</small>}</div>
                  <div className="form-group"><label>Location *</label><input className="form-input" value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} placeholder="Ahmedabad" />{listingErrors.location && <small style={{ color: '#f87171' }}>{listingErrors.location}</small>}</div>
                  <div className="form-group"><label>Description</label><textarea className="form-input" value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Condition..." rows="2" /></div>
                  <button type="submit" className="login-submit-btn" style={{ width: '100%' }}>Add Listing</button>
                </form>
              </div>
            </div>
          );
        } else if (user.role === 'buyer') {
          return (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px' }}>
                <h4 style={{ color: '#60a5fa' }}>🛒 Create Requirement (Buyer)</h4>
                <form onSubmit={handleAddRequirement}>
                  <div className="form-group"><label>Material *</label><input className="form-input" value={reqForm.material} onChange={(e) => setReqForm({ ...reqForm, material: e.target.value })} placeholder="PET Scrap" />{reqErrors.material && <small style={{ color: '#f87171' }}>{reqErrors.material}</small>}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Min Qty *</label><input type="number" className="form-input" value={reqForm.minQty} onChange={(e) => setReqForm({ ...reqForm, minQty: e.target.value })} placeholder="500" />{reqErrors.minQty && <small style={{ color: '#f87171' }}>{reqErrors.minQty}</small>}</div>
                    <div className="form-group"><label>Max Qty *</label><input type="number" className="form-input" value={reqForm.maxQty} onChange={(e) => setReqForm({ ...reqForm, maxQty: e.target.value })} placeholder="1000" />{reqErrors.maxQty && <small style={{ color: '#f87171' }}>{reqErrors.maxQty}</small>}</div>
                  </div>
                  <div className="form-group"><label>Max Price (₹/kg) *</label><input type="number" className="form-input" value={reqForm.maxPrice} onChange={(e) => setReqForm({ ...reqForm, maxPrice: e.target.value })} placeholder="40" />{reqErrors.maxPrice && <small style={{ color: '#f87171' }}>{reqErrors.maxPrice}</small>}</div>
                  <div className="form-group"><label>Location *</label><input className="form-input" value={reqForm.location} onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })} placeholder="Surat" />{reqErrors.location && <small style={{ color: '#f87171' }}>{reqErrors.location}</small>}</div>
                  <button type="submit" className="login-submit-btn" style={{ width: '100%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>Add Requirement</button>
                </form>
              </div>
            </div>
          );
        } else {
          return <p style={{ color: '#f87171' }}>⛔ Access Denied. Invalid role.</p>;
        }

      case 'matches':
        if (user.role === 'admin') {
          return <p style={{ color: '#666' }}>This tab is not available for admin.</p>;
        }
        const matches = getMatches();
        return (
          <div>
            <h3 style={{ color: '#a78bfa' }}>🤖 AI Recommended Matches</h3>
            {matches.length === 0 && <p style={{ color: '#666' }}>No high-confidence matches found. Create listing/requirement.</p>}
            {matches.map((item, idx) => <MatchCard key={idx} item={item} type={user.role} onSendRequest={sendRequest} />)}
          </div>
        );

      case 'deals':
        if (user.role === 'admin') {
          return <p style={{ color: '#666' }}>This tab is not available for admin.</p>;
        }
        const myDeals = deals.filter(d => d.buyerId === user.id || d.generatorId === user.id);
        return (
          <div>
            <h3 style={{ color: '#eab308' }}>🤝 My Deals</h3>
            {myDeals.length === 0 && <p style={{ color: '#666' }}>No deals yet.</p>}
            {myDeals.map(d => <DealCard key={d.id} deal={d} userRole={user.role} onAccept={acceptDeal} onComplete={completeDeal} />)}
          </div>
        );

      case 'admin':
        return (
          <div>
            <h3>📊 Admin Dashboard</h3>
            <div>Revenue: ₹{adminStats.totalRevenue}</div>
            <div>Deals: {adminStats.totalDeals}</div>
            <div>Generators: {adminStats.totalGenerators}</div>
            <div>Buyers: {adminStats.totalBuyers}</div>
          </div>
        );
    }
  };

  // ===== LOADING =====
  if (loading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem'
      }}>
        ⏳ Loading...
      </div>
    );
  }

  // ===== MAIN RETURN =====
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: 'white',
      padding: '2rem',
      fontFamily: 'sans-serif',
      position: 'relative'
    }}>
      {/* Subtle background glows */}
      <div style={{
        position: 'fixed',
        top: '-30%',
        right: '-20%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-30%',
        left: '-20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: '50%'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '1rem',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1
      }}>
        <h1 style={{
          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.8rem'
        }}>
          ♻️ WasteExchange AI
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: '#aaa', fontSize: '0.95rem' }}>
            👋 {user?.name} <span style={{ color: '#666', fontSize: '0.8rem' }}>({user?.role})</span>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.1)',
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(248,113,113,0.1)'}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs - Role Based */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1
      }}>
        {user.role !== 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('listings')}
              style={{
                background: activeTab === 'listings' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'listings' ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem'
              }}
            >
              📄 My Items
            </button>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                background: activeTab === 'create' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'create' ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem'
              }}
            >
              ➕ Create
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              style={{
                background: activeTab === 'matches' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'matches' ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem'
              }}
            >
              🤖 AI Matches
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              style={{
                background: activeTab === 'deals' ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === 'deals' ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem'
              }}
            >
              🤝 Deals
            </button>
          </>
        )}

        {user.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              background: activeTab === 'admin' ? 'rgba(251,191,36,0.2)' : 'transparent',
              color: activeTab === 'admin' ? 'white' : 'rgba(255,255,255,0.6)',
              border: 'none',
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.95rem'
            }}
          >
            📊 Admin
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ marginTop: '2rem', position: 'relative', zIndex: 1 }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Dashboard;