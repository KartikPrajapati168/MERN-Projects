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
import ThemeToggle from '../components/ThemeToggle';
import { useDialog } from '../context/DialogContext';

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
  const currentUserId = String(user?._id || user?.id || '');

  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [deals, setDeals] = useState([]);
  const [messages, setMessages] = useState([]);
  const [bidListings, setBidListings] = useState([]);
  const [bidsTab, setBidsTab] = useState('active');

  const [clientsTab, setClientsTab] = useState('all');
  const [reviewRequirement, setReviewRequirement] = useState(null);
  const [reqStatusFilter, setReqStatusFilter] = useState('all');

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMsgText, setNewMsgText] = useState('');
  const chatEndRef = useRef(null);

  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerPrice, setOfferPrice] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinQty, setFilterMinQty] = useState('');
  const [filterMaxQty, setFilterMaxQty] = useState('');

  const [isSendingOffer, setIsSendingOffer] = useState(false);

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

  const [aiRecommendedClients, setAiRecommendedClients] = useState([]);
  const [aiRecLoading, setAiRecLoading] = useState(false);

  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('upi');
  const [withdrawUPI, setWithdrawUPI] = useState('');
  const [withdrawBank, setWithdrawBank] = useState({
    accountHolder: '', accountNumber: '', ifscCode: '', bankName: ''
  });
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const materialChartRef = useRef(null);
  const materialChartInstance = useRef(null);

  const [dismissedRequirements, setDismissedRequirements] = useState([]);

  const handleDismissRequirement = (reqId) => {
    setDismissedRequirements(prev => [...prev, String(reqId)]);
    showSuccess('Requirement hidden from your list', 'Rejected');
  };

  const { showAlert, showSuccess, showError, showConfirm, showDanger } = useDialog();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (currentUser.role === 'admin') {
      setLoading(false);
      navigate('/admin', { replace: true });
      return;
    }

    if (currentUser.role !== 'generator') {
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    if (!currentUser.isCompanyVerified) {
      setLoading(false);
      navigate('/waiting', { replace: true });
      return;
    }

    setUser(currentUser);
    if (currentUser.profilePhoto) setProfilePhoto(currentUser.profilePhoto);
    setProfileForm({ ...currentUser, password: '' });
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        API.get('/listings/user'),
        API.get('/requirements'),
        API.get('/deals/user'),
        API.get('/messages/user'),
        API.get('/wallet/withdrawals'),
        API.get('/listings/bids-received')
      ]);

      if (results[0].status === 'fulfilled') setListings(results[0].value.data || []);
      else setListings([]);

      let reqsData = [];
      if (results[1].status === 'fulfilled') {
        reqsData = results[1].value.data || [];
      }

      let dealsData = [];
      if (results[2].status === 'fulfilled') {
        dealsData = results[2].value.data || [];
      }
      setDeals(dealsData);

      if (results[3].status === 'fulfilled') setMessages(results[3].value.data || []);
      else setMessages([]);

      if (results[4].status === 'fulfilled') setWithdrawals(results[4].value.data || []);
      else setWithdrawals([]);

      let receivedBids = [];
      if (results[5].status === 'fulfilled') {
        receivedBids = results[5].value.data || [];
        setBidListings(receivedBids);
      } else {
        setBidListings([]);
      }

      // ✅ Extract requirement IDs from buyer requests
      const requestedReqIds = new Set();
      receivedBids.forEach(listing => {
        (listing.requests || []).forEach(req => {
          if (req.requirementId) requestedReqIds.add(String(req.requirementId));
        });
      });

      // ✅ FILTER: Only show requirements that buyers have explicitly requested
      const relevantReqs = reqsData.filter(r => requestedReqIds.has(String(r._id)));

      const cid = String(user?._id || user?.id || '');
      const myActiveDeals = dealsData.filter(d =>
        String(d.generatorId?._id || d.generatorId || '') === cid &&
        ['offered', 'requested', 'accepted', 'paid'].includes(d.status)
      );

      const existingReqIds = new Set(relevantReqs.map(r => String(r._id)));
      const mergedReqs = [...relevantReqs];

      myActiveDeals.forEach(d => {
        const reqId = String(d.requirementId?._id || d.requirementId);
        if (!reqId || reqId === 'undefined') return;
        if (existingReqIds.has(reqId)) return;

        mergedReqs.push({
          _id: reqId,
          material: d.material,
          materialSubtype: d.materialSubtype || '',
          minQty: d.quantity,
          maxQty: d.quantity,
          maxPrice: d.pricePerUnit,
          location: d.location || '',
          buyerName: d.buyerName,
          buyerId: d.buyerId,
          status: 'open',
          createdAt: d.createdAt,
          _fromDeal: true,
          _dealId: d._id
        });
        existingReqIds.add(reqId);
      });

      setRequirements(mergedReqs);
    } catch (err) { console.error('❌ fetchData error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // While on Bids page: poll every 20s to auto-award when timer ends
  useEffect(() => {
    if (!user || activePage !== 'bids') return;
    loadBids();
    const t = setInterval(() => { loadBids(); }, 20000);
    return () => clearInterval(t);
  }, [user, activePage]);

  const loadBids = async () => {
    try {
      const res = await API.get('/listings/bids-received');
      let data = res.data || [];
      setBidListings(data);

      // Expired live auctions (time over, not yet sold/closed)
      const expired = data.filter(l =>
        l.biddingEndsAt &&
        new Date(l.biddingEndsAt).getTime() <= Date.now() &&
        l.status !== 'sold' &&
        l.status !== 'closed'
      );

      for (const l of expired) {
        const openBids = (l.bids || []).filter(b => b.status !== 'rejected' && b.status !== 'accepted');
        const hasBids = openBids.length > 0 || (l.bids || []).some(b => b.status === 'accepted');

        if (openBids.length > 0) {
          // Auto-award to highest bidder → creates deal / sends offer
          try {
            await API.post(`/listings/${l._id}/bids/auto-award`);
          } catch (_) {
            // Fallback: accept top bid manually
            const top = [...openBids].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
            if (top?._id) {
              try {
                await API.post(`/listings/${l._id}/bids/${top._id}/accept`);
              } catch (__) { /* ignore */ }
            }
          }
        } else if (!hasBids && l.biddingEnabled) {
          // No bids → close bidding, restore stock for direct requests
          try {
            await API.put(`/listings/${l._id}`, { biddingEnabled: false });
          } catch (_) {
            try { await API.patch(`/listings/${l._id}`, { biddingEnabled: false }); } catch (__) { /* ignore */ }
          }
        }
      }

      if (expired.length > 0) {
        const [bidsRes, listRes, dealsRes] = await Promise.allSettled([
          API.get('/listings/bids-received'),
          API.get('/listings/user'),
          API.get('/deals/user'),
        ]);
        if (bidsRes.status === 'fulfilled') setBidListings(bidsRes.value.data || []);
        if (listRes.status === 'fulfilled') setListings(listRes.value.data || []);
        if (dealsRes.status === 'fulfilled') setDeals(dealsRes.value.data || []);
      }
    } catch (err) { setBidListings([]); }
  };

  const fetchListingsOnly = async () => {
    try {
      const res = await API.get('/listings/user');
      setListings(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAcceptBid = async (listingId, bidId) => {
    if (!listingId || !bidId) {
      showError('Bid not found. Refresh and try again.');
      return;
    }

    const ok = await showConfirm(
      'This will send an OFFER to the buyer (not auto-accepted). Buyer must accept & pay — same as when auction timer ends.',
      { title: 'Send Offer to Bidder?', confirmText: 'Send Offer' }
    );
    if (!ok) return;

    const listing = bidListings.find(l => String(l._id) === String(listingId));
    const bid = (listing?.bids || []).find(b =>
      String(b._id || b.id) === String(bidId)
    );

    const buyerId = bid
      ? (bid.buyerId?._id || bid.buyerId || bid.buyer?._id || bid.buyer)
      : null;
    const requirementId = bid
      ? (bid.requirementId?._id || bid.requirementId || null)
      : null;
    const price = bid ? Number(bid.amount || bid.price || 0) : 0;
    const qty = listing ? Number(listing.quantity || 0) : 0;

    const forceDealOffered = async (dealId) => {
      if (!dealId) return;
      try {
        await API.put(`/deals/${dealId}`, { status: 'offered' });
      } catch (_) {
        try { await API.patch(`/deals/${dealId}`, { status: 'offered' }); } catch (__) { /* ignore */ }
      }
    };

    try {
      let offerCreated = false;

      // 1) Preferred: create deal as OFFER (buyer Deals tab shows Offer)
      if (buyerId && price > 0 && qty > 0) {
        try {
          await API.post('/deals/offer', {
            listingId,
            buyerId,
            requirementId,
            quantity: qty,
            pricePerUnit: price
          });
          offerCreated = true;
        } catch (e) {
          console.warn('deals/offer failed', e?.response?.data?.msg || e?.message);
        }
      }

      // 2) Mark bid as won (backend may also create a deal as accepted)
      let acceptDeal = null;
      try {
        const res = await API.post(
          `/listings/${listingId}/bids/${bidId}/accept`,
          { asOffer: true, createAsOffer: true }
        );
        acceptDeal = res?.data?.deal || null;
      } catch (acceptErr) {
        // If offer already created, accept failure is ok for bid marking
        if (!offerCreated) throw acceptErr;
      }

      // 3) Force any accepted deal for this listing+buyer → offered
      if (acceptDeal?._id && acceptDeal.status === 'accepted') {
        await forceDealOffered(acceptDeal._id);
      }

      try {
        const dealsRes = await API.get('/deals/user');
        const allDeals = dealsRes.data || [];
        const toFix = allDeals.filter(d => {
          const lid = String(d.listingId?._id || d.listingId || '');
          const bid = String(d.buyerId?._id || d.buyerId || '');
          return lid === String(listingId) &&
            (!buyerId || bid === String(buyerId)) &&
            d.status === 'accepted';
        });
        for (const d of toFix) {
          await forceDealOffered(d._id);
        }
        const refreshed = await API.get('/deals/user');
        setDeals(refreshed.data || []);
      } catch (_) { /* ignore */ }

      // Close bidding on this listing so it leaves Active tab
      try {
        await API.put(`/listings/${listingId}`, { biddingEnabled: false, status: 'closed' });
      } catch (_) {
        try {
          await API.patch(`/listings/${listingId}`, { biddingEnabled: false, status: 'closed' });
        } catch (__) { /* ignore */ }
      }

      showSuccess('Offer sent to buyer! Listing moved to Completed — buyer will see Offer under Deals.');
      setBidsTab('completed');
      await loadBids();
      await fetchListingsOnly();
      try {
        const dealsRes = await API.get('/deals/user');
        setDeals(dealsRes.data || []);
      } catch (_) { /* ignore */ }
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
  };

  const handleRejectBid = async (listingId, bidId) => {
    const ok = await showDanger(
      'This bid will be rejected and the buyer will be notified.',
      { title: 'Reject Bid?', confirmText: 'Reject' }
    );
    if (!ok) return;
    try {
      await API.post(`/listings/${listingId}/bids/${bidId}/reject`);
      showSuccess('Bid rejected.');
      await loadBids();
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
  };

  const handleContactBuyer = async (requirement) => {
    if (requirement.status === 'fulfilled') {
      showError('This requirement is already fulfilled.', 'Cannot Send Offer');
      return;
    }

    // ✅ FIX: Ignore 'requested' status. Only block if Generator already sent an offer or deal is accepted/paid.
    const existingOffer = deals.find(d => {
      if (!d.requirementId || !requirement._id) return false;
      const reqId = String(d.requirementId?._id || d.requirementId);
      const genId = String(d.generatorId?._id || d.generatorId || '');
      const isSameReq = reqId === String(requirement._id);
      const isSameGen = genId === currentUserId;
      // ✅ Sirf in statuses par block karo (offered, accepted, paid). 'requested' ko mat block karo.
      const isActive = ['offered', 'accepted', 'paid'].includes(d.status);

      return isSameReq && isSameGen && isActive;
    });

    if (existingOffer) {
      let title = 'Offer Already Sent';
      let msg = '';
      let type = 'warning';

      if (existingOffer.status === 'offered') {
        msg = 'You already sent an offer. Waiting for buyer response.\n\nCheck "Deals" tab for updates.';
      } else if (existingOffer.status === 'accepted') {
        msg = 'Buyer accepted your offer. Payment pending.\n\nCheck "Deals" tab.';
        type = 'info';
      } else if (existingOffer.status === 'paid') {
        msg = '✅ Buyer has PAID. Go to "Deals" tab to mark as delivered.';
        title = 'Payment Received';
        type = 'success';
      }

      showAlert(msg, { title, type });
      setTimeout(() => setActivePage('deals'), 500);
      return;
    }

    const matched = listings.filter(l => {
      const listingGenId = String(l.generatorId?._id || l.generatorId || '');
      const matMatch = (l.material || '').toLowerCase() === (requirement.material || '').toLowerCase();
      const statusMatch = l.status === 'active' || l.status === 'pending';
      return listingGenId === currentUserId && statusMatch && matMatch;
    });

    if (matched.length === 0) {
      showAlert(
        `You don't have any active or pending listing for "${requirement.material}".\n\nPlease create a matching listing first.`,
        { title: 'No Matching Listing', type: 'warning' }
      );
      setActivePage('create');
      return;
    }

    setOfferRequirement(requirement);
    setMatchingListings(matched);
    setSelectedListingForOffer(null);

    const defaultQty = Math.min(
      Number(requirement.maxQty) || 0,
      Number(matched[0]?.quantity) || 0
    );
    setOfferQuantity(String(defaultQty || ''));
    setOfferPrice(String(matched[0]?.price || requirement.maxPrice || ''));
  };

  const confirmSendOffer = async () => {
    if (!offerRequirement || !selectedListingForOffer || isSendingOffer) return;

    const qty = Number(offerQuantity);
    const price = Number(offerPrice);

    if (!qty || qty <= 0) {
      showError('Enter a valid quantity', 'Invalid Input');
      return;
    }
    if (qty > selectedListingForOffer.quantity) {
      showError(`Quantity exceeds your listing stock (${selectedListingForOffer.quantity} kg)`, 'Not Enough Stock');
      return;
    }
    if (!price || price <= 0) {
      showError('Enter a valid price', 'Invalid Input');
      return;
    }
    if (price > offerRequirement.maxPrice) {
      showError(`Price exceeds buyer's max (₹${offerRequirement.maxPrice}/kg)`, 'Price Too High');
      return;
    }

    setIsSendingOffer(true);

    try {
      await API.post('/deals/offer', {
        listingId: selectedListingForOffer._id,
        buyerId: offerRequirement.buyerId,
        requirementId: offerRequirement._id,
        quantity: qty,
        pricePerUnit: price
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
          content: `Hi ${offerRequirement.buyerName}, I saw your requirement for ${offerRequirement.material}. I can offer ${qty}kg at ₹${price}/kg. Total: ₹${(qty * price).toLocaleString('en-IN')}. Let's connect!`
        });
      } catch (e) { /* ignore */ }

      const buyerName = offerRequirement.buyerName;
      setOfferRequirement(null);
      setMatchingListings([]);
      setSelectedListingForOffer(null);
      setOfferQuantity('');
      setOfferPrice('');
      showSuccess(`Offer sent to ${buyerName}!\n\n${qty} kg @ ₹${price}/kg`, 'Offer Sent');
    } catch (err) {
      showError(err.response?.data?.msg || err.message, 'Failed to Send Offer');
    } finally {
      setIsSendingOffer(false);
    }
  };

  // ----- Stats -----
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === 'active').length;
  const pendingBidsCount = bidListings.reduce((sum, l) => {
    const live = l.biddingEnabled && l.status !== 'sold' && l.status !== 'closed' &&
      (!l.biddingEndsAt || new Date(l.biddingEndsAt).getTime() > Date.now());
    if (!live) return sum;
    return sum + (l.bids?.filter(b => b.status !== 'accepted' && b.status !== 'rejected').length || 0);
  }, 0);
  const completedDeals = deals.filter(d => String(d.generatorId) === currentUserId && d.status === 'completed').length;

  const monthlyListings = (() => {
    const counts = Array(12).fill(0);
    listings.forEach(l => {
      if (!l.createdAt) return;
      const m = new Date(l.createdAt).getMonth();
      if (m >= 0 && m < 12) counts[m]++;
    });
    return counts;
  })();

  const materialDistribution = (() => {
    const dist = {};
    listings.forEach(l => {
      const mat = l.aiCategory || l.material || 'Other';
      dist[mat] = (dist[mat] || 0) + 1;
    });
    return dist;
  })();

  const initChart = useCallback(() => {
    if (!chartRef.current) return;
    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }
    const ctx = chartRef.current.getContext('2d');
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'New Listings',
          data: monthlyListings,
          backgroundColor: monthlyListings.map(v => v > 0 ? 'rgba(99,102,241,0.85)' : 'rgba(99,102,241,0.2)'),
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: isLight ? '#475569' : '#9ca3af', font: { size: 12 } } },
          tooltip: { callbacks: { label: (c) => `${c.raw} listing(s)` } }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(5, ...monthlyListings) + 1,
            ticks: { stepSize: 1, color: isLight ? '#64748b' : '#9ca3af', font: { size: 11 } },
            grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }
          },
          x: { ticks: { color: isLight ? '#64748b' : '#9ca3af', font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  }, [monthlyListings]);

  const initMaterialChart = useCallback(() => {
    if (!materialChartRef.current) return;
    if (materialChartInstance.current) {
      materialChartInstance.current.destroy();
      materialChartInstance.current = null;
    }
    if (Object.keys(materialDistribution).length === 0) return;

    const ctx = materialChartRef.current.getContext('2d');
    const labels = Object.keys(materialDistribution);
    const data = Object.values(materialDistribution);

    const COLORS = {
      'Plastic': '#6366f1', 'Metal': '#f59e0b', 'Paper': '#22c55e', 'Textile': '#ec4899',
      'Wood': '#8b5cf6', 'Glass': '#06b6d4', 'Rubber': '#ef4444', 'E-waste': '#84cc16',
      'Organic': '#10b981', 'Other': '#94a3b8'
    };

    const bgColors = labels.map(l => COLORS[l] || '#94a3b8');

    materialChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#0a0a0f',
          hoverOffset: 12,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#d1d5db', padding: 14, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw} listing(s)` } }
        }
      }
    });
  }, [materialDistribution]);

  useEffect(() => {
    if (activePage === 'dashboard' && !loading) {
      const timer = setTimeout(() => {
        initChart();
        initMaterialChart();
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (activePage !== 'dashboard') {
        if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }
        if (materialChartInstance.current) { materialChartInstance.current.destroy(); materialChartInstance.current = null; }
      }
    };
  }, [activePage, loading, initChart, initMaterialChart]);

  const getRequirementStatusForGenerator = useCallback((req) => {
    const cid = String(user?._id || user?.id || '');

    const myDeals = deals.filter(d =>
      String(d.requirementId?._id || d.requirementId) === String(req._id) &&
      String(d.generatorId?._id || d.generatorId || '') === cid
    );

    const myDeal = myDeals.sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )[0];

    if (!myDeal) {
      return { key: 'active', label: 'New' };
    }

    if (myDeal.status === 'completed') {
      return { key: 'active', label: 'New' };
    }
    if (myDeal.status === 'paid') {
      return { key: 'paid', label: 'Paid' };
    }
    if (myDeal.status === 'accepted') {
      return { key: 'paid', label: 'Paid' };
    }
    if (myDeal.status === 'offered') {
      return { key: 'offered', label: 'Offer Sent' };
    }
    if (myDeal.status === 'rejected') {
      return { key: 'rejected', label: 'Rejected' };
    }

    return { key: 'active', label: 'New' };
  }, [user, deals]);

  const filteredRequirements = requirements
    .filter(r => {
      const matchSearch = (r.material || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchMat = filterMaterial ? (r.material || '').toLowerCase().includes(filterMaterial.toLowerCase()) : true;
      const matchLoc = filterLocation ? (r.location || '').toLowerCase().includes(filterLocation.toLowerCase()) : true;
      const matchMinPrice = filterMinPrice ? r.maxPrice >= Number(filterMinPrice) : true;
      const matchMaxPrice = filterMaxPrice ? r.maxPrice <= Number(filterMaxPrice) : true;
      const matchMinQty = filterMinQty ? r.maxQty >= Number(filterMinQty) : true;
      const matchMaxQty = filterMaxQty ? r.minQty <= Number(filterMaxQty) : true;

      const statusInfo = getRequirementStatusForGenerator(r);
      const statusMatch = reqStatusFilter === 'all' ? true : statusInfo.key === reqStatusFilter;

      return matchSearch && matchMat && matchLoc && matchMinPrice && matchMaxPrice && matchMinQty && matchMaxQty && statusMatch;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const statusCounts = requirements.reduce((acc, r) => {
    const { key } = getRequirementStatusForGenerator(r);
    acc[key] = (acc[key] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, { all: 0, active: 0, offered: 0, paid: 0, fulfilled: 0, rejected: 0 });

  const fetchAIRecClients = async () => {
    try {
      setAiRecLoading(true);

      const bidsRes = await API.get('/listings/bids-received');
      const freshBidListings = bidsRes.data || [];
      setBidListings(freshBidListings);

      const requestedReqIds = new Set();
      freshBidListings.forEach(listing => {
        (listing.requests || []).forEach(req => {
          if (req.requirementId) requestedReqIds.add(String(req.requirementId));
        });
      });

      const res = await API.post('/ai/recommend', { role: 'generator' });
      let aiData = res.data || [];

      const relevantAiMatches = aiData.filter(item => requestedReqIds.has(String(item._id)));

      const cid = String(user?._id || user?.id || '');
      const myActiveDeals = deals.filter(d =>
        String(d.generatorId?._id || d.generatorId || '') === cid &&
        ['offered', 'requested', 'accepted', 'paid'].includes(d.status)
      );

      const existingIds = new Set(relevantAiMatches.map(a => String(a._id)));
      const extraRelevant = [];

      myActiveDeals.forEach(d => {
        const reqId = String(d.requirementId?._id || d.requirementId);
        if (!reqId || reqId === 'undefined') return;
        if (existingIds.has(reqId)) return;

        const req = requirements.find(r => String(r._id) === reqId);

        if (req) {
          extraRelevant.push({
            ...req,
            matchScore: 100,
            textSimilarity: 100,
            ruleScore: 100,
            aiExplanation: [`Past interaction: Deal ${d.status}`]
          });
        } else {
          extraRelevant.push({
            _id: reqId,
            material: d.material,
            materialSubtype: d.materialSubtype || '',
            minQty: d.quantity,
            maxQty: d.quantity,
            maxPrice: d.pricePerUnit,
            location: d.location || '',
            buyerName: d.buyerName,
            buyerId: d.buyerId,
            status: 'open',
            createdAt: d.createdAt,
            matchScore: 100,
            textSimilarity: 100,
            ruleScore: 100,
            aiExplanation: [`Past interaction: Deal ${d.status}`]
          });
        }
        existingIds.add(reqId);
      });

      setAiRecommendedClients([...relevantAiMatches, ...extraRelevant]);
    } catch (err) {
      console.error('❌ AI recommend failed:', err.response?.data?.msg || err.message);
      setAiRecommendedClients([]);
    } finally {
      setAiRecLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === 'findRequirements' && clientsTab === 'ai') {
      fetchAIRecClients();
    }
  }, [activePage, clientsTab]);

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
    if (!file.type.startsWith('image/')) { showError('Please choose an image file.', 'Invalid File'); return; }
    if (file.size > MAX_IMAGE_SIZE) { showError('Image must be under 5MB.', 'File Too Large'); return; }
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
    reader.onerror = () => showError('Could not read that image.', 'Error');
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
      showSuccess(
        `Listing added successfully!\n\nAI classified as: ${res.data.aiCategory || 'Other'}\nConfidence: ${res.data.aiConfidence || 0}%`,
        'Listing Created'
      );
      setActivePage('listings');
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
  };

  const deleteListing = async (id) => {
    const ok = await showDanger(
      'This listing will be permanently deleted along with all its bids and offers.',
      { title: 'Delete Listing?', confirmText: 'Delete' }
    );
    if (!ok) return;
    try {
      await API.delete(`/listings/${id}`);
      setListings(listings.filter(l => l._id !== id));
      showSuccess('Listing deleted successfully.', 'Deleted');
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
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
      showSuccess('Listing updated successfully.', 'Updated');
      closeEditModal();
    } catch (err) {
      showError(err.response?.data?.msg || err.message, 'Update Failed');
    }
  };

  const acceptDeal = async (dealId) => {
    try {
      const deal = deals.find(d => d._id === dealId);
      if (!deal) return;

      const confirmMsg =
        `Material: ${deal.material} (${deal.quantity}kg)\n\n` +
        `Buyer will pay: ₹${(deal.buyerTotalPayment || deal.totalAmount).toLocaleString('en-IN')}\n` +
        `You will receive: ₹${(deal.generatorPayout || deal.totalAmount).toLocaleString('en-IN')}\n\n` +
        `After you accept, the buyer will need to complete the payment.`;

      const ok = await showConfirm(confirmMsg, {
        title: 'Accept This Request?',
        confirmText: 'Accept Request'
      });
      if (!ok) return;

      const res = await API.put(`/deals/${dealId}/accept`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));

      showSuccess(
        `Request accepted!\n\nBuyer will now complete the payment.\nOnce paid, you can mark it as delivered.`,
        'Request Accepted'
      );
      await fetchData();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'INSUFFICIENT_BALANCE') {
        showError(`Buyer doesn't have enough balance.\n\n${errData.msg}`, 'Insufficient Balance');
      } else {
        showError(errData?.msg || err.message);
      }
    }
  };

  const completeDeal = async (dealId) => {
    const deal = deals.find(d => d._id === dealId);
    if (!deal) return;

    const isPaid = deal.status === 'paid';
    const confirmMsg = isPaid
      ? `Confirm only after the material has been handed over to the buyer.\n\nThis will close the deal permanently.`
      : `⚠️ Buyer has NOT paid yet.\n\nAre you sure the buyer has paid and you want to mark this as delivered?\n\nThis will close the deal permanently.`;

    const ok = await showConfirm(confirmMsg, {
      title: 'Mark as Delivered?',
      confirmText: 'Yes, Mark Delivered'
    });
    if (!ok) return;
    try {
      const res = await API.put(`/deals/${dealId}/complete`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      showSuccess('Deal marked as delivered! Material handover complete.', 'Completed');
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
  };

  const handleAutoAward = async (listing) => {
    const sortedBids = [...(listing.bids || [])].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    const topBid = sortedBids.find(b => b.status !== 'rejected') || sortedBids[0];
    if (!topBid) {
      showError('No bids to award.');
      return;
    }

    // Already awarded? Don't allow again
    if ((listing.bids || []).some(b => b.status === 'accepted' || b.status === 'won')) {
      showAlert('This listing is already awarded to a bidder.', { title: 'Already Awarded', type: 'info' });
      setBidsTab('completed');
      return;
    }

    const ok = await showConfirm(
      `Winner: ${topBid?.buyerName}\nAmount: ₹${topBid?.amount}/kg\nTotal: ₹${(listing.quantity * topBid?.amount).toLocaleString('en-IN')}\n\nThis will send an OFFER to the buyer (they must Accept & Pay).`,
      { title: `Award "${listing.material}"?`, confirmText: 'Send Offer to Winner' }
    );
    if (!ok) return;

    const bidId = topBid._id || topBid.id;
    try {
      // Reuse same flow as manual Accept → offer first
      await handleAcceptBid(listing._id, bidId);
    } catch (err) {
      // Fallback: auto-award API then force offered
      try {
        const res = await API.post(`/listings/${listing._id}/bids/auto-award`);
        try {
          await API.put(`/listings/${listing._id}`, { biddingEnabled: false, status: 'closed' });
        } catch (_) { /* ignore */ }
        showSuccess(res.data?.msg || 'Awarded', '🏆 Awarded');
        setBidsTab('completed');
        await loadBids();
        await fetchListingsOnly();
        const dealsRes = await API.get('/deals/user');
        setDeals(dealsRes.data || []);
      } catch (err2) {
        showError(err2.response?.data?.msg || err2.message);
      }
    }
  };

  const rejectDeal = async (dealId) => {
    const ok = await showDanger(
      'This request will be rejected and the listing will become available again.',
      { title: 'Reject Deal?', confirmText: 'Reject' }
    );
    if (!ok) return;
    try {
      const res = await API.put(`/deals/${dealId}/reject`);
      setDeals(deals.map(d => d._id === dealId ? res.data : d));
      showSuccess('Deal rejected.', 'Rejected');
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    }
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
      showSuccess(`₹${amount.toLocaleString('en-IN')} added.\nNew balance: ₹${res.data.newBalance.toLocaleString('en-IN')}`, 'Money Added');
    } catch (err) { setAddMoneyError(err.response?.data?.msg || 'Failed to add money'); }
    finally { setAddMoneyLoading(false); }
  };

  const handleWithdraw = async () => {
    setWithdrawError('');

    if (!withdrawAmount || Number(withdrawAmount) < 100) {
      setWithdrawError('Minimum withdrawal is ₹100');
      return;
    }
    const amt = Number(withdrawAmount);
    const bal = Number(user?.walletBalance || 0);
    if (amt > bal) {
      setWithdrawError(`Insufficient balance. Available: ₹${bal}`);
      return;
    }
    if (withdrawMethod === 'upi' && !withdrawUPI.trim()) {
      setWithdrawError('Enter your UPI ID');
      return;
    }
    if (withdrawMethod === 'bank') {
      if (!withdrawBank.accountHolder || !withdrawBank.accountNumber || !withdrawBank.ifscCode) {
        setWithdrawError('Fill all bank details');
        return;
      }
    }

    const confirmMsg =
      `Confirm Withdrawal\n\n` +
      `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
      `Method: ${withdrawMethod === 'upi' ? `UPI (${withdrawUPI})` : `Bank A/C (${withdrawBank.accountNumber})`}\n\n` +
      `Money will be deducted from your wallet immediately.\n` +
      `Credit will happen within 24-48 hours.`;

    const ok = await showConfirm(confirmMsg, {
      title: 'Confirm Withdrawal',
      confirmText: 'Request Withdrawal'
    });
    if (!ok) return;

    setWithdrawLoading(true);
    try {
      const res = await API.post('/wallet/withdraw', {
        amount: amt,
        method: withdrawMethod,
        upiId: withdrawMethod === 'upi' ? withdrawUPI.trim() : undefined,
        bankAccount: withdrawMethod === 'bank' ? withdrawBank : undefined
      });

      const updatedUser = { ...user, walletBalance: res.data.newBalance };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setWithdrawals([res.data.withdrawal, ...withdrawals]);

      setWithdrawAmount('');
      setWithdrawUPI('');
      setWithdrawBank({ accountHolder: '', accountNumber: '', ifscCode: '', bankName: '' });

      showSuccess(res.data.msg, 'Withdrawal Requested');
    } catch (err) {
      const errData = err.response?.data;
      setWithdrawError(errData?.msg || 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

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
      const payload = { ...profileForm };
      if (!payload.password) delete payload.password;

      const res = await API.put('/auth/profile', payload);
      const updatedUser = {
        ...user,
        ...res.data,
        walletBalance: user.walletBalance,
        role: user.role
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileForm({ ...updatedUser, password: '' });
      showSuccess('Profile updated successfully.', 'Saved');
    } catch (err) {
      showError(err.response?.data?.msg || err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const conversationPartners = Array.from(new Set(
    messages.map(m => m.senderName === user?.name ? m.receiverName : m.senderName)
      .filter(name => name && name !== user?.name)
  ));

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
    { id: 'stock', icon: 'cubes', label: 'Total Stock' },
    { id: 'findRequirements', icon: 'search', label: 'Find Requirements' },
    { id: 'bids', icon: 'gavel', label: 'Bids Received', badge: pendingBidsCount },
    { id: 'messages', icon: 'comments', label: 'Messages' },
    { id: 'deals', icon: 'handshake', label: 'Deals' },
    { id: 'withdraw', icon: 'money-bill-wave', label: 'Withdraw' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];

  const getStatusBadgeClass = (status) => {
    const map = {
      active: 'status-active',
      closed: 'status-closed',
      sold: 'status-closed',
      requested: 'status-requested',
      offered: 'status-pending',
      accepted: 'status-accepted',
      paid: 'status-paid',
      completed: 'status-completed',
      rejected: 'status-closed',
      pending: 'status-pending'
    };
    return map[status] || 'status-pending';
  };

  const getDealStatusLabel = (d) => {
    if (d.status === 'completed') return '✅ Completed';
    if (d.status === 'paid') return '💰 Paid';
    if (d.status === 'accepted') return '✅ Accepted (Unpaid)';
    if (d.status === 'offered') return '📤 Offered';
    if (d.status === 'requested') return '📩 Requested';
    if (d.status === 'rejected') return '❌ Rejected';
    return d.status;
  };

  if (loading) {
    return (
      <div className="gp-loading-container">
        <div className="gp-loading-logo-wrap">
          <div className="gp-loading-logo-ring">
            <div className="gp-loading-logo-inner">
              <i className="fas fa-recycle"></i>
            </div>
          </div>
          <h1 className="gp-loading-text">WasteExchange AI</h1>
          <p className="gp-loading-tagline">Smart Waste Marketplace</p>
          <div className="gp-loading-dots">
            <span></span><span></span><span></span>
          </div>
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
              <KpiCard label="Active Bids" value={pendingBidsCount} color="#fbbf24" icon="gavel" />
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

            <div className="gp-card" style={{ marginBottom: 24 }}>
              <div className="gp-section-title">
                <span><i className="fas fa-chart-pie me-2" style={{ color: '#a78bfa' }}></i>Material Distribution</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>
                  By AI-predicted category
                </span>
              </div>
              {listings.length === 0 ? (
                <div className="gp-no-data-block" style={{ padding: '24px 0' }}>
                  <i className="fas fa-chart-pie fa-2x" style={{ color: '#4b5563', marginBottom: 8 }}></i>
                  <p style={{ fontSize: '0.85rem' }}>No listings yet</p>
                </div>
              ) : (
                <div style={{ height: 260, position: 'relative' }}>
                  <canvas ref={materialChartRef}></canvas>
                </div>
              )}
            </div>

            <div className="gp-actions-grid">
              <button className="gp-action-card" onClick={() => setActivePage('create')}>
                <i className="fas fa-plus-circle"></i><span>Create Listing</span>
              </button>
              <button className="gp-action-card" onClick={() => setActivePage('findRequirements')}>
                <i className="fas fa-search"></i><span>Find Requirements</span>
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
                        {l.biddingEnabled ? (() => {
                          const t = timeLeft(l.biddingEndsAt);
                          const isEnded = t === 'Ended';
                          const isAssigned = l.status === 'closed' || l.status === 'sold';
                          if (isAssigned) {
                            return <span className="gp-bid-chip" style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af' }}>
                              <i className="fas fa-lock"></i> Closed
                            </span>;
                          }
                          return (
                            <span
                              className="gp-bid-chip"
                              style={isEnded ? { background: 'rgba(248,113,113,0.15)', color: '#f87171' } : {}}
                            >
                              <i className={`fas fa-${isEnded ? 'stopwatch' : 'gavel'}`}></i>
                              {isEnded ? 'Ended' : `Live${l.biddingEndsAt ? ` · ${t}` : ''}`}
                            </span>
                          );
                        })() : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>

                      <td>
                        {(() => {
                          const isBiddingLive = l.biddingEnabled && l.biddingEndsAt && new Date(l.biddingEndsAt).getTime() > Date.now();
                          const isAssigned = l.status === 'closed' || l.status === 'sold';
                          const listingDeals = deals.filter(d => String(d.listingId) === String(l._id));
                          const hasCompleted = listingDeals.some(d => d.status === 'completed');
                          const hasPaid = listingDeals.some(d => d.status === 'paid' || d.status === 'accepted');
                          const hasAccepted = listingDeals.some(d => d.status === 'accepted');
                          const hasOffered = listingDeals.some(d => d.status === 'offered' || d.status === 'requested');

                          if (hasCompleted) {
                            return <span className="badge status-completed"><i className="fas fa-check-circle me-1"></i>Completed</span>;
                          }
                          if (hasPaid) {
                            return <span className="badge status-paid"><i className="fas fa-rupee-sign me-1"></i>Paid</span>;
                          }
                          if (hasAccepted) {
                            return <span className="badge status-accepted">Accepted</span>;
                          }
                          if (hasOffered) {
                            return <span className="badge status-pending">Offered</span>;
                          }
                          if (isAssigned) {
                            return <span className="badge status-closed">Closed</span>;
                          }
                          if (isBiddingLive) {
                            return <span className="badge status-active">Active</span>;
                          }
                          if (l.biddingEnabled && !isBiddingLive) {
                            return <span className="badge status-closed" style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af' }}>
                              Bidding Ended
                            </span>;
                          }
                          return <span className="badge status-active">Active</span>;
                        })()}
                      </td>
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

      case 'findRequirements': {
        const aiCount = aiRecommendedClients.length;
        const allCount = requirements.length;

        return (
          <div>
            <div className="gp-page-header">
              <h2>Find Requirements</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="gp-btn-primary"
                  onClick={() => { fetchData(); }}
                  style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                >
                  <i className="fas fa-sync"></i> Refresh
                </button>
                <button
                  className="gp-btn-primary"
                  onClick={() => { fetchAIRecClients(); }}
                  style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                >
                  <i className="fas fa-robot"></i> Refresh AI
                </button>
              </div>
            </div>

            <div className="gp-pill-tabs">
              <button onClick={() => setClientsTab('all')} className={`gp-pill-tab ${clientsTab === 'all' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#6366f1' }} />
                All Requirements
                <span className="gp-pill-count">{allCount}</span>
              </button>
              <button onClick={() => setClientsTab('ai')} className={`gp-pill-tab ${clientsTab === 'ai' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#8b5cf6' }} />
                AI Recommended
                <span className="gp-pill-count">{aiCount}</span>
              </button>
            </div>

            {clientsTab === 'ai' ? (
              <div className="gp-section-block">
                <h3 style={{ fontSize: '1rem' }}>
                  <i className="fas fa-robot me-2" style={{ color: '#8b5cf6' }}></i>
                  AI Recommended Buyers
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
                  <i className="fas fa-info-circle me-1"></i>
                  Matches based on <strong style={{ color: '#a78bfa' }}>TF-IDF + Cosine Similarity</strong> — combining material, quantity, price and location fit.
                </p>

                {aiRecLoading ? (
                  <div className="gp-no-data-block">
                    <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#8b5cf6', marginBottom: 10 }}></i>
                    <p style={{ fontSize: '0.85rem' }}>AI is analyzing your listings vs open requirements...</p>
                  </div>
                ) : aiRecommendedClients.length === 0 ? (
                  <div className="gp-no-data-block">
                    <i className="fas fa-robot fa-2x" style={{ color: '#4b5563', marginBottom: 10 }}></i>
                    <p style={{ fontSize: '0.85rem' }}>No AI matches yet.</p>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      Make sure you have active listings and there are open buyer requirements.
                    </small>
                  </div>
                ) : (
                  <div className="gp-requests-grid">
                    {[...aiRecommendedClients]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .map((item, idx) => {
                        const bc = idx === 0 ? '#22c55e' : idx === 1 ? '#fbbf24' : idx === 2 ? '#60a5fa' : '#8b5cf6';
                        const statusInfo = getRequirementStatusForGenerator(item);
                        return (
                          <div key={`${item._id}-${idx}`} className="gp-ai-card-wrapper" style={{ borderLeft: `4px solid ${bc}` }}>
                            <div style={{
                              background: 'rgba(139,92,246,0.08)',
                              padding: '10px 14px',
                              borderRadius: 10,
                              marginBottom: 10,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 8
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{
                                  background: bc, color: 'white', padding: '3px 10px', borderRadius: 20,
                                  fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2px'
                                }}>
                                  #{idx + 1} · {item.matchScore}% Match
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                  Text Sim: <strong style={{ color: '#22c55e' }}>{item.textSimilarity}%</strong>
                                  {' · '}
                                  Rule: <strong style={{ color: '#60a5fa' }}>{item.ruleScore}%</strong>
                                </span>
                              </div>
                              {item.aiExplanation?.[0] && (
                                <span style={{ color: '#a78bfa', fontStyle: 'italic', fontSize: '0.72rem' }}>
                                  <i className="fas fa-lightbulb"></i> {item.aiExplanation[0]}
                                </span>
                              )}
                            </div>

                            {(() => {
                              const statusInfo = getRequirementStatusForGenerator(item);
                              return (
                                <RequirementCard
                                  requirement={item}
                                  viewMode="browse"
                                  onContact={handleContactBuyer}
                                  onReview={(req) => setReviewRequirement(req)}
                                  onDelete={null}
                                  onEdit={null}
                                  isFulfilled={statusInfo.key === 'fulfilled'}
                                  isInProgress={statusInfo.key === 'paid'}
                                  alreadyOffered={statusInfo.key === 'offered'}
                                />
                              );
                            })()}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="gp-filters-grid">
                  <input type="text" placeholder="Search by material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <input type="text" placeholder="Material filter" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)} />
                  <input type="text" placeholder="Location" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                  <input type="number" placeholder="Min Price" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} />
                  <input type="number" placeholder="Max Price" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} />
                  <input type="number" placeholder="Min Qty" value={filterMinQty} onChange={(e) => setFilterMinQty(e.target.value)} />
                  <input type="number" placeholder="Max Qty" value={filterMaxQty} onChange={(e) => setFilterMaxQty(e.target.value)} />
                </div>

                <div className="gp-pill-tabs" style={{ marginBottom: 18 }}>
                  <button
                    onClick={() => setReqStatusFilter('all')}
                    className={`gp-pill-tab ${reqStatusFilter === 'all' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#6366f1' }} />
                    All
                    <span className="gp-pill-count">{statusCounts.all || 0}</span>
                  </button>

                  <button
                    onClick={() => setReqStatusFilter('directRequest')}
                    className={`gp-pill-tab ${reqStatusFilter === 'directRequest' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#fbbf24' }} />
                    📩 Requests Received
                    <span className="gp-pill-count">{statusCounts.directRequest || 0}</span>
                  </button>

                  <button
                    onClick={() => setReqStatusFilter('active')}
                    className={`gp-pill-tab ${reqStatusFilter === 'active' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#22c55e' }} />
                    Active / New
                    <span className="gp-pill-count">{statusCounts.active || 0}</span>
                  </button>

                  <button
                    onClick={() => setReqStatusFilter('offered')}
                    className={`gp-pill-tab ${reqStatusFilter === 'offered' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#60a5fa' }} />
                    Offer Sent
                    <span className="gp-pill-count">{statusCounts.offered || 0}</span>
                  </button>

                  <button
                    onClick={() => setReqStatusFilter('paid')}
                    className={`gp-pill-tab ${reqStatusFilter === 'paid' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#10b981' }} />
                    💰 Paid
                    <span className="gp-pill-count">{statusCounts.paid || 0}</span>
                  </button>

                  <button
                    onClick={() => setReqStatusFilter('progress')}
                    className={`gp-pill-tab ${reqStatusFilter === 'progress' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#22d3ee' }} />
                    In Progress
                    <span className="gp-pill-count">{statusCounts.progress || 0}</span>
                  </button>
                  <button
                    onClick={() => setReqStatusFilter('fulfilled')}
                    className={`gp-pill-tab ${reqStatusFilter === 'fulfilled' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#a78bfa' }} />
                    Fulfilled
                    <span className="gp-pill-count">{statusCounts.fulfilled || 0}</span>
                  </button>
                  <button
                    onClick={() => setReqStatusFilter('rejected')}
                    className={`gp-pill-tab ${reqStatusFilter === 'rejected' ? 'active' : ''}`}
                  >
                    <span className="gp-pill-dot" style={{ background: '#9ca3af' }} />
                    Rejected
                    <span className="gp-pill-count">{statusCounts.rejected || 0}</span>
                  </button>
                </div>

                <h3 style={{ marginTop: 8, marginBottom: 14, fontSize: '1rem' }}>
                  {reqStatusFilter === 'all' && 'All Buyer Requirements'}
                  {reqStatusFilter === 'active' && 'Active Requirements (No offer sent yet)'}
                  {reqStatusFilter === 'offered' && 'Offer Sent — Waiting for buyer response'}
                  {reqStatusFilter === 'progress' && 'In Progress — Buyer accepted, deal ongoing'}
                  {reqStatusFilter === 'fulfilled' && 'Fulfilled Requirements'}
                  {reqStatusFilter === 'rejected' && 'Rejected Requirements'}
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                    ({filteredRequirements.length} {filteredRequirements.length === 1 ? 'item' : 'items'})
                  </span>
                </h3>

                <div className="gp-requests-grid">
                  {filteredRequirements.length === 0 ? (
                    <div className="gp-no-data-block">
                      <i className="fas fa-inbox fa-2x" style={{ color: '#4b5563', marginBottom: 10 }}></i>
                      <p style={{ fontSize: '0.85rem' }}>No requirements found in this category.</p>
                    </div>
                  ) : filteredRequirements.map(r => {
                    const statusInfo = getRequirementStatusForGenerator(r);

                    return (
                      <RequirementCard
                        key={r._id}
                        requirement={r}
                        viewMode="browse"
                        onContact={handleContactBuyer}
                        onReview={(req) => setReviewRequirement(req)}
                        onDelete={null}
                        onEdit={null}
                        isFulfilled={statusInfo.key === 'fulfilled'}
                        isInProgress={statusInfo.key === 'paid'}
                        alreadyOffered={statusInfo.key === 'offered'}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'stock': {
        // Helper: get deal quantity (supports both quantity & requestedQuantity)
        const getDealQty = (d) => Number(d.quantity || d.requestedQuantity || 0) || 0;
        const getListingId = (d) => String(d.listingId?._id || d.listingId || '');
        const getGenId = (d) => String(d.generatorId?._id || d.generatorId || '');

        const myDeals = deals.filter(d => getGenId(d) === currentUserId);

        // Per-listing: CAP sold + reserved so they never exceed listing quantity
        // Available = free to sell now
        // Reserved  = locked in requested/offered deals
        // Sold      = accepted/paid/completed (capped to listing qty)
        const listingStock = listings.map(l => {
          const relatedDeals = myDeals.filter(d => getListingId(d) === String(l._id));
          const soldDeals = relatedDeals.filter(d => ['completed', 'paid', 'accepted'].includes(d.status));
          const reservedDeals = relatedDeals.filter(d => ['requested', 'offered'].includes(d.status));

          const totalQty = Number(l.quantity) || 0;
          let soldQty = soldDeals.reduce((s, d) => s + getDealQty(d), 0);
          let reservedQty = reservedDeals.reduce((s, d) => s + getDealQty(d), 0);

          // Consistency: sold first, then reserved, never exceed totalQty
          soldQty = Math.min(soldQty, totalQty);
          reservedQty = Math.min(reservedQty, Math.max(0, totalQty - soldQty));
          const available = Math.max(0, totalQty - soldQty - reservedQty);

          return {
            ...l,
            soldQty,
            pendingQty: reservedQty, // kept as pendingQty for table column
            available,
            totalDeals: relatedDeals.length,
            potentialValue: totalQty * (Number(l.price) || 0)
          };
        });

        // Aggregate — always consistent: available + reserved + sold === totalQty
        const stockStats = listingStock.reduce((acc, l) => {
          const qty = Number(l.quantity) || 0;
          acc.totalQty += qty;
          acc.count++;
          acc.soldQty += l.soldQty;
          acc.pendingQty += l.pendingQty; // reserved
          acc.activeQty += l.available;   // available to sell
          acc.totalValue += qty * (Number(l.price) || 0);
          if (l.status === 'active') acc.activeCount++;
          else if (l.status === 'pending') acc.pendingCount++;
          else if (l.status === 'sold' || l.status === 'closed') acc.soldCount++;
          return acc;
        }, { totalQty: 0, activeQty: 0, pendingQty: 0, soldQty: 0, count: 0, activeCount: 0, pendingCount: 0, soldCount: 0, totalValue: 0 });

        // SVG pie helper
        const pieSlices = (() => {
          const parts = [
            { label: 'Available', value: stockStats.activeQty, color: '#22c55e' },
            { label: 'Reserved', value: stockStats.pendingQty, color: '#fbbf24' },
            { label: 'Sold', value: stockStats.soldQty, color: '#a78bfa' },
          ].filter(p => p.value > 0);
          const total = parts.reduce((s, p) => s + p.value, 0) || 1;
          let angle = -90;
          return parts.map(p => {
            const sweep = (p.value / total) * 360;
            const start = angle;
            angle += sweep;
            const r = 60;
            const c = 70;
            const toRad = (a) => (a * Math.PI) / 180;
            const x1 = c + r * Math.cos(toRad(start));
            const y1 = c + r * Math.sin(toRad(start));
            const x2 = c + r * Math.cos(toRad(start + sweep));
            const y2 = c + r * Math.sin(toRad(start + sweep));
            const large = sweep > 180 ? 1 : 0;
            const d = sweep >= 359.9
              ? `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`
              : `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            return { ...p, d, pct: ((p.value / total) * 100).toFixed(1) };
          });
        })();

        return (
          <div>
            <div className="gp-page-header">
              <h2>📦 Total Stock Overview</h2>
            </div>

            <div className="gp-kpi-grid">
              <KpiCard label="Total Stock" value={`${stockStats.totalQty.toLocaleString('en-IN')} kg`} color="#6366f1" icon="cubes" />
              <KpiCard label="Available" value={`${stockStats.activeQty.toLocaleString('en-IN')} kg`} color="#22c55e" icon="check-circle" />
              <KpiCard label="Reserved (In Deals)" value={`${stockStats.pendingQty.toLocaleString('en-IN')} kg`} color="#fbbf24" icon="lock" />
              <KpiCard label="Sold" value={`${stockStats.soldQty.toLocaleString('en-IN')} kg`} color="#a78bfa" icon="handshake" />
            </div>

            <div className="gp-stats-row" style={{ marginBottom: 24 }}>
              <div className="gp-card">
                <div className="gp-section-title"><span>Stock Summary</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: 4 }}><i className="fas fa-boxes me-1"></i> Total Listings</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>{stockStats.count}</div>
                  </div>
                  <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: 4 }}><i className="fas fa-rupee-sign me-1"></i> Total Stock Value</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>₹{stockStats.totalValue.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginBottom: 4 }}><i className="fas fa-lock me-1"></i> Reserved</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{stockStats.pendingQty.toLocaleString('en-IN')} kg</div>
                  </div>
                  <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#c4b5fd', marginBottom: 4 }}><i className="fas fa-handshake me-1"></i> Total Deals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c4b5fd' }}>{myDeals.length}</div>
                  </div>
                </div>
              </div>

              <div className="gp-card">
                <div className="gp-section-title"><span>Stock Distribution</span></div>
                {stockStats.totalQty > 0 && pieSlices.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {pieSlices.map((s, i) => (
                        <path key={i} d={s.d} fill={s.color} stroke="#0a0a0f" strokeWidth="2" />
                      ))}
                      <circle cx="70" cy="70" r="32" fill="#0a0a0f" />
                      <text x="70" y="68" textAnchor="middle" fill="#e5e7eb" fontSize="11" fontWeight="700">{stockStats.totalQty.toLocaleString('en-IN')}</text>
                      <text x="70" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">kg total</text>
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pieSlices.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                          <span style={{ color: '#9ca3af', minWidth: 70 }}>{s.label}</span>
                          <strong style={{ color: s.color }}>{s.value.toLocaleString('en-IN')} kg</strong>
                          <span style={{ color: '#6b7280' }}>({s.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="gp-no-data-block" style={{ padding: '24px 0' }}>
                    <i className="fas fa-chart-pie fa-2x" style={{ color: '#4b5563', marginBottom: 8 }}></i>
                    <p style={{ fontSize: '0.85rem' }}>No stock data yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="gp-card" style={{ marginBottom: 24 }}>
              <div className="gp-section-title">
                <span><i className="fas fa-list-ul me-2" style={{ color: '#a78bfa' }}></i>Per-Listing Stock Breakdown</span>
              </div>
              {listingStock.length === 0 ? (
                <div className="gp-no-data-block">
                  <i className="fas fa-box-open fa-2x" style={{ color: '#4b5563', marginBottom: 8 }}></i>
                  <p>No listings yet. Create a listing to start tracking stock.</p>
                  <button className="gp-btn-primary" style={{ marginTop: 8 }} onClick={() => setActivePage('create')}>
                    <i className="fas fa-plus"></i> Create Listing
                  </button>
                </div>
              ) : (
                <div className="gp-table" style={{ marginTop: 8 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material</th><th>Total Qty</th><th>Sold</th><th>Reserved</th>
                        <th>Available</th><th>Price</th><th>Total Value</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listingStock.map(l => (
                        <tr key={l._id}>
                          <td>
                            <strong>{l.material}</strong>
                            {l.materialSubtype && <><br /><small style={{ color: '#9ca3af' }}>{l.materialSubtype}</small></>}
                          </td>
                          <td><strong>{l.quantity} kg</strong></td>
                          <td>
                            {l.soldQty > 0 ? (
                              <span style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>{l.soldQty} kg</span>
                            ) : <span style={{ color: '#6b7280' }}>—</span>}
                          </td>
                          <td>
                            {l.pendingQty > 0 ? (
                              <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>{l.pendingQty} kg</span>
                            ) : <span style={{ color: '#6b7280' }}>—</span>}
                          </td>
                          <td>
                            <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>{l.available} kg</span>
                          </td>
                          <td>₹{l.price}/kg</td>
                          <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{l.potentialValue.toLocaleString('en-IN')}</td>
                          <td><span className={`badge ${getStatusBadgeClass(l.status)}`}>{l.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stock by Material — Pie (uses capped listingStock) */}
            <div className="gp-card" style={{ marginBottom: 24 }}>
              <div className="gp-section-title">
                <span><i className="fas fa-chart-pie me-2" style={{ color: '#60a5fa' }}></i>Stock by Material</span>
              </div>
              {(() => {
                const byMaterial = {};
                listingStock.forEach(l => {
                  const mat = l.material || 'Other';
                  if (!byMaterial[mat]) byMaterial[mat] = { total: 0, available: 0, reserved: 0, sold: 0 };
                  byMaterial[mat].total += Number(l.quantity) || 0;
                  byMaterial[mat].available += l.available;
                  byMaterial[mat].reserved += l.pendingQty;
                  byMaterial[mat].sold += l.soldQty;
                });
                const entries = Object.entries(byMaterial);
                if (entries.length === 0) {
                  return (
                    <div className="gp-no-data-block" style={{ padding: '24px 0' }}>
                      <i className="fas fa-chart-pie fa-2x" style={{ color: '#4b5563', marginBottom: 8 }}></i>
                      <p style={{ fontSize: '0.85rem' }}>No stock data yet</p>
                    </div>
                  );
                }
                const COLORS = ['#6366f1', '#22c55e', '#fbbf24', '#a78bfa', '#ec4899', '#06b6d4', '#f59e0b', '#84cc16'];
                const totalAll = entries.reduce((s, [, v]) => s + v.total, 0) || 1;
                let angle = -90;
                const slices = entries.map(([mat, v], idx) => {
                  const sweep = (v.total / totalAll) * 360;
                  const start = angle;
                  angle += sweep;
                  const r = 60, c = 70;
                  const toRad = (a) => (a * Math.PI) / 180;
                  const x1 = c + r * Math.cos(toRad(start));
                  const y1 = c + r * Math.sin(toRad(start));
                  const x2 = c + r * Math.cos(toRad(start + sweep));
                  const y2 = c + r * Math.sin(toRad(start + sweep));
                  const large = sweep > 180 ? 1 : 0;
                  const d = sweep >= 359.9
                    ? `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`
                    : `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  return { mat, ...v, d, color: COLORS[idx % COLORS.length], pct: ((v.total / totalAll) * 100).toFixed(1) };
                });
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {slices.map((s, i) => (
                        <path key={i} d={s.d} fill={s.color} stroke="#0a0a0f" strokeWidth="2" />
                      ))}
                      <circle cx="70" cy="70" r="32" fill="#0a0a0f" />
                      <text x="70" y="68" textAnchor="middle" fill="#e5e7eb" fontSize="11" fontWeight="700">{totalAll.toLocaleString('en-IN')}</text>
                      <text x="70" y="82" textAnchor="middle" fill="#9ca3af" fontSize="9">kg</text>
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
                      {slices.map((s, i) => (
                        <div key={i} style={{ fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                            <strong style={{ color: '#e5e7eb', minWidth: 60 }}>{s.mat}</strong>
                            <span style={{ color: '#9ca3af' }}>{s.total} kg ({s.pct}%)</span>
                          </div>
                          <div style={{ marginLeft: 18, color: '#6b7280', fontSize: '0.7rem' }}>
                            Available <span style={{ color: '#22c55e' }}>{s.available}</span>
                            {' · '}Reserved <span style={{ color: '#fbbf24' }}>{s.reserved}</span>
                            {' · '}Sold <span style={{ color: '#a78bfa' }}>{s.sold}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      }

      case 'bids': {
        // Active = live auction (time remaining, not yet awarded)
        // Completed = awarded / sold / closed / has accepted bid / has deal
        const listingHasDeal = (l) => {
          const lid = String(l._id);
          return deals.some(d => {
            const dLid = String(d.listingId?._id || d.listingId || '');
            return dLid === lid && ['offered', 'accepted', 'paid', 'completed'].includes(d.status);
          });
        };
        const isBiddingLive = (l) => {
          if (l.status === 'sold' || l.status === 'closed') return false;
          if (!l.biddingEnabled) return false;
          if ((l.bids || []).some(b => b.status === 'accepted')) return false;
          if (listingHasDeal(l)) return false;
          if (!l.biddingEndsAt) return true;
          return new Date(l.biddingEndsAt).getTime() > Date.now();
        };
        const isBiddingCompleted = (l) => {
          if (l.status === 'sold' || l.status === 'closed') return true;
          if ((l.bids || []).some(b => b.status === 'accepted')) return true;
          if (listingHasDeal(l)) return true;
          const ended = l.biddingEndsAt && new Date(l.biddingEndsAt).getTime() <= Date.now();
          if (ended && (l.bids || []).length > 0) return true;
          return false;
        };
        const activeBidListings = bidListings.filter(l => isBiddingLive(l));
        const completedBidListings = bidListings.filter(l => isBiddingCompleted(l));
        const shown = bidsTab === 'active' ? activeBidListings : completedBidListings;

        return (
          <div>
            <div className="gp-page-header">
              <h2>Bids & Requests Received</h2>
              <button className="gp-btn-primary" onClick={loadBids} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                <i className="fas fa-sync"></i> Refresh
              </button>
            </div>

            <div className="gp-pill-tabs">
              <button onClick={() => setBidsTab('active')} className={`gp-pill-tab ${bidsTab === 'active' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#fbbf24' }} />
                Active Bidding
                <span className="gp-pill-count">{activeBidListings.length}</span>
              </button>
              <button onClick={() => setBidsTab('completed')} className={`gp-pill-tab ${bidsTab === 'completed' ? 'active' : ''}`}>
                <span className="gp-pill-dot" style={{ background: '#22c55e' }} />
                Completed
                <span className="gp-pill-count">{completedBidListings.length}</span>
              </button>
            </div>

            {shown.length === 0 ? (
              <div className="gp-no-data-block">
                <i className="fas fa-gavel fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i>
                <p>{bidsTab === 'active' ? 'No active bidding listings.' : 'No completed bidding deals yet.'}</p>
                <small style={{ color: '#6b7280' }}>Enable bidding when you create a listing. When time ends, highest bidder is auto-assigned.</small>
              </div>
            ) : (
              <div className="gp-bid-listings">
                {shown.map(listing => {
                  const sortedBids = [...(listing.bids || [])].sort((a, b) => b.amount - a.amount);
                  const topBid = sortedBids[0];
                  const allRequests = listing.requests || [];
                  const pendingRequests = allRequests.filter(r => r.status === 'requested' || r.status === 'offered');
                  const acceptedRequests = allRequests.filter(r => r.status === 'accepted' || r.status === 'paid');
                  const isEnded = listing.biddingEndsAt && new Date(listing.biddingEndsAt).getTime() <= Date.now();
                  const hasAcceptedBid = (listing.bids || []).some(b => b.status === 'accepted' || b.status === 'won');
                  const hasListingDeal = deals.some(d => {
                    const lid = String(d.listingId?._id || d.listingId || '');
                    return lid === String(listing._id) && ['offered', 'accepted', 'paid', 'completed'].includes(d.status);
                  });
                  const isClosed = listing.status === 'sold' || listing.status === 'closed' || hasAcceptedBid || hasListingDeal;
                  const alreadyAwarded = hasAcceptedBid || hasListingDeal;

                  return (
                    <div key={listing._id} className="gp-bid-listing-card">
                      <div className="gp-bid-listing-header">
                        <div>
                          <h3>
                            {listing.material}
                            {listing.materialSubtype && <span style={{ color: '#a78bfa', fontWeight: 500 }}> · {listing.materialSubtype}</span>}
                            <small style={{ color: '#9ca3af', fontWeight: 400 }}> ({listing.quantity} kg)</small>
                          </h3>
                          <p className="gp-bid-listing-meta">
                            📍 {listing.location} &middot; Base ₹{listing.price}/kg
                            {listing.minBidPrice ? <> &middot; Min bid ₹{listing.minBidPrice}/kg</> : null}
                          </p>
                        </div>
                        <div className="gp-bid-listing-status">
                          {isClosed ? (
                            <span className="gp-bid-chip" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <i className="fas fa-lock"></i> Assigned & Closed
                            </span>
                          ) : isEnded ? (
                            <span className="gp-bid-chip" style={{ background: 'rgba(107,114,128,0.2)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.35)' }}>
                              <i className="fas fa-stopwatch"></i> Bidding Closed — Stock Available
                            </span>
                          ) : (
                            <span className="gp-bid-chip">
                              <i className="fas fa-clock"></i> Live {listing.biddingEndsAt ? `· ${timeLeft(listing.biddingEndsAt)}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {sortedBids.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-gavel me-2"></i>Bids Received ({sortedBids.length})
                          </div>
                          <div className="gp-bid-table">
                            <table className="table">
                              <thead>
                                <tr><th>Buyer</th><th>Bid Amount</th><th>Placed On</th><th>Status</th><th>Action</th></tr>
                              </thead>
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
                                      {bid.status !== 'accepted' && bid.status !== 'rejected' && !isClosed && (
                                        <>
                                          <button className="btn-sm btn-outline-success me-1" onClick={() => handleAcceptBid(listing._id, bid._id || bid.id)}>
                                            <i className="fas fa-check"></i> Accept
                                          </button>
                                          <button className="btn-sm btn-outline-danger" onClick={() => handleRejectBid(listing._id, bid._id || bid.id)}>
                                            <i className="fas fa-times"></i>
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {pendingRequests.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-paper-plane me-2"></i>Direct Buyer Requests ({pendingRequests.length})
                          </div>
                          <div className="gp-bid-table">
                            <table className="table">
                              <thead>
                                <tr><th>Buyer</th><th>Qty</th><th>Price/kg</th><th>Total</th><th>Status</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {pendingRequests.map(req => (
                                  <tr key={req._id}>
                                    <td><strong>{req.buyerName}</strong></td>
                                    <td>{req.quantity} kg</td>
                                    <td>₹{req.amount}/kg</td>
                                    <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{req.totalAmount?.toLocaleString('en-IN')}</td>
                                    <td><span className={`badge ${getStatusBadgeClass(req.status)}`}>{req.status}</span></td>
                                    <td>
                                      {req.status === 'requested' && !isClosed && (
                                        <>
                                          <button className="btn-sm btn-outline-success me-1" onClick={() => acceptDeal(req._id)}>
                                            <i className="fas fa-check"></i> Accept
                                          </button>
                                          <button className="btn-sm btn-outline-danger" onClick={() => rejectDeal(req._id)}>
                                            <i className="fas fa-times"></i>
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {acceptedRequests.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-check-circle me-2"></i>Accepted / Paid Deals ({acceptedRequests.length})
                          </div>
                          <div className="gp-bid-table">
                            <table className="table">
                              <thead>
                                <tr><th>Buyer</th><th>Qty</th><th>Price/kg</th><th>Total</th><th>Status</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {acceptedRequests.map(req => (
                                  <tr key={req._id}>
                                    <td><strong>{req.buyerName}</strong></td>
                                    <td>{req.quantity} kg</td>
                                    <td>₹{req.amount}/kg</td>
                                    <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{req.totalAmount?.toLocaleString('en-IN')}</td>
                                    <td>
                                      <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                                        {req.status === 'paid' ? '💰 Paid' : 'Accepted (Unpaid)'}
                                      </span>
                                    </td>
                                    <td>
                                      <button className="btn-sm btn-outline-success" onClick={() => completeDeal(req._id)} title="Mark as delivered after handover">
                                        <i className="fas fa-truck"></i> Mark Delivered
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {isEnded && !alreadyAwarded && sortedBids.length > 0 && (
                        <div style={{
                          marginTop: 16, padding: '14px 16px',
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(139,92,246,0.08))',
                          border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
                        }}>
                          <div>
                            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>
                              <i className="fas fa-flag-checkered me-2"></i>Bidding Ended
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
                              Highest bidder: <strong style={{ color: '#22c55e' }}>{topBid?.buyerName}</strong> at <strong style={{ color: '#fbbf24' }}>₹{topBid?.amount}/kg</strong>
                            </div>
                          </div>
                          <button className="gp-btn-primary" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 14px rgba(251,191,36,0.3)' }} onClick={() => handleAutoAward(listing)}>
                            <i className="fas fa-crown"></i> Award to Highest Bidder
                          </button>
                        </div>
                      )}
                      {alreadyAwarded && (
                        <div style={{
                          marginTop: 16, padding: '12px 16px',
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                          borderRadius: 10, fontSize: '0.82rem', color: '#6ee7b7'
                        }}>
                          <i className="fas fa-check-circle me-2"></i>
                          Already awarded — offer/deal is with the buyer. Check Deals tab for status.
                        </div>
                      )}

                      {sortedBids.length === 0 && pendingRequests.length === 0 && acceptedRequests.length === 0 && (
                        <p className="gp-no-data" style={{ padding: '16px 0', textAlign: 'center' }}>
                          {isEnded ? (
                            <><i className="fas fa-box-open me-2"></i>Bidding closed. Stock restored — buyers can request this listing directly.</>
                          ) : (
                            <><i className="fas fa-hourglass-half me-2"></i>Waiting for bids and requests...</>
                          )}
                        </p>
                      )}
                      {isEnded && !alreadyAwarded && sortedBids.length === 0 && (
                        <div style={{
                          marginTop: 12, padding: '12px 14px',
                          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                          borderRadius: 10, fontSize: '0.8rem', color: '#86efac'
                        }}>
                          <i className="fas fa-check-circle me-2"></i>
                          Listing is available again for direct buyer requests / generator offers.
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
        const cid = String(user?._id || user?.id || '');
        const myDeals = deals.filter(d => String(d.generatorId?._id || d.generatorId) === cid);

        const pendingOffersSent = myDeals.filter(d => d.status === 'offered');
        const paidDeals = myDeals.filter(d => d.status === 'paid');
        const completedDealsList = myDeals.filter(d => d.status === 'completed');

        const renderDealTable = (dealList, emptyMsg, showAction = false) => (
          dealList.length === 0 ? (
            <div className="gp-no-data-block" style={{ padding: '24px 0' }}>
              <i className="fas fa-inbox fa-2x" style={{ color: '#4b5563', marginBottom: 8 }}></i>
              <p style={{ fontSize: '0.85rem' }}>{emptyMsg}</p>
            </div>
          ) : (
            <div className="gp-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Price/kg</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dealList
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(d => (
                      <tr key={d._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: 'white', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700
                            }}>
                              {(d.buyerName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <strong style={{ fontSize: '0.88rem' }}>{d.buyerName || 'Unknown'}</strong>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>{d.material}</td>
                        <td style={{ fontSize: '0.88rem' }}>{d.quantity} kg</td>
                        <td style={{ fontSize: '0.88rem' }}>₹{d.pricePerUnit}/kg</td>
                        <td style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.88rem' }}>
                          ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(d.status)}`} style={{ fontSize: '0.72rem' }}>
                            {getDealStatusLabel(d)}
                          </span>
                        </td>
                        <td>
                          <small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{formatDate(d.createdAt)}</small>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        );

        return (
          <div>
            <div className="gp-page-header">
              <h2>My Deals</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge status-pending">📤 {pendingOffersSent.length} Offered</span>
                <span className="badge status-paid">💰 {paidDeals.length} Paid</span>
                <span className="badge status-completed">✔️ {completedDealsList.length} Completed</span>
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'rgba(96,165,250,0.08)',
              border: '1px solid rgba(96,165,250,0.25)',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: '0.82rem',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <i className="fas fa-info-circle"></i>
              <span>
                Buyer "Mark Received" karne ke baad deal automatic <strong>Completed</strong> ho jayegi.
                <span style={{ color: '#6b7280', marginLeft: 8 }}>Handover material to buyer before they confirm.</span>
              </span>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '1rem', color: '#fbbf24', marginBottom: 12 }}>
                <i className="fas fa-paper-plane me-2"></i>My Pending Offers ({pendingOffersSent.length})
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                  Waiting for buyer to accept
                </span>
              </h3>
              {renderDealTable(pendingOffersSent, 'No pending offers sent. Go to "Find Requirements" to send offers.')}
            </div>

            {paidDeals.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: '1rem', color: '#22c55e', marginBottom: 12 }}>
                  <i className="fas fa-rupee-sign me-2"></i>Paid — Handover Material ({paidDeals.length})
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                    Buyer paid. Deliver material now — buyer will mark received.
                  </span>
                </h3>
                {renderDealTable(paidDeals, 'No paid deals awaiting delivery')}
              </div>
            )}

            {completedDealsList.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: 12 }}>
                  <i className="fas fa-check-circle me-2"></i>Completed Deals ({completedDealsList.length})
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                    Buyer confirmed receipt — deal closed
                  </span>
                </h3>
                {renderDealTable(completedDealsList, 'No completed deals yet')}
              </div>
            )}

            {myDeals.filter(d => d.status !== 'rejected').length === 0 && (
              <div className="gp-no-data-block" style={{ padding: '48px 0' }}>
                <i className="fas fa-handshake fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i>
                <p>No deals yet</p>
                <button
                  className="gp-btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => setActivePage('findRequirements')}
                >
                  <i className="fas fa-search"></i> Find Requirements
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'withdraw':
        return (
          <div style={{ maxWidth: 720 }}>
            <div className="gp-page-header">
              <h2>💸 Withdraw Money</h2>
            </div>

            <div className="gp-form-card" style={{
              maxWidth: 'none', marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.06))',
              border: '1px solid rgba(34,197,94,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fas fa-wallet me-2"></i>Available Balance
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
                    ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Min: ₹100 · Max: Balance</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>Credit in 24-48 hrs</div>
                </div>
              </div>
            </div>

            <div className="gp-form-card" style={{ maxWidth: 'none', marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, color: '#a78bfa', fontSize: '1rem' }}>
                <i className="fas fa-plus-circle me-2"></i>New Withdrawal Request
              </h3>

              <div className="gp-form-group">
                <label>Amount (₹) *</label>
                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter amount (min ₹100)" min="100" />
              </div>

              <div className="gp-form-group">
                <label>Withdrawal Method *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setWithdrawMethod('upi')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      border: withdrawMethod === 'upi' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                      background: withdrawMethod === 'upi' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                      color: withdrawMethod === 'upi' ? '#22c55e' : '#9ca3af',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}>
                    <i className="fas fa-mobile-alt me-2"></i>UPI
                  </button>
                  <button type="button" onClick={() => setWithdrawMethod('bank')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      border: withdrawMethod === 'bank' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                      background: withdrawMethod === 'bank' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                      color: withdrawMethod === 'bank' ? '#22c55e' : '#9ca3af',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                    }}>
                    <i className="fas fa-university me-2"></i>Bank Account
                  </button>
                </div>
              </div>

              {withdrawMethod === 'upi' ? (
                <div className="gp-form-group">
                  <label>UPI ID *</label>
                  <input type="text" value={withdrawUPI} onChange={(e) => setWithdrawUPI(e.target.value)} placeholder="yourname@upi (e.g. 9876543210@ybl)" />
                </div>
              ) : (
                <div className="gp-form-grid">
                  <div className="gp-form-group">
                    <label>Account Holder Name *</label>
                    <input type="text" value={withdrawBank.accountHolder} onChange={(e) => setWithdrawBank({ ...withdrawBank, accountHolder: e.target.value })} placeholder="Full name as on bank" />
                  </div>
                  <div className="gp-form-group">
                    <label>Account Number *</label>
                    <input type="text" value={withdrawBank.accountNumber} onChange={(e) => setWithdrawBank({ ...withdrawBank, accountNumber: e.target.value })} placeholder="1234567890123" />
                  </div>
                  <div className="gp-form-group">
                    <label>IFSC Code *</label>
                    <input type="text" value={withdrawBank.ifscCode} onChange={(e) => setWithdrawBank({ ...withdrawBank, ifscCode: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} />
                  </div>
                  <div className="gp-form-group">
                    <label>Bank Name</label>
                    <input type="text" value={withdrawBank.bankName} onChange={(e) => setWithdrawBank({ ...withdrawBank, bankName: e.target.value })} placeholder="HDFC Bank" />
                  </div>
                </div>
              )}

              {withdrawError && <small className="gp-error-text" style={{ display: 'block', marginBottom: 12 }}>{withdrawError}</small>}

              <button className="gp-btn-primary" style={{ width: '100%' }} onClick={handleWithdraw} disabled={withdrawLoading}>
                {withdrawLoading ? (
                  <><i className="fas fa-spinner fa-spin me-2"></i>Processing...</>
                ) : (
                  <><i className="fas fa-money-bill-wave me-2"></i>Request Withdrawal</>
                )}
              </button>

              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 12, textAlign: 'center' }}>
                <i className="fas fa-lock me-1" style={{ color: '#22c55e' }}></i>
                Secured by Razorpay Payouts · Powered by WasteExchange AI
              </div>
            </div>

            <div className="gp-form-card" style={{ maxWidth: 'none' }}>
              <h3 style={{ marginTop: 0, color: '#60a5fa', fontSize: '1rem' }}>
                <i className="fas fa-history me-2"></i>Withdrawal History ({withdrawals.length})
              </h3>

              {withdrawals.length === 0 ? (
                <div className="gp-no-data-block" style={{ padding: '32px 20px' }}>
                  <i className="fas fa-receipt fa-2x" style={{ color: '#4b5563', marginBottom: 10 }}></i>
                  <p style={{ fontSize: '0.85rem' }}>No withdrawals yet</p>
                </div>
              ) : (
                <div className="gp-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Amount</th><th>Method</th><th>Details</th><th>Status</th><th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map(w => (
                        <tr key={w._id}>
                          <td><strong style={{ color: '#f87171' }}>-₹{w.amount.toLocaleString('en-IN')}</strong></td>
                          <td>
                            <span style={{
                              background: w.method === 'upi' ? 'rgba(139,92,246,0.15)' : 'rgba(96,165,250,0.15)',
                              color: w.method === 'upi' ? '#a78bfa' : '#60a5fa',
                              padding: '3px 10px', borderRadius: 8,
                              fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase'
                            }}>
                              {w.method}
                            </span>
                          </td>
                          <td>
                            <small style={{ color: '#9ca3af' }}>
                              {w.method === 'upi' ? w.upiId : `****${w.bankAccount?.accountNumber?.slice(-4) || ''}`}
                            </small>
                          </td>
                          <td>
                            <span className={`badge ${w.status === 'completed' ? 'status-active' :
                              w.status === 'pending' ? 'status-pending' :
                                w.status === 'processing' ? 'status-pending' : 'status-closed'
                              }`}>
                              {w.status}
                            </span>
                          </td>
                          <td><small style={{ color: '#9ca3af' }}>{formatDate(w.createdAt)}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

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
            <div className="gp-page-header">
              <h2>👤 My Profile</h2>
              <span style={{
                background: profileForm.isCompanyVerified ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                color: profileForm.isCompanyVerified ? '#22c55e' : '#fbbf24',
                padding: '6px 14px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                border: `1px solid ${profileForm.isCompanyVerified ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <i className={`fas fa-${profileForm.isCompanyVerified ? 'check-circle' : 'clock'}`}></i>
                {profileForm.isCompanyVerified ? 'Company Verified' : 'Verification Pending'}
              </span>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="gp-form-card" style={{ maxWidth: 'none', marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, color: '#a78bfa', fontSize: '1rem', marginBottom: 18 }}>
                  <i className="fas fa-user me-2"></i>Account Information
                </h3>
                <div className="gp-form-grid">
                  <div className="gp-form-group">
                    <label>Name *</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                    {profileErrors.name && <small className="gp-error-text">{profileErrors.name}</small>}
                  </div>
                  <div className="gp-form-group">
                    <label>Email *</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                    {profileErrors.email && <small className="gp-error-text">{profileErrors.email}</small>}
                  </div>
                  <div className="gp-form-group">
                    <label>Phone</label>
                    <input type="tel" value={profileForm.phone || ''} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="10-digit mobile" />
                  </div>
                  <div className="gp-form-group">
                    <label>New Password</label>
                    <input type="password" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} placeholder="Leave blank to keep current" />
                    {profileErrors.password && <small className="gp-error-text">{profileErrors.password}</small>}
                  </div>
                </div>
              </div>

              <div className="gp-form-card" style={{ maxWidth: 'none', marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, color: '#60a5fa', fontSize: '1rem', marginBottom: 18 }}>
                  <i className="fas fa-building me-2"></i>Company Information
                </h3>
                <div className="gp-form-grid">
                  {companyFields.map(field => (
                    <div key={field.key} className="gp-form-group" style={{ gridColumn: field.type === 'textarea' ? '1/-1' : 'auto' }}>
                      <label>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea rows={2} value={profileForm[field.key] || ''} onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })} />
                      ) : (
                        <input type={field.type} value={profileForm[field.key] || ''} onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })} />
                      )}
                    </div>
                  ))}
                  <div className="gp-form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Company Type</label>
                    <select value={profileForm.companyType || 'private'} onChange={(e) => setProfileForm({ ...profileForm, companyType: e.target.value })}>
                      <option value="private">Private Limited</option>
                      <option value="public">Public Limited</option>
                      <option value="partnership">Partnership</option>
                      <option value="sole">Sole Proprietorship</option>
                      <option value="llp">LLP</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="gp-form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Business Description</label>
                    <textarea rows={3} value={profileForm.businessDescription || ''} onChange={(e) => setProfileForm({ ...profileForm, businessDescription: e.target.value })} placeholder="Brief about your business..." />
                  </div>
                </div>
              </div>

              <button type="submit" className="gp-btn-primary" disabled={profileLoading} style={{ width: '100%' }}>
                {profileLoading ? (
                  <><i className="fas fa-spinner fa-spin me-2"></i>Saving...</>
                ) : (
                  <><i className="fas fa-save me-2"></i>Save All Changes</>
                )}
              </button>
            </form>
          </div>
        );
      }

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
                  <div key={l._id} onClick={() => {
                    setSelectedListingForOffer(l);
                    const maxQty = Math.min(Number(req.maxQty) || l.quantity, l.quantity);
                    setOfferQuantity(String(maxQty));
                    setOfferPrice(String(l.price || req.maxPrice));
                  }}
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
              <div style={{ marginTop: 16, padding: '16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.72rem', color: '#86efac', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                  <i className="fas fa-handshake me-1"></i> Finalize Offer
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                      Quantity (kg) *
                    </label>
                    <input
                      type="number"
                      value={offerQuantity}
                      onChange={(e) => setOfferQuantity(e.target.value)}
                      min={req.minQty || 1}
                      max={Math.min(Number(req.maxQty) || selectedListingForOffer.quantity, selectedListingForOffer.quantity)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white', fontSize: '0.9rem'
                      }}
                    />
                    <small style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      Range: {req.minQty}-{Math.min(req.maxQty, selectedListingForOffer.quantity)} kg
                    </small>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                      Price (₹/kg) *
                    </label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      min={1}
                      max={req.maxPrice}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white', fontSize: '0.9rem'
                      }}
                    />
                    <small style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      Buyer max: ₹{req.maxPrice}/kg · Your listing: ₹{selectedListingForOffer.price}/kg
                    </small>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: '#9ca3af' }}>Total Amount</span>
                  <strong style={{ color: '#22c55e', fontSize: '1.1rem' }}>
                    ₹{((Number(offerQuantity) || 0) * (Number(offerPrice) || 0)).toLocaleString('en-IN')}
                  </strong>
                </div>

                {(Number(offerQuantity) > selectedListingForOffer.quantity) && (
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#f87171' }}>
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    Quantity exceeds your listing stock ({selectedListingForOffer.quantity} kg)
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => { setOfferRequirement(null); setSelectedListingForOffer(null); }}
              style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Cancel</button>
            <button onClick={confirmSendOffer} disabled={!selectedListingForOffer || isSendingOffer}
              style={{
                padding: '10px 24px', borderRadius: 9, border: 'none',
                background: selectedListingForOffer ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.08)',
                color: selectedListingForOffer ? 'white' : '#6b7280',
                cursor: selectedListingForOffer ? 'pointer' : 'not-allowed',
                fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
              {isSendingOffer ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Send Offer
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
              <p>Generator · ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</p>
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
            <ThemeToggle />
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
        .badge { padding: 3px 11px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: capitalize; display: inline-block; }
        .status-active { background: rgba(34,197,94,0.15); color: #34d399; }
        .status-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .status-closed { background: rgba(107,114,128,0.15); color: #9ca3af; }
        .status-requested { background: rgba(96,165,250,0.15); color: #60a5fa; }
        .status-accepted { background: rgba(6,182,212,0.15); color: #22d3ee; }
        .status-paid { background: rgba(34,197,94,0.2); color: #4ade80; }
        .status-completed { background: rgba(167,139,250,0.15); color: #c4b5fd; }
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
        .gp-ai-card-wrapper { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 12px; margin-bottom: 16px; transition: 0.2s; }
        .gp-ai-card-wrapper:hover { background: rgba(255,255,255,0.04); border-color: rgba(139,92,246,0.3); }
        .gp-requests-grid { display: grid; gap: 14px; }
        .gp-pill-tabs { display: inline-flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; margin-bottom: 22px; border: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; }
        .gp-pill-tab { display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 9px; border: none; background: transparent; color: #9ca3af; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
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
        .gp-form-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); max-width: 760px; }
        .gp-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .gp-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: #d1d5db; }
        .gp-form-group input,
.gp-form-group select,
.gp-form-group textarea {
  width: 100%; padding: 9px 12px; border-radius: 9px;
  border: 1px solid var(--gp-input-border);
  background: var(--gp-input-bg);
  color: var(--gp-text-primary);
  font-size: 0.9rem;
  transition: background 0.3s, border-color 0.3s, color 0.3s;
  color-scheme: dark;
}
[data-theme="light"] .gp-form-group input,
[data-theme="light"] .gp-form-group select,
[data-theme="light"] .gp-form-group textarea {
  color-scheme: light;
}
.gp-form-group select option {
  background: #1a1a2e;
  color: #ffffff;
  padding: 8px;
}
[data-theme="light"] .gp-form-group select option {
  background: #ffffff;
  color: #0f172a;
}
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
      `}
      </style>
    </div>
  );
};

export default GeneratorDashboard;