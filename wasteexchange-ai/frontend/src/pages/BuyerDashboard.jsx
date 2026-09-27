// src/pages/BuyerDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '../components/LocationPicker';
import API from '../utils/api';
import { wasteCategories, mainCategories } from '../utils/wasteData';
import Chart from 'chart.js/auto';
import 'leaflet/dist/leaflet.css';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import RazorpayPaymentModal from '../components/RazorpayPaymentModal';
import ThemeToggle from '../components/ThemeToggle';

// ----- Helper Components -----
const StatCard = ({ label, value, color, icon }) => (
  <div className="bd-stat-card" style={{ borderTopColor: color }}>
    <div className="bd-stat-icon" style={{ color }}>{icon}</div>
    <div className="bd-stat-value" style={{ color }}>{value}</div>
    <div className="bd-stat-label">{label}</div>
  </div>
);

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const formatDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const formatDateTime = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'N/A'; }
};

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [requirements, setRequirements] = useState([]);
  const [listings, setListings] = useState([]);
  const [deals, setDeals] = useState([]);
  const [messages, setMessages] = useState([]);

  const [findMaterialMode, setFindMaterialMode] = useState('browse');
  const [aiMatches, setAiMatches] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinQty, setFilterMinQty] = useState('');
  const [filterMaxQty, setFilterMaxQty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewingListing, setViewingListing] = useState(null);

  const [balanceModal, setBalanceModal] = useState({ open: false, required: 0, available: 0, context: '' });
  const [razorpayModal, setRazorpayModal] = useState({ open: false, deal: null });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // ✅ Requests Sent tab state
  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('all');

  const [reqForm, setReqForm] = useState({
    material: '', materialSubtype: '', minQty: '', maxQty: '', maxPrice: '', location: '', locationCoordinates: [23.0225, 72.5714],
  });
  const [reqErrors, setReqErrors] = useState({});

  const [reqImages, setReqImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef(null);

  const [editingRequirement, setEditingRequirement] = useState(null);
  const [editForm, setEditForm] = useState({ material: '', materialSubtype: '', minQty: '', maxQty: '', maxPrice: '', location: '', locationCoordinates: [0, 0] });

  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyLoading, setAddMoneyLoading] = useState(false);
  const [addMoneyError, setAddMoneyError] = useState('');

  // ✅ Extended profile form with all company fields
  const [profileForm, setProfileForm] = useState({
    name: '', email: '', phone: '', password: '',
    companyName: '', companyRegistrationNo: '', gstNumber: '', panNumber: '',
    companyAddress: '', companyCity: '', companyState: '', companyPincode: '',
    companyCountry: 'India', website: '', yearEstablished: '',
    businessDescription: '', companyType: 'private',
    contactPerson: '', contactPhone: '', contactEmail: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMsgText, setNewMsgText] = useState('');
  const chatEndRef = useRef(null);

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [paymentChoiceModal, setPaymentChoiceModal] = useState({ open: false, deal: null, walletBalance: 0, canUseWallet: false });

  const [myBids, setMyBids] = useState({});
  const [incrementModal, setIncrementModal] = useState({ open: false, listing: null, myBid: null, topBid: null });
  const [newBidAmount, setNewBidAmount] = useState('');
  const [bidUpdating, setBidUpdating] = useState(false);
  const [bidError, setBidError] = useState('');

  const [walletTransactions, setWalletTransactions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { navigate('/login'); return; }

    if (currentUser.role === 'admin') { navigate('/admin'); return; }
    if (currentUser.role !== 'buyer') { navigate('/login'); return; }
    if (!currentUser.isCompanyVerified) { navigate('/waiting'); return; }

    setUser(currentUser);
    if (currentUser.profilePhoto) setProfilePhoto(currentUser.profilePhoto);

    // ✅ Prefill all profile fields from currentUser
    setProfileForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      password: '',
      companyName: currentUser.companyName || '',
      companyRegistrationNo: currentUser.companyRegistrationNo || '',
      gstNumber: currentUser.gstNumber || '',
      panNumber: currentUser.panNumber || '',
      companyAddress: currentUser.companyAddress || '',
      companyCity: currentUser.companyCity || '',
      companyState: currentUser.companyState || '',
      companyPincode: currentUser.companyPincode || '',
      companyCountry: currentUser.companyCountry || 'India',
      website: currentUser.website || '',
      yearEstablished: currentUser.yearEstablished || '',
      businessDescription: currentUser.businessDescription || '',
      companyType: currentUser.companyType || 'private',
      contactPerson: currentUser.contactPerson || '',
      contactPhone: currentUser.contactPhone || '',
      contactEmail: currentUser.contactEmail || '',
    });

    fetchData();
  }, [navigate]);

  const currentUserId = String(user?._id || user?.id || '');

  const fetchData = async () => {
    try {
      const [reqRes, listingsRes, dealsRes] = await Promise.all([
        API.get('/requirements/user'),
        API.get('/listings'),
        API.get('/deals/user'),
      ]);
      setRequirements(reqRes.data);
      setListings(listingsRes.data);
      setDeals(dealsRes.data);
      fetchMyBids(listingsRes.data);
      const msgRes = await API.get('/messages/user');
      setMessages(msgRes.data);
      // ✅ ADD: Fetch wallet transactions
      try {
        const txRes = await API.get('/wallet/transactions');
        setWalletTransactions(txRes.data || []);
        console.log('📊 Wallet transactions:', txRes.data?.length || 0);
      } catch (e) {
        console.warn('Wallet transactions fetch failed:', e.message);
        setWalletTransactions([]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMyBids = async (listingsData) => {
    const biddingListings = (listingsData || []).filter(l => l.biddingEnabled);
    if (biddingListings.length === 0) return;

    try {
      const results = await Promise.allSettled(
        biddingListings.map(l => API.get(`/listings/${l._id}/my-bid`))
      );

      const newMyBids = {};
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value.data?.myBid) {
          newMyBids[biddingListings[idx]._id] = res.value.data;
        }
      });
      setMyBids(newMyBids);
    } catch (err) {
      console.error('fetchMyBids error:', err);
    }
  };

  const fetchAIMatches = async () => {
    try {
      setAiLoading(true);
      const res = await API.post('/ai/recommend', { role: user?.role });
      let data = res.data || [];

      // ✅ Filter out listings whose bidding has ENDED
      const now = Date.now();
      data = data.filter((item) => {
        if (!item.biddingEnabled) return true;
        if (!item.biddingEndsAt) return true;
        return new Date(item.biddingEndsAt).getTime() > now;
      });

      setAiMatches(data);
    } catch (err) {
      console.error('❌ AI Match failed:', err.response?.data?.msg || err.message);
      setAiMatches([]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (findMaterialMode === 'ai' && user) {
      fetchAIMatches();
    }
  }, [findMaterialMode, user]);

  const totalRequirements = requirements.length;
  const activeRequirements = requirements.filter(r => r.status === 'open').length;
  const pendingDeals = deals.filter(d =>
    String(d.buyerId) === currentUserId &&
    (d.status === 'requested' || d.status === 'offered')
  ).length;
  const acceptedDeals = deals.filter(d =>
    String(d.buyerId) === currentUserId && d.status === 'accepted'
  ).length;
  const completedDeals = deals.filter(d =>
    String(d.buyerId) === currentUserId && d.status === 'completed'
  ).length;
  const unreadCount = messages.filter(m => m.is_read === false).length;

  // ✅ Requests Sent calculations
  const sentRequestsList = deals.filter(d =>
    String(d.buyerId) === currentUserId && d.initiatedBy === 'buyer'
  );
  const sentRequestsCount = sentRequestsList.length;

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const timer = setTimeout(() => {
      if (!chartRef.current) return;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;
      const hasData = pendingDeals + acceptedDeals + completedDeals > 0;
      chartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Requested (Waiting)', 'Accepted (Paid)', 'Completed (Delivered)'],
          datasets: [{
            data: hasData ? [pendingDeals, acceptedDeals, completedDeals] : [1, 1, 1],
            backgroundColor: ['#fbbf24', '#60a5fa', '#22c55e'],
            borderWidth: 2,
            borderColor: '#0a0a0f',
            hoverOffset: 12,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#d1d5db', padding: 16, usePointStyle: true, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (c) => (hasData ? `${c.label}: ${c.raw} deal(s)` : `${c.label}: No data yet`),
              },
            },
          },
        },
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTab, pendingDeals, acceptedDeals, completedDeals]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation, messages]);

  const acceptOffer = async (dealId) => {
    const deal = deals.find(d => d._id === dealId);
    if (!deal) return;
    setPaymentChoiceModal({
      open: true,
      deal,
      walletBalance: user?.walletBalance || 0,
      canUseWallet: (user?.walletBalance || 0) >= deal.buyerTotalPayment
    });
  };

  const payViaWallet = async (deal) => {
    try {
      setPaymentChoiceModal({ open: false, deal: null, walletBalance: 0, canUseWallet: false });
      const res = await API.put(`/deals/${deal._id}/accept`);
      setDeals(deals.map(d => d._id === deal._id ? res.data : d));
      try {
        const meRes = await API.get('/auth/me');
        if (meRes.data?.user) {
          const u = { ...user, walletBalance: meRes.data.user.walletBalance };
          localStorage.setItem('currentUser', JSON.stringify(u));
          setUser(u);
        }
      } catch (e) { }
      alert(`✅ Deal accepted!\n\n₹${deal.buyerTotalPayment.toLocaleString('en-IN')} deducted from wallet.`);
      await fetchData();
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const markReceived = async (dealId) => {
    if (!window.confirm(
      `Mark this deal as RECEIVED?\n\n` +
      `Confirm only after you have received the material from the generator.`
    )) return;
    try {
      const res = await API.put(`/deals/${dealId}/complete`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Deal completed! You have received the material.');
      await fetchData();
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const rejectOffer = async (dealId) => {
    if (!window.confirm('Reject this offer? The listing will be available again.')) return;
    try {
      const res = await API.put(`/deals/${dealId}/reject`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      alert('✅ Offer rejected');
      await fetchData();
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const applyFilters = () => {
    let filtered = listings;

    // ✅ 1. Exclude listings whose bidding has already ended
    const now = Date.now();
    filtered = filtered.filter((l) => {
      if (!l.biddingEnabled) return true;           // no bidding → show
      if (!l.biddingEndsAt) return true;            // no end date → show
      return new Date(l.biddingEndsAt).getTime() > now;  // show only if still running
    });

    // ✅ 2. Apply other filters
    if (searchTerm) filtered = filtered.filter(l => l.material.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterMaterial) filtered = filtered.filter(l => l.material.toLowerCase().includes(filterMaterial.toLowerCase()));
    if (filterLocation) filtered = filtered.filter(l => l.location.toLowerCase().includes(filterLocation.toLowerCase()));
    if (filterMinPrice) filtered = filtered.filter(l => l.price >= Number(filterMinPrice));
    if (filterMaxPrice) filtered = filtered.filter(l => l.price <= Number(filterMaxPrice));
    if (filterMinQty) filtered = filtered.filter(l => l.quantity >= Number(filterMinQty));
    if (filterMaxQty) filtered = filtered.filter(l => l.quantity <= Number(filterMaxQty));
    return filtered;
  };

  const clearAllFilters = () => {
    setFilterMaterial(''); setFilterLocation(''); setFilterMinPrice(''); setFilterMaxPrice('');
    setFilterMinQty(''); setFilterMaxQty(''); setCurrentPage(1);
  };

  const filteredListings = applyFilters();
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage) || 1;
  const currentListings = filteredListings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ✅ Filtered requests sent
  const filteredSentRequests = sentRequestsList
    .filter(r => {
      const matchesSearch = !requestsSearch ||
        r.material?.toLowerCase().includes(requestsSearch.toLowerCase()) ||
        r.generatorName?.toLowerCase().includes(requestsSearch.toLowerCase());
      const matchesStatus = requestsStatusFilter === 'all' || r.status === requestsStatusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read "${file.name}". Please try another image.`));
      reader.readAsDataURL(file);
    });

  const handleImageSelect = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setImageError('');
    if (reqImages.length + files.length > MAX_IMAGES) {
      setImageError(`You can upload up to ${MAX_IMAGES} photos.`);
      return;
    }
    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setImageError('Only image files (JPG, PNG, WEBP) are allowed.'); continue; }
      if (file.size > MAX_IMAGE_SIZE) { setImageError('Each image must be under 5MB.'); continue; }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    setImageUploading(true);
    try {
      const previews = await Promise.all(validFiles.map(async (file) => ({ file, preview: await readFileAsDataURL(file) })));
      setReqImages(prev => [...prev, ...previews]);
    } catch (err) {
      setImageError(err.message || 'Could not read one or more files. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageInputChange = (e) => {
    handleImageSelect(e.target.files);
    e.target.value = '';
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) handleImageSelect(e.dataTransfer.files);
  };

  const removeImage = (idx) => {
    setReqImages(prev => prev.filter((_, i) => i !== idx));
    setImageError('');
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { alert('Image must be under 5MB.'); return; }
    setProfilePhotoUploading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setProfilePhoto(dataUrl);
      try {
        const fd = new FormData();
        fd.append('profilePhoto', file);
        const res = await API.put('/auth/profile-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const updatedUser = { ...user, profilePhoto: res.data?.profilePhoto || dataUrl };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (err) {
        console.warn('Profile photo upload endpoint not available:', err.message);
      }
    } catch (err) {
      alert(err.message || 'Could not read that image. Please try another one.');
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const validateRequirement = () => {
    const err = {};
    if (!reqForm.material.trim()) err.material = 'Required';
    if (!reqForm.minQty || Number(reqForm.minQty) <= 0) err.minQty = 'Must be > 0';
    if (!reqForm.maxQty || Number(reqForm.maxQty) <= 0) err.maxQty = 'Must be > 0';
    if (Number(reqForm.minQty) > Number(reqForm.maxQty)) err.maxQty = 'Min cannot exceed Max';
    if (!reqForm.maxPrice || Number(reqForm.maxPrice) <= 0) err.maxPrice = 'Must be > 0';
    if (!reqForm.location.trim()) err.location = 'Required';
    setReqErrors(err);
    return Object.keys(err).length === 0;
  };

  const resetReqForm = () => {
    setReqForm({ material: '', materialSubtype: '', minQty: '', maxQty: '', maxPrice: '', location: '', locationCoordinates: [23.0225, 72.5714] });
    setReqImages([]);
    setImageError('');
    setReqErrors({});
  };

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    if (!validateRequirement()) return;
    try {
      let res;
      if (reqImages.length > 0) {
        const fd = new FormData();
        fd.append('material', reqForm.material);
        fd.append('materialSubtype', reqForm.materialSubtype);
        fd.append('minQty', Number(reqForm.minQty));
        fd.append('maxQty', Number(reqForm.maxQty));
        fd.append('maxPrice', Number(reqForm.maxPrice));
        fd.append('location', reqForm.location);
        fd.append('locationCoordinates', JSON.stringify(reqForm.locationCoordinates));
        reqImages.forEach(img => fd.append('images', img.file));
        res = await API.post('/requirements', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await API.post('/requirements', {
          material: reqForm.material,
          materialSubtype: reqForm.materialSubtype,
          minQty: Number(reqForm.minQty),
          maxQty: Number(reqForm.maxQty),
          maxPrice: Number(reqForm.maxPrice),
          location: reqForm.location,
          locationCoordinates: reqForm.locationCoordinates,
        });
      }
      setRequirements([...requirements, res.data]);
      resetReqForm();
      alert('✅ Requirement added!');
      setCurrentPage(1);
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const deleteRequirement = async (id) => {
    if (!window.confirm('Delete this requirement?')) return;
    try {
      await API.delete(`/requirements/${id}`);
      setRequirements(requirements.filter(r => r._id !== id));
      alert('🗑️ Requirement deleted.');
    } catch (err) {
      alert('❌ Delete failed');
    }
  };

  const openEditModal = (requirement) => {
    setEditingRequirement(requirement);
    setEditForm({
      material: requirement.material,
      materialSubtype: requirement.materialSubtype || '',
      minQty: requirement.minQty,
      maxQty: requirement.maxQty,
      maxPrice: requirement.maxPrice,
      location: requirement.location,
      locationCoordinates: requirement.locationCoordinates || [0, 0],
    });
  };

  const closeEditModal = () => { setEditingRequirement(null); setEditForm({}); };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRequirement) return;
    try {
      const res = await API.put(`/requirements/${editingRequirement._id}`, {
        material: editForm.material,
        materialSubtype: editForm.materialSubtype,
        minQty: Number(editForm.minQty),
        maxQty: Number(editForm.maxQty),
        maxPrice: Number(editForm.maxPrice),
        location: editForm.location,
        locationCoordinates: editForm.locationCoordinates,
      });
      setRequirements(requirements.map(r => r._id === editingRequirement._id ? res.data : r));
      alert('✅ Requirement updated!');
      closeEditModal();
    } catch (err) {
      alert('❌ Update failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  const sendRequest = async (listingId) => {
    try {
      const listing = listings.find(l => l._id === listingId);
      if (!listing) { alert('Listing not found'); return; }

      const total = listing.quantity * listing.price;
      const buyerTotalPayment = Math.round(total * 1.02);
      const wallet = user?.walletBalance || 0;

      if (wallet < buyerTotalPayment) {
        setBalanceModal({
          open: true,
          required: buyerTotalPayment,
          available: wallet,
          context: `Request for ${listing.material} (${listing.quantity}kg)`
        });
        setViewingListing(null);
        return;
      }

      const res = await API.post('/deals', { listingId });
      setDeals([...deals, res.data]);
      setListings(listings.map(l => l._id === listingId ? { ...l, status: 'pending' } : l));
      alert(`✅ Request sent!\n\n₹${buyerTotalPayment.toLocaleString('en-IN')} will be transferred once the deal is accepted.`);
      setViewingListing(null);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'INSUFFICIENT_BALANCE') {
        setBalanceModal({
          open: true, required: errData.required, available: errData.current,
          context: 'Insufficient balance to send request'
        });
      } else {
        alert('❌ Failed: ' + (errData?.msg || err.message));
      }
    }
  };

  const placeBid = async (listing, amount) => {
    try {
      setBidUpdating(true);
      await API.post(`/listings/${listing._id}/bids`, { amount: Number(amount) });
      const res = await API.get(`/listings/${listing._id}/my-bid`);
      setMyBids(prev => ({ ...prev, [listing._id]: res.data }));
      alert(`✅ Bid placed: ₹${amount}/kg`);
      setIncrementModal({ open: false, listing: null, myBid: null, topBid: null });
      setNewBidAmount('');
      setBidError('');
    } catch (err) {
      setBidError(err.response?.data?.msg || err.message);
    } finally {
      setBidUpdating(false);
    }
  };

  const updateBid = async (listing, bidId, newAmount) => {
    try {
      setBidUpdating(true);
      await API.put(`/listings/${listing._id}/bids/${bidId}`, { amount: Number(newAmount) });
      const res = await API.get(`/listings/${listing._id}/my-bid`);
      setMyBids(prev => ({ ...prev, [listing._id]: res.data }));
      alert(`✅ Bid updated: ₹${newAmount}/kg`);
      setIncrementModal({ open: false, listing: null, myBid: null, topBid: null });
      setNewBidAmount('');
      setBidError('');
    } catch (err) {
      setBidError(err.response?.data?.msg || err.message);
    } finally {
      setBidUpdating(false);
    }
  };

  const openIncrementModal = (listing) => {
    const bidInfo = myBids[listing._id];
    if (!bidInfo) {
      setIncrementModal({ open: true, listing, myBid: null, topBid: null });
      setNewBidAmount(String(listing.minBidPrice || listing.price || ''));
    } else {
      const suggested = bidInfo.topBid
        ? Math.max(bidInfo.topBid.amount + 1, (bidInfo.myBid?.amount || 0) + 1)
        : (listing.minBidPrice || listing.price);
      setIncrementModal({ open: true, listing, myBid: bidInfo.myBid, topBid: bidInfo.topBid });
      setNewBidAmount(String(suggested));
    }
    setBidError('');
  };

  const handleAddMoney = async () => {
    if (!addMoneyAmount || Number(addMoneyAmount) <= 0) { setAddMoneyError('Enter a valid amount'); return; }
    const amount = Number(addMoneyAmount);
    if (amount > 100000) { setAddMoneyError('Daily limit for buyers is ₹100,000'); return; }
    setRazorpayModal({ open: true, deal: null, mode: 'wallet_topup', amount: amount });
    setAddMoneyError('');
  };

  // ✅ Extended profile update - sends all fields
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const err = {};
    if (!profileForm.name?.trim()) err.name = 'Name is required';
    if (!profileForm.email?.trim()) err.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) err.email = 'Invalid email';
    if (profileForm.password && profileForm.password.length < 6) err.password = 'Password must be at least 6 characters';
    setProfileErrors(err);
    if (Object.keys(err).length > 0) return;

    setProfileLoading(true);
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        companyName: profileForm.companyName,
        companyRegistrationNo: profileForm.companyRegistrationNo,
        gstNumber: profileForm.gstNumber,
        panNumber: profileForm.panNumber,
        companyAddress: profileForm.companyAddress,
        companyCity: profileForm.companyCity,
        companyState: profileForm.companyState,
        companyPincode: profileForm.companyPincode,
        companyCountry: profileForm.companyCountry,
        website: profileForm.website,
        yearEstablished: profileForm.yearEstablished ? parseInt(profileForm.yearEstablished) : null,
        businessDescription: profileForm.businessDescription,
        companyType: profileForm.companyType,
        contactPerson: profileForm.contactPerson,
        contactPhone: profileForm.contactPhone,
        contactEmail: profileForm.contactEmail,
      };

      const passwordChanged = !!profileForm.password;
      if (passwordChanged) payload.password = profileForm.password;

      const res = await API.put('/auth/profile', payload);
      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileForm(prev => ({ ...prev, ...res.data, password: '' }));
      setProfileEditMode(false);

      // ✅ If password or email changed → force re-login
      const emailChanged = res.data.email !== user.email;
      if (passwordChanged || emailChanged) {
        alert(
          `✅ Profile updated!\n\n` +
          `Email/Password was changed. Please login again with new credentials.`
        );
        localStorage.clear();
        navigate('/login');
      } else {
        alert('✅ Profile updated!');
      }
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
    } finally {
      setProfileLoading(false);
    }
  };

  const conversationPartners = (() => {
    const myName = (user?.name || '').toLowerCase().trim();
    if (!myName) return [];

    const partnerSet = new Set();

    messages.forEach(m => {
      const sender = (m.senderName || '').toLowerCase().trim();
      const receiver = (m.receiverName || '').toLowerCase().trim();

      // If I sent this message, partner is receiver
      if (sender === myName && m.receiverName) {
        partnerSet.add(m.receiverName);
      }
      // If I received this message, partner is sender
      else if (receiver === myName && m.senderName) {
        partnerSet.add(m.senderName);
      }
    });

    return Array.from(partnerSet);
  })();

  const sendChatMessage = async () => {
    if (!newMsgText.trim() || !selectedConversation) return;
    const content = newMsgText;
    setNewMsgText('');
    const optimisticMsg = { _id: `local-${Date.now()}`, senderName: user?.name || 'You', receiverName: selectedConversation, content, is_read: true };
    setMessages(prev => [...prev, optimisticMsg]);
    try {
      await API.post('/messages', { receiverName: selectedConversation, content });
    } catch (err) {
      console.warn('Message send endpoint not available, kept local copy:', err.message);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const pendingOffersCount = deals.filter(d => String(d.buyerId) === currentUserId && d.status === 'offered').length;

  // ✅ Sidebar with new "Requests Sent" tab
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'tachometer-alt' },
    { id: 'requirements', label: 'My Requirements', icon: 'file-alt', badge: requirements.length },
    { id: 'findMaterial', label: 'Find Material', icon: 'search' },
    { id: 'requestsSent', label: 'Requests Sent', icon: 'paper-plane', badge: sentRequestsCount },
    { id: 'deals', label: 'Deals', icon: 'handshake', badge: pendingOffersCount },
    { id: 'messages', label: 'Messages', icon: 'comments', badge: unreadCount },
    { id: 'addMoney', label: 'Add Money', icon: 'wallet' },
    { id: 'profile', label: 'Profile', icon: 'user-cog' },
  ];

  const viewTitles = {
    dashboard: 'Buyer Dashboard',
    requirements: 'My Requirements',
    findMaterial: 'Find Material',
    requestsSent: 'Requests Sent to Generators',
    create: 'Create Requirement',
    deals: 'Deals & Offers',
    messages: 'Messages & Updates',
    addMoney: 'Add Money',
    profile: 'Profile & Settings',
  };
  const viewIcons = {
    dashboard: 'tachometer-alt',
    requirements: 'file-alt',
    findMaterial: 'search',
    requestsSent: 'paper-plane',
    create: 'plus-circle',
    deals: 'handshake',
    messages: 'comments',
    addMoney: 'wallet',
    profile: 'user-cog',
  };

  const getRankColor = (idx) => (idx === 0 ? '#22c55e' : idx === 1 ? '#fbbf24' : idx === 2 ? '#60a5fa' : '#8b5cf6');
  const getReqStatusBadgeClass = (s) => (s === 'open' ? 'bd-status-open' : s === 'matched' ? 'bd-status-matched' : 'bd-status-closed');
  const getReqStatusText = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="bd-dashboard">
            <div className="bd-stats-grid">
              <StatCard label="Total Requirements" value={totalRequirements} color="#60a5fa" icon="📋" />
              <StatCard label="Active" value={activeRequirements} color="#22c55e" icon="✅" />
              <StatCard label="Pending Deals" value={pendingDeals} color="#fbbf24" icon="⏳" />
              <StatCard label="Completed" value={completedDeals} color="#a78bfa" icon="🎉" />
            </div>

            <div className="bd-dashboard-columns">
              <div className="bd-content-card">
                <div className="bd-card-title"><i className="fas fa-chart-pie me-2"></i>Deal Status Overview</div>
                {deals.length === 0 ? (
                  <div className="bd-empty-state">
                    <div className="bd-empty-icon">📊</div>
                    <p>No deals yet. Send a request from Find Material to see analytics.</p>
                    <button className="bd-btn-primary bd-btn-sm" onClick={() => setActiveTab('findMaterial')}>Find Material</button>
                  </div>
                ) : (
                  <div className="bd-chart-wrapper">
                    <canvas ref={chartRef}></canvas>
                  </div>
                )}
              </div>
              <div className="bd-content-card">
                <div className="bd-card-title">
                  <span><i className="fas fa-history me-2"></i>Recent Activity</span>
                  <button className="bd-link-btn" onClick={() => setActiveTab('requirements')}>View All</button>
                </div>
                {requirements.length === 0 ? (
                  <div className="bd-empty-state">
                    <div className="bd-empty-icon">📄</div>
                    <p>No requirements yet.</p>
                  </div>
                ) : (
                  requirements.slice(0, 5).map(r => (
                    <div key={r._id} className="bd-activity-item">
                      <div className="bd-activity-icon">{r.material.charAt(0)}</div>
                      <div className="bd-activity-content">
                        <strong>{r.material}</strong> <span className="bd-activity-meta">({r.minQty}-{r.maxQty} kg)</span>
                        <div className="bd-activity-status" style={{ color: r.status === 'open' ? '#22c55e' : '#9ca3af' }}>
                          {r.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bd-quick-actions">
              <button className="bd-action-btn" onClick={() => setActiveTab('create')}>
                <i className="fas fa-plus-circle"></i> Create Requirement
              </button>
              <button className="bd-action-btn" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('browse'); }}>
                <i className="fas fa-search"></i> Find Material
              </button>
              <button className="bd-action-btn bd-ai-btn" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('ai'); }}>
                <i className="fas fa-robot"></i> AI Match
              </button>
              <button className="bd-action-btn" onClick={() => setActiveTab('messages')}>
                <i className="fas fa-comments"></i> Messages
              </button>
            </div>

            <div className="bd-content-card">
              <div className="bd-card-title">
                <span><i className="fas fa-file-contract me-2"></i>My Requirements ({requirements.length})</span>
                <button className="bd-btn-primary bd-btn-sm" onClick={() => setActiveTab('create')}><i className="fas fa-plus me-1"></i>New</button>
              </div>
              <div className="bd-table-wrap">
                <table className="bd-data-table">
                  <thead>
                    <tr><th>Material</th><th>Qty Range</th><th>Max Price</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {requirements.length === 0 ? (
                      <tr><td colSpan="5" className="bd-table-empty">No requirements found. <button className="bd-link-btn" onClick={() => setActiveTab('create')}>Create your first one</button></td></tr>
                    ) : (
                      requirements.slice(0, 5).map(r => (
                        <tr key={r._id}>
                          <td><strong>{r.material}</strong></td>
                          <td>{r.minQty}-{r.maxQty} kg</td>
                          <td>₹{r.maxPrice}/kg</td>
                          <td><span className={`bd-status-badge ${getReqStatusBadgeClass(r.status)}`}>{getReqStatusText(r.status)}</span></td>
                          <td><button className="bd-btn-outline-sm" onClick={() => setActiveTab('requirements')}>View</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'findMaterial':
        return (
          <div className="bd-find-material">
            <div className="bd-segmented-toggle">
              <button className={`bd-segmented-btn ${findMaterialMode === 'browse' ? 'active' : ''}`} onClick={() => setFindMaterialMode('browse')}>
                <i className="fas fa-search me-2"></i>Browse Listings
              </button>
              <button className={`bd-segmented-btn ${findMaterialMode === 'ai' ? 'active' : ''}`} onClick={() => setFindMaterialMode('ai')}>
                <i className="fas fa-robot me-2"></i>AI Match
              </button>
            </div>

            {findMaterialMode === 'browse' && (
              <div className="bd-content-card">
                <div className="bd-card-title">
                  <span><i className="fas fa-boxes me-2"></i>Available Materials ({filteredListings.length})</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="bd-btn-primary bd-btn-sm" onClick={() => setShowFilterModal(true)}>
                      <i className="fas fa-sliders-h me-1"></i>Filters
                    </button>
                    <button className="bd-btn-secondary bd-btn-sm" onClick={fetchData}>
                      <i className="fas fa-sync me-1"></i>Refresh
                    </button>
                  </div>
                </div>

                <div className="bd-search-bar">
                  <input type="text" placeholder="Search by material..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                </div>

                <div className="bd-filters-grid">
                  <input type="text" placeholder="Material filter" value={filterMaterial} onChange={(e) => { setFilterMaterial(e.target.value); setCurrentPage(1); }} />
                  <input type="text" placeholder="Location" value={filterLocation} onChange={(e) => { setFilterLocation(e.target.value); setCurrentPage(1); }} />
                  <input type="number" placeholder="Min Price" value={filterMinPrice} onChange={(e) => { setFilterMinPrice(e.target.value); setCurrentPage(1); }} />
                  <input type="number" placeholder="Max Price" value={filterMaxPrice} onChange={(e) => { setFilterMaxPrice(e.target.value); setCurrentPage(1); }} />
                  <input type="number" placeholder="Min Qty" value={filterMinQty} onChange={(e) => { setFilterMinQty(e.target.value); setCurrentPage(1); }} />
                  <input type="number" placeholder="Max Qty" value={filterMaxQty} onChange={(e) => { setFilterMaxQty(e.target.value); setCurrentPage(1); }} />
                </div>

                {currentListings.length === 0 ? (
                  <div className="bd-empty-state">
                    <div className="bd-empty-icon">📦</div>
                    <p>No listings found matching your filters.</p>
                    <button className="bd-btn-secondary bd-btn-sm" onClick={clearAllFilters}>Clear Filters</button>
                  </div>
                ) : (
                  <div className="bd-material-grid">
                    {currentListings.map(l => (
                      <div key={l._id} className="bd-material-card">
                        <div className="bd-material-card-header">
                          <div className="bd-material-card-icon"><i className="fas fa-recycle"></i></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h6>{l.material}</h6>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                              <span className="bd-badge-verified">✓ Active</span>
                              {l.generatorName && (
                                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 8, fontSize: '0.6rem', fontWeight: 600 }}>
                                  <i className="fas fa-user me-1" style={{ fontSize: '0.5rem' }}></i>{l.generatorName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {l.materialSubtype && <p className="bd-material-card-sub"><i className="fas fa-tag me-1"></i>{l.materialSubtype}</p>}
                        <p className="bd-material-card-sub"><i className="fas fa-map-marker-alt me-1"></i>{l.location}</p>
                        <div className="bd-material-card-stats">
                          <div className="bd-stat-row"><span>Quantity:</span><strong>{l.quantity} kg</strong></div>
                          <div className="bd-stat-row"><span>Price:</span><strong style={{ color: '#22c55e' }}>₹{l.price}/kg</strong></div>
                        </div>
                        {l.biddingEnabled && (() => {
                          const bidInfo = myBids[l._id];
                          if (!bidInfo?.myBid) return null;
                          const rank = bidInfo.rank;
                          const isLeading = rank === 1;
                          return (
                            <div style={{
                              background: isLeading ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                              border: `1px solid ${isLeading ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                              borderRadius: 8, padding: '8px 12px', marginTop: 8, marginBottom: 8,
                              fontSize: '0.75rem', color: isLeading ? '#22c55e' : '#fbbf24',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                              <span>
                                <i className={`fas fa-${isLeading ? 'crown' : 'chart-line'} me-1`}></i>
                                Your Bid: <strong>₹{bidInfo.myBid.amount}/kg</strong>
                              </span>
                              <span style={{
                                background: isLeading ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)',
                                padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.68rem'
                              }}>
                                {isLeading ? '🏆 Highest' : `Rank #${rank}`}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="bd-material-card-actions">
                          <button className="bd-btn-outline-sm" onClick={() => setViewingListing(l)}>Details</button>
                          {l.biddingEnabled ? (
                            (() => {
                              const bidInfo = myBids[l._id];
                              const hasBid = !!bidInfo?.myBid;
                              const isLeading = bidInfo?.rank === 1;

                              if (isLeading) {
                                return (
                                  <button className="bd-btn-request" style={{ background: 'rgba(34,197,94,0.15)', cursor: 'default' }} disabled>
                                    <i className="fas fa-crown"></i> Leading
                                  </button>
                                );
                              }
                              return (
                                <button className="bd-btn-request" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }} onClick={() => openIncrementModal(l)}>
                                  <i className="fas fa-gavel"></i> {hasBid ? 'Increase Bid' : 'Place Bid'}
                                </button>
                              );
                            })()
                          ) : (
                            <button className="bd-btn-request" onClick={() => sendRequest(l._id)}>Request</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredListings.length > itemsPerPage && (
                  <div className="bd-pagination">
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                  </div>
                )}
              </div>
            )}

            {findMaterialMode === 'ai' && (
              <div className="bd-content-card">
                <div className="bd-card-title">
                  <i className="fas fa-robot me-2" style={{ color: '#a78bfa' }}></i>
                  AI-Powered Material Matching
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>
                    (TF-IDF + Cosine Similarity)
                  </span>
                </div>
                <div className="bd-ai-box">
                  <p>
                    <i className="fas fa-info-circle me-2" style={{ color: '#a78bfa' }}></i>
                    AI analyzes your requirements using <strong>TF-IDF vectorization</strong> and <strong>Cosine Similarity</strong> to recommend the best matches — just like Netflix recommends movies.
                  </p>
                </div>

                {aiLoading ? (
                  <div className="bd-empty-state">
                    <div className="bd-empty-icon">🤖</div>
                    <p>AI is analyzing matches...</p>
                  </div>
                ) : aiMatches.length === 0 ? (
                  <div className="bd-empty-state">
                    <div className="bd-empty-icon">🤖</div>
                    {requirements.length === 0 ? (
                      <>
                        <p>No AI recommendations yet. Create a requirement first.</p>
                        <button className="bd-btn-primary bd-btn-sm" onClick={() => setActiveTab('create')}>Create Requirement</button>
                      </>
                    ) : listings.length === 0 ? (
                      <>
                        <p>Your requirement is ready, but there are no listings on the platform yet.</p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Wait for generators to list materials, or check the Browse Listings tab.</p>
                      </>
                    ) : (
                      <>
                        <p>No strong matches found right now.</p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          Your {requirements.length} requirement(s) didn't match with the {listings.length} available listing(s).
                        </p>
                        <button className="bd-btn-secondary bd-btn-sm" onClick={fetchAIMatches}>
                          <i className="fas fa-sync me-1"></i> Try Again
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bd-material-grid">
                    {aiMatches.slice(0, 12).map((item, idx) => {
                      const bc = getRankColor(idx);
                      return (
                        <div key={item._id + idx} className="bd-material-card bd-ai-card" style={{ borderColor: bc }}>
                          <div className="bd-ai-rank-badge" style={{ background: bc }}>#{idx + 1} Match</div>
                          <div className="bd-material-card-header">
                            <div className="bd-material-card-icon"><i className="fas fa-recycle"></i></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h6>{item.material}</h6>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                                <span className="bd-badge-verified">✓ Active</span>
                                {item.generatorName && (
                                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 8, fontSize: '0.6rem', fontWeight: 600 }}>
                                    <i className="fas fa-user me-1" style={{ fontSize: '0.5rem' }}></i>{item.generatorName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bd-ai-score-grid">
                            <div className="bd-ai-score-box" style={{ background: 'rgba(34,197,94,0.12)' }}>
                              <div className="bd-ai-score-num" style={{ color: '#22c55e' }}>{item.matchScore}%</div>
                              <div className="bd-ai-score-label">Match Score</div>
                            </div>
                            <div className="bd-ai-score-box" style={{ background: 'rgba(167,139,250,0.12)' }}>
                              <div className="bd-ai-score-num" style={{ color: '#a78bfa' }}>₹{item.price}</div>
                              <div className="bd-ai-score-label">Per kg</div>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: 4 }}>Score Breakdown:</div>
                            <div className="bd-stat-row" style={{ fontSize: '0.7rem' }}>
                              <span>Text Similarity:</span><strong>{item.textSimilarity}%</strong>
                            </div>
                            <div className="bd-stat-row" style={{ fontSize: '0.7rem' }}>
                              <span>Rule-based:</span><strong>{item.ruleScore}%</strong>
                            </div>
                          </div>

                          {item.aiExplanation && item.aiExplanation.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginBottom: 8 }}>
                              <i className="fas fa-lightbulb me-1"></i>
                              {item.aiExplanation[0]}
                            </div>
                          )}

                          <p className="bd-material-card-sub">
                            <i className="fas fa-map-marker-alt me-1"></i>{item.location} | {item.quantity}kg
                          </p>

                          {/* ✅ BID STATUS CHIP (if bidding enabled and user has placed bid) */}
                          {item.biddingEnabled && (() => {
                            const bidInfo = myBids[item._id];
                            if (!bidInfo?.myBid) return null;
                            const rank = bidInfo.rank;
                            const isLeading = rank === 1;
                            return (
                              <div style={{
                                background: isLeading ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                                border: `1px solid ${isLeading ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginTop: 8,
                                marginBottom: 8,
                                fontSize: '0.75rem',
                                color: isLeading ? '#22c55e' : '#fbbf24',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}>
                                <span>
                                  <i className={`fas fa-${isLeading ? 'crown' : 'chart-line'} me-1`}></i>
                                  Your Bid: <strong>₹{bidInfo.myBid.amount}/kg</strong>
                                </span>
                                <span style={{
                                  background: isLeading ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                }}>
                                  {isLeading ? '🏆 Highest' : `Rank #${rank}`}
                                </span>
                              </div>
                            );
                          })()}

                          {/* ✅ CONDITIONAL ACTION — Bid for bidding-enabled, Request otherwise */}
                          <div className="bd-material-card-actions">
                            <button className="bd-btn-outline-sm" onClick={() => setViewingListing(item)}>Details</button>
                            {item.biddingEnabled ? (
                              (() => {
                                const bidInfo = myBids[item._id];
                                const hasBid = !!bidInfo?.myBid;
                                const isLeading = bidInfo?.rank === 1;

                                if (isLeading) {
                                  return (
                                    <button
                                      className="bd-btn-request"
                                      style={{ background: 'rgba(34,197,94,0.15)', cursor: 'default' }}
                                      disabled
                                    >
                                      <i className="fas fa-crown"></i> Leading
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    className="bd-btn-request"
                                    style={{
                                      background: 'rgba(251,191,36,0.15)',
                                      color: '#fbbf24',
                                      borderColor: 'rgba(251,191,36,0.3)',
                                    }}
                                    onClick={() => openIncrementModal(item)}
                                  >
                                    <i className="fas fa-gavel"></i> {hasBid ? 'Increase Bid' : 'Place Bid'}
                                  </button>
                                );
                              })()
                            ) : (
                              <button className="bd-btn-request" onClick={() => sendRequest(item._id)}>Request</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'requirements':
        return (
          <div className="bd-requirements">
            <div className="bd-page-header">
              <h2>📄 My Requirements ({requirements.length})</h2>
              <button className="bd-btn-primary" onClick={() => setActiveTab('create')}><i className="fas fa-plus-circle me-2"></i>Create New</button>
            </div>
            {requirements.length === 0 ? (
              <div className="bd-empty-state" style={{ padding: '48px 16px' }}>
                <div className="bd-empty-icon">📄</div>
                <p>You haven't created any requirements yet.</p>
                <button className="bd-btn-primary" onClick={() => setActiveTab('create')}><i className="fas fa-plus-circle me-2"></i>Create New Requirement</button>
              </div>
            ) : (
              <div className="bd-req-grid">
                {requirements.map(r => (
                  <div key={r._id} className="bd-req-card">
                    <div className="bd-req-card-top">
                      <h6>{r.material}</h6>
                      <span className={`bd-status-badge ${getReqStatusBadgeClass(r.status)}`}>{getReqStatusText(r.status)}</span>
                    </div>
                    {r.materialSubtype && <span className="bd-req-type-tag">{r.materialSubtype}</span>}
                    <div className="bd-req-card-body">
                      <div className="bd-stat-row"><span>Quantity:</span><strong>{r.minQty}-{r.maxQty} kg</strong></div>
                      <div className="bd-stat-row"><span>Max Price:</span><strong>₹{r.maxPrice}/kg</strong></div>
                      <div className="bd-stat-row"><span>Location:</span><strong>{r.location}</strong></div>
                      {r.createdAt && <div className="bd-stat-row"><span>Created:</span><strong>{formatDate(r.createdAt)}</strong></div>}
                    </div>
                    <div className="bd-req-card-actions">
                      <button className="bd-btn-outline-sm" onClick={() => openEditModal(r)}><i className="fas fa-edit me-1"></i>Edit</button>
                      <button className="bd-btn-outline-sm" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('ai'); }}><i className="fas fa-robot me-1"></i>Matches</button>
                      <button className="bd-btn-danger-sm" onClick={() => deleteRequirement(r._id)}><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ✅ NEW: Requests Sent Tab
      case 'requestsSent': {
        const statusTabs = [
          { key: 'all', label: 'All', color: '#6366f1' },
          { key: 'requested', label: 'Requested', color: '#fbbf24' },
          { key: 'accepted', label: 'Accepted', color: '#22c55e' },
          { key: 'completed', label: 'Completed', color: '#a78bfa' },
          { key: 'rejected', label: 'Rejected', color: '#f87171' },
        ];

        return (
          <div className="bd-requests-sent">
            <div className="bd-page-header">
              <h2>📤 Requests Sent to Generators ({filteredSentRequests.length})</h2>
              <div className="bd-search-bar" style={{ margin: 0, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Search by material or generator..."
                  value={requestsSearch}
                  onChange={(e) => setRequestsSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="bd-status-tabs">
              {statusTabs.map(tab => {
                const count = tab.key === 'all'
                  ? sentRequestsList.length
                  : sentRequestsList.filter(r => r.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    className={`bd-status-tab ${requestsStatusFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setRequestsStatusFilter(tab.key)}
                    style={{
                      borderColor: requestsStatusFilter === tab.key ? tab.color : 'transparent',
                      color: requestsStatusFilter === tab.key ? tab.color : '#9ca3af',
                    }}
                  >
                    <span className="bd-status-tab-dot" style={{ background: tab.color }} />
                    {tab.label}
                    <span className="bd-status-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Stats Row */}
            <div className="bd-stats-grid" style={{ marginBottom: 24 }}>
              <StatCard label="Total Sent" value={sentRequestsList.length} color="#6366f1" icon="📤" />
              <StatCard label="Awaiting" value={sentRequestsList.filter(r => r.status === 'requested').length} color="#fbbf24" icon="⏳" />
              <StatCard label="Accepted" value={sentRequestsList.filter(r => r.status === 'accepted').length} color="#22c55e" icon="✅" />
              <StatCard label="Completed" value={sentRequestsList.filter(r => r.status === 'completed').length} color="#a78bfa" icon="🎉" />
            </div>

            {filteredSentRequests.length === 0 ? (
              <div className="bd-content-card">
                <div className="bd-empty-state">
                  <div className="bd-empty-icon">📤</div>
                  <p>No requests sent yet.</p>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Browse available materials and send requests to generators.
                  </p>
                  <button className="bd-btn-primary" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('browse'); }}>
                    <i className="fas fa-search me-2"></i>Find Material
                  </button>
                </div>
              </div>
            ) : (
              <div className="bd-content-card">
                <div className="bd-table-wrap">
                  <table className="bd-data-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Quantity</th>
                        <th>Price/kg</th>
                        <th>Total</th>
                        <th>Generator</th>
                        <th>Status</th>
                        <th>Sent On</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSentRequests.map(r => (
                        <tr key={r._id}>
                          <td>
                            <strong style={{ color: 'white' }}>{r.material}</strong>
                            {r.materialSubtype && (
                              <div>
                                <small style={{ color: '#a78bfa', fontSize: '0.7rem' }}>{r.materialSubtype}</small>
                              </div>
                            )}
                          </td>
                          <td>{r.quantity} kg</td>
                          <td>₹{r.pricePerUnit}/kg</td>
                          <td>
                            <strong style={{ color: '#22c55e' }}>₹{r.totalAmount?.toLocaleString('en-IN')}</strong>
                            <div>
                              <small style={{ color: '#6b7280', fontSize: '0.68rem' }}>
                                +₹{r.buyerCommission} fee
                              </small>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                              }}>
                                {(r.generatorName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.85rem' }}>{r.generatorName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`bd-status-badge ${r.status === 'requested' ? 'bd-status-open' :
                              r.status === 'accepted' ? 'bd-status-matched' :
                                r.status === 'completed' ? 'bd-status-closed' :
                                  'bd-status-closed'
                              }`}>
                              {r.status?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                              {formatDate(r.createdAt)}
                            </small>
                          </td>
                          <td>
                            {r.status === 'accepted' && (
                              <button
                                className="bd-btn-outline-sm"
                                style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}
                                onClick={() => markReceived(r._id)}
                                title="Mark as received"
                              >
                                <i className="fas fa-truck"></i> Received
                              </button>
                            )}
                            {(r.status === 'completed' || r.status === 'rejected') && (
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'create':
        return (
          <div className="bd-create-form">
            <h2>➕ Create Requirement</h2>
            <form onSubmit={handleAddRequirement}>
              <div className="bd-form-group">
                <label>Material Category *</label>
                <select className="bd-form-input" value={reqForm.material} onChange={(e) => setReqForm({ ...reqForm, material: e.target.value, materialSubtype: '' })}>
                  <option value="">Select Category</option>
                  {mainCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {reqErrors.material && <small className="bd-error-text">{reqErrors.material}</small>}
              </div>
              {reqForm.material && (
                <div className="bd-form-group">
                  <label>Material Subtype</label>
                  <select className="bd-form-input" value={reqForm.materialSubtype} onChange={(e) => setReqForm({ ...reqForm, materialSubtype: e.target.value })}>
                    <option value="">Select Subtype</option>
                    {wasteCategories[reqForm.material]?.subtypes.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              )}
              <div className="bd-form-row">
                <div className="bd-form-group">
                  <label>Min Qty (kg) *</label>
                  <input type="number" className="bd-form-input" value={reqForm.minQty} onChange={(e) => setReqForm({ ...reqForm, minQty: e.target.value })} placeholder="500" />
                  {reqErrors.minQty && <small className="bd-error-text">{reqErrors.minQty}</small>}
                </div>
                <div className="bd-form-group">
                  <label>Max Qty (kg) *</label>
                  <input type="number" className="bd-form-input" value={reqForm.maxQty} onChange={(e) => setReqForm({ ...reqForm, maxQty: e.target.value })} placeholder="1000" />
                  {reqErrors.maxQty && <small className="bd-error-text">{reqErrors.maxQty}</small>}
                </div>
              </div>
              <div className="bd-form-group">
                <label>Max Price (₹/kg) *</label>
                <input type="number" className="bd-form-input" value={reqForm.maxPrice} onChange={(e) => setReqForm({ ...reqForm, maxPrice: e.target.value })} placeholder="40" />
                {reqErrors.maxPrice && <small className="bd-error-text">{reqErrors.maxPrice}</small>}
              </div>
              <div className="bd-form-group">
                <label>Location *</label>
                <LocationPicker onLocationSelect={(data) => setReqForm({ ...reqForm, location: data.address, locationCoordinates: data.coordinates })} defaultLocation={reqForm.locationCoordinates} />
                <input type="text" className="bd-form-input bd-location-input" value={reqForm.location} onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })} placeholder="Type or click map" />
                {reqErrors.location && <small className="bd-error-text">{reqErrors.location}</small>}
              </div>

              <div className="bd-form-group">
                <label>Reference Photos <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional, up to {MAX_IMAGES})</span></label>
                <div className="bd-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop} onClick={() => fileInputRef.current?.click()}>
                  <i className={`fas ${imageUploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                  <p>{imageUploading ? 'Reading images…' : 'Click or drag photos here to upload'}</p>
                  <small>JPG, PNG or WEBP, up to 5MB each</small>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageInputChange} />
                </div>
                {imageError && <small className="bd-error-text">{imageError}</small>}
                {reqImages.length > 0 && (
                  <div className="bd-image-preview-grid">
                    {reqImages.map((img, idx) => (
                      <div key={idx} className="bd-image-preview-item">
                        <img src={img.preview} alt={`upload-${idx}`} />
                        <button type="button" onClick={() => removeImage(idx)}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="bd-btn-primary">Add Requirement</button>
            </form>
          </div>
        );

      case 'deals': {
        const myDeals = deals.filter(d => String(d.buyerId) === currentUserId);
        const receivedOffers = myDeals.filter(d => d.initiatedBy === 'generator');
        const sentRequests = myDeals.filter(d => d.initiatedBy === 'buyer');
        const activeDeals = myDeals.filter(d => d.status === 'accepted');

        return (
          <div className="bd-deals-page">
            <div className="bd-page-header">
              <h2>🤝 Deals & Offers ({myDeals.length})</h2>
            </div>

            <div className="bd-stats-grid" style={{ marginBottom: 24 }}>
              <StatCard label="Pending Offers" value={receivedOffers.filter(d => d.status === 'offered').length} color="#22c55e" icon="📥" />
              <StatCard label="My Requests" value={sentRequests.length} color="#60a5fa" icon="📤" />
              <StatCard label="Paid Deals" value={activeDeals.length} color="#fbbf24" icon="🔄" />
              <StatCard label="Completed" value={myDeals.filter(d => d.status === 'completed').length} color="#a78bfa" icon="✅" />
            </div>

            <div className="bd-content-card" style={{ marginBottom: 20 }}>
              <div className="bd-card-title">
                <span><i className="fas fa-inbox me-2" style={{ color: '#22c55e' }}></i>Offers Received from Generators ({receivedOffers.length})</span>
              </div>
              {receivedOffers.length === 0 ? (
                <div className="bd-empty-state">
                  <div className="bd-empty-icon">📭</div>
                  <p>No offers received yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {receivedOffers.map(d => (
                    <div key={d._id} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderLeft: d.status === 'offered' ? '4px solid #22c55e' : d.status === 'accepted' ? '4px solid #60a5fa' : d.status === 'rejected' ? '4px solid #f87171' : '4px solid #9ca3af',
                      borderRadius: 12, padding: '16px 18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                            <strong style={{ fontSize: '1rem', color: 'white' }}>{d.material}</strong>
                            <span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>
                              <i className="fas fa-user me-1"></i>{d.generatorName || 'Unknown Generator'}
                            </span>
                            <span className={`bd-status-badge ${d.status === 'offered' ? 'bd-status-open' : d.status === 'accepted' ? 'bd-status-matched' : 'bd-status-closed'}`}>{d.status.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: '#9ca3af' }}>
                            <span>⚖️ {d.quantity} kg</span>
                            <span>💰 ₹{d.pricePerUnit}/kg</span>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>Total: ₹{d.totalAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                            <i className="far fa-clock me-1"></i>{formatDate(d.createdAt)}
                          </div>
                        </div>
                        {d.status === 'offered' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => acceptOffer(d._id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <i className="fas fa-check"></i> Accept
                            </button>
                            <button onClick={() => rejectOffer(d._id)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <i className="fas fa-times"></i> Reject
                            </button>
                          </div>
                        )}
                        {d.status === 'accepted' && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, padding: '8px 12px', background: 'rgba(96,165,250,0.1)', borderRadius: 8 }}>
                              <i className="fas fa-check-circle me-1"></i> Paid · Accepted
                            </div>
                            <button onClick={() => markReceived(d._id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <i className="fas fa-truck"></i> Mark Received
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bd-content-card">
              <div className="bd-card-title">
                <span><i className="fas fa-paper-plane me-2" style={{ color: '#60a5fa' }}></i>My Requests to Generators ({sentRequests.length})</span>
                <button className="bd-link-btn" onClick={() => setActiveTab('requestsSent')}>View Detailed</button>
              </div>
              {sentRequests.length === 0 ? (
                <div className="bd-empty-state">
                  <div className="bd-empty-icon">📤</div>
                  <p>No requests sent yet.</p>
                  <button className="bd-btn-primary bd-btn-sm" onClick={() => setActiveTab('findMaterial')}>Find Material</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {sentRequests.slice(0, 5).map(d => (
                    <div key={d._id} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderLeft: '4px solid #60a5fa', borderRadius: 12, padding: '14px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                          <strong style={{ color: 'white' }}>{d.material}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            <i className="fas fa-user me-1"></i>{d.generatorName || 'Unknown Generator'}
                          </span>
                          <span className={`bd-status-badge ${d.status === 'accepted' ? 'bd-status-matched' : d.status === 'rejected' ? 'bd-status-closed' : 'bd-status-open'}`}>
                            {d.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', gap: 14 }}>
                          <span>{d.quantity} kg</span>
                          <span>₹{d.pricePerUnit}/kg</span>
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>₹{d.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sentRequests.length > 5 && (
                    <button className="bd-btn-secondary bd-btn-sm" onClick={() => setActiveTab('requestsSent')}>
                      View all {sentRequests.length} requests
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'messages':
        return (
          <div className="bd-messages-page">
            <div className="bd-messages-grid">
              <div className="bd-conv-panel">
                <div className="bd-conv-header">
                  <h6><i className="fas fa-comments me-2"></i>Conversations</h6>
                  <span className="bd-live-dot"><i className="fas fa-circle"></i> Live</span>
                </div>
                <div className="bd-conv-list">
                  {conversationPartners.length === 0 ? (
                    <div className="bd-empty-state" style={{ padding: '32px 12px' }}>
                      <div className="bd-empty-icon">💬</div>
                      <p>No active conversations</p>
                      <small style={{ color: '#6b7280' }}>Send a request to a generator to start messaging</small>
                    </div>
                  ) : (
                    conversationPartners.map(name => (
                      <div key={name} className={`bd-conv-item ${selectedConversation === name ? 'active' : ''}`} onClick={() => setSelectedConversation(name)}>
                        <div className="bd-conv-avatar">{name.charAt(0).toUpperCase()}</div>
                        <div className="bd-conv-info">
                          <div className="bd-conv-name">{name}</div>
                          <div className="bd-conv-preview">
                            {messages.filter(m => m.senderName === name).slice(-1)[0]?.content || 'No messages yet'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bd-chat-panel">
                {!selectedConversation ? (
                  <div className="bd-chat-placeholder">
                    <i className="fas fa-comments"></i>
                    <h5>Select a Conversation</h5>
                    <p>Choose a conversation from the left to start messaging.</p>
                  </div>
                ) : (
                  <>
                    <div className="bd-chat-header">
                      <div className="bd-conv-avatar">{selectedConversation.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="bd-conv-name">{selectedConversation}</div>
                        <div className="bd-live-dot"><i className="fas fa-circle"></i> Live</div>
                      </div>
                    </div>
                    <div className="bd-chat-body">
                      {messages.filter(m =>
                        (m.senderName === selectedConversation && m.receiverName === user?.name) ||
                        (m.senderName === user?.name && m.receiverName === selectedConversation)
                      ).length === 0 ? (
                        <div className="bd-chat-placeholder" style={{ margin: 'auto' }}>
                          <i className="fas fa-comment-dots"></i>
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.filter(m =>
                          (m.senderName === selectedConversation && m.receiverName === user?.name) ||
                          (m.senderName === user?.name && m.receiverName === selectedConversation)
                        ).map((m, idx) => (
                          <div key={m._id || idx} className={`bd-chat-bubble-row ${m.senderName === user?.name ? 'mine' : ''}`}>
                            <div className="bd-chat-bubble">{m.content}</div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="bd-chat-input">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      />
                      <button className="bd-btn-primary" onClick={sendChatMessage}><i className="fas fa-paper-plane"></i></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'addMoney':
        return (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ color: 'white', marginBottom: 24, fontSize: '1.3rem' }}>💰 Add Money</h2>

            {/* Wallet Balance Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.06))',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 14,
              padding: '20px 22px',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fas fa-wallet me-2"></i>Current Balance
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
                    ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af' }}>
                  <div>Daily limit: ₹100,000</div>
                  <div style={{ marginTop: 4 }}>Instant credit</div>
                </div>
              </div>
            </div>

            {/* Add Money Form */}
            <div className="bd-content-card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, color: '#a78bfa', fontSize: '1rem', marginBottom: 18 }}>
                <i className="fas fa-plus-circle me-2"></i>Add Funds
              </h3>

              <div className="bd-form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  className="bd-form-input"
                  value={addMoneyAmount}
                  onChange={(e) => setAddMoneyAmount(e.target.value)}
                  placeholder="Enter amount (min ₹100)"
                />
                {addMoneyError && <small className="bd-error-text">{addMoneyError}</small>}
              </div>

              {/* Quick Amount Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[500, 1000, 2000, 5000, 10000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddMoneyAmount(String(amt))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(99,102,241,0.3)',
                      background: 'rgba(99,102,241,0.08)',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAddMoney}
                className="bd-btn-primary"
                disabled={addMoneyLoading}
                style={{ width: '100%' }}
              >
                {addMoneyLoading ? 'Processing...' : <><i className="fas fa-plus me-2"></i>Add Money</>}
              </button>
            </div>

            {/* ✅ Transaction History */}
            <div className="bd-content-card">
              <div className="bd-card-title">
                <span>
                  <i className="fas fa-history me-2" style={{ color: '#60a5fa' }}></i>
                  Transaction History ({walletTransactions.length})
                </span>
              </div>

              {walletTransactions.length === 0 ? (
                <div className="bd-empty-state" style={{ padding: '32px 16px' }}>
                  <div className="bd-empty-icon">💳</div>
                  <p>No transactions yet</p>
                  <small style={{ color: '#6b7280' }}>Your wallet activity will appear here</small>
                </div>
              ) : (
                <div className="bd-table-wrap">
                  <table className="bd-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletTransactions.map(tx => {
                        const isCredit = tx.amount > 0;
                        const typeMap = {
                          add_money: { label: 'Add Money', icon: 'plus-circle', color: '#22c55e' },
                          withdraw: { label: 'Withdraw', icon: 'arrow-down', color: '#f87171' },
                          deal_payment: { label: 'Deal Payment', icon: 'handshake', color: '#fbbf24' },
                          deal_receive: { label: 'Deal Received', icon: 'handshake', color: '#60a5fa' },
                          refund: { label: 'Refund', icon: 'undo', color: '#a78bfa' },
                        };
                        const meta = typeMap[tx.type] || { label: tx.type, icon: 'circle', color: '#9ca3af' };

                        return (
                          <tr key={tx._id}>
                            <td>
                              <small style={{ color: '#9ca3af' }}>
                                {new Date(tx.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </small>
                            </td>
                            <td>
                              <span style={{ color: meta.color, fontWeight: 600, fontSize: '0.85rem' }}>
                                <i className={`fas fa-${meta.icon} me-1`}></i>
                                {meta.label}
                              </span>
                            </td>
                            <td>
                              <small style={{ color: '#9ca3af', textTransform: 'uppercase' }}>
                                {tx.method || '—'}
                              </small>
                            </td>
                            <td style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCredit ? '#22c55e' : '#f87171',
                            }}>
                              {isCredit ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'right', color: '#d1d5db', fontSize: '0.85rem' }}>
                              ₹{(tx.balanceAfter || 0).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <span className={`bd-status-badge ${tx.status === 'success' ? 'bd-status-open' :
                                  tx.status === 'pending' ? 'bd-status-closed' :
                                    tx.status === 'processing' ? 'bd-status-matched' :
                                      'bd-status-closed'
                                }`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      // ✅ EXTENDED PROFILE - Full company details like Generator
      case 'profile': {
        const companyFields = [
          { key: 'companyName', label: 'Company Name', type: 'text' },
          { key: 'companyRegistrationNo', label: 'Registration Number', type: 'text' },
          { key: 'gstNumber', label: 'GST Number', type: 'text' },
          { key: 'panNumber', label: 'PAN Number', type: 'text' },
          { key: 'companyAddress', label: 'Company Address', type: 'textarea' },
          { key: 'companyCity', label: 'City', type: 'text' },
          { key: 'companyState', label: 'State', type: 'text' },
          { key: 'companyPincode', label: 'Pincode', type: 'text' },
          { key: 'companyCountry', label: 'Country', type: 'text' },
          { key: 'website', label: 'Website', type: 'url' },
          { key: 'yearEstablished', label: 'Year Established', type: 'number' },
          { key: 'contactPerson', label: 'Contact Person', type: 'text' },
          { key: 'contactPhone', label: 'Contact Phone', type: 'tel' },
          { key: 'contactEmail', label: 'Contact Email', type: 'email' },
        ];

        return (
          <div style={{ maxWidth: 900 }}>
            <div className="bd-profile-header">
              <h2>👤 My Profile</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{
                  background: user?.isCompanyVerified ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                  color: user?.isCompanyVerified ? '#22c55e' : '#fbbf24',
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.72rem',
                  fontWeight: 700,
                  border: `1px solid ${user?.isCompanyVerified ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <i className={`fas fa-${user?.isCompanyVerified ? 'check-circle' : 'clock'}`}></i>
                  {user?.isCompanyVerified ? 'Company Verified' : 'Verification Pending'}
                </span>
                {!profileEditMode ? (
                  <button className="bd-btn-primary bd-btn-sm" onClick={() => setProfileEditMode(true)}>
                    <i className="fas fa-edit me-1"></i>Edit Profile
                  </button>
                ) : (
                  <button className="bd-btn-secondary bd-btn-sm" onClick={() => {
                    setProfileEditMode(false);
                    setProfileErrors({});
                    // Reset to user data
                    setProfileForm({
                      name: user?.name || '', email: user?.email || '', phone: user?.phone || '', password: '',
                      companyName: user?.companyName || '', companyRegistrationNo: user?.companyRegistrationNo || '',
                      gstNumber: user?.gstNumber || '', panNumber: user?.panNumber || '',
                      companyAddress: user?.companyAddress || '', companyCity: user?.companyCity || '',
                      companyState: user?.companyState || '', companyPincode: user?.companyPincode || '',
                      companyCountry: user?.companyCountry || 'India', website: user?.website || '',
                      yearEstablished: user?.yearEstablished || '', businessDescription: user?.businessDescription || '',
                      companyType: user?.companyType || 'private', contactPerson: user?.contactPerson || '',
                      contactPhone: user?.contactPhone || '', contactEmail: user?.contactEmail || '',
                    });
                  }}>Cancel</button>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileUpdate}>
              {/* Account Information */}
              <div className="bd-content-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, color: '#a78bfa', fontSize: '1rem', marginBottom: 18 }}>
                  <i className="fas fa-user me-2"></i>Account Information
                </h3>
                <div className="bd-form-grid">
                  <div className="bd-form-group">
                    <label>Name *</label>
                    <input type="text" className="bd-form-input" value={profileForm.name} readOnly={!profileEditMode} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} style={!profileEditMode ? { opacity: 0.7 } : {}} />
                    {profileErrors.name && <small className="bd-error-text">{profileErrors.name}</small>}
                  </div>
                  <div className="bd-form-group">
                    <label>Email *</label>
                    <input type="email" className="bd-form-input" value={profileForm.email} readOnly={!profileEditMode} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} style={!profileEditMode ? { opacity: 0.7 } : {}} />
                    {profileErrors.email && <small className="bd-error-text">{profileErrors.email}</small>}
                  </div>
                  <div className="bd-form-group">
                    <label>Phone</label>
                    <input type="tel" className="bd-form-input" value={profileForm.phone} readOnly={!profileEditMode} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="10-digit mobile" style={!profileEditMode ? { opacity: 0.7 } : {}} />
                  </div>
                  {profileEditMode && (
                    <div className="bd-form-group">
                      <label>New Password (leave blank to keep current)</label>
                      <input type="password" className="bd-form-input" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} placeholder="Enter new password" />
                      {profileErrors.password && <small className="bd-error-text">{profileErrors.password}</small>}
                    </div>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <div className="bd-content-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, color: '#60a5fa', fontSize: '1rem', marginBottom: 18 }}>
                  <i className="fas fa-building me-2"></i>Company Information
                </h3>
                <div className="bd-form-grid">
                  {companyFields.map(field => (
                    <div key={field.key} className="bd-form-group" style={{ gridColumn: field.type === 'textarea' ? '1/-1' : 'auto' }}>
                      <label>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          className="bd-form-input"
                          value={profileForm[field.key] || ''}
                          readOnly={!profileEditMode}
                          onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })}
                          style={!profileEditMode ? { opacity: 0.7 } : {}}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className="bd-form-input"
                          value={profileForm[field.key] || ''}
                          readOnly={!profileEditMode}
                          onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })}
                          style={!profileEditMode ? { opacity: 0.7 } : {}}
                        />
                      )}
                    </div>
                  ))}
                  <div className="bd-form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Company Type</label>
                    <select className="bd-form-input" value={profileForm.companyType || 'private'} disabled={!profileEditMode} onChange={(e) => setProfileForm({ ...profileForm, companyType: e.target.value })} style={!profileEditMode ? { opacity: 0.7 } : {}}>
                      <option value="private">Private Limited</option>
                      <option value="public">Public Limited</option>
                      <option value="partnership">Partnership</option>
                      <option value="sole">Sole Proprietorship</option>
                      <option value="llp">LLP</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="bd-form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Business Description</label>
                    <textarea
                      rows={3}
                      className="bd-form-input"
                      value={profileForm.businessDescription || ''}
                      readOnly={!profileEditMode}
                      onChange={(e) => setProfileForm({ ...profileForm, businessDescription: e.target.value })}
                      placeholder="Brief about your business..."
                      style={!profileEditMode ? { opacity: 0.7 } : {}}
                    />
                  </div>
                </div>
              </div>

              {profileEditMode && (
                <button type="submit" className="bd-btn-primary" disabled={profileLoading} style={{ width: '100%' }}>
                  {profileLoading ? (
                    <><i className="fas fa-spinner fa-spin me-2"></i>Saving...</>
                  ) : (
                    <><i className="fas fa-save me-2"></i>Save All Changes</>
                  )}
                </button>
              )}
            </form>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderEditModal = () => {
    if (!editingRequirement) return null;
    return (
      <div className="bd-modal-overlay" onClick={closeEditModal}>
        <div className="bd-modal-content" onClick={e => e.stopPropagation()}>
          <h3>✏️ Edit Requirement</h3>
          <form onSubmit={handleEditSubmit}>
            <div className="bd-form-group">
              <label>Material</label>
              <input type="text" name="material" className="bd-form-input" value={editForm.material} onChange={handleEditChange} required />
            </div>
            <div className="bd-form-group">
              <label>Material Subtype</label>
              <input type="text" name="materialSubtype" className="bd-form-input" value={editForm.materialSubtype} onChange={handleEditChange} />
            </div>
            <div className="bd-form-row">
              <div className="bd-form-group">
                <label>Min Qty</label>
                <input type="number" name="minQty" className="bd-form-input" value={editForm.minQty} onChange={handleEditChange} required />
              </div>
              <div className="bd-form-group">
                <label>Max Qty</label>
                <input type="number" name="maxQty" className="bd-form-input" value={editForm.maxQty} onChange={handleEditChange} required />
              </div>
            </div>
            <div className="bd-form-group">
              <label>Max Price</label>
              <input type="number" name="maxPrice" className="bd-form-input" value={editForm.maxPrice} onChange={handleEditChange} required />
            </div>
            <div className="bd-form-group">
              <label>Location</label>
              <input type="text" name="location" className="bd-form-input" value={editForm.location} onChange={handleEditChange} required />
            </div>
            <div className="bd-modal-actions">
              <button type="submit" className="bd-btn-primary">💾 Save</button>
              <button type="button" className="bd-btn-secondary" onClick={closeEditModal}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderFilterModal = () => {
    if (!showFilterModal) return null;
    return (
      <div className="bd-modal-overlay" onClick={() => setShowFilterModal(false)}>
        <div className="bd-modal-content" onClick={e => e.stopPropagation()}>
          <h3><i className="fas fa-sliders-h me-2"></i>Advanced Filters</h3>
          <div className="bd-form-group">
            <label>Material</label>
            <input type="text" className="bd-form-input" placeholder="e.g., Plastic, Metal" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)} />
          </div>
          <div className="bd-form-group">
            <label>Location</label>
            <input type="text" className="bd-form-input" placeholder="City or area" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
          </div>
          <div className="bd-form-row">
            <div className="bd-form-group">
              <label>Min Price (₹/kg)</label>
              <input type="number" className="bd-form-input" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} />
            </div>
            <div className="bd-form-group">
              <label>Max Price (₹/kg)</label>
              <input type="number" className="bd-form-input" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} />
            </div>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-group">
              <label>Min Qty (kg)</label>
              <input type="number" className="bd-form-input" value={filterMinQty} onChange={(e) => setFilterMinQty(e.target.value)} />
            </div>
            <div className="bd-form-group">
              <label>Max Qty (kg)</label>
              <input type="number" className="bd-form-input" value={filterMaxQty} onChange={(e) => setFilterMaxQty(e.target.value)} />
            </div>
          </div>
          <div className="bd-modal-actions">
            <button className="bd-btn-secondary" onClick={clearAllFilters}>Clear All</button>
            <button className="bd-btn-primary" onClick={() => { setCurrentPage(1); setShowFilterModal(false); }}>Apply Filters</button>
          </div>
        </div>
      </div>
    );
  };

  const renderListingDetailModal = () => {
    if (!viewingListing) return null;
    const l = viewingListing;
    return (
      <div className="bd-modal-overlay" onClick={() => setViewingListing(null)}>
        <div className="bd-modal-content" onClick={e => e.stopPropagation()}>
          <h3><i className="fas fa-recycle me-2"></i>{l.material}</h3>
          <span className="bd-badge-verified" style={{ marginBottom: '12px', display: 'inline-block' }}>✓ Active Listing</span>
          <div className="bd-form-group">
            <label>Location</label>
            <p style={{ margin: 0 }}>{l.location}</p>
          </div>
          <div className="bd-form-row">
            <div className="bd-form-group">
              <label>Quantity</label>
              <p style={{ margin: 0 }}>{l.quantity} kg</p>
            </div>
            <div className="bd-form-group">
              <label>Price</label>
              <p style={{ margin: 0, color: '#22c55e', fontWeight: 700 }}>₹{l.price}/kg</p>
            </div>
          </div>
          {l.description && (
            <div className="bd-form-group">
              <label>Description</label>
              <p style={{ margin: 0 }}>{l.description}</p>
            </div>
          )}
          <div className="bd-modal-actions">
            <button className="bd-btn-secondary" onClick={() => setViewingListing(null)}>Close</button>
            <button className="bd-btn-primary" onClick={() => sendRequest(l._id)}>
              <i className="fas fa-paper-plane me-2"></i>Send Request
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <style>{`
        .bd-loading-container { position: fixed; inset: 0; background: #0a0a0f; display: flex; align-items: center; justify-content: center; z-index: 99999; }
        [data-theme="light"] .bd-loading-container { background: #f8fafc; }
        .bd-loading-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .bd-loading-logo-ring { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
        .bd-loading-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: #6366f1; border-right-color: #8b5cf6; animation: bd-spin-ring 1.2s linear infinite; }
        .bd-loading-logo-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; border: 2px solid transparent; border-top-color: #60a5fa; border-left-color: #a78bfa; animation: bd-spin-ring 1.8s linear infinite reverse; }
        .bd-loading-logo-inner { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2.4rem; color: white; box-shadow: 0 0 40px rgba(99,102,241,0.5); animation: bd-logo-breathe 2s ease-in-out infinite; }
        @keyframes bd-spin-ring { to { transform: rotate(360deg); } }
        @keyframes bd-logo-breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(99,102,241,0.5); } 50% { transform: scale(1.08); box-shadow: 0 0 60px rgba(99,102,241,0.8); } }
        .bd-loading-text { font-size: 1.5rem; font-weight: 800; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px; margin: 0; animation: bd-text-pulse 2s ease-in-out infinite; }
        @keyframes bd-text-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .bd-loading-tagline { color: #6b7280; font-size: 0.85rem; letter-spacing: 0.5px; margin-top: -12px; }
        .bd-loading-dots { display: flex; gap: 6px; margin-top: 8px; }
        .bd-loading-dots span { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; animation: bd-dot-bounce 1.4s ease-in-out infinite; }
        .bd-loading-dots span:nth-child(2) { animation-delay: 0.2s; background: #8b5cf6; }
        .bd-loading-dots span:nth-child(3) { animation-delay: 0.4s; background: #60a5fa; }
        @keyframes bd-dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-10px); opacity: 1; } }
      `}</style>
        <div className="bd-loading-container">
          <div className="bd-loading-logo-wrap">
            <div className="bd-loading-logo-ring">
              <div className="bd-loading-logo-inner"><i className="fas fa-recycle"></i></div>
            </div>
            <h1 className="bd-loading-text">WasteExchange AI</h1>
            <p className="bd-loading-tagline">Smart Waste Marketplace</p>
            <div className="bd-loading-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bd-dashboard-wrapper">
      <div className={`bd-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="bd-brand-photo">
          <div className="bd-brand-avatar" onClick={() => profilePhotoInputRef.current?.click()} title="Update photo">
            {profilePhotoUploading ? (<i className="fas fa-spinner fa-spin"></i>) : profilePhoto ? (<img src={profilePhoto} alt="Profile" />) : (<span>{user?.name?.charAt(0) || 'B'}</span>)}
            <span className="bd-brand-avatar-overlay"><i className="fas fa-camera"></i></span>
          </div>
          <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
          {!sidebarCollapsed && <p className="bd-brand-avatar-hint">Update photo</p>}
        </div>

        <div className="bd-logo">
          <div className="bd-logo-icon"><i className="fas fa-recycle"></i></div>
          {!sidebarCollapsed && <div className="bd-logo-text">WasteExchange AI</div>}
        </div>

        <div className="bd-sidebar-nav">
          {sidebarItems.map(item => (
            <button key={item.id} className={`bd-sidebar-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)} title={sidebarCollapsed ? item.label : undefined}>
              <div className="bd-sidebar-icon"><i className={`fas fa-${item.icon}`}></i></div>
              {!sidebarCollapsed && <div className="bd-nav-text">{item.label}</div>}
              {item.badge > 0 && <span className="bd-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        {!sidebarCollapsed && (
          <div className="bd-sidebar-actions">
            <div className="bd-sidebar-actions-title">Quick Actions</div>
            <button className="bd-sidebar-action-btn" onClick={() => setActiveTab('create')}>
              <i className="fas fa-plus-circle bd-sidebar-actions-icon"></i>
              <span className="bd-sidebar-actions-text">Create Requirement</span>
            </button>
            <button className="bd-sidebar-action-btn" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('browse'); }}>
              <i className="fas fa-search bd-sidebar-actions-icon"></i>
              <span className="bd-sidebar-actions-text">Find Material</span>
            </button>
            <button className="bd-sidebar-action-btn" onClick={() => { setActiveTab('findMaterial'); setFindMaterialMode('ai'); }}>
              <i className="fas fa-robot bd-sidebar-actions-icon"></i>
              <span className="bd-sidebar-actions-text">AI Match</span>
            </button>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="bd-user-profile">
            <div className="bd-user-avatar">{user?.name?.charAt(0)}</div>
            <div className="bd-user-info">
              <h4>{user?.name}</h4>
              <p>Buyer · ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        <div className="bd-sidebar-footer">
          <i className="fas fa-bolt"></i>
          {!sidebarCollapsed && <span>WasteExchange AI</span>}
        </div>
      </div>

      <div className="bd-main-content">
        <div className="bd-header">
          <div className="bd-header-left">
            <div className="bd-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <i className="fas fa-bars"></i>
            </div>
            <div className="bd-page-title">
              <i className={`fas fa-${viewIcons[activeTab] || 'tachometer-alt'}`}></i>
              <span>{viewTitles[activeTab] || 'Dashboard'}</span>
            </div>
          </div>
          <div className="bd-header-actions">
            <div className="bd-header-search">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search..." />
            </div>
            <ThemeToggle />
            <div className="bd-notification-btn">
              <i className="fas fa-bell"></i>
              {unreadCount > 0 && <div className="bd-notification-dot"></div>}
            </div>
            <button className="bd-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        <div className="bd-content">
          {renderContent()}
          {renderEditModal()}
          {renderFilterModal()}
          {renderListingDetailModal()}
        </div>
      </div>

      <InsufficientBalanceModal
        open={balanceModal.open}
        required={balanceModal.required}
        available={balanceModal.available}
        context={balanceModal.context}
        onClose={() => setBalanceModal({ open: false, required: 0, available: 0, context: '' })}
        onAddMoney={() => {
          setBalanceModal({ open: false, required: 0, available: 0, context: '' });
          setActiveTab('addMoney');
        }}
      />

      {paymentChoiceModal.open && paymentChoiceModal.deal && (
        <div
          onClick={() => setPaymentChoiceModal({ open: false, deal: null, walletBalance: 0, canUseWallet: false })}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: 16, maxWidth: 480, width: '100%', border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))', borderBottom: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#a78bfa' }}>💳</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Choose Payment Method</h3>
                <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>Pay for {paymentChoiceModal.deal.material} ({paymentChoiceModal.deal.quantity}kg)</p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', marginBottom: 18, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>₹{paymentChoiceModal.deal.buyerTotalPayment.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>Includes ₹{paymentChoiceModal.deal.buyerCommission} (2% platform fee)</div>
              </div>

              {paymentChoiceModal.canUseWallet ? (
                <button onClick={() => payViaWallet(paymentChoiceModal.deal)} style={{ width: '100%', padding: '16px 20px', marginBottom: 12, borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <i className="fas fa-wallet" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i>
                      <span>Pay from Wallet</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Balance: ₹{paymentChoiceModal.walletBalance.toLocaleString('en-IN')}</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#22c55e' }}></i>
                </button>
              ) : (
                <div style={{ padding: '12px 16px', marginBottom: 12, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.78rem', color: '#fbbf24' }}>
                  <i className="fas fa-info-circle me-2"></i>
                  Wallet balance (₹{paymentChoiceModal.walletBalance.toLocaleString('en-IN')}) is insufficient. Short by ₹{(paymentChoiceModal.deal.buyerTotalPayment - paymentChoiceModal.walletBalance).toLocaleString('en-IN')}.
                </div>
              )}

              <button
                onClick={() => {
                  const deal = paymentChoiceModal.deal;
                  setPaymentChoiceModal({ open: false, deal: null, walletBalance: 0, canUseWallet: false });
                  setRazorpayModal({ open: true, deal, mode: 'deal_payment', amount: deal.buyerTotalPayment });
                }}
                style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <i className="fas fa-credit-card" style={{ fontSize: '1.1rem' }}></i>
                    <span>Pay via Razorpay</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>Card · UPI · Netbanking · Wallet</div>
                </div>
                <i className="fas fa-arrow-right"></i>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#6b7280', marginTop: 14, justifyContent: 'center' }}>
                <i className="fas fa-lock" style={{ color: '#22c55e' }}></i>
                Secured by Razorpay · PCI-DSS Compliant
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPaymentChoiceModal({ open: false, deal: null, walletBalance: 0, canUseWallet: false })}
                style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {incrementModal.open && incrementModal.listing && (
        <div onClick={() => setIncrementModal({ open: false, listing: null, myBid: null, topBid: null })} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: 16, maxWidth: 460, width: '100%', border: '1px solid rgba(251,191,36,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(139,92,246,0.08))', borderBottom: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#fbbf24' }}>🏆</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>{incrementModal.myBid ? 'Increase Your Bid' : 'Place Your Bid'}</h3>
                <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>{incrementModal.listing.material} ({incrementModal.listing.quantity}kg)</p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {incrementModal.topBid && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 4 }}>Current Highest Bid</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.1rem' }}>₹{incrementModal.topBid.amount}/kg</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>by {incrementModal.topBid.buyerName}</span>
                  </div>
                </div>
              )}

              {incrementModal.myBid && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginBottom: 4 }}>Your Current Bid</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>₹{incrementModal.myBid.amount}/kg</div>
                </div>
              )}

              <div className="bd-form-group">
                <label>New Bid Amount (₹/kg) *</label>
                <input type="number" className="bd-form-input" value={newBidAmount} onChange={(e) => setNewBidAmount(e.target.value)} min={incrementModal.listing.minBidPrice || 0} placeholder={`Min ₹${incrementModal.listing.minBidPrice || 0}`} />
                <small style={{ color: '#6b7280', fontSize: '0.72rem', display: 'block', marginTop: 4 }}>
                  <i className="fas fa-info-circle me-1"></i>
                  Minimum: ₹{incrementModal.listing.minBidPrice || 0}/kg
                  {incrementModal.topBid && ` · Must be > ₹${incrementModal.topBid.amount}/kg`}
                </small>
              </div>

              {incrementModal.topBid && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {[1, 5, 10, 25].map(inc => (
                    <button key={inc} type="button" onClick={() => setNewBidAmount(String(incrementModal.topBid.amount + inc))} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
                      +₹{inc}
                    </button>
                  ))}
                </div>
              )}

              {bidError && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '10px 14px', borderRadius: 9, fontSize: '0.82rem', marginBottom: 14 }}>
                  ⚠️ {bidError}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setIncrementModal({ open: false, listing: null, myBid: null, topBid: null })} disabled={bidUpdating} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: bidUpdating ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Cancel</button>
              <button
                onClick={() => {
                  if (!newBidAmount || Number(newBidAmount) <= 0) { setBidError('Enter a valid amount'); return; }
                  if (incrementModal.myBid) { updateBid(incrementModal.listing, incrementModal.myBid.id, newBidAmount); }
                  else { placeBid(incrementModal.listing, newBidAmount); }
                }}
                disabled={bidUpdating}
                style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: bidUpdating ? '#4b5563' : 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: 'white', cursor: bidUpdating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {bidUpdating ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-gavel"></i> {incrementModal.myBid ? 'Update Bid' : 'Place Bid'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <RazorpayPaymentModal
        open={razorpayModal.open}
        amount={razorpayModal.deal?.buyerTotalPayment || razorpayModal.amount || 0}
        purpose={razorpayModal.mode === 'wallet_topup' ? 'wallet_topup' : 'deal_payment'}
        dealId={razorpayModal.deal?._id}
        title={razorpayModal.mode === 'wallet_topup' ? 'Add Money to Wallet' : `Accept Offer - ${razorpayModal.deal?.material || ''}`}
        onClose={() => setRazorpayModal({ open: false, deal: null, mode: null, amount: 0 })}
        onSuccess={async (paymentId, response) => {
          const { deal, mode, amount: topupAmount } = razorpayModal;
          try {
            if (mode === 'wallet_topup') {
              const res = await API.post('/wallet/razorpay-add', {
                amount: topupAmount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              const u = { ...user, walletBalance: res.data.newBalance };
              localStorage.setItem('currentUser', JSON.stringify(u));
              setUser(u);
              setAddMoneyAmount('');
              setRazorpayModal({ open: false, deal: null, mode: null, amount: 0 });
              alert(`✅ ₹${topupAmount.toLocaleString('en-IN')} added!\nNew balance: ₹${res.data.newBalance.toLocaleString('en-IN')}`);
              await fetchData();
            } else {
              const res = await API.put(`/deals/${deal._id}/accept-razorpay`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              setDeals(deals.map(d => d._id === deal._id ? res.data : d));
              setRazorpayModal({ open: false, deal: null, mode: null, amount: 0 });
              alert(`✅ Payment successful!\nPayment ID: ${paymentId}\n\nDeal accepted!`);
              await fetchData();
            }
          } catch (err) {
            alert('❌ Failed: ' + (err.response?.data?.msg || err.message));
          }
        }}
      />

      <style>{`
        * { box-sizing: border-box; }
        .bd-dashboard-wrapper { display: flex; min-height: 100vh; background: #0a0a0f; color: #e5e7eb; font-family: 'Inter', sans-serif; font-size: 14px; }
        .bd-sidebar { width: 260px; background: rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 22px 0; transition: width 0.25s ease; flex-shrink: 0; overflow: hidden; }
        .bd-sidebar.collapsed { width: 76px; }
        .bd-brand-photo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 4px 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 14px; }
        .bd-brand-avatar { position: relative; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; cursor: pointer; overflow: hidden; border: 2px solid rgba(99,102,241,0.3); transition: 0.2s; flex-shrink: 0; }
        .bd-brand-avatar:hover { transform: scale(1.05); border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(139,92,246,0.12); }
        .bd-brand-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bd-brand-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; opacity: 0; transition: 0.2s; }
        .bd-brand-avatar:hover .bd-brand-avatar-overlay { opacity: 1; }
        .bd-brand-avatar-hint { margin: 4px 0 0; font-size: 0.62rem; color: rgba(255,255,255,0.3); }
        .bd-sidebar.collapsed .bd-brand-avatar { width: 38px; height: 38px; font-size: 0.9rem; }
        .bd-logo { display: flex; align-items: center; gap: 10px; padding: 4px 20px 20px; }
        .bd-logo-icon { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; color: white; }
        .bd-logo-text { font-size: 1.05rem; font-weight: 700; white-space: nowrap; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .bd-sidebar-nav { padding: 0 12px; flex: 1; }
        .bd-sidebar-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 9px; cursor: pointer; color: rgba(255,255,255,0.5); margin-bottom: 4px; transition: 0.15s; border: none; background: transparent; text-align: left; border-left: 3px solid transparent; font-size: 0.85rem; position: relative; }
        .bd-sidebar-icon { width: 16px; text-align: center; flex-shrink: 0; }
        .bd-nav-text { white-space: nowrap; }
        .bd-sidebar-item:hover { background: rgba(255,255,255,0.04); color: #e5e7eb; }
        .bd-sidebar-item.active { background: rgba(99,102,241,0.12); color: white; font-weight: 600; border-left: 3px solid #8b5cf6; }
        .bd-nav-badge { margin-left: auto; background: #f87171; color: white; font-size: 0.6rem; font-weight: 700; padding: 1px 6px; border-radius: 999px; }
        .bd-sidebar.collapsed .bd-sidebar-item { justify-content: center; }
        .bd-sidebar.collapsed .bd-nav-badge { position: absolute; top: 2px; right: 6px; margin-left: 0; }
        .bd-sidebar-actions { padding: 16px 16px 8px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 12px; }
        .bd-sidebar-actions-title { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.4px; color: rgba(255,255,255,0.3); margin-bottom: 10px; padding: 0 2px; }
        .bd-sidebar-action-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 7px; border: none; background: rgba(255,255,255,0.03); color: #9ca3af; cursor: pointer; margin-bottom: 6px; font-size: 0.75rem; transition: 0.15s; }
        .bd-sidebar-action-btn:hover { background: rgba(99,102,241,0.1); color: white; }
        .bd-sidebar-actions-icon { width: 14px; text-align: center; color: #8b5cf6; font-size: 0.8rem; }
        .bd-user-profile { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: auto; }
        .bd-user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 0.8rem; flex-shrink: 0; }
        .bd-user-info h4 { margin: 0; font-size: 0.8rem; }
        .bd-user-info p { margin: 0; font-size: 0.65rem; color: rgba(255,255,255,0.4); }
        .bd-sidebar-footer { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.05); color: #8b5cf6; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.3px; }
        .bd-main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0a0a0f; }
        .bd-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; gap: 12px; }
        .bd-header-left { display: flex; align-items: center; gap: 16px; }
        .bd-sidebar-toggle { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #9ca3af; background: rgba(255,255,255,0.03); }
        .bd-sidebar-toggle:hover { background: rgba(255,255,255,0.06); color: #e5e7eb; }
        .bd-page-title { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; font-weight: 700; color: #f3f4f6; }
        .bd-page-title i { color: #8b5cf6; }
        .bd-header-actions { display: flex; align-items: center; gap: 14px; }
        .bd-header-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 7px 12px; width: 190px; color: #6b7280; transition: 0.15s; }
        .bd-header-search:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .bd-header-search input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.8rem; color: white; }
        .bd-header-search input::placeholder { color: #6b7280; }
        .bd-notification-btn { position: relative; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; color: #9ca3af; }
        .bd-notification-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: #f87171; }
        .bd-logout-btn { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); padding: 7px 16px; border-radius: 8px; cursor: pointer; transition: 0.15s; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
        .bd-logout-btn:hover { background: rgba(248,113,113,0.2); }
        .bd-content { padding: 28px 32px 40px; overflow-y: auto; flex: 1; }
        .bd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 24px; }
        .bd-stat-card { background: rgba(255,255,255,0.03); padding: 20px 18px; border-radius: 12px; border-top: 3px solid; text-align: center; }
        .bd-stat-icon { font-size: 1.3rem; margin-bottom: 6px; }
        .bd-stat-value { font-size: 1.5rem; font-weight: 700; }
        .bd-stat-label { color: #9ca3af; font-size: 0.72rem; margin-top: 4px; }
        .bd-dashboard-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .bd-chart-wrapper { position: relative; height: 220px; padding-top: 6px; }
        .bd-link-btn { background: none; border: none; color: #60a5fa; font-size: 0.78rem; cursor: pointer; padding: 0; }
        .bd-link-btn:hover { text-decoration: underline; }
        .bd-quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .bd-action-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; color: #e5e7eb; transition: 0.2s; font-size: 0.8rem; font-weight: 500; }
        .bd-action-btn i { font-size: 1.2rem; color: #8b5cf6; }
        .bd-action-btn:hover { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.2); transform: translateY(-1px); }
        .bd-action-btn.bd-ai-btn i { color: #fbbf24; }
        .bd-activity-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.82rem; }
        .bd-activity-item:last-child { border-bottom: none; }
        .bd-activity-icon { width: 26px; height: 26px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0; font-size: 0.7rem; }
        .bd-activity-content { flex: 1; }
        .bd-activity-meta { color: #6b7280; }
        .bd-activity-status { font-size: 0.65rem; font-weight: 600; margin-top: 2px; }
        .bd-no-data { color: #6b7280; text-align: center; padding: 12px; font-size: 0.85rem; }
        .bd-table-wrap { overflow-x: auto; }
        .bd-data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .bd-data-table th { text-align: left; padding: 10px 14px; color: #9ca3af; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.3px; }
        .bd-data-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .bd-table-empty { text-align: center; padding: 28px; color: #6b7280; }
        .bd-status-badge { font-size: 0.65rem; font-weight: 700; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; }
        .bd-status-open { background: rgba(34,197,94,0.15); color: #22c55e; }
        .bd-status-matched { background: rgba(96,165,250,0.15); color: #60a5fa; }
        .bd-status-closed { background: rgba(156,163,175,0.15); color: #9ca3af; }
        .bd-segmented-toggle { display: flex; margin-bottom: 22px; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 5px; gap: 5px; }
        .bd-segmented-btn { flex: 1; padding: 10px 18px; border: none; border-radius: 9px; font-weight: 600; font-size: 0.85rem; cursor: pointer; background: transparent; color: #9ca3af; transition: 0.2s; }
        .bd-segmented-btn.active { background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .bd-segmented-btn:hover:not(.active) { color: #e5e7eb; }
        .bd-content-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 22px; }
        .bd-card-title { display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 0.98rem; margin-bottom: 16px; color: #f3f4f6; flex-wrap: wrap; gap: 10px; }
        .bd-search-bar { margin-bottom: 14px; }
        .bd-search-bar input { width: 100%; padding: 9px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: white; font-size: 0.85rem; }
        .bd-filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; }
        .bd-filters-grid input { padding: 6px 10px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.04); color: white; font-size: 0.75rem; }
        .bd-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: #6b7280; text-align: center; gap: 10px; }
        .bd-empty-icon { font-size: 1.6rem; opacity: 0.5; }
        .bd-ai-box { background: rgba(99,102,241,0.06); border-radius: 10px; padding: 16px; margin-bottom: 20px; }
        .bd-ai-box p { margin: 0 0 10px; font-size: 0.82rem; color: #d1d5db; line-height: 1.5; }
        .bd-ai-box textarea { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: white; font-size: 0.82rem; resize: vertical; font-family: inherit; }
        .bd-material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .bd-material-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; position: relative; }
        .bd-material-card.bd-ai-card { border-width: 2px; }
        .bd-ai-rank-badge { position: absolute; top: 0; right: 0; color: white; padding: 3px 10px; border-bottom-left-radius: 10px; border-top-right-radius: 10px; font-size: 0.6rem; font-weight: 700; }
        .bd-material-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .bd-material-card-icon { width: 34px; height: 34px; border-radius: 9px; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; font-size: 0.8rem; }
        .bd-material-card-header h6 { margin: 0; font-size: 0.85rem; font-weight: 700; color: #f3f4f6; }
        .bd-badge-verified { font-size: 0.6rem; background: rgba(34,197,94,0.12); color: #22c55e; padding: 2px 8px; border-radius: 8px; }
        .bd-material-card-sub { font-size: 0.75rem; color: #9ca3af; margin: 3px 0; }
        .bd-material-card-stats { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 10px 12px; margin: 12px 0; font-size: 0.75rem; }
        .bd-stat-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 0.78rem; }
        .bd-ai-score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
        .bd-ai-score-box { border-radius: 8px; padding: 10px; text-align: center; }
        .bd-ai-score-num { font-size: 1.05rem; font-weight: 800; }
        .bd-ai-score-label { font-size: 0.6rem; color: #9ca3af; margin-top: 2px; }
        .bd-material-card-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 12px; }
        .bd-btn-outline-sm { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; flex: 1; }
        .bd-btn-outline-sm:hover { background: rgba(255,255,255,0.04); }
        .bd-btn-danger-sm { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #f87171; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; }
        .bd-btn-danger-sm:hover { background: rgba(248,113,113,0.2); }
        .bd-btn-request { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7rem; white-space: nowrap; flex: 1; }
        .bd-btn-request:hover { background: rgba(34,197,94,0.2); }
        .bd-pagination { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 20px; font-size: 0.8rem; }
        .bd-pagination button { padding: 5px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #e5e7eb; cursor: pointer; font-size: 0.8rem; }
        .bd-pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
        .bd-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .bd-page-header h2 { margin: 0; font-size: 1.15rem; font-weight: 600; }
        .bd-req-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
        .bd-req-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-left: 3px solid #6366f1; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; }
        .bd-req-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 10px; }
        .bd-req-card-top h6 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #f3f4f6; }
        .bd-req-type-tag { display: inline-block; font-size: 0.68rem; background: rgba(255,255,255,0.05); color: #9ca3af; padding: 3px 10px; border-radius: 8px; margin-bottom: 12px; align-self: flex-start; }
        .bd-req-card-body { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
        .bd-req-card-actions { display: flex; gap: 8px; margin-top: auto; }
        .bd-btn-primary { background: #6366f1; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 0.85rem; font-weight: 500; }
        .bd-btn-primary:hover { background: #4f46e5; }
        .bd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .bd-btn-secondary { background: rgba(255,255,255,0.04); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.08); padding: 9px 18px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 0.85rem; }
        .bd-btn-secondary:hover { background: rgba(255,255,255,0.08); }
        .bd-btn-sm { padding: 6px 14px; font-size: 0.75rem; }
        .bd-create-form { max-width: 640px; margin: 0 auto; background: rgba(255,255,255,0.02); padding: 28px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05); }
        .bd-create-form h2 { color: #60a5fa; margin-top: 0; margin-bottom: 20px; font-size: 1.15rem; }
        .bd-form-group { margin-bottom: 16px; }
        .bd-form-group label { display: block; margin-bottom: 6px; font-size: 0.78rem; color: #d1d5db; font-weight: 500; }
        .bd-form-input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: white; font-size: 0.85rem; }
        .bd-form-input:focus { outline: none; border-color: #6366f1; }
        
        /* ✅ Custom Select Dropdown Styling for Clear Visibility */
        select.bd-form-input {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          padding-right: 36px;
          cursor: pointer;
        }
        .bd-form-input option {
          background-color: #1a1a2e;
          color: #ffffff;
          padding: 10px;
        }

        .bd-location-input { margin-top: 10px; }
        .bd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .bd-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .bd-error-text { color: #f87171; font-size: 0.7rem; margin-top: 4px; display: block; }
        .bd-dropzone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; color: #9ca3af; transition: 0.15s; background: rgba(255,255,255,0.02); }
        .bd-dropzone:hover { border-color: #6366f1; background: rgba(99,102,241,0.04); color: #c7d2fe; }
        .bd-dropzone i { font-size: 1.3rem; display: block; margin-bottom: 8px; }
        .bd-dropzone p { margin: 0; font-weight: 500; font-size: 0.8rem; }
        .bd-dropzone small { color: #6b7280; font-size: 0.7rem; display: block; margin-top: 4px; }
        .bd-image-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); gap: 10px; margin-top: 12px; }
        .bd-image-preview-item { position: relative; width: 100%; aspect-ratio: 1; border-radius: 9px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .bd-image-preview-item img { width: 100%; height: 100%; object-fit: cover; }
        .bd-image-preview-item button { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; border: none; background: rgba(0,0,0,0.7); color: white; cursor: pointer; font-size: 0.6rem; display: flex; align-items: center; justify-content: center; }
        .bd-add-money { max-width: 440px; margin: 0 auto; }
        .bd-wallet-info { background: rgba(255,255,255,0.02); padding: 16px 18px; border-radius: 10px; margin-bottom: 18px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
        .bd-wallet-info p { margin: 0 0 6px; }
        .bd-wallet-info p:last-child { margin-bottom: 0; }
        .bd-limit-note { color: #6b7280; font-size: 0.72rem; }
        .bd-messages-page { height: calc(100vh - 160px); min-height: 460px; }
        .bd-messages-grid { display: grid; grid-template-columns: 290px 1fr; gap: 18px; height: 100%; }
        .bd-conv-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .bd-conv-header { padding: 14px 16px; background: rgba(99,102,241,0.1); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .bd-conv-header h6 { margin: 0; font-size: 0.85rem; font-weight: 700; color: #f3f4f6; }
        .bd-live-dot { font-size: 0.65rem; color: #22c55e; display: flex; align-items: center; gap: 4px; }
        .bd-live-dot i { font-size: 0.5rem; }
        .bd-conv-list { flex: 1; overflow-y: auto; }
        .bd-conv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); transition: 0.15s; }
        .bd-conv-item:hover { background: rgba(255,255,255,0.03); }
        .bd-conv-item.active { background: rgba(99,102,241,0.12); border-left: 3px solid #6366f1; }
        .bd-conv-avatar { width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
        .bd-conv-info { flex: 1; min-width: 0; }
        .bd-conv-name { font-weight: 600; font-size: 0.82rem; color: #f3f4f6; }
        .bd-conv-preview { font-size: 0.72rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .bd-chat-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .bd-chat-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280; text-align: center; padding: 36px; gap: 10px; }
        .bd-chat-placeholder i { font-size: 2.2rem; opacity: 0.4; }
        .bd-chat-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); }
        .bd-chat-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
        .bd-chat-bubble-row { display: flex; }
        .bd-chat-bubble-row.mine { justify-content: flex-end; }
        .bd-chat-bubble { max-width: 70%; padding: 10px 14px; border-radius: 14px 14px 14px 4px; background: rgba(255,255,255,0.05); font-size: 0.82rem; line-height: 1.5; }
        .bd-chat-bubble-row.mine .bd-chat-bubble { border-radius: 14px 14px 4px 14px; background: #6366f1; color: white; }
        .bd-chat-input { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .bd-chat-input input { flex: 1; padding: 9px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: white; font-size: 0.85rem; }
        .bd-profile { max-width: 540px; margin: 0 auto; }
        .bd-profile form { }
        .bd-profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .bd-profile-header h2 { margin: 0; font-size: 1.15rem; }
        .bd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 20px; }
        .bd-modal-content { background: #1a1a2e; padding: 24px; border-radius: 14px; max-width: 440px; width: 100%; border: 1px solid rgba(255,255,255,0.08); max-height: 90vh; overflow-y: auto; }
        .bd-modal-content h3 { margin-top: 0; margin-bottom: 18px; color: #60a5fa; font-size: 1.05rem; }
        .bd-modal-actions { display: flex; gap: 10px; margin-top: 18px; }
        .bd-modal-actions .bd-btn-secondary, .bd-modal-actions .bd-btn-primary { flex: 1; }

        /* ✅ Requests Sent status tabs */
        .bd-status-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          flex-wrap: wrap;
          padding: 6px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          width: fit-content;
        }
        .bd-status-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.15s;
          color: #9ca3af;
        }
        .bd-status-tab:hover { background: rgba(255,255,255,0.04); }
        .bd-status-tab.active { background: rgba(255,255,255,0.05); }
        .bd-status-tab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .bd-status-tab-count {
          padding: 2px 8px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          font-size: 0.7rem; font-weight: 700;
        }

        /* ✅ ROTATING LOGO LOADING ANIMATION */
        .bd-loading-container { position: fixed; inset: 0; background: #0a0a0f; display: flex; align-items: center; justify-content: center; z-index: 99999; }
        [data-theme="light"] .bd-loading-container { background: #f8fafc; }
        .bd-loading-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .bd-loading-logo-ring { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
        .bd-loading-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: #6366f1; border-right-color: #8b5cf6; animation: bd-spin-ring 1.2s linear infinite; }
        .bd-loading-logo-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; border: 2px solid transparent; border-top-color: #60a5fa; border-left-color: #a78bfa; animation: bd-spin-ring 1.8s linear infinite reverse; }
        .bd-loading-logo-inner { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2.4rem; color: white; box-shadow: 0 0 40px rgba(99,102,241,0.5); animation: bd-logo-breathe 2s ease-in-out infinite; }
        @keyframes bd-spin-ring { to { transform: rotate(360deg); } }
        @keyframes bd-logo-breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(99,102,241,0.5); } 50% { transform: scale(1.08); box-shadow: 0 0 60px rgba(99,102,241,0.8); } }
        .bd-loading-text { font-size: 1.5rem; font-weight: 800; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px; margin: 0; animation: bd-text-pulse 2s ease-in-out infinite; }
        @keyframes bd-text-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .bd-loading-tagline { color: #6b7280; font-size: 0.85rem; letter-spacing: 0.5px; margin-top: -12px; }
        .bd-loading-dots { display: flex; gap: 6px; margin-top: 8px; }
        .bd-loading-dots span { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; animation: bd-dot-bounce 1.4s ease-in-out infinite; }
        .bd-loading-dots span:nth-child(2) { animation-delay: 0.2s; background: #8b5cf6; }
        .bd-loading-dots span:nth-child(3) { animation-delay: 0.4s; background: #60a5fa; }
        @keyframes bd-dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-10px); opacity: 1; } }

        @media (max-width: 900px) {
          .bd-dashboard-columns { grid-template-columns: 1fr; }
          .bd-messages-grid { grid-template-columns: 1fr; height: auto; }
          .bd-conv-panel { max-height: 220px; }
          .bd-chat-panel { min-height: 400px; }
        }
        @media (max-width: 768px) {
          .bd-content { padding: 20px 16px 32px; }
          .bd-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .bd-quick-actions { grid-template-columns: repeat(2, 1fr); }
          .bd-form-row { grid-template-columns: 1fr; }
          .bd-filters-grid { grid-template-columns: 1fr 1fr; }
          .bd-segmented-toggle { flex-direction: column; }
          .bd-material-grid { grid-template-columns: 1fr; }
          .bd-header-search { display: none; }
        }
      `}</style>
    </div>
  );
};

export default BuyerDashboard;