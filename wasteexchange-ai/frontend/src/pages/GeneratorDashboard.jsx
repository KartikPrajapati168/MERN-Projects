// src/pages/GeneratorDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LocationPicker from '../components/LocationPicker';
import RequirementCard from '../components/RequirementCard';
import API from '../utils/api';
import { wasteCategories, mainCategories } from '../utils/wasteData';
import Chart from 'chart.js/auto';
import 'leaflet/dist/leaflet.css';

// ----- Helpers -----
const KpiCard = ({ label, value, color, icon }) => (
  <div className="gp-kpi-card" style={{ borderTop: `4px solid ${color}` }}>
    <div className="gp-kpi-icon" style={{ background: color + '22', color }}>
      <i className={`fas fa-${icon}`}></i>
    </div>
    <div>
      <h3 style={{ color }}>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Invalid date'; }
};

const timeLeft = (endDate) => {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const hrs = Math.floor(diff / 36e5);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h left`;
  const mins = Math.floor((diff % 36e5) / 60000);
  return `${hrs}h ${mins}m left`;
};

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const GeneratorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [deals, setDeals] = useState([]);
  const [messages, setMessages] = useState([]);
  const [bidListings, setBidListings] = useState([]);
  const [bidsTab, setBidsTab] = useState('active');

  const [clientsTab, setClientsTab] = useState('ai');
  const [reviewRequirement, setReviewRequirement] = useState(null);

  // ✅ Messages state (two-pane)
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMsgText, setNewMsgText] = useState('');
  const chatEndRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinQty, setFilterMinQty] = useState('');
  const [filterMaxQty, setFilterMaxQty] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [listingForm, setListingForm] = useState({
    material: '', materialSubtype: '', quantity: '', price: '', location: '',
    locationCoordinates: [23.0225, 72.5714], description: '',
    biddingEnabled: false, minBidPrice: '', biddingEndsAt: '',
  });
  const [listingErrors, setListingErrors] = useState({});
  const [listingImages, setListingImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const profilePhotoInputRef = useRef(null);

  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyLoading, setAddMoneyLoading] = useState(false);
  const [addMoneyError, setAddMoneyError] = useState('');

  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);

  const [offerRequirement, setOfferRequirement] = useState(null);
  const [selectedListingForOffer, setSelectedListingForOffer] = useState(null);
  const [matchingListings, setMatchingListings] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'generator') { navigate('/login'); return; }
    if (!currentUser.isCompanyVerified) { navigate('/waiting'); return; }
    setUser(currentUser);
    if (currentUser.profilePhoto) setProfilePhoto(currentUser.profilePhoto);
    setProfileForm({ name: currentUser.name, email: currentUser.email, password: '' });
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        API.get('/listings/user'),
        API.get('/requirements'),
        API.get('/deals/user'),
        API.get('/messages/user')
      ]);

      if (results[0].status === 'fulfilled') setListings(results[0].value.data || []);
      else setListings([]);

      if (results[1].status === 'fulfilled') setRequirements((results[1].value.data || []).filter(r => r.status === 'open'));
      else setRequirements([]);

      if (results[2].status === 'fulfilled') setDeals(results[2].value.data || []);
      else setDeals([]);

      if (results[3].status === 'fulfilled') setMessages(results[3].value.data || []);
      else setMessages([]);

      await loadBids();
    } catch (err) { console.error('❌ fetchData error:', err); }
    finally { setLoading(false); }
  };

  const loadBids = async () => {
    try {
      const res = await API.get('/listings/bids-received');
      setBidListings(res.data || []);
    } catch (err) { setBidListings([]); }
  };

  const fetchListingsOnly = async () => {
    try {
      const res = await API.get('/listings/user');
      setListings(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAcceptBid = async (listingId, bidId) => {
    if (!window.confirm('Accept this bid?')) return;
    try {
      const res = await API.post(`/listings/${listingId}/bids/${bidId}/accept`);
      alert('✅ Bid accepted! Deal created.');
      if (res?.data?.deal) setDeals(prev => [...prev, res.data.deal]);
      await loadBids();
      await fetchListingsOnly();
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleRejectBid = async (listingId, bidId) => {
    if (!window.confirm('Reject this bid?')) return;
    try {
      await API.post(`/listings/${listingId}/bids/${bidId}/reject`);
      await loadBids();
    } catch (err) { alert('❌ Failed to reject bid'); }
  };

  // ✅ Handle buyer contact (find matching listings)
  const handleContactBuyer = (requirement) => {
    const currentUserId = String(user?._id || user?.id || '');
    const matched = listings.filter(l => {
      const listingGenId = String(l.generatorId?._id || l.generatorId || '');
      const matMatch = (l.material || '').toLowerCase() === (requirement.material || '').toLowerCase();
      const statusMatch = l.status === 'active' || l.status === 'pending';
      return listingGenId === currentUserId && statusMatch && matMatch;
    });

    if (matched.length === 0) {
      alert(`❌ You don't have any active or pending listing for "${requirement.material}".\n\nPlease create a matching listing first.`);
      setActivePage('create');
      return;
    }

    setOfferRequirement(requirement);
    setMatchingListings(matched);
    setSelectedListingForOffer(null);
  };

  // ✅ Confirm send offer - uses /deals/offer endpoint
  const confirmSendOffer = async () => {
    if (!offerRequirement || !selectedListingForOffer) return;
    try {
      // ✅ YE endpoint use karo, /deals nahi
      await API.post('/deals/offer', {
        listingId: selectedListingForOffer._id,
        buyerId: offerRequirement.buyerId  // ✅ buyerId zaroori hai
      });

      const [dealsRes, listingsRes] = await Promise.all([
        API.get('/deals/user'),
        API.get('/listings/user')
      ]);
      setDeals(dealsRes.data);
      setListings(listingsRes.data);

      try {
        await API.post('/messages', {
          receiverName: offerRequirement.buyerName,
          content: `Hi ${offerRequirement.buyerName}, I saw your requirement for ${offerRequirement.material}. I have a matching listing. Let's connect!`
        });
      } catch (e) { }

      setOfferRequirement(null);
      setMatchingListings([]);
      setSelectedListingForOffer(null);
      alert(`✅ Offer sent to ${offerRequirement.buyerName}!`);
    } catch (err) {
      alert('❌ Failed to send offer: ' + (err.response?.data?.msg || err.message));
    }
  };

  // ----- Stats -----
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === 'active').length;
  const pendingBidsCount = bidListings.reduce((sum, l) => sum + (l.bids?.filter(b => b.status !== 'accepted' && b.status !== 'rejected').length || 0), 0);
  const currentUserId = String(user?._id || user?.id || '');
  const completedDeals = deals.filter(d => String(d.generatorId) === currentUserId && d.status === 'completed').length;

  const monthlyListings = [12, 19, 8, 15, 12, 17, 10, 14, 16, 12, 10, 15];

  const initChart = useCallback(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }
    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'New Listings',
          data: monthlyListings,
          backgroundColor: 'rgba(99,102,241,0.75)',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af' } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } },
        },
      },
    });
  }, []);

  useEffect(() => {
    if (activePage === 'dashboard' && !loading && chartRef.current) {
      const timer = setTimeout(initChart, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (activePage !== 'dashboard' && chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activePage, loading, initChart]);

  // Filters
  const filteredRequirements = requirements.filter(r => {
    const matchSearch = r.material.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMat = filterMaterial ? r.material.toLowerCase().includes(filterMaterial.toLowerCase()) : true;
    const matchLoc = filterLocation ? r.location.toLowerCase().includes(filterLocation.toLowerCase()) : true;
    const matchMinPrice = filterMinPrice ? r.maxPrice >= Number(filterMinPrice) : true;
    const matchMaxPrice = filterMaxPrice ? r.maxPrice <= Number(filterMaxPrice) : true;
    const matchMinQty = filterMinQty ? r.maxQty >= Number(filterMinQty) : true;
    const matchMaxQty = filterMaxQty ? r.minQty <= Number(filterMaxQty) : true;
    return matchSearch && matchMat && matchLoc && matchMinPrice && matchMaxPrice && matchMinQty && matchMaxQty;
  });
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const paginatedRequirements = filteredRequirements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // AI Matches
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
    return Math.round((textSim * weights.text) + (qtyScore * weights.qty) + (priceScore * weights.price) + (locScore * weights.loc) + (condScore * weights.cond));
  };

  const getAIMatches = () => {
    const myListings = listings.filter(l => String(l.generatorId) === user?._id && l.status === 'active');
    const openReqs = requirements.filter(r => r.status === 'open');
    const results = [];
    myListings.forEach(listing => {
      openReqs.forEach(req => {
        const score = calculateMatch(listing, req);
        if (score > 30) results.push({ ...req, listingId: listing._id, listingMaterial: listing.material, matchScore: score });
      });
    });
    return results.sort((a, b) => b.matchScore - a.matchScore);
  };
  const aiMatches = getAIMatches();

  // Image upload
  const handleImageSelect = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setImageError('');
    if (listingImages.length + files.length > MAX_IMAGES) {
      setImageError(`You can upload up to ${MAX_IMAGES} photos.`);
      return;
    }
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) { setImageError('Only image files (JPG, PNG, WEBP) are allowed.'); return; }
      if (file.size > MAX_IMAGE_SIZE) { setImageError('Each image must be under 5MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => setListingImages(prev => [...prev, { file, preview: reader.result }]);
      reader.onerror = () => setImageError('Could not read that file.');
      reader.readAsDataURL(file);
    });
  };

  const handleImageInputChange = (e) => { handleImageSelect(e.target.files); e.target.value = ''; };
  const handleImageDrop = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer?.files?.length) handleImageSelect(e.dataTransfer.files); };
  const removeImage = (idx) => { setListingImages(prev => prev.filter((_, i) => i !== idx)); setImageError(''); };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { alert('Image must be under 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setProfilePhoto(reader.result);
      try {
        const fd = new FormData();
        fd.append('profilePhoto', file);
        const res = await API.put('/auth/profile-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const updatedUser = { ...user, profilePhoto: res.data?.profilePhoto || reader.result };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setProfilePhoto(res.data?.profilePhoto || reader.result);
      } catch (err) { console.warn('Profile photo upload failed:', err.message); }
    };
    reader.onerror = () => alert('Could not read that image.');
    reader.readAsDataURL(file);
  };

  const validateListing = () => {
    const err = {};
    if (!listingForm.material.trim()) err.material = 'Required';
    if (!listingForm.quantity || Number(listingForm.quantity) <= 0) err.quantity = 'Must be > 0';
    if (!listingForm.price || Number(listingForm.price) <= 0) err.price = 'Must be > 0';
    if (!listingForm.location.trim()) err.location = 'Required';
    if (listingForm.biddingEnabled) {
      if (!listingForm.minBidPrice || Number(listingForm.minBidPrice) <= 0) err.minBidPrice = 'Set a minimum bid';
      if (!listingForm.biddingEndsAt) err.biddingEndsAt = 'Set an end date/time';
    }
    setListingErrors(err);
    return Object.keys(err).length === 0;
  };

  const resetListingForm = () => {
    setListingForm({
      material: '', materialSubtype: '', quantity: '', price: '',
      location: '', locationCoordinates: [23.0225, 72.5714],
      description: '', biddingEnabled: false, minBidPrice: '', biddingEndsAt: ''
    });
    setListingImages([]);
    setImageError('');
    setListingErrors({});
  };

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!validateListing()) return;
    try {
      let res;
      if (listingImages.length > 0) {
        const fd = new FormData();
        fd.append('material', listingForm.material);
        fd.append('materialSubtype', listingForm.materialSubtype);
        fd.append('quantity', Number(listingForm.quantity));
        fd.append('price', Number(listingForm.price));
        fd.append('location', listingForm.location);
        fd.append('locationCoordinates', JSON.stringify(listingForm.locationCoordinates));
        fd.append('description', listingForm.description);
        fd.append('biddingEnabled', String(listingForm.biddingEnabled));
        if (listingForm.biddingEnabled) {
          fd.append('minBidPrice', Number(listingForm.minBidPrice));
          fd.append('biddingEndsAt', listingForm.biddingEndsAt);
        }
        listingImages.forEach(img => fd.append('images', img.file));
        res = await API.post('/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await API.post('/listings', {
          material: listingForm.material,
          materialSubtype: listingForm.materialSubtype,
          quantity: Number(listingForm.quantity),
          price: Number(listingForm.price),
          location: listingForm.location,
          locationCoordinates: listingForm.locationCoordinates,
          description: listingForm.description,
          biddingEnabled: listingForm.biddingEnabled,
          minBidPrice: listingForm.biddingEnabled ? Number(listingForm.minBidPrice) : undefined,
          biddingEndsAt: listingForm.biddingEnabled ? listingForm.biddingEndsAt : undefined,
        });
      }
      setListings([...listings, res.data]);
      resetListingForm();
      alert(`✅ Listing added! AI classified as: ${res.data.aiCategory || 'Other'} (${res.data.aiConfidence || 0}% confidence)`);
      setCurrentPage(1);
      setActivePage('listings');
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await API.delete(`/listings/${id}`);
      setListings(listings.filter(l => l._id !== id));
      alert('🗑️ Listing deleted.');
    } catch (err) { alert('❌ Delete failed'); }
  };

  const openEditModal = (listing) => {
    setEditingListing(listing);
    setEditForm({
      material: listing.material,
      materialSubtype: listing.materialSubtype || '',
      quantity: listing.quantity,
      price: listing.price,
      location: listing.location,
      locationCoordinates: listing.locationCoordinates?.coordinates || [0, 0],
      description: listing.description || '',
    });
  };

  const closeEditModal = () => { setEditingListing(null); setEditForm({}); };
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingListing) return;
    try {
      const res = await API.put(`/listings/${editingListing._id}`, {
        material: editForm.material,
        materialSubtype: editForm.materialSubtype,
        quantity: Number(editForm.quantity),
        price: Number(editForm.price),
        location: editForm.location,
        description: editForm.description,
      });
      setListings(listings.map(l => l._id === editingListing._id ? res.data : l));
      alert('✅ Listing updated!');
      closeEditModal();
    } catch (err) {
      alert('❌ Update failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const acceptDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/accept`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Accepted!');
    } catch (err) { alert('❌ Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const completeDeal = async (dealId) => {
    try {
      const res = await API.put(`/deals/${dealId}/complete`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal Completed!');
    } catch (err) { alert('❌ Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const rejectDeal = async (dealId) => {
    if (!window.confirm('Reject this deal?')) return;
    try {
      const res = await API.put(`/deals/${dealId}/reject`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal rejected');
    } catch (err) { alert('❌ Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const handleAddMoney = async () => {
    if (!addMoneyAmount || Number(addMoneyAmount) <= 0) { setAddMoneyError('Enter a valid amount'); return; }
    const amount = Number(addMoneyAmount);
    if (amount > 50000) { setAddMoneyError('Daily limit for generators is ₹50,000'); return; }
    setAddMoneyLoading(true);
    setAddMoneyError('');
    try {
      const res = await API.post('/wallet/add-money', { amount });
      const updatedUser = { ...user, walletBalance: res.data.newBalance };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAddMoneyAmount('');
      alert(`✅ Added ₹${amount}. New balance: ₹${res.data.newBalance}`);
    } catch (err) { setAddMoneyError(err.response?.data?.msg || 'Failed to add money'); }
    finally { setAddMoneyLoading(false); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const err = {};
    if (!profileForm.name.trim()) err.name = 'Name is required';
    if (!profileForm.email.trim()) err.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) err.email = 'Invalid email';
    if (profileForm.password && profileForm.password.length < 6) err.password = 'Password must be at least 6 characters';
    setProfileErrors(err);
    if (Object.keys(err).length > 0) return;
    setProfileLoading(true);
    try {
      const payload = { name: profileForm.name, email: profileForm.email };
      if (profileForm.password) payload.password = profileForm.password;
      const res = await API.put('/auth/profile', payload);
      const updatedUser = { ...user, name: res.data.name, email: res.data.email };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      alert('✅ Profile updated!');
    } catch (err) { alert('❌ Failed: ' + (err.response?.data?.msg || err.message)); }
    finally { setProfileLoading(false); }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  // ✅ Conversation partners (exclude own name)
  const conversationPartners = Array.from(new Set(
    messages.map(m => m.senderName === user?.name ? m.receiverName : m.senderName)
      .filter(name => name && name !== user?.name)
  ));

  // ✅ Send chat message
  const sendChatMessage = async () => {
    if (!newMsgText.trim() || !selectedConversation) return;
    const content = newMsgText;
    setNewMsgText('');
    const optimisticMsg = { _id: `local-${Date.now()}`, senderName: user?.name || 'You', receiverName: selectedConversation, content, is_read: true };
    setMessages(prev => [...prev, optimisticMsg]);
    try {
      await API.post('/messages', { receiverName: selectedConversation, content });
    } catch (err) { console.warn('Message send failed:', err.message); }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation, messages]);

  const navItems = [
    { id: 'dashboard', icon: 'tachometer-alt', label: 'Dashboard' },
    { id: 'listings', icon: 'box-open', label: 'My Listings' },
    { id: 'findClients', icon: 'search', label: 'Find Clients' },
    { id: 'bids', icon: 'gavel', label: 'Bids Received', badge: pendingBidsCount },
    { id: 'messages', icon: 'comments', label: 'Messages' },
    { id: 'deals', icon: 'handshake', label: 'Deals' },
    { id: 'addMoney', icon: 'wallet', label: 'Add Money' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];

  const getStatusBadgeClass = (status) => {
    const map = {
      active: 'status-active', pending: 'status-pending', closed: 'status-closed',
      completed: 'status-closed', requested: 'status-pending', offered: 'status-pending',
      accepted: 'status-active', rejected: 'status-closed', sold: 'status-closed'
    };
    return map[status] || 'status-pending';
  };

  if (loading) {
    return (
      <div className="gp-loading-container">
        <div className="gp-loading-card">
          <div className="gp-spinner"></div>
          <h2>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="gp-dashboard">
            <div className="gp-kpi-grid">
              <KpiCard label="Total Listings" value={totalListings} color="#6366f1" icon="box-open" />
              <KpiCard label="Active Listings" value={activeListings} color="#22c55e" icon="check-circle" />
              <KpiCard label="Pending Bids" value={pendingBidsCount} color="#fbbf24" icon="gavel" />
              <KpiCard label="Completed Deals" value={completedDeals} color="#a78bfa" icon="handshake" />
            </div>

            <div className="gp-stats-row">
              <div className="gp-card" style={{ flex: 2 }}>
                <div className="gp-section-title"><span>Monthly Listings</span></div>
                <div style={{ height: 260, position: 'relative' }}><canvas ref={chartRef}></canvas></div>
              </div>
              <div className="gp-card" style={{ flex: 1 }}>
                <div className="gp-section-title">
                  <span>Recent Activity</span>
                  <button onClick={() => setActivePage('listings')}>View All</button>
                </div>
                {listings.slice(0, 5).map(l => (
                  <div key={l._id} className="gp-activity-item">
                    <div className="gp-activity-icon"><i className="fas fa-recycle"></i></div>
                    <div>
                      <h4>{l.material}</h4>
                      <p>{l.quantity} kg &middot; ₹{l.price}/kg</p>
                      <span className={`badge ${getStatusBadgeClass(l.status)}`}>{l.status}</span>
                    </div>
                  </div>
                ))}
                {listings.length === 0 && <p className="gp-no-data">No recent activity</p>}
              </div>
            </div>

            <div className="gp-actions-grid">
              <button className="gp-action-card" onClick={() => setActivePage('create')}>
                <i className="fas fa-plus-circle"></i><span>Create Listing</span>
              </button>
              <button className="gp-action-card" onClick={() => setActivePage('findClients')}>
                <i className="fas fa-search"></i><span>Find Clients</span>
              </button>
              <button className="gp-action-card" onClick={() => setActivePage('bids')}>
                <i className="fas fa-gavel"></i><span>Bids Received</span>
              </button>
              <button className="gp-action-card" onClick={() => setActivePage('messages')}>
                <i className="fas fa-comment-medical"></i><span>Messages</span>
              </button>
            </div>
          </div>
        );

      case 'listings':
        return (
          <div>
            <div className="gp-page-header">
              <h2>My Listings ({listings.length})</h2>
              <button className="gp-btn-primary" onClick={() => setActivePage('create')}>
                <i className="fas fa-plus"></i> Create Listing
              </button>
            </div>
            <div className="gp-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Photo</th><th>Material</th><th>AI Category</th><th>Qty (kg)</th>
                    <th>Price (₹/kg)</th><th>Location</th><th>Bidding</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => (
                    <tr key={l._id}>
                      <td>
                        {l.images?.[0] ? <img src={l.images[0]} alt={l.material} className="gp-thumb" /> : <div className="gp-thumb-placeholder"><i className="fas fa-image"></i></div>}
                      </td>
                      <td>
                        <strong>{l.material}</strong>
                        {l.materialSubtype && <><br /><small style={{ color: '#9ca3af' }}>{l.materialSubtype}</small></>}
                      </td>
                      <td>
                        <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem' }}>
                          🤖 {l.aiCategory || 'Other'}
                          {l.aiConfidence > 0 && <span style={{ color: '#6b7280' }}> ({l.aiConfidence}%)</span>}
                        </span>
                      </td>
                      <td>{l.quantity}</td>
                      <td>₹{l.price}</td>
                      <td>{l.location}</td>
                      <td>
                        {l.biddingEnabled
                          ? <span className="gp-bid-chip"><i className="fas fa-gavel"></i> Live{l.biddingEndsAt ? ` · ${timeLeft(l.biddingEndsAt)}` : ''}</span>
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td><span className={`badge ${getStatusBadgeClass(l.status)}`}>{l.status}</span></td>
                      <td>
                        <button className="btn-sm btn-outline-primary me-1" onClick={() => openEditModal(l)}><i className="fas fa-edit"></i></button>
                        <button className="btn-sm btn-outline-danger" onClick={() => deleteListing(l._id)}><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listings.length === 0 && (
                <div className="gp-no-data-block">
                  <i className="fas fa-box-open fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i>
                  <p>No listings yet. Click "Create Listing" to get started.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'findClients': {
        const aiCount = aiMatches.length;
        const allCount = filteredRequirements.length;
        return (
          <div>
            <div className="gp-page-header"><h2>Find Clients</h2></div>

            <div className="gp-pill-tabs">
              <button onClick={() => setClientsTab('ai')} className={`gp-pill-tab ${clientsTab === 'ai' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#8b5cf6' }} />
                AI Recommended
                <span className="gp-pill-count">{aiCount}</span>
              </button>
              <button onClick={() => setClientsTab('all')} className={`gp-pill-tab ${clientsTab === 'all' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#6366f1' }} />
                All Clients
                <span className="gp-pill-count">{allCount}</span>
              </button>
            </div>

            {clientsTab === 'ai' ? (
              <div className="gp-section-block">
                <h3><i className="fas fa-robot me-2" style={{ color: '#8b5cf6' }}></i>AI Recommended Clients</h3>
                {aiMatches.length === 0 ? (
                  <div className="gp-no-data-block">
                    <i className="fas fa-robot fa-2x" style={{ color: '#4b5563', marginBottom: 10 }}></i>
                    <p>No AI matches yet. Create a listing to get recommendations.</p>
                  </div>
                ) : aiMatches.map((item, idx) => (
                  <div key={`${item._id}-${idx}`} className="gp-ai-item">
                    <div>
                      <strong>{item.material}</strong> <span className="gp-match-badge">Match {item.matchScore}%</span>
                      <div className="gp-ai-details">📍 {item.location} | {item.minQty}-{item.maxQty}kg | Max ₹{item.maxPrice}/kg</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="gp-filters-grid">
                  <input type="text" placeholder="Search by material..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                  <input type="text" placeholder="Material filter" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)} />
                  <input type="text" placeholder="Location" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                  <input type="number" placeholder="Min Price" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} />
                  <input type="number" placeholder="Max Price" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} />
                  <input type="number" placeholder="Min Qty" value={filterMinQty} onChange={(e) => setFilterMinQty(e.target.value)} />
                  <input type="number" placeholder="Max Qty" value={filterMaxQty} onChange={(e) => setFilterMaxQty(e.target.value)} />
                </div>

                <h3 style={{ marginTop: 8 }}>All Buyer Requirements</h3>
                <div className="gp-requests-grid">
                  {paginatedRequirements.map(r => (
                    <RequirementCard
                      key={r._id}
                      requirement={r}
                      viewMode="browse"
                      onContact={handleContactBuyer}
                      onReview={(req) => setReviewRequirement(req)}
                      onDelete={null}
                      onEdit={null}
                    />
                  ))}
                </div>
                {filteredRequirements.length > itemsPerPage && (
                  <div className="gp-pagination">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'bids': {
        const activeBidListings = bidListings.filter(l => l.status !== 'sold' && l.status !== 'closed');
        const closedBidListings = bidListings.filter(l => l.status === 'sold' || l.status === 'closed');
        const shown = bidsTab === 'active' ? activeBidListings : closedBidListings;
        return (
          <div>
            <div className="gp-page-header"><h2>Bids Received</h2></div>

            <div className="gp-pill-tabs">
              {[
                { key: 'active', label: 'Active Bidding', count: activeBidListings.length, dot: '#fbbf24' },
                { key: 'closed', label: 'Closed / Sold', count: closedBidListings.length, dot: '#22c55e' },
              ].map(tab => {
                const isActive = bidsTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setBidsTab(tab.key)} className={`gp-pill-tab ${isActive ? 'active' : ''}`}>
                    <span className="gp-pill-dot" style={{ background: tab.dot }} />
                    {tab.label}
                    <span className="gp-pill-count">{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {shown.length === 0 ? (
              <div className="gp-no-data-block">
                <i className="fas fa-gavel fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i>
                <p>{bidsTab === 'active' ? 'No listings currently receiving bids.' : 'No closed auctions yet.'}</p>
              </div>
            ) : (
              <div className="gp-bid-listings">
                {shown.map(listing => {
                  const sortedBids = [...(listing.bids || [])].sort((a, b) => b.amount - a.amount);
                  const topBid = sortedBids[0];
                  return (
                    <div key={listing._id} className="gp-bid-listing-card">
                      <div className="gp-bid-listing-header">
                        <div>
                          <h3>{listing.material} <small style={{ color: '#9ca3af', fontWeight: 400 }}>({listing.quantity} kg)</small></h3>
                          <p className="gp-bid-listing-meta">
                            📍 {listing.location} &middot; Base price ₹{listing.price}/kg
                            {listing.minBidPrice ? <> &middot; Min bid ₹{listing.minBidPrice}/kg</> : null}
                          </p>
                        </div>
                        <div className="gp-bid-listing-status">
                          {listing.status === 'sold' || listing.status === 'closed'
                            ? <span className="badge status-closed">Closed</span>
                            : <span className="gp-bid-chip"><i className="fas fa-clock"></i> {timeLeft(listing.biddingEndsAt) || 'Live'}</span>}
                        </div>
                      </div>

                      {sortedBids.length === 0 ? (
                        <p className="gp-no-data" style={{ padding: '12px 0' }}>No bids placed yet.</p>
                      ) : (
                        <div className="gp-bid-table">
                          <table className="table">
                            <thead><tr><th>Buyer</th><th>Bid Amount</th><th>Placed On</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                              {sortedBids.map((bid, idx) => (
                                <tr key={bid.id} className={idx === 0 && bid.status !== 'rejected' ? 'gp-top-bid-row' : ''}>
                                  <td>
                                    {bid.buyerName}
                                    {idx === 0 && bid.status !== 'rejected' && <span className="gp-top-bid-badge">🏆 Highest</span>}
                                  </td>
                                  <td><strong>₹{bid.amount}/kg</strong></td>
                                  <td><small>{formatDate(bid.createdAt)}</small></td>
                                  <td>
                                    {bid.status === 'accepted' ? <span className="badge status-active">Won</span> :
                                      bid.status === 'rejected' ? <span className="badge status-closed">Rejected</span> :
                                        <span className="badge status-pending">Pending</span>}
                                  </td>
                                  <td>
                                    {bid.status !== 'accepted' && bid.status !== 'rejected' && listing.status !== 'sold' && listing.status !== 'closed' && (
                                      <>
                                        <button className="btn-sm btn-outline-success me-1" onClick={() => handleAcceptBid(listing._id, bid.id)}><i className="fas fa-check"></i> Accept</button>
                                        <button className="btn-sm btn-outline-danger" onClick={() => handleRejectBid(listing._id, bid.id)}><i className="fas fa-times"></i></button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {topBid && listing.status !== 'sold' && listing.status !== 'closed' && (
                        <div className="gp-bid-cta">
                          <span>Highest bid so far: <strong>₹{topBid.amount}/kg</strong> by {topBid.buyerName}</span>
                          <button className="gp-btn-primary" onClick={() => handleAcceptBid(listing._id, topBid.id)}>
                            <i className="fas fa-gavel"></i> Accept Highest Bid
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'create':
        return (
          <div className="gp-form-card">
            <div className="gp-page-header"><h2>➕ Create Listing</h2></div>
            <form onSubmit={handleAddListing}>
              <div className="gp-form-grid">
                <div className="gp-form-group">
                  <label>Material Category *</label>
                  <select value={listingForm.material} onChange={(e) => setListingForm({ ...listingForm, material: e.target.value, materialSubtype: '' })}>
                    <option value="">Select Category</option>
                    {mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {listingErrors.material && <small className="gp-error-text">{listingErrors.material}</small>}
                </div>
                {listingForm.material && (
                  <div className="gp-form-group">
                    <label>Material Subtype</label>
                    <select value={listingForm.materialSubtype} onChange={(e) => setListingForm({ ...listingForm, materialSubtype: e.target.value })}>
                      <option value="">Select Subtype</option>
                      {wasteCategories[listingForm.material]?.subtypes.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                )}
                <div className="gp-form-group">
                  <label>Quantity (kg) *</label>
                  <input type="number" value={listingForm.quantity} onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })} placeholder="1000" />
                  {listingErrors.quantity && <small className="gp-error-text">{listingErrors.quantity}</small>}
                </div>
                <div className="gp-form-group">
                  <label>Base Price (₹/kg) *</label>
                  <input type="number" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} placeholder="35" />
                  {listingErrors.price && <small className="gp-error-text">{listingErrors.price}</small>}
                </div>

                <div className="gp-form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Location * (Click on map)</label>
                  <LocationPicker
                    onLocationSelect={(data) => setListingForm({ ...listingForm, location: data.address, locationCoordinates: data.coordinates })}
                    defaultLocation={listingForm.locationCoordinates}
                  />
                  <input type="text" className="gp-location-input" value={listingForm.location}
                    onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
                    placeholder="Type or click map to set location"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', marginTop: 10, fontSize: '0.9rem' }} />
                  {listingErrors.location && <small className="gp-error-text">{listingErrors.location}</small>}
                </div>

                <div className="gp-form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <textarea rows={3} value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Condition, grade, packaging. AI will auto-classify." />
                </div>

                <div className="gp-form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Photos <span style={{ fontWeight: 400, color: '#6b7280' }}>(up to {MAX_IMAGES})</span></label>
                  <div className="gp-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop} onClick={() => fileInputRef.current?.click()}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>Click or drag photos here</p>
                    <small>JPG, PNG or WEBP, up to 5MB each</small>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageInputChange} />
                  </div>
                  {imageError && <small className="gp-error-text">{imageError}</small>}
                  {listingImages.length > 0 && (
                    <div className="gp-image-preview-grid">
                      {listingImages.map((img, idx) => (
                        <div key={idx} className="gp-image-preview-item">
                          <img src={img.preview} alt={`upload-${idx}`} />
                          <button type="button" onClick={() => removeImage(idx)}><i className="fas fa-times"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="gp-bid-section">
                <label className="gp-checkbox-row">
                  <input type="checkbox" checked={listingForm.biddingEnabled} onChange={(e) => setListingForm({ ...listingForm, biddingEnabled: e.target.checked })} />
                  <span><i className="fas fa-gavel me-2"></i>Enable Bidding (Auction)</span>
                </label>
                <p className="gp-bid-hint">Buyers will be able to place competing bids on this listing.</p>

                {listingForm.biddingEnabled && (
                  <div className="gp-form-grid" style={{ marginTop: 12 }}>
                    <div className="gp-form-group">
                      <label>Minimum Bid (₹/kg) *</label>
                      <input type="number" value={listingForm.minBidPrice} onChange={(e) => setListingForm({ ...listingForm, minBidPrice: e.target.value })} placeholder="e.g. 30" />
                      {listingErrors.minBidPrice && <small className="gp-error-text">{listingErrors.minBidPrice}</small>}
                    </div>
                    <div className="gp-form-group">
                      <label>Bidding Ends On *</label>
                      <input type="datetime-local" value={listingForm.biddingEndsAt} onChange={(e) => setListingForm({ ...listingForm, biddingEndsAt: e.target.value })} />
                      {listingErrors.biddingEndsAt && <small className="gp-error-text">{listingErrors.biddingEndsAt}</small>}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="gp-btn-primary" style={{ marginTop: 16 }}>Add Listing</button>
            </form>
          </div>
        );

      case 'messages':
        return (
          <div className="gp-messages-page">
            <div className="gp-messages-grid">
              {/* Conversations Panel */}
              <div className="gp-conv-panel">
                <div className="gp-conv-header">
                  <h6><i className="fas fa-comments me-2"></i>Conversations</h6>
                  <span className="gp-live-dot"><i className="fas fa-circle"></i> Live</span>
                </div>
                <div className="gp-conv-list">
                  {conversationPartners.length === 0 ? (
                    <div className="gp-no-data-block" style={{ padding: '32px 12px' }}>
                      <i className="fas fa-comments fa-2x" style={{ color: '#4b5563', marginBottom: 10 }}></i>
                      <p style={{ fontSize: '0.85rem' }}>No conversations yet</p>
                      <small style={{ color: '#6b7280', fontSize: '0.7rem' }}>Send an offer to a buyer to start messaging</small>
                    </div>
                  ) : (
                    conversationPartners.map(name => {
                      const lastMsg = messages.filter(m =>
                        (m.senderName === name && m.receiverName === user?.name) ||
                        (m.senderName === user?.name && m.receiverName === name)
                      ).slice(-1)[0];
                      return (
                        <div key={name}
                          className={`gp-conv-item ${selectedConversation === name ? 'active' : ''}`}
                          onClick={() => setSelectedConversation(name)}>
                          <div className="gp-conv-avatar">{name.charAt(0).toUpperCase()}</div>
                          <div className="gp-conv-info">
                            <div className="gp-conv-name">{name}</div>
                            <div className="gp-conv-preview">{lastMsg?.content || 'No messages yet'}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Panel */}
              <div className="gp-chat-panel">
                {!selectedConversation ? (
                  <div className="gp-chat-placeholder">
                    <i className="fas fa-comments"></i>
                    <h5>Select a Conversation</h5>
                    <p>Choose a conversation from the left to start messaging.</p>
                  </div>
                ) : (
                  <>
                    <div className="gp-chat-header">
                      <div className="gp-conv-avatar">{selectedConversation.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="gp-conv-name">{selectedConversation}</div>
                        <div className="gp-live-dot"><i className="fas fa-circle"></i> Live</div>
                      </div>
                    </div>
                    <div className="gp-chat-body">
                      {messages.filter(m =>
                        (m.senderName === selectedConversation && m.receiverName === user?.name) ||
                        (m.senderName === user?.name && m.receiverName === selectedConversation)
                      ).length === 0 ? (
                        <div className="gp-chat-placeholder" style={{ margin: 'auto' }}>
                          <i className="fas fa-comment-dots"></i>
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.filter(m =>
                          (m.senderName === selectedConversation && m.receiverName === user?.name) ||
                          (m.senderName === user?.name && m.receiverName === selectedConversation)
                        ).map((m, idx) => (
                          <div key={m._id || idx} className={`gp-chat-bubble-row ${m.senderName === user?.name ? 'mine' : ''}`}>
                            <div className="gp-chat-bubble">{m.content}</div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="gp-chat-input">
                      <input type="text" placeholder="Type your message..." value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} />
                      <button className="gp-btn-primary" onClick={sendChatMessage}><i className="fas fa-paper-plane"></i></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'deals': {
        const myDeals = deals.filter(d => String(d.generatorId) === String(user?._id));
        const sentOffers = myDeals.filter(d => d.initiatedBy === 'generator');
        const receivedRequests = myDeals.filter(d => d.initiatedBy === 'buyer');

        return (
          <div>
            <div className="gp-page-header"><h2>My Deals ({myDeals.length})</h2></div>

            {/* Sent Offers */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', color: '#22c55e', marginBottom: 12 }}>
                <i className="fas fa-paper-plane me-2"></i>Offers Sent ({sentOffers.length})
              </h3>
              {sentOffers.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No offers sent yet.</p>
              ) : (
                <div className="gp-table">
                  <table className="table">
                    <thead><tr><th>Material</th><th>Qty</th><th>Total</th><th>Buyer</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {sentOffers.map(d => (
                        <tr key={d._id}>
                          <td><strong>{d.material}</strong></td>
                          <td>{d.quantity} kg</td>
                          <td>₹{d.totalAmount}</td>
                          <td>{d.buyerName || '—'}</td>
                          <td><span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span></td>
                          <td><small style={{ color: '#9ca3af' }}>{formatDate(d.createdAt)}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Received Requests */}
            <div>
              <h3 style={{ fontSize: '1rem', color: '#fbbf24', marginBottom: 12 }}>
                <i className="fas fa-inbox me-2"></i>Requests Received ({receivedRequests.length})
              </h3>
              {receivedRequests.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No requests received yet.</p>
              ) : (
                <div className="gp-table">
                  <table className="table">
                    <thead><tr><th>Material</th><th>Qty</th><th>Total</th><th>Buyer</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {receivedRequests.map(d => (
                        <tr key={d._id}>
                          <td><strong>{d.material}</strong></td>
                          <td>{d.quantity} kg</td>
                          <td>₹{d.totalAmount}</td>
                          <td>{d.buyerName || '—'}</td>
                          <td><span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span></td>
                          <td>
                            {d.status === 'requested' && (
                              <>
                                <button className="btn-sm btn-outline-success me-1" onClick={() => acceptDeal(d._id)}><i className="fas fa-check"></i> Accept</button>
                                <button className="btn-sm btn-outline-danger" onClick={() => rejectDeal(d._id)}><i className="fas fa-times"></i> Reject</button>
                              </>
                            )}
                            {d.status === 'accepted' && (
                              <button className="btn-sm btn-outline-primary" onClick={() => completeDeal(d._id)}><i className="fas fa-flag-checkered"></i> Complete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'addMoney':
        return (
          <div className="gp-form-card" style={{ maxWidth: 460 }}>
            <div className="gp-page-header"><h2>💰 Add Money</h2></div>
            <div className="gp-wallet-info">
              <p>Current Balance: <strong>₹{user?.walletBalance || 0}</strong></p>
              <p className="gp-limit-note">Daily limit: ₹50,000 for generators</p>
            </div>
            <div className="gp-form-group">
              <label>Amount (₹)</label>
              <input type="number" value={addMoneyAmount} onChange={(e) => setAddMoneyAmount(e.target.value)} placeholder="Enter amount" />
              {addMoneyError && <small className="gp-error-text">{addMoneyError}</small>}
            </div>
            <button className="gp-btn-primary" style={{ width: '100%' }} onClick={handleAddMoney} disabled={addMoneyLoading}>
              {addMoneyLoading ? 'Processing...' : 'Add Money'}
            </button>
          </div>
        );

      case 'profile':
        return (
          <div className="gp-form-card" style={{ maxWidth: 560 }}>
            <div className="gp-page-header"><h2>👤 My Profile</h2></div>
            <form onSubmit={handleProfileUpdate}>
              <div className="gp-form-group">
                <label>Name</label>
                <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                {profileErrors.name && <small className="gp-error-text">{profileErrors.name}</small>}
              </div>
              <div className="gp-form-group">
                <label>Email</label>
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                {profileErrors.email && <small className="gp-error-text">{profileErrors.email}</small>}
              </div>
              <div className="gp-form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} placeholder="Enter new password" />
                {profileErrors.password && <small className="gp-error-text">{profileErrors.password}</small>}
              </div>
              <button type="submit" className="gp-btn-primary" disabled={profileLoading}>
                {profileLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        );

      default:
        return null;
    }
  };

  const renderEditModal = () => {
    if (!editingListing) return null;
    return (
      <div className="gp-modal-overlay" onClick={closeEditModal}>
        <div className="gp-modal" onClick={e => e.stopPropagation()}>
          <div className="gp-modal-header">
            <div><h3>Edit Listing</h3><p>Update your listing details</p></div>
            <button onClick={closeEditModal} className="gp-modal-close">&times;</button>
          </div>
          <form onSubmit={handleEditSubmit} className="gp-modal-form">
            <div className="gp-form-grid">
              <div className="gp-form-group"><label>Material</label><input type="text" name="material" value={editForm.material} onChange={handleEditChange} required /></div>
              <div className="gp-form-group"><label>Material Subtype</label><input type="text" name="materialSubtype" value={editForm.materialSubtype} onChange={handleEditChange} /></div>
              <div className="gp-form-group"><label>Quantity (kg)</label><input type="number" name="quantity" value={editForm.quantity} onChange={handleEditChange} required /></div>
              <div className="gp-form-group"><label>Price (₹/kg)</label><input type="number" name="price" value={editForm.price} onChange={handleEditChange} required /></div>
              <div className="gp-form-group" style={{ gridColumn: '1/-1' }}><label>Location</label><input type="text" name="location" value={editForm.location} onChange={handleEditChange} required /></div>
              <div className="gp-form-group" style={{ gridColumn: '1/-1' }}><label>Description</label><textarea rows={2} name="description" value={editForm.description} onChange={handleEditChange} /></div>
            </div>
            <div className="gp-modal-footer">
              <button type="button" onClick={closeEditModal}>Cancel</button>
              <button type="submit" style={{ background: '#6366f1', color: 'white' }}><i className="fas fa-save me-1"></i> Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderReviewModal = () => {
    if (!reviewRequirement) return null;
    const r = reviewRequirement;

    return (
      <div className="gp-modal-overlay" onClick={() => setReviewRequirement(null)}>
        <div className="gp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
          <div className="gp-modal-header">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <i className="fas fa-file-contract" style={{ color: '#a78bfa' }}></i>Requirement Details
              </h3>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>Review full requirements before sending an offer</p>
            </div>
            <button onClick={() => setReviewRequirement(null)} className="gp-modal-close">&times;</button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                {r.buyerName?.charAt(0)?.toUpperCase() || 'B'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Buyer</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{r.buyerName || 'Unknown'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                <i className="fas fa-recycle me-2" style={{ color: '#a78bfa' }}></i>Material
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>{r.material}</span>
                {r.materialSubtype && <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a78bfa', padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>{r.materialSubtype}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 4 }}><i className="fas fa-arrow-down me-1" style={{ color: '#60a5fa' }}></i>Min Quantity</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}>{r.minQty} kg</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 4 }}><i className="fas fa-arrow-up me-1" style={{ color: '#a78bfa' }}></i>Max Quantity</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa' }}>{r.maxQty} kg</div>
              </div>
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginBottom: 4 }}><i className="fas fa-rupee-sign me-1"></i>Max Price</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24' }}>₹{r.maxPrice}/kg</div>
              </div>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#22c55e', marginBottom: 4 }}><i className="fas fa-calculator me-1"></i>Est. Total</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#22c55e' }}>₹{(r.maxQty * r.maxPrice).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
                <i className="fas fa-map-marker-alt me-2" style={{ color: '#f87171' }}></i>Location
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.5 }}>
                {r.location || 'Not specified'}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setReviewRequirement(null)} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Close</button>
            <button onClick={() => { const req = reviewRequirement; setReviewRequirement(null); handleContactBuyer(req); }}
              style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-handshake"></i> Send Offer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOfferModal = () => {
    if (!offerRequirement) return null;
    const req = offerRequirement;

    return (
      <div className="gp-modal-overlay" onClick={() => { setOfferRequirement(null); setSelectedListingForOffer(null); }}>
        <div className="gp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
          <div className="gp-modal-header">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <i className="fas fa-handshake" style={{ color: '#22c55e' }}></i>Send Offer to {req.buyerName}
              </h3>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>Choose which listing to offer</p>
            </div>
            <button onClick={() => { setOfferRequirement(null); setSelectedListingForOffer(null); }} className="gp-modal-close">&times;</button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: '0.7rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 6 }}>
                <i className="fas fa-file-contract me-2"></i>Buyer's Requirement
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.85rem', color: '#d1d5db' }}>
                <span><strong style={{ color: 'white' }}>{req.material}</strong> {req.materialSubtype && <span style={{ color: '#a78bfa' }}>({req.materialSubtype})</span>}</span>
                <span>📉 {req.minQty}-{req.maxQty} kg</span>
                <span>💰 Max ₹{req.maxPrice}/kg</span>
                <span>📍 {req.location}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 12 }}>
              <i className="fas fa-box-open me-2" style={{ color: '#22c55e' }}></i>Your Matching Listings ({matchingListings.length})
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {matchingListings.map((l) => {
                const isSelected = selectedListingForOffer?._id === l._id;
                const totalValue = l.quantity * l.price;
                return (
                  <div key={l._id} onClick={() => setSelectedListingForOffer(l)}
                    style={{
                      background: isSelected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 14, position: 'relative'
                    }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: isSelected ? '6px solid #22c55e' : '2px solid rgba(255,255,255,0.2)', background: isSelected ? 'white' : 'transparent', flexShrink: 0 }} />
                    {l.images?.[0] ? (
                      <img src={l.images[0]} alt={l.material} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0, fontSize: '1.2rem' }}>
                        <i className="fas fa-recycle"></i>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ color: 'white', fontSize: '0.95rem' }}>{l.material}</strong>
                        <span style={{ background: l.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)', color: l.status === 'active' ? '#22c55e' : '#fbbf24', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{l.status}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span>⚖️ {l.quantity} kg</span>
                        <span>💰 ₹{l.price}/kg</span>
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>Total: ₹{totalValue.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 3 }}>📍 {l.location}</div>
                    </div>
                    {isSelected && <div style={{ position: 'absolute', top: 10, right: 10, color: '#22c55e', fontSize: '1.1rem' }}><i className="fas fa-check-circle"></i></div>}
                  </div>
                );
              })}
            </div>

            {selectedListingForOffer && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, fontSize: '0.82rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-info-circle"></i>
                <span>Offering <strong>{selectedListingForOffer.quantity} kg</strong> at <strong>₹{selectedListingForOffer.price}/kg</strong></span>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => { setOfferRequirement(null); setSelectedListingForOffer(null); }}
              style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Cancel</button>
            <button onClick={confirmSendOffer} disabled={!selectedListingForOffer}
              style={{
                padding: '10px 24px', borderRadius: 9, border: 'none',
                background: selectedListingForOffer ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.08)',
                color: selectedListingForOffer ? 'white' : '#6b7280',
                cursor: selectedListingForOffer ? 'pointer' : 'not-allowed',
                fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
              <i className="fas fa-paper-plane"></i>Send Offer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const unreadCount = 0;

  return (
    <div className="gp-wrapper">
      <div className={`gp-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="gp-brand-photo">
          <div className="gp-brand-avatar" onClick={() => profilePhotoInputRef.current?.click()} title="Update photo">
            {profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <span>{user?.name?.charAt(0) || 'G'}</span>}
            <span className="gp-brand-avatar-overlay"><i className="fas fa-camera"></i></span>
          </div>
          <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
          {!sidebarCollapsed && <p className="gp-brand-avatar-hint">Update photo</p>}
        </div>
        <div className="gp-logo">
          <div className="gp-logo-icon"><i className="fas fa-recycle"></i></div>
          {!sidebarCollapsed && <div className="gp-logo-text">WasteExchange AI</div>}
        </div>
        <div className="gp-nav">
          {navItems.map(item => (
            <div key={item.id} className={`gp-nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <i className={`fas fa-${item.icon}`}></i>
              {!sidebarCollapsed && <span>{item.label}</span>}
              {item.badge > 0 && <span className="gp-badge">{item.badge}</span>}
            </div>
          ))}
        </div>
        {!sidebarCollapsed && (
          <div className="gp-user">
            <div className="gp-avatar">{user?.name?.charAt(0) || 'G'}</div>
            <div className="gp-user-info">
              <h4>{user?.name || 'Generator'}</h4>
              <p>Waste Generator</p>
            </div>
          </div>
        )}
        <div className="gp-sidebar-footer">
          <i className="fas fa-bolt"></i>
          {!sidebarCollapsed && <span>AI Powered</span>}
        </div>
      </div>

      <div className="gp-main">
        <div className="gp-header">
          <div className="gp-title">
            <button className="gp-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><i className="fas fa-bars"></i></button>
            <span>{navItems.find(n => n.id === activePage)?.label || 'Dashboard'}</span>
          </div>
          <div className="gp-actions">
            <div className="gp-search"><i className="fas fa-search"></i><input type="text" placeholder="Search..." /></div>
            <div className="gp-notification"><i className="fas fa-bell"></i>{unreadCount > 0 && <span className="gp-dot"></span>}</div>
            <button className="gp-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>

        {renderContent()}
      </div>

      {renderEditModal()}
      {renderReviewModal()}
      {renderOfferModal()}

      <style>{`
        * { box-sizing: border-box; }
        .gp-wrapper { display: flex; min-height: 100vh; background: #0a0a0f; font-family: 'Inter', sans-serif; color: #e5e7eb; }
        .gp-sidebar { width: 260px; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px 0; transition: width 0.2s; }
        .gp-sidebar.collapsed { width: 80px; }
        .gp-brand-photo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 16px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 6px; }
        .gp-brand-avatar { position: relative; width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; cursor: pointer; overflow: hidden; border: 3px solid rgba(99,102,241,0.3); transition: 0.2s; }
        .gp-brand-avatar:hover { transform: scale(1.05); border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
        .gp-brand-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .gp-brand-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; color: white; font-size: 0.9rem; }
        .gp-brand-avatar:hover .gp-brand-avatar-overlay { opacity: 1; }
        .gp-brand-avatar-hint { margin: 0; font-size: 0.65rem; color: rgba(255,255,255,0.4); }
        .gp-logo { display: flex; align-items: center; gap: 12px; padding: 4px 24px 24px; }
        .gp-logo-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; color: white; }
        .gp-logo-text { font-size: 1.1rem; font-weight: 700; white-space: nowrap; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gp-nav { flex: 1; padding: 0 12px; }
        .gp-nav-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.6); margin-bottom: 4px; transition: 0.15s; border-left: 3px solid transparent; font-size: 0.9rem; }
        .gp-nav-item i { width: 18px; text-align: center; }
        .gp-nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
        .gp-nav-item.active { background: rgba(99,102,241,0.12); color: white; font-weight: 600; border-left: 3px solid #8b5cf6; }
        .gp-badge { margin-left: auto; background: #f97316; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
        .gp-user { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 12px; }
        .gp-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; color: white; }
        .gp-user-info h4 { margin: 0; font-size: 0.9rem; color: white; }
        .gp-user-info p { margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.5); }
        .gp-sidebar-footer { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.05); color: #8b5cf6; font-weight: 600; font-size: 0.8rem; }
        .gp-main { flex: 1; padding: 24px 32px; overflow-y: auto; background: #0a0a0f; }
        .gp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .gp-title { display: flex; align-items: center; gap: 14px; font-size: 1.4rem; font-weight: 700; color: white; }
        .gp-toggle { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #9ca3af; }
        .gp-actions { display: flex; align-items: center; gap: 14px; }
        .gp-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 14px; width: 240px; color: #6b7280; }
        .gp-search input { border: none; outline: none; flex: 1; font-size: 0.85rem; background: transparent; color: white; }
        .gp-search input::placeholder { color: #6b7280; }
        .gp-notification { position: relative; width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: #9ca3af; }
        .gp-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
        .gp-logout { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); padding: 8px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .gp-logout:hover { background: rgba(248,113,113,0.2); }
        .gp-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .gp-kpi-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .gp-kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .gp-kpi-card h3 { margin: 0; font-size: 1.6rem; font-weight: 700; }
        .gp-kpi-card p { margin: 0; color: #9ca3af; font-size: 0.8rem; }
        .gp-stats-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .gp-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .gp-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-weight: 600; color: #e5e7eb; }
        .gp-section-title button { background: none; border: none; color: #a78bfa; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
        .gp-activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .gp-activity-item:last-child { border-bottom: none; }
        .gp-activity-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(99,102,241,0.15); color: #818cf8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .gp-activity-item h4 { margin: 0; font-size: 0.9rem; color: white; }
        .gp-activity-item p { margin: 2px 0; font-size: 0.8rem; color: #9ca3af; }
        .gp-actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .gp-action-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 22px; text-align: center; cursor: pointer; transition: 0.2s; }
        .gp-action-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
        .gp-action-card i { font-size: 1.7rem; color: #8b5cf6; display: block; margin-bottom: 8px; }
        .gp-action-card span { font-weight: 600; font-size: 0.9rem; color: #e5e7eb; }
        .gp-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: 0.15s; }
        .gp-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
        .btn-sm { padding: 5px 11px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; font-size: 0.8rem; transition: 0.15s; }
        .btn-sm:hover { background: rgba(255,255,255,0.05); }
        .btn-outline-primary { color: #818cf8; border-color: rgba(99,102,241,0.3); }
        .btn-outline-primary:hover { background: rgba(99,102,241,0.15); }
        .btn-outline-danger { color: #f87171; border-color: rgba(248,113,113,0.3); }
        .btn-outline-danger:hover { background: rgba(248,113,113,0.15); }
        .btn-outline-success { color: #34d399; border-color: rgba(52,211,153,0.3); }
        .btn-outline-success:hover { background: rgba(52,211,153,0.15); }
        .me-1 { margin-right: 6px; }
        .gp-table { background: rgba(255,255,255,0.03); border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .gp-table table { width: 100%; border-collapse: collapse; }
        .gp-table th { text-align: left; padding: 14px 18px; background: rgba(255,255,255,0.03); color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .gp-table td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; font-size: 0.9rem; color: #e5e7eb; }
        .gp-table tr:last-child td { border-bottom: none; }
        .badge { padding: 3px 11px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: capitalize; }
        .status-active { background: rgba(34,197,94,0.15); color: #34d399; }
        .status-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .status-closed { background: rgba(107,114,128,0.15); color: #9ca3af; }
        .gp-thumb { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
        .gp-thumb-placeholder { width: 46px; height: 46px; border-radius: 8px; background: rgba(255,255,255,0.03); color: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .gp-bid-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(251,191,36,0.15); color: #fbbf24; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
        .gp-no-data-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: #6b7280; text-align: center; }
        .gp-no-data { color: #6b7280; text-align: center; padding: 12px; }
        .gp-filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: rgba(255,255,255,0.03); padding: 14px; border-radius: 14px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .gp-filters-grid input { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 0.85rem; }
        .gp-filters-grid input::placeholder { color: #6b7280; }
        .gp-section-block { background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.15); border-radius: 14px; padding: 18px; margin-bottom: 8px; }
        .gp-section-block h3 { margin-top: 0; font-size: 1rem; color: #c4b5fd; }
        .gp-ai-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .gp-ai-item:last-child { border-bottom: none; }
        .gp-match-badge { background: rgba(139,92,246,0.15); color: #a78bfa; padding: 2px 9px; border-radius: 999px; font-size: 0.7rem; margin-left: 8px; font-weight: 700; }
        .gp-ai-details { font-size: 0.82rem; color: #9ca3af; margin-top: 2px; }
        .gp-requests-grid { display: grid; gap: 14px; }
        .gp-pagination { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; }
        .gp-pagination button { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; }
        .gp-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        .gp-pill-tabs { display: inline-flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; margin-bottom: 22px; border: 1px solid rgba(255,255,255,0.05); }
        .gp-pill-tab { display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 9px; border: none; background: transparent; color: #9ca3af; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .gp-pill-tab.active { background: rgba(99,102,241,0.15); color: white; }
        .gp-pill-dot { width: 7px; height: 7px; border-radius: 50%; }
        .gp-pill-count { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.05); color: #9ca3af; }
        .gp-pill-tab.active .gp-pill-count { background: rgba(99,102,241,0.15); color: #a78bfa; }
        .gp-bid-listings { display: grid; gap: 20px; }
        .gp-bid-listing-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid #fbbf24; }
        .gp-bid-listing-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
        .gp-bid-listing-header h3 { margin: 0; font-size: 1.05rem; color: white; }
        .gp-bid-listing-meta { margin: 4px 0 0; color: #9ca3af; font-size: 0.85rem; }
        .gp-bid-table { margin-top: 8px; border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
        .gp-bid-table table { width: 100%; border-collapse: collapse; }
        .gp-bid-table th { text-align: left; padding: 10px 14px; background: rgba(255,255,255,0.03); font-size: 0.72rem; text-transform: uppercase; color: #6b7280; }
        .gp-bid-table td { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #e5e7eb; }
        .gp-top-bid-row { background: rgba(251,191,36,0.05); }
        .gp-top-bid-badge { margin-left: 8px; background: rgba(251,191,36,0.15); color: #fbbf24; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
        .gp-bid-cta { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(255,255,255,0.08); flex-wrap: wrap; gap: 10px; font-size: 0.9rem; }
        .gp-form-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); max-width: 760px; }
        .gp-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .gp-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: #d1d5db; }
        .gp-form-group input, .gp-form-group select, .gp-form-group textarea { width: 100%; padding: 9px 12px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 0.9rem; }
        .gp-form-group input::placeholder { color: #6b7280; }
        .gp-error-text { color: #f87171; font-size: 0.78rem; margin-top: 4px; display: block; }
        .gp-dropzone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; color: #6b7280; transition: 0.15s; background: rgba(255,255,255,0.02); }
        .gp-dropzone:hover { border-color: #8b5cf6; background: rgba(99,102,241,0.05); color: #a78bfa; }
        .gp-dropzone i { font-size: 1.6rem; display: block; margin-bottom: 8px; }
        .gp-dropzone p { margin: 0; font-weight: 600; font-size: 0.9rem; }
        .gp-dropzone small { color: #6b7280; }
        .gp-image-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; margin-top: 12px; }
        .gp-image-preview-item { position: relative; width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .gp-image-preview-item img { width: 100%; height: 100%; object-fit: cover; }
        .gp-image-preview-item button { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; border: none; background: rgba(0,0,0,0.7); color: white; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
        .gp-bid-section { margin-top: 20px; background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.15); border-radius: 12px; padding: 16px; }
        .gp-checkbox-row { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #fbbf24; cursor: pointer; }
        .gp-checkbox-row input { width: 18px; height: 18px; accent-color: #8b5cf6; }
        .gp-bid-hint { margin: 8px 0 0; font-size: 0.82rem; color: #fbbf24; opacity: 0.7; }
        .gp-wallet-info { background: rgba(255,255,255,0.03); padding: 14px; border-radius: 10px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .gp-limit-note { color: #6b7280; font-size: 0.8rem; margin: 4px 0 0; }
        
        /* ✅ Messages two-pane styles */
        .gp-messages-page { height: calc(100vh - 160px); min-height: 460px; }
        .gp-messages-grid { display: grid; grid-template-columns: 290px 1fr; gap: 18px; height: 100%; }
        .gp-conv-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .gp-conv-header { padding: 14px 16px; background: rgba(99,102,241,0.1); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .gp-conv-header h6 { margin: 0; font-size: 0.85rem; font-weight: 700; color: #f3f4f6; }
        .gp-live-dot { font-size: 0.65rem; color: #22c55e; display: flex; align-items: center; gap: 4px; }
        .gp-live-dot i { font-size: 0.5rem; }
        .gp-conv-list { flex: 1; overflow-y: auto; }
        .gp-conv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); transition: 0.15s; }
        .gp-conv-item:hover { background: rgba(255,255,255,0.03); }
        .gp-conv-item.active { background: rgba(99,102,241,0.12); border-left: 3px solid #6366f1; }
        .gp-conv-avatar { width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
        .gp-conv-info { flex: 1; min-width: 0; }
        .gp-conv-name { font-weight: 600; font-size: 0.82rem; color: #f3f4f6; }
        .gp-conv-preview { font-size: 0.72rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .gp-chat-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .gp-chat-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280; text-align: center; padding: 36px; gap: 10px; }
        .gp-chat-placeholder i { font-size: 2.2rem; opacity: 0.4; }
        .gp-chat-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); }
        .gp-chat-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
        .gp-chat-bubble-row { display: flex; }
        .gp-chat-bubble-row.mine { justify-content: flex-end; }
        .gp-chat-bubble { max-width: 70%; padding: 10px 14px; border-radius: 14px 14px 14px 4px; background: rgba(255,255,255,0.05); font-size: 0.82rem; line-height: 1.5; }
        .gp-chat-bubble-row.mine .gp-chat-bubble { border-radius: 14px 14px 4px 14px; background: #6366f1; color: white; }
        .gp-chat-input { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .gp-chat-input input { flex: 1; padding: 9px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: white; font-size: 0.85rem; }
        
        .gp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .gp-modal { background: #1a1a2e; border-radius: 16px; max-width: 560px; width: 90%; max-height: 88vh; overflow-y: auto; padding: 24px; border: 1px solid rgba(255,255,255,0.08); }
        .gp-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
        .gp-modal-header h3 { margin: 0; color: white; }
        .gp-modal-header p { margin: 2px 0 0; color: #9ca3af; font-size: 0.85rem; }
        .gp-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        .gp-modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px; }
        .gp-modal-footer button { padding: 9px 20px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; font-weight: 600; }
        .gp-modal-footer button:last-child { background: #6366f1; color: white; border: none; }
        .gp-loading-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0f; }
        .gp-loading-card { text-align: center; color: #9ca3af; }
        .gp-spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #8b5cf6; border-radius: 50%; margin: 0 auto 16px; animation: gp-spin 0.8s linear infinite; }
        @keyframes gp-spin { to { transform: rotate(360deg); } }
        .gp-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .gp-page-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: white; }
        @media (max-width: 900px) {
          .gp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .gp-stats-row { grid-template-columns: 1fr; }
          .gp-actions-grid { grid-template-columns: repeat(2, 1fr); }
          .gp-search { display: none; }
          .gp-messages-grid { grid-template-columns: 1fr; height: auto; }
          .gp-conv-panel { max-height: 220px; }
          .gp-chat-panel { min-height: 400px; }
        }
      `}</style>
    </div>
  );
};

export default GeneratorDashboard;