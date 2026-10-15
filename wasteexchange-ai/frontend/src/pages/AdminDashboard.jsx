// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import Chart from 'chart.js/auto';
import ThemeToggle from '../components/ThemeToggle';
import AdminChatbot from '../components/AdminChatbot';

const getPhotoUrl = (photo) => {
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  if (photo.startsWith('data:')) return photo;
  const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${backendUrl}${photo}`;
};

const KpiCard = ({ label, value, color, icon }) => (
  <div className="ad-kpi-card" style={{ borderTop: `4px solid ${color}` }}>
    <div className="ad-kpi-icon" style={{ background: color + '22', color }}>
      <i className={`fas fa-${icon}`}></i>
    </div>
    <div>
      <h3 style={{ color }}>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

const formatDate = (d) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return 'N/A'; }
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('dark'); // ✅ NEW

  const [stats, setStats] = useState({});
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allDeals, setAllDeals] = useState([]);

  const [adminProfile, setAdminProfile] = useState({});
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({});
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef(null);

  const [selectedVerification, setSelectedVerification] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  const [verificationSearch, setVerificationSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dealSearch, setDealSearch] = useState('');
  const [verificationPage, setVerificationPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [dealPage, setDealPage] = useState(1);
  const itemsPerPage = 8;

  const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));
  const [monthlyCommission, setMonthlyCommission] = useState(Array(12).fill(0));
  const [monthlyGenerators, setMonthlyGenerators] = useState(Array(12).fill(0));
  const [monthlyBuyers, setMonthlyBuyers] = useState(Array(12).fill(0));

  const revenueChartRef = useRef(null);
  const userChartRef = useRef(null);
  const revenueChartInstance = useRef(null);
  const userChartInstance = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactStatusFilter, setContactStatusFilter] = useState('all');

  const newContactsCount = contacts.filter(c => c.status === 'new').length;

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState({ page: 1, pages: 1, total: 0 });

  // ✅ Track theme changes (data-theme attribute)
  useEffect(() => {
    const readTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(t);
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const getMonthIndex = (dateStr) => {
    if (!dateStr) return -1;
    try { return new Date(dateStr).getMonth(); } catch { return -1; }
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showMsg('Please choose an image file.', 'error'); return; }
    if (file.size > MAX_IMAGE_SIZE) { showMsg('Image must be under 5MB.', 'error'); return; }

    setProfilePhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('profilePhoto', file);
      const res = await API.put('/auth/profile-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPhotoUrl = res.data?.profilePhoto;
      if (newPhotoUrl) {
        setProfilePhoto(newPhotoUrl);
        setAdminProfile(prev => ({ ...prev, profilePhoto: newPhotoUrl }));

        const updatedUser = { ...user, profilePhoto: newPhotoUrl };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);

        showMsg('Profile photo updated!', 'success');
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      showMsg(err.response?.data?.msg || 'Failed to upload photo', 'error');
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const computeMonthlyStats = useCallback(() => {
    const revenue = Array(12).fill(0);
    const commission = Array(12).fill(0);
    const generators = Array(12).fill(0);
    const buyers = Array(12).fill(0);

    allDeals.forEach(d => {
      const month = getMonthIndex(d.createdAt);
      if (month < 0) return;
      if (d.status === 'completed') {   // ✅ सिर्फ completed
        revenue[month] += Number(d.totalAmount || 0);
        commission[month] += Number(d.platformRevenue || 0);
      }
    });

    allUsers.forEach(u => {
      const month = getMonthIndex(u.createdAt);
      if (month < 0) return;
      if (u.role === 'generator') generators[month]++;
      if (u.role === 'buyer') buyers[month]++;
    });

    setMonthlyRevenue(revenue);
    setMonthlyCommission(commission);
    setMonthlyGenerators(generators);
    setMonthlyBuyers(buyers);
  }, [allDeals, allUsers]);

  const computedTotalRevenue = allDeals
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);

  const computedTotalCommission = allDeals
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + Number(d.platformRevenue || 0), 0);

  const computedTotalDeals = allDeals.length;
  const computedCompletedDeals = allDeals.filter(d => d.status === 'completed').length;
  const computedPaidDeals = allDeals.filter(d => d.status === 'paid').length;
  const computedTotalUsers = allUsers.filter(u =>
    u.role === 'buyer' || u.role === 'generator'
  ).length;

  const finalStats = {
    totalRevenue: stats.totalRevenue || computedTotalRevenue,
    totalCommission: stats.totalCommission || computedTotalCommission,
    totalDeals: computedCompletedDeals,                          // ✅ 45 (completed only)
    completedDeals: computedCompletedDeals,
    totalUsers: computedTotalUsers,
    pendingVerifications: pendingVerifications.length,
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const withTimeout = (promise, ms = 8000) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
        ]);

      const results = await Promise.allSettled([
        withTimeout(API.get('/admin/stats')),
        withTimeout(API.get('/auth/unverified-companies')),
        withTimeout(API.get('/admin/users')),
        withTimeout(API.get('/deals/all')),
        withTimeout(API.get('/auth/profile')),
        withTimeout(API.get('/contact')),
      ]);

      if (results[0].status === 'fulfilled') {
        setStats((prev) => ({ ...prev, ...results[0].value.data }));
      } else {
        setStats({});
      }

      if (results[1].status === 'fulfilled') {
        setPendingVerifications(results[1].value.data || []);
      } else {
        setPendingVerifications([]);
      }

      if (results[2].status === 'fulfilled') {
        setAllUsers(results[2].value.data || []);
      } else {
        setAllUsers([]);
      }

      if (results[3].status === 'fulfilled') {
        setAllDeals(results[3].value.data || []);
      } else {
        setAllDeals([]);
      }

      if (results[4].status === 'fulfilled') {
        const profileData = results[4].value.data || {};
        setAdminProfile(profileData);
        setAdminForm(profileData);
        if (profileData.profilePhoto) setProfilePhoto(profileData.profilePhoto);
      }

      if (results[5].status === 'fulfilled') {
        setContacts(results[5].value.data || []);
      } else {
        setContacts([]);
      }

    } catch (error) {
      console.error('❌ Unexpected error loading data:', error);
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { computeMonthlyStats(); }, [computeMonthlyStats]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }

    setUser(currentUser);
    if (currentUser.profilePhoto) setProfilePhoto(currentUser.profilePhoto);
    loadData();
  }, [navigate, loadData]);

  // ✅ Adaptive chart colors based on theme
  const initCharts = useCallback(() => {
    if (!revenueChartRef.current || !userChartRef.current) return;
    if (revenueChartInstance.current) revenueChartInstance.current.destroy();
    if (userChartInstance.current) userChartInstance.current.destroy();

    const isLight = theme === 'light';
    const textColor = isLight ? '#374151' : '#9ca3af';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const legendColor = isLight ? '#374151' : '#9ca3af';

    const hasRevenueData = monthlyRevenue.some(v => v > 0) || monthlyCommission.some(v => v > 0);

    revenueChartInstance.current = new Chart(revenueChartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: hasRevenueData
          ? [
            {
              label: 'Deal Revenue (₹)',
              data: monthlyRevenue,
              backgroundColor: 'rgba(99,102,241,0.75)',
              borderColor: '#6366f1',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: 'Platform Commission (₹)',
              data: monthlyCommission,
              backgroundColor: 'rgba(34,197,94,0.75)',
              borderColor: '#22c55e',
              borderWidth: 2,
              borderRadius: 6,
            },
          ]
          : [{
            label: 'Platform Revenue (₹)',
            data: Array(12).fill(0),
            backgroundColor: 'rgba(99,102,241,0.75)',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 6,
          }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: legendColor } },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ₹${Number(c.raw).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, callback: (v) => '₹' + v.toLocaleString('en-IN') },
          },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });

    userChartInstance.current = new Chart(userChartRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          { label: 'Generators', data: monthlyGenerators, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#60a5fa' },
          { label: 'Buyers', data: monthlyBuyers, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#a78bfa' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: legendColor } } },
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { display: false }, ticks: { color: textColor } },
        },
      },
    });
  }, [monthlyRevenue, monthlyCommission, monthlyGenerators, monthlyBuyers, theme]);

  useEffect(() => {
    if ((activeModule === 'dashboard' || activeModule === 'analytics') && !loading) {
      const timer = setTimeout(() => initCharts(), 150);
      return () => clearTimeout(timer);
    }
  }, [activeModule, loading, initCharts, theme]);

  useEffect(() => {
    return () => {
      if (revenueChartInstance.current) revenueChartInstance.current.destroy();
      if (userChartInstance.current) userChartInstance.current.destroy();
    };
  }, []);

  useEffect(() => { setVerificationPage(1); }, [verificationSearch]);
  useEffect(() => { setUserPage(1); }, [userSearch]);
  useEffect(() => { setDealPage(1); }, [dealSearch]);
  useEffect(() => { setContactPage(1); }, [contactSearch, contactStatusFilter]);

  const filterBy = (data, term, keys) => {
    if (!term) return data;
    const s = term.toLowerCase();
    return data.filter(item => keys.some(k => item[k]?.toString().toLowerCase().includes(s)));
  };

  const filteredVerifications = filterBy(pendingVerifications, verificationSearch, ['companyName', 'email', 'role']);
  const totalVerificationPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const paginatedVerifications = filteredVerifications.slice((verificationPage - 1) * itemsPerPage, verificationPage * itemsPerPage);

  const filteredUsers = filterBy(allUsers, userSearch, ['name', 'email', 'companyName']);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

  const filteredDeals = filterBy(allDeals, dealSearch, ['material', 'buyerName', 'generatorName']);
  const totalDealPages = Math.ceil(filteredDeals.length / itemsPerPage);
  const paginatedDeals = filteredDeals.slice((dealPage - 1) * itemsPerPage, dealPage * itemsPerPage);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !contactSearch ||
      c.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.message?.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesStatus = contactStatusFilter === 'all' || c.status === contactStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalContactPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice((contactPage - 1) * itemsPerPage, contactPage * itemsPerPage);

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="ad-pagination">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    );
  };

  const handleApprove = async (userId) => {
    try { await API.put(`/auth/verify-company/${userId}`); showMsg('Company verified successfully!'); await loadData(); }
    catch (err) { showMsg(err.response?.data?.msg || 'Failed to verify', 'error'); }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try { await API.post(`/auth/reject-company/${userId}`, { reason }); showMsg('Company rejected', 'error'); await loadData(); }
    catch (err) { showMsg(err.response?.data?.msg || 'Failed to reject', 'error'); }
  };

  const handleSaveAdminProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/profile', { name: adminForm.name, email: adminForm.email, phone: adminForm.phone });
      if (passwordData.current_password && passwordData.new_password) {
        await API.put('/auth/change-password', { currentPassword: passwordData.current_password, newPassword: passwordData.new_password });
        setPasswordData({ current_password: '', new_password: '' });
      }
      const profileRes = await API.get('/auth/profile');
      setAdminProfile(profileRes.data);
      setAdminForm(profileRes.data);
      setEditingAdmin(false);
      showMsg('Profile updated successfully!');
    } catch (error) {
      showMsg(error.response?.data?.msg || 'Failed to update profile', 'error');
    }
  };

  const handleContactStatusChange = async (id, status) => {
    try {
      await API.put(`/contact/${id}/status`, { status });
      setContacts(contacts.map(c => c._id === id ? { ...c, status } : c));
      showMsg(`Marked as ${status}`);
      if (selectedContact?._id === id) setSelectedContact({ ...selectedContact, status });
    } catch (err) {
      showMsg(err.response?.data?.msg || 'Failed to update', 'error');
    }
  };

  const handleDeleteContact = async (id) => {
    const ok = window.confirm('Delete this message permanently?');
    if (!ok) return;
    try {
      await API.delete(`/contact/${id}`);
      setContacts(contacts.filter(c => c._id !== id));
      setSelectedContact(null);
      showMsg('Message deleted');
    } catch (err) {
      showMsg(err.response?.data?.msg || 'Failed to delete', 'error');
    }
  };

  const openContact = (contact) => {
    setSelectedContact(contact);
    if (contact.status === 'new') {
      handleContactStatusChange(contact._id, 'read');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const getStatusBadgeClass = (s) => ({
    pending: 'ad-status-pending',
    accepted: 'ad-status-active',
    completed: 'ad-status-closed',
    rejected: 'ad-status-rejected',
    active: 'ad-status-active',
    blocked: 'ad-status-rejected',
    approved: 'ad-status-closed',
    requested: 'ad-status-pending',
    offered: 'ad-status-pending',
    paid: 'ad-status-active',
    otp_verified: 'ad-status-active',
  })[s] || 'ad-status-pending';

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: 'tachometer-alt' },
    { id: 'verifications', name: 'Verifications', icon: 'user-clock', badge: pendingVerifications.length },
    { id: 'users', name: 'Users', icon: 'users' },
    { id: 'deals', name: 'Deals', icon: 'handshake' },
    { id: 'contacts', name: 'Messages', icon: 'envelope', badge: newContactsCount },
    { id: 'analytics', name: 'Analytics', icon: 'chart-line' },
    { id: 'logs', name: 'Activity Logs', icon: 'history' },
    { id: 'settings', name: 'System Settings', icon: 'cog' },
  ];

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({ page: logPage, limit: 50 });
      if (logSearch) params.append('search', logSearch);
      if (logActionFilter) params.append('action', logActionFilter);

      const res = await API.get(`/admin/logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setLogsPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('fetchLogs error:', err);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logPage, logSearch, logActionFilter]);

  useEffect(() => {
    if (activeModule === 'logs') fetchLogs();
  }, [activeModule, logPage, logActionFilter, fetchLogs]);

  useEffect(() => {
    if (activeModule !== 'logs') return;
    const t = setTimeout(() => { setLogPage(1); fetchLogs(); }, 400);
    return () => clearTimeout(t);
  }, [logSearch, activeModule, fetchLogs]);

  const avgDealValue = finalStats.totalDeals
    ? Math.round(finalStats.totalRevenue / finalStats.totalDeals)
    : 0;
  const completionRate = finalStats.totalDeals
    ? Math.round((computedCompletedDeals / finalStats.totalDeals) * 100)
    : 0;

  if (loading) {
    return (
      <>
        <style>{`
        .ad-loading-container { position: fixed; inset: 0; background: #0a0a0f; display: flex; align-items: center; justify-content: center; z-index: 99999; }
        [data-theme="light"] .ad-loading-container { background: #f8fafc; }
        .ad-loading-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .ad-loading-logo-ring { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
        .ad-loading-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: #6366f1; border-right-color: #8b5cf6; animation: ad-spin-ring 1.2s linear infinite; }
        .ad-loading-logo-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; border: 2px solid transparent; border-top-color: #60a5fa; border-left-color: #a78bfa; animation: ad-spin-ring 1.8s linear infinite reverse; }
        .ad-loading-logo-inner { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 2.4rem; color: white; box-shadow: 0 0 40px rgba(99,102,241,0.5); animation: ad-logo-breathe 2s ease-in-out infinite; }
        @keyframes ad-spin-ring { to { transform: rotate(360deg); } }
        @keyframes ad-logo-breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(99,102,241,0.5); } 50% { transform: scale(1.08); box-shadow: 0 0 60px rgba(99,102,241,0.8); } }
        .ad-loading-text { font-size: 1.5rem; font-weight: 800; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px; margin: 0; animation: ad-text-pulse 2s ease-in-out infinite; }
        @keyframes ad-text-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .ad-loading-tagline { color: #6b7280; font-size: 0.85rem; letter-spacing: 0.5px; margin-top: -12px; }
        .ad-loading-dots { display: flex; gap: 6px; margin-top: 8px; }
        .ad-loading-dots span { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; animation: ad-dot-bounce 1.4s ease-in-out infinite; }
        .ad-loading-dots span:nth-child(2) { animation-delay: 0.2s; background: #8b5cf6; }
        .ad-loading-dots span:nth-child(3) { animation-delay: 0.4s; background: #60a5fa; }
        @keyframes ad-dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-10px); opacity: 1; } }
      `}</style>
        <div className="ad-loading-container">
          <div className="ad-loading-logo-wrap">
            <div className="ad-loading-logo-ring">
              <div className="ad-loading-logo-inner"><i className="fas fa-recycle"></i></div>
            </div>
            <h1 className="ad-loading-text">WasteExchange AI</h1>
            <p className="ad-loading-tagline">Admin Portal</p>
            <div className="ad-loading-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </>
    );
  }

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <div className="ad-dashboard">
            <div className="ad-kpi-grid ad-kpi-grid-5">
              <KpiCard label="Deal Revenue" value={`₹${finalStats.totalRevenue.toLocaleString('en-IN')}`} color="#fbbf24" icon="wallet" />
              <KpiCard label="Platform Commission" value={`₹${finalStats.totalCommission.toLocaleString('en-IN')}`} color="#22c55e" icon="percentage" />
              <KpiCard label="Completed Deals" value={finalStats.totalDeals} color="#60a5fa" icon="handshake" />
              <KpiCard label="Total Users" value={finalStats.totalUsers} color="#a78bfa" icon="users" />
              <KpiCard label="Pending Verifications" value={pendingVerifications.length} color="#f97316" icon="user-clock" />
            </div>

            <div className="ad-stats-row">
              <div className="ad-card" style={{ flex: 2 }}>
                <div className="ad-section-title">
                  <span>Monthly Revenue & Commission</span>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400 }}>
                    (Revenue from paid deals · Commission = 4% platform cut)
                  </span>
                </div>
                <div style={{ height: 280, position: 'relative' }}><canvas ref={revenueChartRef}></canvas></div>
              </div>
              <div className="ad-card" style={{ flex: 1 }}>
                <div className="ad-section-title">
                  <span>Pending Verifications</span>
                  <button onClick={() => setActiveModule('verifications')}>View All</button>
                </div>
                {pendingVerifications.slice(0, 5).map(item => (
                  <div key={item._id} className="ad-activity-item">
                    <div className="ad-activity-icon"><i className="fas fa-building"></i></div>
                    <div>
                      <h4>{item.companyName || 'N/A'}</h4>
                      <p>{item.email} &middot; {item.role}</p>
                      <span className="ad-badge ad-status-pending">Pending</span>
                    </div>
                  </div>
                ))}
                {pendingVerifications.length === 0 && <p className="ad-no-data">No pending verifications</p>}
              </div>
            </div>

            <div className="ad-card" style={{ marginBottom: 24 }}>
              <div className="ad-section-title"><span>User Growth (Monthly)</span></div>
              <div style={{ height: 260, position: 'relative' }}><canvas ref={userChartRef}></canvas></div>
            </div>

            <div className="ad-actions-grid">
              <button className="ad-action-card" onClick={() => setActiveModule('verifications')}>
                <i className="fas fa-user-clock"></i><span>Verifications</span>
              </button>
              <button className="ad-action-card" onClick={() => setActiveModule('users')}>
                <i className="fas fa-users"></i><span>Manage Users</span>
              </button>
              <button className="ad-action-card" onClick={() => setActiveModule('deals')}>
                <i className="fas fa-handshake"></i><span>All Deals</span>
              </button>
              <button className="ad-action-card" onClick={() => setActiveModule('analytics')}>
                <i className="fas fa-chart-line"></i><span>Analytics</span>
              </button>
            </div>
          </div>
        );

      case 'verifications':
        return (
          <div>
            <div className="ad-page-header">
              <h2>Company Verifications ({filteredVerifications.length})</h2>
              <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search by company or email..." value={verificationSearch} onChange={(e) => setVerificationSearch(e.target.value)} /></div>
            </div>
            <div className="ad-onboarding-grid">
              {paginatedVerifications.length === 0 && (
                <div className="ad-no-data-block">
                  <i className="fas fa-check-circle fa-3x" style={{ color: '#34d399', marginBottom: 12 }}></i>
                  <p>No pending verifications</p>
                </div>
              )}
              {paginatedVerifications.map(item => (
                <div key={item._id} className="ad-client-card">
                  <div className="ad-client-header">
                    <span className="ad-client-name">{item.companyName || 'N/A'}</span>
                    <span className="ad-badge ad-status-pending">Pending</span>
                  </div>
                  <div className="ad-client-info">
                    <div><i className="fas fa-user-tag"></i> {item.role}</div>
                    <div><i className="fas fa-envelope"></i> {item.email}</div>
                    <div><i className="fas fa-id-card"></i> Reg No: {item.companyRegistrationNo || 'N/A'}</div>
                    <div><i className="fas fa-map-marker-alt"></i> {item.companyCity || 'N/A'}, {item.companyState || 'N/A'}</div>
                    <div><i className="far fa-calendar-alt"></i> Submitted: {formatDate(item.createdAt)}</div>
                  </div>
                  <div className="ad-action-buttons">
                    <button className="btn-sm btn-outline-warning" onClick={() => setSelectedVerification(item)}><i className="fas fa-eye"></i> Review</button>
                    <button className="btn-sm btn-outline-success" onClick={() => handleApprove(item._id)}><i className="fas fa-check"></i> Approve</button>
                    <button className="btn-sm btn-outline-danger" onClick={() => handleReject(item._id)}><i className="fas fa-times"></i> Reject</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination currentPage={verificationPage} totalPages={totalVerificationPages} onPageChange={setVerificationPage} />
          </div>
        );

      case 'users':
        return (
          <div>
            <div className="ad-page-header">
              <h2>All Users ({filteredUsers.length})</h2>
              <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search users (name, email, company)..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
            </div>
            <div className="ad-table">
              <table className="table">
                <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Company</th><th>Verified</th><th>Joined</th><th>Action</th></tr></thead>
                <tbody>
                  {paginatedUsers.map(u => (
                    <tr key={u._id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="ad-avatar-sm">{u.name?.charAt(0)}</div><strong>{u.name}</strong></div></td>
                      <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                      <td>{u.email}</td>
                      <td>{u.companyName || '—'}</td>
                      <td><span className={`ad-badge ${u.isCompanyVerified ? 'ad-status-closed' : 'ad-status-pending'}`}>{u.isCompanyVerified ? 'Verified' : 'Unverified'}</span></td>
                      <td><small style={{ color: '#9ca3af' }}>{formatDate(u.createdAt)}</small></td>
                      <td><button className="btn-sm btn-outline-primary" onClick={() => setSelectedUser(u)}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedUsers.length === 0 && <div className="ad-no-data-block"><i className="fas fa-users fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i><p>No users found</p></div>}
            </div>
            <Pagination currentPage={userPage} totalPages={totalUserPages} onPageChange={setUserPage} />
          </div>
        );

      case 'deals':
        return (
          <div>
            <div className="ad-page-header">
              <h2>All Deals ({filteredDeals.length})</h2>
              <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search by material, buyer, generator..." value={dealSearch} onChange={(e) => setDealSearch(e.target.value)} /></div>
            </div>
            <div className="ad-table">
              <table className="table">
                <thead><tr><th>Material</th><th>Qty</th><th>Deal Value</th><th>Commission</th><th>Buyer</th><th>Generator</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {paginatedDeals.map(d => (
                    <tr key={d._id}>
                      <td><strong>{d.material}</strong></td>
                      <td>{d.quantity} kg</td>
                      <td style={{ color: '#22c55e' }}>₹{Number(d.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#fbbf24' }}>₹{Number(d.platformRevenue || 0).toLocaleString('en-IN')}</td>
                      <td>{d.buyerName || '—'}</td>
                      <td>{d.generatorName || '—'}</td>
                      <td><span className={`ad-badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span></td>
                      <td><small style={{ color: '#9ca3af' }}>{formatDate(d.createdAt)}</small></td>
                      <td><button className="btn-sm btn-outline-primary" onClick={() => setSelectedDeal(d)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedDeals.length === 0 && <div className="ad-no-data-block"><i className="fas fa-handshake fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i><p>No deals found</p></div>}
            </div>
            <Pagination currentPage={dealPage} totalPages={totalDealPages} onPageChange={setDealPage} />
          </div>
        );

      case 'contacts':
        return (
          <div>
            <div className="ad-page-header">
              <h2>Contact Messages ({filteredContacts.length})</h2>
              <div className="ad-search">
                <i className="fas fa-search"></i>
                <input type="text" placeholder="Search by name, email or message..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
              </div>
            </div>

            <div className="ad-status-tabs">
              {[
                { key: 'all', label: 'All', color: '#6366f1' },
                { key: 'new', label: 'New', color: '#fbbf24' },
                { key: 'read', label: 'Read', color: '#60a5fa' },
                { key: 'replied', label: 'Replied', color: '#22c55e' },
                { key: 'archived', label: 'Archived', color: '#9ca3af' },
              ].map(tab => {
                const count = tab.key === 'all' ? contacts.length : contacts.filter(c => c.status === tab.key).length;
                return (
                  <button key={tab.key} className={`ad-status-tab ${contactStatusFilter === tab.key ? 'active' : ''}`} onClick={() => setContactStatusFilter(tab.key)}
                    style={{ borderColor: contactStatusFilter === tab.key ? tab.color : 'transparent', color: contactStatusFilter === tab.key ? tab.color : '#9ca3af' }}>
                    <span className="ad-status-tab-dot" style={{ background: tab.color }} />
                    {tab.label}
                    <span className="ad-status-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="ad-table">
              <table className="table">
                <thead><tr><th>From</th><th>Subject</th><th>Message Preview</th><th>Status</th><th>Received</th><th>Action</th></tr></thead>
                <tbody>
                  {paginatedContacts.map(c => (
                    <tr key={c._id} style={{ background: c.status === 'new' ? 'rgba(251,191,36,0.04)' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ad-avatar-sm">{c.fullName?.charAt(0)?.toUpperCase()}</div>
                          <div>
                            <strong style={{ color: 'inherit', fontSize: '0.9rem' }}>{c.fullName}</strong>
                            <br />
                            <small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{c.email}</small>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '3px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize' }}>{c.subject}</span></td>
                      <td><small style={{ color: '#9ca3af' }}>{c.message?.length > 60 ? c.message.slice(0, 60) + '…' : c.message}</small></td>
                      <td><span className={`ad-badge ${c.status === 'new' ? 'ad-status-pending' : c.status === 'read' ? 'ad-status-active' : 'ad-status-closed'}`}>{c.status}</span></td>
                      <td><small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{formatDate(c.createdAt)}</small></td>
                      <td><button className="btn-sm btn-outline-primary" onClick={() => openContact(c)}><i className="fas fa-eye"></i> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedContacts.length === 0 && <div className="ad-no-data-block"><i className="fas fa-envelope-open fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i><p>No messages found</p></div>}
            </div>
            <Pagination currentPage={contactPage} totalPages={totalContactPages} onPageChange={setContactPage} />
          </div>
        );

      case 'logs':
        return (
          <div className="ad-logs-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ color: 'inherit', margin: 0 }}>📊 Activity Logs</h2>
              <button onClick={fetchLogs} className="ad-btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
                <i className="fas fa-sync me-1"></i> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search user/action..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="ad-log-input"
              />
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="ad-log-select"
              >
                <option value="">All Actions</option>
                <option value="signup">🆕 Signup</option>
                <option value="login">🔐 Login</option>
                <option value="register_company">🏢 Company Registration</option>
                <option value="company_verified">✅ Company Verified</option>
                <option value="company_rejected">❌ Company Rejected</option>
                <option value="otp_requested">🔢 OTP Requested</option>
                <option value="otp_verified">🔐 OTP Verified</option>
                <option value="offer_sent">📤 Offer Sent</option>
                <option value="deal_created">📩 Deal Created</option>
                <option value="deal_accepted">💰 Payment Accepted (Wallet)</option>
                <option value="deal_accepted_razorpay">💳 Payment Accepted (Razorpay)</option>
                <option value="deal_completed">🎉 Deal Completed</option>
                <option value="deal_rejected">❌ Deal Rejected</option>
                <option value="wallet_topup">💵 Wallet Top-up</option>
              </select>
            </div>

            <div className="ad-logs-table-wrap">
              {logsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '2rem' }}>📭</div>
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="ad-logs-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const actionColor = (() => {
                          if (log.action?.includes('accept') || log.action?.includes('completed') || log.action?.includes('verified')) return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
                          if (log.action?.includes('reject')) return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
                          if (log.action?.includes('signup') || log.action?.includes('register')) return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
                          if (log.action?.includes('offer') || log.action?.includes('deal')) return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' };
                          if (log.action?.includes('wallet')) return { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
                          if (log.action?.includes('otp')) return { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' };
                          return { bg: 'rgba(99,102,241,0.15)', color: '#a78bfa' };
                        })();

                        return (
                          <tr key={log._id}>
                            <td style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                              {new Date(log.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'inherit', fontSize: '0.85rem' }}>{log.userName || '—'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{log.userEmail || ''}</div>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                                background: log.userRole === 'admin' ? 'rgba(139,92,246,0.15)' : log.userRole === 'generator' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
                                color: log.userRole === 'admin' ? '#a78bfa' : log.userRole === 'generator' ? '#fbbf24' : '#22c55e',
                              }}>{log.userRole || '—'}</span>
                            </td>
                            <td>
                              <span style={{ padding: '3px 10px', borderRadius: 8, background: actionColor.bg, color: actionColor.color, fontSize: '0.7rem', fontWeight: 600 }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ color: 'inherit', fontSize: '0.8rem' }}>
                              {log.title}
                              {log.details && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{log.details}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {logsPagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 20 }}>
                <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1} className="ad-log-page-btn">
                  Previous
                </button>
                <span style={{ color: '#9ca3af', alignSelf: 'center', fontSize: '0.8rem' }}>
                  Page {logPage} of {logsPagination.pages}
                </span>
                <button onClick={() => setLogPage(p => Math.min(logsPagination.pages, p + 1))} disabled={logPage === logsPagination.pages} className="ad-log-page-btn">
                  Next
                </button>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div>
            <div className="ad-page-header"><h2>Analytics Overview</h2></div>

            <div className="ad-kpi-grid ad-kpi-grid-5">
              <KpiCard label="Avg. Deal Value" value={`₹${avgDealValue.toLocaleString('en-IN')}`} color="#fbbf24" icon="chart-bar" />
              <KpiCard label="Deal Revenue" value={`₹${finalStats.totalRevenue.toLocaleString('en-IN')}`} color="#22c55e" icon="wallet" />
              <KpiCard label="Platform Commission" value={`₹${finalStats.totalCommission.toLocaleString('en-IN')}`} color="#10b981" icon="percentage" />
              <KpiCard label="Total Users" value={finalStats.totalUsers} color="#60a5fa" icon="users" />
              <KpiCard label="Completion Rate" value={`${completionRate}%`} color="#a78bfa" icon="check-circle" />
            </div>

            <div className="ad-stats-row">
              <div className="ad-card" style={{ flex: 1 }}>
                <div className="ad-section-title">
                  <span>Revenue vs Commission Trend</span>
                </div>
                <div style={{ height: 280, position: 'relative' }}><canvas ref={revenueChartRef}></canvas></div>
              </div>
              <div className="ad-card" style={{ flex: 1 }}>
                <div className="ad-section-title">
                  <span>User Growth Overview</span>
                </div>
                <div style={{ height: 280, position: 'relative' }}><canvas ref={userChartRef}></canvas></div>
              </div>
            </div>

            <div className="ad-card" style={{ marginTop: 24 }}>
              <div className="ad-section-title"><span>Deal Summary by Status</span></div>
              <div className="ad-analytics-summary">
                <div className="ad-summary-item">
                  <div className="ad-summary-label">Paid Deals</div>
                  <div className="ad-summary-value" style={{ color: '#22c55e' }}>{computedPaidDeals}</div>
                </div>
                <div className="ad-summary-item">
                  <div className="ad-summary-label">Completed</div>
                  <div className="ad-summary-value" style={{ color: '#a78bfa' }}>{computedCompletedDeals}</div>
                </div>
                <div className="ad-summary-item">
                  <div className="ad-summary-label">Total Deals</div>
                  <div className="ad-summary-value" style={{ color: '#60a5fa' }}>{computedTotalDeals}</div>
                </div>
                <div className="ad-summary-item">
                  <div className="ad-summary-label">Total Generators</div>
                  <div className="ad-summary-value" style={{ color: '#fbbf24' }}>{allUsers.filter(u => u.role === 'generator').length}</div>
                </div>
                <div className="ad-summary-item">
                  <div className="ad-summary-label">Total Buyers</div>
                  <div className="ad-summary-value" style={{ color: '#ec4899' }}>{allUsers.filter(u => u.role === 'buyer').length}</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="ad-form-card" style={{ maxWidth: 760 }}>
            <div className="ad-page-header">
              <h2>System Settings</h2>
              {!editingAdmin && <button className="ad-btn-primary" onClick={() => setEditingAdmin(true)}><i className="fas fa-edit"></i> Edit Profile</button>}
            </div>
            {!editingAdmin ? (
              <div className="ad-settings-grid">
                <div className="ad-profile-card">
                  <div className="ad-profile-avatar-large" onClick={() => profilePhotoInputRef.current?.click()} title="Click to update photo">
                    {profilePhotoUploading ? <i className="fas fa-spinner fa-spin"></i> : profilePhoto ? <img src={getPhotoUrl(profilePhoto)} alt="Profile" /> : <span>{adminProfile.name?.charAt(0) || 'A'}</span>}
                    <span className="ad-profile-avatar-overlay"><i className="fas fa-camera"></i></span>
                  </div>
                  <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
                  <h3>{adminProfile.name || 'Admin User'}</h3>
                  <p>{adminProfile.email}</p>
                  <span className="ad-role-badge">Super Admin</span>
                  <div className="ad-profile-details">
                    <div><small>Phone</small><p>{adminProfile.phone || 'Not set'}</p></div>
                    <div><small>Account Created</small><p>{adminProfile.createdAt ? formatDate(adminProfile.createdAt) : 'N/A'}</p></div>
                  </div>
                </div>
                <div className="ad-card">
                  <h4 className="ad-info-title">Personal Information</h4>
                  <div className="ad-info-grid">
                    <div><small>Full Name</small><p>{adminProfile.name || 'N/A'}</p></div>
                    <div><small>Email</small><p>{adminProfile.email || 'N/A'}</p></div>
                    <div><small>Phone</small><p>{adminProfile.phone || 'N/A'}</p></div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveAdminProfile}>
                <div className="ad-form-grid">
                  <div className="ad-form-group"><label>Full Name</label><input type="text" value={adminForm.name || ''} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} /></div>
                  <div className="ad-form-group"><label>Email</label><input type="email" value={adminForm.email || ''} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} /></div>
                  <div className="ad-form-group"><label>Phone Number</label><input type="tel" value={adminForm.phone || ''} onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })} /></div>
                </div>
                <h4 className="ad-info-title" style={{ marginTop: 20 }}>Change Password</h4>
                <div className="ad-form-grid">
                  <div className="ad-form-group"><label>Current Password</label><input type="password" value={passwordData.current_password} onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} placeholder="Leave blank to keep unchanged" /></div>
                  <div className="ad-form-group"><label>New Password</label><input type="password" value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} placeholder="Enter new password" /></div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button type="submit" className="ad-btn-primary"><i className="fas fa-save"></i> Save Changes</button>
                  <button type="button" className="btn-cancel" onClick={() => setEditingAdmin(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ad-wrapper">
      <div className={`ad-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="ad-brand-photo">
          <div className="ad-brand-avatar" onClick={() => profilePhotoInputRef.current?.click()} title="Update photo">
            {profilePhotoUploading ? <i className="fas fa-spinner fa-spin"></i> : profilePhoto ? <img src={getPhotoUrl(profilePhoto)} alt="Profile" /> : <span>{adminProfile.name?.charAt(0) || user?.name?.charAt(0) || 'A'}</span>}
            <span className="ad-brand-avatar-overlay"><i className="fas fa-camera"></i></span>
          </div>
          <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
          {!sidebarCollapsed && <p className="ad-brand-avatar-hint">Update photo</p>}
        </div>

        <div className="ad-logo">
          <div className="ad-logo-icon"><i className="fas fa-recycle"></i></div>
          {!sidebarCollapsed && <div className="ad-logo-text">WasteExchange AI</div>}
        </div>

        <div className="ad-nav">
          {modules.map(module => (
            <div key={module.id} className={`ad-nav-item ${activeModule === module.id ? 'active' : ''}`} onClick={() => setActiveModule(module.id)}>
              <i className={`fas fa-${module.icon}`}></i>
              {!sidebarCollapsed && <span>{module.name}</span>}
              {module.badge > 0 && <span className="ad-badge-pill">{module.badge}</span>}
            </div>
          ))}
        </div>

        {!sidebarCollapsed && (
          <div className="ad-user">
            <div className="ad-avatar">{adminProfile.name?.charAt(0) || user?.name?.charAt(0) || 'A'}</div>
            <div className="ad-user-info">
              <h4>{adminProfile.name || user?.name || 'Admin'}</h4>
              <p>System Administrator</p>
            </div>
          </div>
        )}

        <div className="ad-sidebar-footer">
          <i className="fas fa-bolt"></i>
          {!sidebarCollapsed && <span>AI Powered</span>}
        </div>
      </div>

      <div className="ad-main">
        <div className="ad-header">
          <div className="ad-title">
            <button className="ad-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><i className="fas fa-bars"></i></button>
            <span>{modules.find(m => m.id === activeModule)?.name || 'Dashboard'}</span>
          </div>
          <div className="ad-header-actions">
            <div className="ad-search ad-header-search"><i className="fas fa-search"></i><input type="text" placeholder="Quick search..." /></div>
            {/* ✅ THEME TOGGLE ADDED */}
            <ThemeToggle />
            <div className="ad-notification"><i className="fas fa-bell"></i>{(pendingVerifications.length > 0 || newContactsCount > 0) && <span className="ad-dot"></span>}</div>
            <button className="ad-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>

        {message.text && (
          <div className={`ad-alert ${message.type === 'success' ? 'ad-alert-success' : 'ad-alert-danger'}`}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        {renderContent()}

        <footer className="ad-footer"><p>WasteExchange AI — Smart Waste Marketplace | Admin Portal | © 2026</p></footer>
      </div>

      {/* All modals — unchanged from your existing code */}
      {selectedVerification && (
        <div className="ad-modal-overlay" onClick={() => setSelectedVerification(null)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <div><h3><i className="fas fa-building me-2"></i>Company Verification Details</h3></div>
              <button onClick={() => setSelectedVerification(null)} className="ad-modal-close">&times;</button>
            </div>
            <div className="ad-modal-body">
              <div className="ad-modal-grid">
                {[['Company Name', selectedVerification.companyName || 'N/A'], ['Role', selectedVerification.role], ['Email', selectedVerification.email], ['Registration No.', selectedVerification.companyRegistrationNo || 'N/A'], ['Address', selectedVerification.companyAddress || 'N/A'], ['City', selectedVerification.companyCity || 'N/A'], ['State', selectedVerification.companyState || 'N/A'], ['Submitted', formatDate(selectedVerification.createdAt)]].map(([label, val], i) => (
                  <div key={i}><small>{label}</small><p>{val}</p></div>
                ))}
              </div>
              <div className="ad-modal-footer" style={{ justifyContent: 'flex-start' }}>
                <button className="btn-sm btn-outline-success" onClick={() => { handleApprove(selectedVerification._id); setSelectedVerification(null); }}><i className="fas fa-check"></i> Approve</button>
                <button className="btn-sm btn-outline-danger" onClick={() => { handleReject(selectedVerification._id); setSelectedVerification(null); }}><i className="fas fa-times"></i> Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="ad-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <div><h3><i className="fas fa-user me-2"></i>User Details</h3></div>
              <button onClick={() => setSelectedUser(null)} className="ad-modal-close">&times;</button>
            </div>
            <div className="ad-modal-body">
              <div className="ad-modal-grid">
                {[['Full Name', selectedUser.name], ['Role', selectedUser.role], ['Email', selectedUser.email], ['Company', selectedUser.companyName || 'N/A'], ['Verified', selectedUser.isCompanyVerified ? 'Yes' : 'No'], ['Joined', formatDate(selectedUser.createdAt)]].map(([label, val], i) => (
                  <div key={i}><small>{label}</small><p>{val}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDeal && (
        <div className="ad-modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <div><h3><i className="fas fa-handshake me-2"></i>Deal Details</h3></div>
              <button onClick={() => setSelectedDeal(null)} className="ad-modal-close">&times;</button>
            </div>
            <div className="ad-modal-body">
              <div className="ad-modal-grid">
                {[['Material', selectedDeal.material], ['Quantity', `${selectedDeal.quantity} kg`], ['Deal Value', `₹${Number(selectedDeal.totalAmount || 0).toLocaleString('en-IN')}`], ['Platform Commission', `₹${Number(selectedDeal.platformRevenue || 0).toLocaleString('en-IN')}`], ['Buyer', selectedDeal.buyerName || 'N/A'], ['Generator', selectedDeal.generatorName || 'N/A'], ['Status', selectedDeal.status], ['Date', formatDate(selectedDeal.createdAt)]].map(([label, val], i) => (
                  <div key={i}><small>{label}</small><p>{val}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="ad-modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="ad-modal-header">
              <div>
                <h3><i className="fas fa-envelope me-2"></i>Contact Message</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '4px 0 0' }}>
                  Received on {formatDateTime(selectedContact.createdAt)}
                </p>
              </div>
              <button onClick={() => setSelectedContact(null)} className="ad-modal-close">&times;</button>
            </div>
            <div className="ad-modal-body">
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '1.2rem' }}>
                  {selectedContact.fullName?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'inherit', fontSize: '1rem' }}>{selectedContact.fullName}</strong>
                  <div style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: 2 }}>
                    <i className="fas fa-envelope me-1"></i>
                    <a href={`mailto:${selectedContact.email}`} style={{ color: '#a78bfa', textDecoration: 'none' }}>{selectedContact.email}</a>
                    {selectedContact.phone && (<> · <i className="fas fa-phone me-1"></i>{selectedContact.phone}</>)}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Subject</div>
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', display: 'inline-block' }}>{selectedContact.subject}</span>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Message</div>
                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '14px 16px', color: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedContact.message}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['new', 'read', 'replied', 'archived'].map(s => (
                    <button key={s} onClick={() => handleContactStatusChange(selectedContact._id, s)} className={`btn-sm ${selectedContact.status === s ? 'btn-outline-success' : 'btn-outline-primary'}`} style={{ textTransform: 'capitalize' }}>
                      {selectedContact.status === s && <i className="fas fa-check me-1"></i>}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => handleDeleteContact(selectedContact._id)} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                <i className="fas fa-trash me-1"></i> Delete
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={`mailto:${selectedContact.email}?subject=Re: Your message to WasteExchange AI`} style={{ padding: '10px 20px', borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-reply"></i> Reply via Email
                </a>
                <button onClick={() => setSelectedContact(null)} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================== STYLES ================== */}
      <style>{`
        * { box-sizing: border-box; }

        /* ============================================================ */
        /* 🎨 DARK MODE (default)                                        */
        /* ============================================================ */
        .ad-wrapper { display: flex; min-height: 100vh; background: #0a0a0f; font-family: 'Inter', sans-serif; color: #e5e7eb; }
        .ad-sidebar { width: 260px; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px 0; transition: width 0.2s; flex-shrink: 0; }
        .ad-sidebar.collapsed { width: 80px; }
        .ad-brand-photo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 16px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 6px; }
        .ad-brand-avatar { position: relative; width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; cursor: pointer; overflow: hidden; border: 3px solid rgba(99,102,241,0.3); transition: 0.2s; }
        .ad-brand-avatar:hover { transform: scale(1.05); border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
        .ad-brand-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .ad-brand-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; color: white; font-size: 0.9rem; }
        .ad-brand-avatar:hover .ad-brand-avatar-overlay { opacity: 1; }
        .ad-brand-avatar-hint { margin: 0; font-size: 0.65rem; color: rgba(255,255,255,0.4); }
        .ad-logo { display: flex; align-items: center; gap: 12px; padding: 4px 24px 24px; }
        .ad-logo-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; color: white; }
        .ad-logo-text { font-size: 1.05rem; font-weight: 700; white-space: nowrap; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .ad-nav { flex: 1; padding: 0 12px; }
        .ad-nav-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.6); margin-bottom: 4px; transition: 0.15s; border-left: 3px solid transparent; font-size: 0.9rem; position: relative; }
        .ad-nav-item i { width: 18px; text-align: center; }
        .ad-nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
        .ad-nav-item.active { background: rgba(99,102,241,0.12); color: white; font-weight: 600; border-left: 3px solid #8b5cf6; }
        .ad-badge-pill { margin-left: auto; background: #f97316; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
        .ad-user { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 12px; }
        .ad-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; color: white; }
        .ad-user-info h4 { margin: 0; font-size: 0.9rem; color: inherit; }
        .ad-user-info p { margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.5); }
        .ad-sidebar-footer { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.05); color: #8b5cf6; font-weight: 600; font-size: 0.8rem; }
        .ad-main { flex: 1; padding: 24px 32px; overflow-y: auto; background: #0a0a0f; min-width: 0; }
        .ad-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .ad-title { display: flex; align-items: center; gap: 14px; font-size: 1.4rem; font-weight: 700; color: inherit; }
        .ad-toggle { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #9ca3af; }
        .ad-header-actions { display: flex; align-items: center; gap: 14px; }
        .ad-header-search { width: 220px; }
        .ad-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 14px; color: #6b7280; }
        .ad-search input { border: none; outline: none; flex: 1; font-size: 0.85rem; background: transparent; color: inherit; }
        .ad-search input::placeholder { color: #6b7280; }
        .ad-notification { position: relative; width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: #9ca3af; flex-shrink: 0; }
        .ad-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
        .ad-logout { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); padding: 8px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.15s; white-space: nowrap; }
        .ad-logout:hover { background: rgba(248,113,113,0.2); }
        .ad-alert { padding: 12px 18px; border-radius: 10px; margin-bottom: 18px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
        .ad-alert-success { background: rgba(34,197,94,0.12); color: #34d399; border: 1px solid rgba(34,197,94,0.2); }
        .ad-alert-danger { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .ad-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .ad-kpi-grid-5 { grid-template-columns: repeat(5, 1fr); }
        .ad-kpi-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 18px 16px; display: flex; align-items: center; gap: 14px; border: 1px solid rgba(255,255,255,0.05); }
        .ad-kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
        .ad-kpi-card h3 { margin: 0; font-size: 1.4rem; font-weight: 700; }
        .ad-kpi-card p { margin: 0; color: #9ca3af; font-size: 0.75rem; }
        .ad-stats-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .ad-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .ad-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-weight: 600; color: inherit; flex-wrap: wrap; gap: 8px; }
        .ad-section-title button { background: none; border: none; color: #a78bfa; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
        .ad-activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ad-activity-item:last-child { border-bottom: none; }
        .ad-activity-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(99,102,241,0.15); color: #818cf8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ad-activity-item h4 { margin: 0; font-size: 0.9rem; color: inherit; }
        .ad-activity-item p { margin: 2px 0; font-size: 0.8rem; color: #9ca3af; }
        .ad-actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .ad-action-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 22px; text-align: center; cursor: pointer; transition: 0.2s; color: inherit; }
        .ad-action-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
        .ad-action-card i { font-size: 1.7rem; color: #8b5cf6; display: block; margin-bottom: 8px; }
        .ad-action-card span { font-weight: 600; font-size: 0.9rem; color: inherit; }
        .ad-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: 0.15s; }
        .ad-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
        .btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; cursor: pointer; font-weight: 600; }
        .btn-cancel:hover { background: rgba(255,255,255,0.05); }
        .btn-sm { padding: 5px 11px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; cursor: pointer; font-size: 0.8rem; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-sm:hover { background: rgba(255,255,255,0.05); }
        .btn-outline-primary { color: #818cf8; border-color: rgba(99,102,241,0.3); }
        .btn-outline-primary:hover { background: rgba(99,102,241,0.15); }
        .btn-outline-danger { color: #f87171; border-color: rgba(248,113,113,0.3); }
        .btn-outline-danger:hover { background: rgba(248,113,113,0.15); }
        .btn-outline-success { color: #34d399; border-color: rgba(52,211,153,0.3); }
        .btn-outline-success:hover { background: rgba(52,211,153,0.15); }
        .btn-outline-warning { color: #fbbf24; border-color: rgba(251,191,36,0.3); }
        .btn-outline-warning:hover { background: rgba(251,191,36,0.15); }
        .ad-table { background: rgba(255,255,255,0.03); border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .ad-table table { width: 100%; border-collapse: collapse; }
        .ad-table th { text-align: left; padding: 14px 18px; background: rgba(255,255,255,0.03); color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ad-table td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; font-size: 0.9rem; color: inherit; }
        .ad-table tr:last-child td { border-bottom: none; }
        .ad-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
        .ad-badge { padding: 3px 11px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: capitalize; display: inline-block; }
        .ad-status-active { background: rgba(34,197,94,0.15); color: #34d399; }
        .ad-status-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .ad-status-closed { background: rgba(107,114,128,0.15); color: #9ca3af; }
        .ad-status-rejected { background: rgba(248,113,113,0.15); color: #f87171; }
        .ad-no-data-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: #6b7280; text-align: center; grid-column: 1/-1; }
        .ad-no-data { color: #6b7280; text-align: center; padding: 12px; }
        .ad-pagination { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; color: #9ca3af; font-size: 0.85rem; }
        .ad-pagination button { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; cursor: pointer; }
        .ad-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        .ad-onboarding-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .ad-client-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 18px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid #fbbf24; }
        .ad-client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ad-client-name { font-weight: 700; color: inherit; font-size: 0.95rem; }
        .ad-client-info div { font-size: 0.83rem; color: #9ca3af; margin-bottom: 5px; }
        .ad-client-info i { width: 16px; color: #6b7280; margin-right: 6px; }
        .ad-action-buttons { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
        .ad-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .ad-page-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: inherit; }
        .ad-form-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); }
        .ad-settings-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
        .ad-profile-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 24px; text-align: center; }
        .ad-profile-avatar-large { position: relative; width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 12px; cursor: pointer; overflow: hidden; border: 3px solid rgba(99,102,241,0.3); transition: 0.2s; }
        .ad-profile-avatar-large:hover { border-color: #8b5cf6; transform: scale(1.03); }
        .ad-profile-avatar-large img { width: 100%; height: 100%; object-fit: cover; }
        .ad-profile-avatar-large span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
        .ad-profile-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.1rem; opacity: 0; transition: 0.2s; }
        .ad-profile-avatar-large:hover .ad-profile-avatar-overlay { opacity: 1; }
        .ad-profile-card h3 { margin: 0; color: inherit; font-size: 1.05rem; }
        .ad-profile-card p { margin: 2px 0; color: #9ca3af; font-size: 0.85rem; }
        .ad-role-badge { background: rgba(99,102,241,0.15); color: #a78bfa; padding: 3px 14px; border-radius: 999px; font-size: 0.75rem; display: inline-block; margin-top: 4px; }
        .ad-profile-details { margin-top: 16px; text-align: left; font-size: 0.85rem; }
        .ad-profile-details div { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ad-profile-details small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
        .ad-profile-details p { margin: 2px 0 0; color: inherit; }
        .ad-info-title { color: #a78bfa; margin-top: 0; font-size: 1rem; font-weight: 600; }
        .ad-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .ad-info-grid small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
        .ad-info-grid p { margin: 4px 0 0; color: inherit; font-size: 0.9rem; }
        .ad-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .ad-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: inherit; }
        .ad-form-group input { width: 100%; padding: 9px 12px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: inherit; font-size: 0.9rem; }
        .ad-form-group input::placeholder { color: #6b7280; }
        .ad-form-group input:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.15); }
        .ad-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 16px; }
        .ad-modal { background: #1a1a2e; border-radius: 16px; max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5); color: #e5e7eb; }
        .ad-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ad-modal-header h3 { margin: 0; color: #a78bfa; font-size: 1.05rem; }
        .ad-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; transition: 0.15s; }
        .ad-modal-close:hover { color: #d1d5db; }
        .ad-modal-body { padding: 24px; }
        .ad-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ad-modal-grid small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
        .ad-modal-grid p { margin: 4px 0 0; color: inherit; font-size: 0.9rem; }
        .ad-modal-footer { display: flex; gap: 12px; margin-top: 18px; }
        .ad-footer { margin-top: 8px; padding-top: 16px; text-align: center; font-size: 0.8rem; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.05); }

        .ad-status-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; padding: 6px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); width: fit-content; }
        .ad-status-tab { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; border: 2px solid transparent; background: transparent; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.15s; color: #9ca3af; }
        .ad-status-tab:hover { background: rgba(255,255,255,0.04); }
        .ad-status-tab.active { background: rgba(255,255,255,0.05); }
        .ad-status-tab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .ad-status-tab-count { padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.05); font-size: 0.7rem; font-weight: 700; }

        .ad-log-input { padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: inherit; min-width: 220px; font-size: 0.85rem; }
        .ad-log-input::placeholder { color: #6b7280; }
        .ad-log-input:focus { outline: none; border-color: #6366f1; }

        .ad-log-select { padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background-color: #1a1a2e !important; color: inherit; font-size: 0.85rem; cursor: pointer; min-width: 240px; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 36px; }
        .ad-log-select:focus { outline: none; border-color: #6366f1; }
        .ad-log-select option { background-color: #1a1a2e !important; color: #ffffff !important; padding: 10px; }

        .ad-log-page-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; cursor: pointer; }
        .ad-log-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ad-logs-table-wrap { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; }
        .ad-logs-table { width: 100%; border-collapse: collapse; }
        .ad-logs-table th { padding: 12px 16px; text-align: left; background: rgba(255,255,255,0.03); color: #9ca3af; font-size: 0.72rem; text-transform: uppercase; font-weight: 600; }
        .ad-logs-table td { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.04); color: inherit; }

        .ad-analytics-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
        .ad-summary-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; text-align: center; }
        .ad-summary-label { font-size: 0.72rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px; }
        .ad-summary-value { font-size: 1.6rem; font-weight: 800; }

        /* ============================================================ */
        /* ☀️  LIGHT MODE OVERRIDES                                       */
        /* ============================================================ */
        [data-theme="light"] .ad-wrapper { background: #f8fafc; color: #1f2937; }
        [data-theme="light"] .ad-sidebar { background: #ffffff; border-right: 1px solid #e5e7eb; box-shadow: 2px 0 8px rgba(0,0,0,0.03); }
        [data-theme="light"] .ad-brand-photo { border-bottom: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-brand-avatar-hint { color: #9ca3af; }
        [data-theme="light"] .ad-nav-item { color: #6b7280; }
        [data-theme="light"] .ad-nav-item:hover { background: #f1f5f9; color: #1f2937; }
        [data-theme="light"] .ad-nav-item.active { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08)); color: #4f46e5; border-left-color: #6366f1; }
        [data-theme="light"] .ad-user { border-top: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-user-info h4 { color: #1f2937; }
        [data-theme="light"] .ad-user-info p { color: #9ca3af; }
        [data-theme="light"] .ad-sidebar-footer { border-top: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-main { background: #f8fafc; }
        [data-theme="light"] .ad-title { color: #1f2937; }
        [data-theme="light"] .ad-toggle { color: #4b5563; }
        [data-theme="light"] .ad-toggle:hover { background: #e5e7eb; border-radius: 6px; }
        [data-theme="light"] .ad-search { background: #ffffff; border: 1px solid #e5e7eb; color: #6b7280; }
        [data-theme="light"] .ad-search input { color: #1f2937; }
        [data-theme="light"] .ad-search input::placeholder { color: #9ca3af; }
        [data-theme="light"] .ad-notification { background: #ffffff; border: 1px solid #e5e7eb; color: #6b7280; }
        [data-theme="light"] .ad-card,
        [data-theme="light"] .ad-kpi-card,
        [data-theme="light"] .ad-form-card,
        [data-theme="light"] .ad-profile-card,
        [data-theme="light"] .ad-client-card,
        [data-theme="light"] .ad-action-card,
        [data-theme="light"] .ad-content-card { background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        [data-theme="light"] .ad-action-card:hover { background: #f9fafb; }
        [data-theme="light"] .ad-kpi-card p,
        [data-theme="light"] .ad-activity-item p,
        [data-theme="light"] .ad-client-info div,
        [data-theme="light"] .ad-stat-label { color: #6b7280; }
        [data-theme="light"] .ad-activity-item { border-bottom: 1px solid #f1f5f9; }
        [data-theme="light"] .ad-table { background: #ffffff; border: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-table th { background: #f9fafb; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-table td { color: #374151; border-bottom: 1px solid #f1f5f9; }
        [data-theme="light"] .ad-page-header h2 { color: #1f2937; }
        [data-theme="light"] .btn-sm { color: #4b5563; border-color: #e5e7eb; }
        [data-theme="light"] .btn-sm:hover { background: #f3f4f6; }
        [data-theme="light"] .btn-outline-primary { color: #6366f1; border-color: rgba(99,102,241,0.3); }
        [data-theme="light"] .btn-outline-primary:hover { background: rgba(99,102,241,0.08); }
        [data-theme="light"] .btn-cancel { color: #374151; border-color: #e5e7eb; }
        [data-theme="light"] .btn-cancel:hover { background: #f3f4f6; }
        [data-theme="light"] .ad-modal { background: #ffffff; color: #1f2937; border: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-modal-header { border-bottom: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-modal-header h3 { color: #6366f1; }
        [data-theme="light"] .ad-modal-close { color: #9ca3af; }
        [data-theme="light"] .ad-modal-close:hover { color: #4b5563; }
        [data-theme="light"] .ad-modal-grid small { color: #6b7280; }
        [data-theme="light"] .ad-modal-grid p { color: #1f2937; }
        [data-theme="light"] .ad-modal-overlay { background: rgba(15, 23, 42, 0.5); }
        [data-theme="light"] .ad-form-group label { color: #374151; }
        [data-theme="light"] .ad-form-group input { background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937; }
        [data-theme="light"] .ad-form-group input::placeholder { color: #9ca3af; }
        [data-theme="light"] .ad-info-title { color: #6366f1; }
        [data-theme="light"] .ad-profile-details div { border-bottom: 1px solid #f1f5f9; }
        [data-theme="light"] .ad-profile-details small { color: #6b7280; }
        [data-theme="light"] .ad-profile-details p { color: #1f2937; }
        [data-theme="light"] .ad-info-grid small { color: #6b7280; }
        [data-theme="light"] .ad-info-grid p { color: #1f2937; }
        [data-theme="light"] .ad-profile-card h3 { color: #1f2937; }
        [data-theme="light"] .ad-profile-card p { color: #6b7280; }
        [data-theme="light"] .ad-role-badge { background: rgba(99,102,241,0.1); color: #6366f1; }
        [data-theme="light"] .ad-client-name { color: #1f2937; }
        [data-theme="light"] .ad-activity-item h4 { color: #1f2937; }
        [data-theme="light"] .ad-footer { color: #9ca3af; border-top: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        [data-theme="light"] .ad-alert-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        [data-theme="light"] .ad-no-data,
        [data-theme="light"] .ad-no-data-block { color: #9ca3af; }
        [data-theme="light"] .ad-status-tabs { background: #ffffff; border: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-status-tab { color: #6b7280; }
        [data-theme="light"] .ad-status-tab:hover { background: #f3f4f6; }
        [data-theme="light"] .ad-status-tab.active { background: #f3f4f6; }
        [data-theme="light"] .ad-status-tab-count { background: #f1f5f9; color: #4b5563; }
        [data-theme="light"] .ad-log-input { background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937; }
        [data-theme="light"] .ad-log-input::placeholder { color: #9ca3af; }
        [data-theme="light"] .ad-log-select { background-color: #ffffff !important; color: #1f2937 !important; border: 1px solid #e5e7eb; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); }
        [data-theme="light"] .ad-log-select option { background-color: #ffffff !important; color: #1f2937 !important; }
        [data-theme="light"] .ad-logs-table-wrap { background: #ffffff; border: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-logs-table th { background: #f9fafb; color: #6b7280; }
        [data-theme="light"] .ad-logs-table td { color: #374151; border-top: 1px solid #f1f5f9; }
        [data-theme="light"] .ad-log-page-btn { color: #374151; border-color: #e5e7eb; }
        [data-theme="light"] .ad-summary-item { background: #f9fafb; border: 1px solid #e5e7eb; }
        [data-theme="light"] .ad-summary-label { color: #6b7280; }
        [data-theme="light"] .ad-pagination { color: #6b7280; }
        [data-theme="light"] .ad-pagination button { border-color: #e5e7eb; color: #4b5563; }
        [data-theme="light"] .ad-pagination button:hover:not(:disabled) { background: #f3f4f6; }
        [data-theme="light"] .ad-brand-avatar { box-shadow: 0 2px 8px rgba(99,102,241,0.15); }

        @media (max-width: 1200px) { .ad-kpi-grid-5 { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) {
          .ad-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .ad-kpi-grid-5 { grid-template-columns: repeat(2, 1fr); }
          .ad-stats-row { grid-template-columns: 1fr; }
          .ad-actions-grid { grid-template-columns: repeat(2, 1fr); }
          .ad-settings-grid { grid-template-columns: 1fr; }
          .ad-header-search { display: none; }
        }
        @media (max-width: 640px) {
          .ad-kpi-grid, .ad-kpi-grid-5 { grid-template-columns: 1fr; }
          .ad-actions-grid { grid-template-columns: 1fr; }
          .ad-main { padding: 16px; }
          .ad-modal { max-width: 100%; }
        }
      `}</style>
      <AdminChatbot />
    </div>
  );
};

export default AdminDashboard;








































// // src/pages/AdminDashboard.jsx
// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import API from '../utils/api';
// import Chart from 'chart.js/auto';

// // ✅ Helper to resolve photo URL
// const getPhotoUrl = (photo) => {
//   if (!photo) return '';
//   if (photo.startsWith('http')) return photo;       // Already absolute
//   if (photo.startsWith('data:')) return photo;       // Base64
//   // Relative path - prepend backend URL
//   const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
//   return `${backendUrl}${photo}`;
// };

// // ----- Small presentational helpers -----
// const KpiCard = ({ label, value, color, icon }) => (
//   <div className="ad-kpi-card" style={{ borderTop: `4px solid ${color}` }}>
//     <div className="ad-kpi-icon" style={{ background: color + '22', color }}>
//       <i className={`fas fa-${icon}`}></i>
//     </div>
//     <div>
//       <h3 style={{ color }}>{value}</h3>
//       <p>{label}</p>
//     </div>
//   </div>
// );

// const formatDate = (d) => {
//   if (!d) return 'N/A';
//   try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return 'N/A'; }
// };

// // ----- Image upload constants -----
// const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// const AdminDashboard = () => {
//   const navigate = useNavigate();
//   const [activeModule, setActiveModule] = useState('dashboard');
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState({ text: '', type: '' });
//   const [user, setUser] = useState(null);
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   // Core data
//   const [stats, setStats] = useState({});
//   const [pendingVerifications, setPendingVerifications] = useState([]);
//   const [allUsers, setAllUsers] = useState([]);
//   const [allDeals, setAllDeals] = useState([]);

//   // Admin profile
//   const [adminProfile, setAdminProfile] = useState({});
//   const [editingAdmin, setEditingAdmin] = useState(false);
//   const [adminForm, setAdminForm] = useState({});
//   const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });

//   // Profile photo
//   const [profilePhoto, setProfilePhoto] = useState(null);
//   const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
//   const profilePhotoInputRef = useRef(null);

//   // Detail modals
//   const [selectedVerification, setSelectedVerification] = useState(null);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [selectedDeal, setSelectedDeal] = useState(null);

//   // Search & pagination
//   const [verificationSearch, setVerificationSearch] = useState('');
//   const [userSearch, setUserSearch] = useState('');
//   const [dealSearch, setDealSearch] = useState('');
//   const [verificationPage, setVerificationPage] = useState(1);
//   const [userPage, setUserPage] = useState(1);
//   const [dealPage, setDealPage] = useState(1);
//   const itemsPerPage = 8;

//   // Chart data
//   const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));
//   const [monthlyGenerators, setMonthlyGenerators] = useState(Array(12).fill(0));
//   const [monthlyBuyers, setMonthlyBuyers] = useState(Array(12).fill(0));

//   const revenueChartRef = useRef(null);
//   const userChartRef = useRef(null);
//   const revenueChartInstance = useRef(null);
//   const userChartInstance = useRef(null);

//   const showMsg = (text, type = 'success') => {
//     setMessage({ text, type });
//     setTimeout(() => setMessage({ text: '', type: '' }), 3500);
//   };

//   const getMonthIndex = (dateStr) => {
//     if (!dateStr) return -1;
//     try { return new Date(dateStr).getMonth(); } catch { return -1; }
//   };

//   // ----- Profile photo upload (Fixed) -----
//   const readFileAsDataURL = (file) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = () => reject(new Error('Could not read image file.'));
//       reader.readAsDataURL(file);
//     });

//   // const handleProfilePhotoChange = async (e) => {
//   //   const file = e.target.files?.[0];
//   //   e.target.value = '';
//   //   if (!file) return;
//   //   if (!file.type.startsWith('image/')) { showMsg('Please choose an image file.', 'error'); return; }
//   //   if (file.size > MAX_IMAGE_SIZE) { showMsg('Image must be under 5MB.', 'error'); return; }

//   //   setProfilePhotoUploading(true);
//   //   try {
//   //     const dataUrl = await readFileAsDataURL(file);
//   //     // Set preview immediately
//   //     setProfilePhoto(dataUrl);

//   //     // Try to upload to backend
//   //     try {
//   //       const fd = new FormData();
//   //       fd.append('profilePhoto', file);
//   //       const res = await API.put('/auth/profile-photo', fd, {
//   //         headers: { 'Content-Type': 'multipart/form-data' },
//   //       });
//   //       // Success - update with server response
//   //       const updatedUser = { ...user, profilePhoto: res.data?.profilePhoto || dataUrl };
//   //       localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//   //       setUser(updatedUser);
//   //       setAdminProfile(prev => ({ ...prev, profilePhoto: res.data?.profilePhoto || dataUrl }));
//   //       showMsg('Profile photo updated!', 'success');
//   //     } catch (err) {
//   //       // Fallback: store in localStorage only (if backend endpoint doesn't exist yet)
//   //       console.warn('Profile photo upload endpoint not available, using localStorage fallback:', err.message);
//   //       const updatedUser = { ...user, profilePhoto: dataUrl };
//   //       localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//   //       setUser(updatedUser);
//   //       setAdminProfile(prev => ({ ...prev, profilePhoto: dataUrl }));
//   //       showMsg('Profile photo updated locally. (Backend endpoint not available)', 'success');
//   //     }
//   //   } catch (err) {
//   //     showMsg(err.message || 'Could not read that image.', 'error');
//   //   } finally {
//   //     setProfilePhotoUploading(false);
//   //   }
//   // };

//   // const handleProfilePhotoChange = async (e) => {
//   //   const file = e.target.files?.[0];
//   //   e.target.value = '';
//   //   if (!file) return;
//   //   if (!file.type.startsWith('image/')) { showMsg('Please choose an image file.', 'error'); return; }
//   //   if (file.size > MAX_IMAGE_SIZE) { showMsg('Image must be under 5MB.', 'error'); return; }

//   //   setProfilePhotoUploading(true);
//   //   try {
//   //     const fd = new FormData();
//   //     fd.append('profilePhoto', file);
//   //     const res = await API.put('/auth/profile-photo', fd, {
//   //       headers: { 'Content-Type': 'multipart/form-data' },
//   //     });

//   //     // ✅ Backend se aaya full URL use karo
//   //     const newPhotoUrl = res.data?.profilePhoto;
//   //     if (newPhotoUrl) {
//   //       setProfilePhoto(newPhotoUrl);
//   //       setAdminProfile(prev => ({ ...prev, profilePhoto: newPhotoUrl }));

//   //       // localStorage me bhi save karo
//   //       const updatedUser = { ...user, profilePhoto: newPhotoUrl };
//   //       localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//   //       setUser(updatedUser);

//   //       showMsg('Profile photo updated!', 'success');
//   //     }
//   //   } catch (err) {
//   //     console.error('Photo upload failed:', err);
//   //     showMsg(err.response?.data?.msg || 'Failed to upload photo', 'error');
//   //   } finally {
//   //     setProfilePhotoUploading(false);
//   //   }
//   // };
//   const handleProfilePhotoChange = async (e) => {
//     const file = e.target.files?.[0];
//     e.target.value = '';
//     if (!file) return;
//     if (!file.type.startsWith('image/')) { showMsg('Please choose an image file.', 'error'); return; }
//     if (file.size > MAX_IMAGE_SIZE) { showMsg('Image must be under 5MB.', 'error'); return; }

//     setProfilePhotoUploading(true);
//     try {
//       const fd = new FormData();
//       fd.append('profilePhoto', file);
//       const res = await API.put('/auth/profile-photo', fd, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       });

//       // ✅ Backend se aaya full URL use karo
//       const newPhotoUrl = res.data?.profilePhoto;
//       if (newPhotoUrl) {
//         setProfilePhoto(newPhotoUrl);
//         setAdminProfile(prev => ({ ...prev, profilePhoto: newPhotoUrl }));

//         // localStorage me bhi save karo
//         const updatedUser = { ...user, profilePhoto: newPhotoUrl };
//         localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//         setUser(updatedUser);

//         showMsg('Profile photo updated!', 'success');
//       }
//     } catch (err) {
//       console.error('Photo upload failed:', err);
//       showMsg(err.response?.data?.msg || 'Failed to upload photo', 'error');
//     } finally {
//       setProfilePhotoUploading(false);
//     }
//   };

//   // Compute monthly aggregates from live data
//   const computeMonthlyStats = useCallback(() => {
//     const revenue = Array(12).fill(0);
//     const generators = Array(12).fill(0);
//     const buyers = Array(12).fill(0);

//     allDeals.forEach(d => {
//       const month = getMonthIndex(d.createdAt);
//       if (month >= 0) revenue[month] += Number(d.platformRevenue || 0);
//     });
//     allUsers.forEach(u => {
//       const month = getMonthIndex(u.createdAt);
//       if (month < 0) return;
//       if (u.role === 'generator') generators[month]++;
//       if (u.role === 'buyer') buyers[month]++;
//     });

//     setMonthlyRevenue(revenue);
//     setMonthlyGenerators(generators);
//     setMonthlyBuyers(buyers);
//   }, [allDeals, allUsers]);

//   // Load all data
//   // const loadData = useCallback(async () => {
//   //   setLoading(true);
//   //   try {
//   //     const [statsRes, unverifiedRes] = await Promise.all([
//   //       API.get('/admin/stats'),
//   //       API.get('/auth/unverified-companies'),
//   //     ]);
//   //     setStats({ ...statsRes.data, pendingVerifications: unverifiedRes.data.length });
//   //     setPendingVerifications(unverifiedRes.data || []);

//   //     try { const r = await API.get('/admin/users'); setAllUsers(r.data || []); } catch (e) { console.error(e); }
//   //     try { const r = await API.get('/deals/all'); setAllDeals(r.data || []); } catch (e) { console.error(e); }
//   //     try {
//   //       const r = await API.get('/auth/profile');
//   //       setAdminProfile(r.data || {});
//   //       setAdminForm(r.data || {});
//   //       if (r.data?.profilePhoto) setProfilePhoto(r.data.profilePhoto);
//   //     } catch (e) { console.error(e); }
//   //   } catch (error) {
//   //     console.error('Error loading data:', error);
//   //     if (error.response?.status === 401) { localStorage.clear(); navigate('/login'); }
//   //   } finally { setLoading(false); }
//   // }, [navigate]);
//   // Load all data
//   const loadData = useCallback(async () => {
//     setLoading(true);
//     try {
//       // ✅ Promise.allSettled use karo taaki ek fail ho toh dusra data load ho jaye
//       const results = await Promise.allSettled([
//         API.get('/admin/stats'),
//         API.get('/auth/unverified-companies'),
//         API.get('/admin/users'),
//         API.get('/deals/all'),
//         API.get('/auth/profile')
//       ]);

//       // Stats
//       if (results[0].status === 'fulfilled') {
//         setStats({ ...results[0].value.data });
//       } else {
//         console.error('Stats failed:', results[0].reason);
//       }

//       // Pending Verifications
//       if (results[1].status === 'fulfilled') {
//         const verificationsData = results[1].value.data || [];
//         setPendingVerifications(verificationsData);
//         setStats(prev => ({ ...prev, pendingVerifications: verificationsData.length }));
//       } else {
//         console.error('Verifications failed:', results[1].reason);
//         setPendingVerifications([]);
//       }

//       // All Users
//       if (results[2].status === 'fulfilled') setAllUsers(results[2].value.data || []);

//       // All Deals
//       if (results[3].status === 'fulfilled') setAllDeals(results[3].value.data || []);

//       // // Admin Profile
//       // if (results[4].status === 'fulfilled') {
//       //   setAdminProfile(results[4].value.data || {});
//       //   setAdminForm(results[4].value.data || {});
//       //   if (results[4].value.data?.profilePhoto) setProfilePhoto(results[4].value.data.profilePhoto);
//       // }
//       // Admin Profile
//       if (results[4].status === 'fulfilled') {
//         const profileData = results[4].value.data || {};
//         setAdminProfile(profileData);
//         setAdminForm(profileData);

//         if (profileData.profilePhoto) {
//           setProfilePhoto(profileData.profilePhoto);

//           // ✅ localStorage sync karo taaki refresh pe bhi rahe
//           const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
//           const updatedUser = { ...currentUser, profilePhoto: profileData.profilePhoto };
//           localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//           setUser(updatedUser);
//         }
//       }

//     } catch (error) {
//       console.error('Unexpected error loading data:', error);
//       if (error.response?.status === 401) { localStorage.clear(); navigate('/login'); }
//     } finally {
//       setLoading(false);
//     }
//   }, [navigate]);

//   useEffect(() => { computeMonthlyStats(); }, [computeMonthlyStats]);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) { navigate('/login'); return; }
//     const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
//     if (!currentUser || currentUser.role !== 'admin') { navigate('/login'); return; }
//     setUser(currentUser);
//     // Load profile photo from localStorage
//     if (currentUser.profilePhoto) setProfilePhoto(currentUser.profilePhoto);
//     loadData();
//   }, [navigate, loadData]);

//   // Charts
//   const initCharts = useCallback(() => {
//     if (!revenueChartRef.current || !userChartRef.current) return;
//     if (revenueChartInstance.current) revenueChartInstance.current.destroy();
//     if (userChartInstance.current) userChartInstance.current.destroy();

//     revenueChartInstance.current = new Chart(revenueChartRef.current.getContext('2d'), {
//       type: 'bar',
//       data: {
//         labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
//         datasets: [{
//           label: 'Platform Revenue (₹)',
//           data: monthlyRevenue,
//           backgroundColor: 'rgba(99,102,241,0.75)',
//           borderColor: '#6366f1',
//           borderWidth: 2,
//           borderRadius: 6,
//         }],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: { legend: { labels: { color: '#9ca3af' } } },
//         scales: {
//           y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
//           x: { grid: { display: false } },
//         },
//       },
//     });

//     userChartInstance.current = new Chart(userChartRef.current.getContext('2d'), {
//       type: 'line',
//       data: {
//         labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
//         datasets: [
//           { label: 'Generators', data: monthlyGenerators, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#60a5fa' },
//           { label: 'Buyers', data: monthlyBuyers, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#a78bfa' },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: { legend: { labels: { color: '#9ca3af' } } },
//         scales: {
//           y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
//           x: { grid: { display: false } },
//         },
//       },
//     });
//   }, [monthlyRevenue, monthlyGenerators, monthlyBuyers]);

//   useEffect(() => {
//     if ((activeModule === 'dashboard' || activeModule === 'analytics') && !loading) {
//       const timer = setTimeout(() => initCharts(), 100);
//       return () => clearTimeout(timer);
//     }
//   }, [activeModule, loading, initCharts]);

//   useEffect(() => {
//     return () => {
//       if (revenueChartInstance.current) revenueChartInstance.current.destroy();
//       if (userChartInstance.current) userChartInstance.current.destroy();
//     };
//   }, []);

//   // Reset pagination on search change
//   useEffect(() => { setVerificationPage(1); }, [verificationSearch]);
//   useEffect(() => { setUserPage(1); }, [userSearch]);
//   useEffect(() => { setDealPage(1); }, [dealSearch]);

//   // Filters
//   const filterBy = (data, term, keys) => {
//     if (!term) return data;
//     const s = term.toLowerCase();
//     return data.filter(item => keys.some(k => item[k]?.toString().toLowerCase().includes(s)));
//   };

//   const filteredVerifications = filterBy(pendingVerifications, verificationSearch, ['companyName', 'email', 'role']);
//   const totalVerificationPages = Math.ceil(filteredVerifications.length / itemsPerPage);
//   const paginatedVerifications = filteredVerifications.slice((verificationPage - 1) * itemsPerPage, verificationPage * itemsPerPage);

//   const filteredUsers = filterBy(allUsers, userSearch, ['name', 'email', 'companyName']);
//   const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
//   const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

//   const filteredDeals = filterBy(allDeals, dealSearch, ['material', 'buyerName', 'generatorName']);
//   const totalDealPages = Math.ceil(filteredDeals.length / itemsPerPage);
//   const paginatedDeals = filteredDeals.slice((dealPage - 1) * itemsPerPage, dealPage * itemsPerPage);

//   // Pagination control
//   const Pagination = ({ currentPage, totalPages, onPageChange }) => {
//     if (totalPages <= 1) return null;
//     return (
//       <div className="ad-pagination">
//         <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
//         <span>Page {currentPage} of {totalPages}</span>
//         <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
//       </div>
//     );
//   };

//   // Handlers
//   const handleApprove = async (userId) => {
//     try { await API.put(`/auth/verify-company/${userId}`); showMsg('Company verified successfully!'); await loadData(); }
//     catch (err) { showMsg(err.response?.data?.msg || 'Failed to verify', 'error'); }
//   };

//   const handleReject = async (userId) => {
//     const reason = prompt('Please enter rejection reason:');
//     if (!reason) return;
//     try { await API.post(`/auth/reject-company/${userId}`, { reason }); showMsg('Company rejected', 'error'); await loadData(); }
//     catch (err) { showMsg(err.response?.data?.msg || 'Failed to reject', 'error'); }
//   };

//   const handleSaveAdminProfile = async (e) => {
//     e.preventDefault();
//     try {
//       await API.put('/auth/profile', { name: adminForm.name, email: adminForm.email, phone: adminForm.phone });
//       if (passwordData.current_password && passwordData.new_password) {
//         await API.put('/auth/change-password', { currentPassword: passwordData.current_password, newPassword: passwordData.new_password });
//         setPasswordData({ current_password: '', new_password: '' });
//       }
//       const profileRes = await API.get('/auth/profile');
//       setAdminProfile(profileRes.data);
//       setAdminForm(profileRes.data);
//       setEditingAdmin(false);
//       showMsg('Profile updated successfully!');
//     } catch (error) {
//       showMsg(error.response?.data?.msg || 'Failed to update profile', 'error');
//     }
//   };

//   const handleLogout = () => { localStorage.clear(); navigate('/login'); };

//   const getStatusBadgeClass = (s) => ({
//     pending: 'ad-status-pending', accepted: 'ad-status-active', completed: 'ad-status-closed',
//     rejected: 'ad-status-rejected', active: 'ad-status-active', blocked: 'ad-status-rejected',
//     approved: 'ad-status-closed',
//   })[s] || 'ad-status-pending';

//   const modules = [
//     { id: 'dashboard', name: 'Dashboard', icon: 'tachometer-alt' },
//     { id: 'verifications', name: 'Verifications', icon: 'user-clock', badge: pendingVerifications.length },
//     { id: 'users', name: 'Users', icon: 'users' },
//     { id: 'deals', name: 'Deals', icon: 'handshake' },
//     { id: 'analytics', name: 'Analytics', icon: 'chart-line' },
//     { id: 'settings', name: 'System Settings', icon: 'cog' },
//   ];

//   const avgDealValue = stats.totalDeals ? Math.round((stats.totalRevenue || 0) / stats.totalDeals) : 0;
//   const completionRate = stats.totalDeals ? Math.round(((stats.completedDeals || 0) / stats.totalDeals) * 100) : 0;

//   if (loading) {
//     return (
//       <div className="ad-loading-container">
//         <div className="ad-loading-card">
//           <div className="ad-spinner"></div>
//           <h2>Loading Dashboard...</h2>
//         </div>
//       </div>
//     );
//   }

//   // ----- Render page content -----
//   const renderContent = () => {
//     switch (activeModule) {
//       case 'dashboard':
//         return (
//           <div className="ad-dashboard">
//             <div className="ad-kpi-grid">
//               <KpiCard label="Total Revenue" value={`₹${stats.totalRevenue || 0}`} color="#fbbf24" icon="wallet" />
//               <KpiCard label="Total Deals" value={stats.totalDeals || 0} color="#22c55e" icon="handshake" />
//               <KpiCard label="Total Users" value={stats.totalUsers || 0} color="#60a5fa" icon="users" />
//               <KpiCard label="Pending Verifications" value={stats.pendingVerifications || 0} color="#f97316" icon="user-clock" />
//             </div>

//             <div className="ad-stats-row">
//               <div className="ad-card" style={{ flex: 2 }}>
//                 <div className="ad-section-title"><span>Monthly Platform Revenue</span></div>
//                 <div style={{ height: 260, position: 'relative' }}><canvas ref={revenueChartRef}></canvas></div>
//               </div>
//               <div className="ad-card" style={{ flex: 1 }}>
//                 <div className="ad-section-title">
//                   <span>Pending Verifications</span>
//                   <button onClick={() => setActiveModule('verifications')}>View All</button>
//                 </div>
//                 {pendingVerifications.slice(0, 5).map(item => (
//                   <div key={item._id} className="ad-activity-item">
//                     <div className="ad-activity-icon"><i className="fas fa-building"></i></div>
//                     <div>
//                       <h4>{item.companyName || 'N/A'}</h4>
//                       <p>{item.email} &middot; {item.role}</p>
//                       <span className="ad-badge ad-status-pending">Pending</span>
//                     </div>
//                   </div>
//                 ))}
//                 {pendingVerifications.length === 0 && <p className="ad-no-data">No pending verifications</p>}
//               </div>
//             </div>

//             <div className="ad-card" style={{ marginBottom: 24 }}>
//               <div className="ad-section-title"><span>User Growth</span></div>
//               <div style={{ height: 240, position: 'relative' }}><canvas ref={userChartRef}></canvas></div>
//             </div>

//             <div className="ad-actions-grid">
//               <button className="ad-action-card" onClick={() => setActiveModule('verifications')}>
//                 <i className="fas fa-user-clock"></i><span>Verifications</span>
//               </button>
//               <button className="ad-action-card" onClick={() => setActiveModule('users')}>
//                 <i className="fas fa-users"></i><span>Manage Users</span>
//               </button>
//               <button className="ad-action-card" onClick={() => setActiveModule('deals')}>
//                 <i className="fas fa-handshake"></i><span>All Deals</span>
//               </button>
//               <button className="ad-action-card" onClick={() => setActiveModule('analytics')}>
//                 <i className="fas fa-chart-line"></i><span>Analytics</span>
//               </button>
//             </div>
//           </div>
//         );

//       case 'verifications':
//         return (
//           <div>
//             <div className="ad-page-header">
//               <h2>Company Verifications ({filteredVerifications.length})</h2>
//               <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search by company or email..." value={verificationSearch} onChange={(e) => setVerificationSearch(e.target.value)} /></div>
//             </div>
//             <div className="ad-onboarding-grid">
//               {paginatedVerifications.length === 0 && (
//                 <div className="ad-no-data-block">
//                   <i className="fas fa-check-circle fa-3x" style={{ color: '#34d399', marginBottom: 12 }}></i>
//                   <p>No pending verifications</p>
//                 </div>
//               )}
//               {paginatedVerifications.map(item => (
//                 <div key={item._id} className="ad-client-card">
//                   <div className="ad-client-header">
//                     <span className="ad-client-name">{item.companyName || 'N/A'}</span>
//                     <span className="ad-badge ad-status-pending">Pending</span>
//                   </div>
//                   <div className="ad-client-info">
//                     <div><i className="fas fa-user-tag"></i> {item.role}</div>
//                     <div><i className="fas fa-envelope"></i> {item.email}</div>
//                     <div><i className="fas fa-id-card"></i> Reg No: {item.companyRegistrationNo || 'N/A'}</div>
//                     <div><i className="fas fa-map-marker-alt"></i> {item.companyCity || 'N/A'}, {item.companyState || 'N/A'}</div>
//                     <div><i className="far fa-calendar-alt"></i> Submitted: {formatDate(item.createdAt)}</div>
//                   </div>
//                   <div className="ad-action-buttons">
//                     <button className="btn-sm btn-outline-warning" onClick={() => setSelectedVerification(item)}><i className="fas fa-eye"></i> Review</button>
//                     <button className="btn-sm btn-outline-success" onClick={() => handleApprove(item._id)}><i className="fas fa-check"></i> Approve</button>
//                     <button className="btn-sm btn-outline-danger" onClick={() => handleReject(item._id)}><i className="fas fa-times"></i> Reject</button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <Pagination currentPage={verificationPage} totalPages={totalVerificationPages} onPageChange={setVerificationPage} />
//           </div>
//         );

//       case 'users':
//         return (
//           <div>
//             <div className="ad-page-header">
//               <h2>All Users ({filteredUsers.length})</h2>
//               <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search users (name, email, company)..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
//             </div>
//             <div className="ad-table">
//               <table className="table">
//                 <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Company</th><th>Verified</th><th>Joined</th><th>Action</th></tr></thead>
//                 <tbody>
//                   {paginatedUsers.map(u => (
//                     <tr key={u._id}>
//                       <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="ad-avatar-sm">{u.name?.charAt(0)}</div><strong>{u.name}</strong></div></td>
//                       <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
//                       <td>{u.email}</td>
//                       <td>{u.companyName || '—'}</td>
//                       <td><span className={`ad-badge ${u.isCompanyVerified ? 'ad-status-closed' : 'ad-status-pending'}`}>{u.isCompanyVerified ? 'Verified' : 'Unverified'}</span></td>
//                       <td><small style={{ color: '#9ca3af' }}>{formatDate(u.createdAt)}</small></td>
//                       <td><button className="btn-sm btn-outline-primary" onClick={() => setSelectedUser(u)}>Review</button></td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               {paginatedUsers.length === 0 && <div className="ad-no-data-block"><i className="fas fa-users fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i><p>No users found</p></div>}
//             </div>
//             <Pagination currentPage={userPage} totalPages={totalUserPages} onPageChange={setUserPage} />
//           </div>
//         );

//       case 'deals':
//         return (
//           <div>
//             <div className="ad-page-header">
//               <h2>All Deals ({filteredDeals.length})</h2>
//               <div className="ad-search"><i className="fas fa-search"></i><input type="text" placeholder="Search by material, buyer, generator..." value={dealSearch} onChange={(e) => setDealSearch(e.target.value)} /></div>
//             </div>
//             <div className="ad-table">
//               <table className="table">
//                 <thead><tr><th>Material</th><th>Qty</th><th>Total</th><th>Buyer</th><th>Generator</th><th>Status</th><th>Commission</th><th>Date</th><th>Action</th></tr></thead>
//                 <tbody>
//                   {paginatedDeals.map(d => (
//                     <tr key={d._id}>
//                       <td><strong>{d.material}</strong></td>
//                       <td>{d.quantity} kg</td>
//                       <td>₹{d.totalAmount}</td>
//                       <td>{d.buyerName || '—'}</td>
//                       <td>{d.generatorName || '—'}</td>
//                       <td><span className={`ad-badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span></td>
//                       <td style={{ color: '#fbbf24' }}>₹{d.platformRevenue}</td>
//                       <td><small style={{ color: '#9ca3af' }}>{formatDate(d.createdAt)}</small></td>
//                       <td><button className="btn-sm btn-outline-primary" onClick={() => setSelectedDeal(d)}>Details</button></td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               {paginatedDeals.length === 0 && <div className="ad-no-data-block"><i className="fas fa-handshake fa-3x" style={{ color: '#4b5563', marginBottom: 12 }}></i><p>No deals found</p></div>}
//             </div>
//             <Pagination currentPage={dealPage} totalPages={totalDealPages} onPageChange={setDealPage} />
//           </div>
//         );

//       case 'analytics':
//         return (
//           <div>
//             <div className="ad-page-header"><h2>Analytics Overview</h2></div>
//             <div className="ad-kpi-grid">
//               <KpiCard label="Avg. Deal Value" value={`₹${avgDealValue}`} color="#fbbf24" icon="chart-bar" />
//               <KpiCard label="Total Revenue" value={`₹${stats.totalRevenue || 0}`} color="#22c55e" icon="wallet" />
//               <KpiCard label="Total Users" value={stats.totalUsers || 0} color="#60a5fa" icon="users" />
//               <KpiCard label="Completion Rate" value={`${completionRate}%`} color="#a78bfa" icon="percentage" />
//             </div>
//             <div className="ad-stats-row">
//               <div className="ad-card" style={{ flex: 1 }}>
//                 <div className="ad-section-title"><span>Monthly Revenue Trend</span></div>
//                 <div style={{ height: 240, position: 'relative' }}><canvas ref={revenueChartRef}></canvas></div>
//               </div>
//               <div className="ad-card" style={{ flex: 1 }}>
//                 <div className="ad-section-title"><span>User Growth Overview</span></div>
//                 <div style={{ height: 240, position: 'relative' }}><canvas ref={userChartRef}></canvas></div>
//               </div>
//             </div>
//           </div>
//         );

//       case 'settings':
//         return (
//           <div className="ad-form-card" style={{ maxWidth: 760 }}>
//             <div className="ad-page-header">
//               <h2>System Settings</h2>
//               {!editingAdmin && <button className="ad-btn-primary" onClick={() => setEditingAdmin(true)}><i className="fas fa-edit"></i> Edit Profile</button>}
//             </div>
//             {!editingAdmin ? (
//               <div className="ad-settings-grid">
//                 <div className="ad-profile-card">
//                   <div className="ad-profile-avatar-large" onClick={() => profilePhotoInputRef.current?.click()} title="Click to update photo">
//                     {profilePhotoUploading ? <i className="fas fa-spinner fa-spin"></i> : profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <span>{adminProfile.name?.charAt(0) || 'A'}</span>}
//                     <span className="ad-profile-avatar-overlay"><i className="fas fa-camera"></i></span>
//                   </div>
//                   <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
//                   <h3>{adminProfile.name || 'Admin User'}</h3>
//                   <p>{adminProfile.email}</p>
//                   <span className="ad-role-badge">Super Admin</span>
//                   <div className="ad-profile-details">
//                     <div><small>Phone</small><p>{adminProfile.phone || 'Not set'}</p></div>
//                     <div><small>Account Created</small><p>{adminProfile.createdAt ? formatDate(adminProfile.createdAt) : 'N/A'}</p></div>
//                   </div>
//                 </div>
//                 <div className="ad-card">
//                   <h4 className="ad-info-title">Personal Information</h4>
//                   <div className="ad-info-grid">
//                     <div><small>Full Name</small><p>{adminProfile.name || 'N/A'}</p></div>
//                     <div><small>Email</small><p>{adminProfile.email || 'N/A'}</p></div>
//                     <div><small>Phone</small><p>{adminProfile.phone || 'N/A'}</p></div>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <form onSubmit={handleSaveAdminProfile}>
//                 <div className="ad-form-grid">
//                   <div className="ad-form-group"><label>Full Name</label><input type="text" value={adminForm.name || ''} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} /></div>
//                   <div className="ad-form-group"><label>Email</label><input type="email" value={adminForm.email || ''} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} /></div>
//                   <div className="ad-form-group"><label>Phone Number</label><input type="tel" value={adminForm.phone || ''} onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })} /></div>
//                 </div>
//                 <h4 className="ad-info-title" style={{ marginTop: 20 }}>Change Password</h4>
//                 <div className="ad-form-grid">
//                   <div className="ad-form-group"><label>Current Password</label><input type="password" value={passwordData.current_password} onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} placeholder="Leave blank to keep unchanged" /></div>
//                   <div className="ad-form-group"><label>New Password</label><input type="password" value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} placeholder="Enter new password" /></div>
//                 </div>
//                 <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
//                   <button type="submit" className="ad-btn-primary"><i className="fas fa-save"></i> Save Changes</button>
//                   <button type="button" className="btn-cancel" onClick={() => setEditingAdmin(false)}>Cancel</button>
//                 </div>
//               </form>
//             )}
//           </div>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="ad-wrapper">
//       {/* Sidebar */}
//       <div className={`ad-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
//         <div className="ad-brand-photo">
//           <div className="ad-brand-avatar" onClick={() => profilePhotoInputRef.current?.click()} title="Update photo">
//             {profilePhotoUploading ? <i className="fas fa-spinner fa-spin"></i> : profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <span>{adminProfile.name?.charAt(0) || user?.name?.charAt(0) || 'A'}</span>}
//             <span className="ad-brand-avatar-overlay"><i className="fas fa-camera"></i></span>
//           </div>
//           <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
//           {!sidebarCollapsed && <p className="ad-brand-avatar-hint">Update photo</p>}
//         </div>

//         <div className="ad-logo">
//           <div className="ad-logo-icon"><i className="fas fa-recycle"></i></div>
//           {!sidebarCollapsed && <div className="ad-logo-text">WasteExchange AI</div>}
//         </div>

//         <div className="ad-nav">
//           {modules.map(module => (
//             <div key={module.id} className={`ad-nav-item ${activeModule === module.id ? 'active' : ''}`} onClick={() => setActiveModule(module.id)}>
//               <i className={`fas fa-${module.icon}`}></i>
//               {!sidebarCollapsed && <span>{module.name}</span>}
//               {module.badge > 0 && <span className="ad-badge-pill">{module.badge}</span>}
//             </div>
//           ))}
//         </div>

//         {!sidebarCollapsed && (
//           <div className="ad-user">
//             <div className="ad-avatar">{adminProfile.name?.charAt(0) || user?.name?.charAt(0) || 'A'}</div>
//             <div className="ad-user-info">
//               <h4>{adminProfile.name || user?.name || 'Admin'}</h4>
//               <p>System Administrator</p>
//             </div>
//           </div>
//         )}

//         <div className="ad-sidebar-footer">
//           <i className="fas fa-bolt"></i>
//           {!sidebarCollapsed && <span>AI Powered</span>}
//         </div>
//       </div>

//       {/* Main */}
//       <div className="ad-main">
//         <div className="ad-header">
//           <div className="ad-title">
//             <button className="ad-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><i className="fas fa-bars"></i></button>
//             <span>{modules.find(m => m.id === activeModule)?.name || 'Dashboard'}</span>
//           </div>
//           <div className="ad-header-actions">
//             <div className="ad-search ad-header-search"><i className="fas fa-search"></i><input type="text" placeholder="Quick search..." /></div>
//             <div className="ad-notification"><i className="fas fa-bell"></i>{pendingVerifications.length > 0 && <span className="ad-dot"></span>}</div>
//             <button className="ad-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Logout</button>
//           </div>
//         </div>

//         {message.text && (
//           <div className={`ad-alert ${message.type === 'success' ? 'ad-alert-success' : 'ad-alert-danger'}`}>
//             <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i> {message.text}
//           </div>
//         )}

//         {renderContent()}

//         <footer className="ad-footer"><p>WasteExchange AI — Smart Waste Marketplace | Admin Portal | © 2026</p></footer>
//       </div>

//       {/* Verification detail modal */}
//       {selectedVerification && (
//         <div className="ad-modal-overlay" onClick={() => setSelectedVerification(null)}>
//           <div className="ad-modal" onClick={e => e.stopPropagation()}>
//             <div className="ad-modal-header">
//               <div><h3><i className="fas fa-building me-2"></i>Company Verification Details</h3></div>
//               <button onClick={() => setSelectedVerification(null)} className="ad-modal-close">&times;</button>
//             </div>
//             <div className="ad-modal-body">
//               <div className="ad-modal-grid">
//                 {[['Company Name', selectedVerification.companyName || 'N/A'], ['Role', selectedVerification.role], ['Email', selectedVerification.email], ['Registration No.', selectedVerification.companyRegistrationNo || 'N/A'], ['Address', selectedVerification.companyAddress || 'N/A'], ['City', selectedVerification.companyCity || 'N/A'], ['State', selectedVerification.companyState || 'N/A'], ['Submitted', formatDate(selectedVerification.createdAt)]].map(([label, val], i) => (
//                   <div key={i}><small>{label}</small><p>{val}</p></div>
//                 ))}
//               </div>
//               <div className="ad-modal-footer" style={{ justifyContent: 'flex-start' }}>
//                 <button className="btn-sm btn-outline-success" onClick={() => { handleApprove(selectedVerification._id); setSelectedVerification(null); }}><i className="fas fa-check"></i> Approve</button>
//                 <button className="btn-sm btn-outline-danger" onClick={() => { handleReject(selectedVerification._id); setSelectedVerification(null); }}><i className="fas fa-times"></i> Reject</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* User detail modal */}
//       {selectedUser && (
//         <div className="ad-modal-overlay" onClick={() => setSelectedUser(null)}>
//           <div className="ad-modal" onClick={e => e.stopPropagation()}>
//             <div className="ad-modal-header">
//               <div><h3><i className="fas fa-user me-2"></i>User Details</h3></div>
//               <button onClick={() => setSelectedUser(null)} className="ad-modal-close">&times;</button>
//             </div>
//             <div className="ad-modal-body">
//               <div className="ad-modal-grid">
//                 {[['Full Name', selectedUser.name], ['Role', selectedUser.role], ['Email', selectedUser.email], ['Company', selectedUser.companyName || 'N/A'], ['Verified', selectedUser.isCompanyVerified ? 'Yes' : 'No'], ['Joined', formatDate(selectedUser.createdAt)]].map(([label, val], i) => (
//                   <div key={i}><small>{label}</small><p>{val}</p></div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Deal detail modal */}
//       {selectedDeal && (
//         <div className="ad-modal-overlay" onClick={() => setSelectedDeal(null)}>
//           <div className="ad-modal" onClick={e => e.stopPropagation()}>
//             <div className="ad-modal-header">
//               <div><h3><i className="fas fa-handshake me-2"></i>Deal Details</h3></div>
//               <button onClick={() => setSelectedDeal(null)} className="ad-modal-close">&times;</button>
//             </div>
//             <div className="ad-modal-body">
//               <div className="ad-modal-grid">
//                 {[['Material', selectedDeal.material], ['Quantity', `${selectedDeal.quantity} kg`], ['Total Amount', `₹${selectedDeal.totalAmount}`], ['Platform Revenue', `₹${selectedDeal.platformRevenue}`], ['Buyer', selectedDeal.buyerName || 'N/A'], ['Generator', selectedDeal.generatorName || 'N/A'], ['Status', selectedDeal.status], ['Date', formatDate(selectedDeal.createdAt)]].map(([label, val], i) => (
//                   <div key={i}><small>{label}</small><p>{val}</p></div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       <style>{`
//         /* ===== DARK THEME – WasteExchange AI Admin (matches Generator Dashboard) ===== */
//         * { box-sizing: border-box; }
//         .ad-wrapper { display: flex; min-height: 100vh; background: #0a0a0f; font-family: 'Inter', sans-serif; color: #e5e7eb; }

//         /* ----- Sidebar ----- */
//         .ad-sidebar {
//           width: 260px;
//           background: rgba(255,255,255,0.03);
//           backdrop-filter: blur(20px);
//           border-right: 1px solid rgba(255,255,255,0.05);
//           display: flex;
//           flex-direction: column;
//           padding: 20px 0;
//           transition: width 0.2s;
//           flex-shrink: 0;
//         }
//         .ad-sidebar.collapsed { width: 80px; }

//         .ad-brand-photo {
//           display: flex; flex-direction: column; align-items: center; gap: 6px;
//           padding: 18px 16px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 6px;
//         }
//         .ad-brand-avatar {
//           position: relative; width: 64px; height: 64px; border-radius: 50%;
//           background: linear-gradient(135deg, #6366f1, #8b5cf6);
//           color: white; display: flex; align-items: center; justify-content: center;
//           font-weight: 800; font-size: 1.4rem; cursor: pointer; overflow: hidden;
//           border: 3px solid rgba(99,102,241,0.3); transition: 0.2s;
//         }
//         .ad-brand-avatar:hover { transform: scale(1.05); border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
//         .ad-brand-avatar img { width: 100%; height: 100%; object-fit: cover; }
//         .ad-brand-avatar-overlay {
//           position: absolute; inset: 0; background: rgba(0,0,0,0.5);
//           display: flex; align-items: center; justify-content: center;
//           opacity: 0; transition: 0.2s; color: white; font-size: 0.9rem;
//         }
//         .ad-brand-avatar:hover .ad-brand-avatar-overlay { opacity: 1; }
//         .ad-brand-avatar-hint { margin: 0; font-size: 0.65rem; color: rgba(255,255,255,0.4); }

//         .ad-logo { display: flex; align-items: center; gap: 12px; padding: 4px 24px 24px; }
//         .ad-logo-icon {
//           width: 40px; height: 40px; border-radius: 10px;
//           background: linear-gradient(135deg, #6366f1, #8b5cf6);
//           display: flex; align-items: center; justify-content: center;
//           font-size: 1.1rem; flex-shrink: 0; color: white;
//         }
//         .ad-logo-text { font-size: 1.05rem; font-weight: 700; white-space: nowrap; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

//         .ad-nav { flex: 1; padding: 0 12px; }
//         .ad-nav-item {
//           display: flex; align-items: center; gap: 14px;
//           padding: 12px 14px; border-radius: 10px; cursor: pointer;
//           color: rgba(255,255,255,0.6); margin-bottom: 4px; transition: 0.15s;
//           border-left: 3px solid transparent; font-size: 0.9rem; position: relative;
//         }
//         .ad-nav-item i { width: 18px; text-align: center; }
//         .ad-nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
//         .ad-nav-item.active { background: rgba(99,102,241,0.12); color: white; font-weight: 600; border-left: 3px solid #8b5cf6; }
//         .ad-badge-pill { margin-left: auto; background: #f97316; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }

//         .ad-user { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 12px; }
//         .ad-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; color: white; }
//         .ad-user-info h4 { margin: 0; font-size: 0.9rem; color: white; }
//         .ad-user-info p { margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.5); }

//         .ad-sidebar-footer {
//           display: flex; align-items: center; justify-content: center; gap: 8px;
//           padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.05);
//           color: #8b5cf6; font-weight: 600; font-size: 0.8rem;
//         }

//         /* ----- Main ----- */
//         .ad-main { flex: 1; padding: 24px 32px; overflow-y: auto; background: #0a0a0f; min-width: 0; }
//         .ad-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
//         .ad-title { display: flex; align-items: center; gap: 14px; font-size: 1.4rem; font-weight: 700; color: white; }
//         .ad-toggle { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #9ca3af; }
//         .ad-header-actions { display: flex; align-items: center; gap: 14px; }
//         .ad-header-search { width: 220px; }

//         .ad-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 14px; color: #6b7280; }
//         .ad-search input { border: none; outline: none; flex: 1; font-size: 0.85rem; background: transparent; color: white; }
//         .ad-search input::placeholder { color: #6b7280; }

//         .ad-notification { position: relative; width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: #9ca3af; flex-shrink: 0; }
//         .ad-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
//         .ad-logout { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); padding: 8px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.15s; white-space: nowrap; }
//         .ad-logout:hover { background: rgba(248,113,113,0.2); }

//         .ad-alert { padding: 12px 18px; border-radius: 10px; margin-bottom: 18px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
//         .ad-alert-success { background: rgba(34,197,94,0.12); color: #34d399; border: 1px solid rgba(34,197,94,0.2); }
//         .ad-alert-danger { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }

//         /* ----- KPI ----- */
//         .ad-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
//         .ad-kpi-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid rgba(255,255,255,0.05); }
//         .ad-kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
//         .ad-kpi-card h3 { margin: 0; font-size: 1.6rem; font-weight: 700; }
//         .ad-kpi-card p { margin: 0; color: #9ca3af; font-size: 0.8rem; }

//         /* ----- Dashboard ----- */
//         .ad-stats-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
//         .ad-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); }
//         .ad-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-weight: 600; color: #e5e7eb; }
//         .ad-section-title button { background: none; border: none; color: #a78bfa; font-weight: 600; cursor: pointer; font-size: 0.85rem; }

//         .ad-activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
//         .ad-activity-item:last-child { border-bottom: none; }
//         .ad-activity-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(99,102,241,0.15); color: #818cf8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
//         .ad-activity-item h4 { margin: 0; font-size: 0.9rem; color: white; }
//         .ad-activity-item p { margin: 2px 0; font-size: 0.8rem; color: #9ca3af; }

//         .ad-actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
//         .ad-action-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 22px; text-align: center; cursor: pointer; transition: 0.2s; }
//         .ad-action-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
//         .ad-action-card i { font-size: 1.7rem; color: #8b5cf6; display: block; margin-bottom: 8px; }
//         .ad-action-card span { font-weight: 600; font-size: 0.9rem; color: #e5e7eb; }

//         /* ----- Buttons ----- */
//         .ad-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: 0.15s; }
//         .ad-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.3); }
//         .btn-cancel { padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; font-weight: 600; }
//         .btn-cancel:hover { background: rgba(255,255,255,0.05); }

//         .btn-sm { padding: 5px 11px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; font-size: 0.8rem; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
//         .btn-sm:hover { background: rgba(255,255,255,0.05); }
//         .btn-outline-primary { color: #818cf8; border-color: rgba(99,102,241,0.3); }
//         .btn-outline-primary:hover { background: rgba(99,102,241,0.15); }
//         .btn-outline-danger { color: #f87171; border-color: rgba(248,113,113,0.3); }
//         .btn-outline-danger:hover { background: rgba(248,113,113,0.15); }
//         .btn-outline-success { color: #34d399; border-color: rgba(52,211,153,0.3); }
//         .btn-outline-success:hover { background: rgba(52,211,153,0.15); }
//         .btn-outline-warning { color: #fbbf24; border-color: rgba(251,191,36,0.3); }
//         .btn-outline-warning:hover { background: rgba(251,191,36,0.15); }

//         /* ----- Table ----- */
//         .ad-table { background: rgba(255,255,255,0.03); border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
//         .ad-table table { width: 100%; border-collapse: collapse; }
//         .ad-table th { text-align: left; padding: 14px 18px; background: rgba(255,255,255,0.03); color: #9ca3af; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); }
//         .ad-table td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; font-size: 0.9rem; color: #e5e7eb; }
//         .ad-table tr:last-child td { border-bottom: none; }
//         .ad-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }

//         .ad-badge { padding: 3px 11px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: capitalize; display: inline-block; }
//         .ad-status-active { background: rgba(34,197,94,0.15); color: #34d399; }
//         .ad-status-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
//         .ad-status-closed { background: rgba(107,114,128,0.15); color: #9ca3af; }
//         .ad-status-rejected { background: rgba(248,113,113,0.15); color: #f87171; }

//         .ad-no-data-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: #6b7280; text-align: center; grid-column: 1/-1; }
//         .ad-no-data { color: #6b7280; text-align: center; padding: 12px; }

//         .ad-pagination { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; color: #9ca3af; font-size: 0.85rem; }
//         .ad-pagination button { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e5e7eb; cursor: pointer; }
//         .ad-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

//         /* ----- Onboarding / verification cards ----- */
//         .ad-onboarding-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
//         .ad-client-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 18px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid #fbbf24; }
//         .ad-client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
//         .ad-client-name { font-weight: 700; color: white; font-size: 0.95rem; }
//         .ad-client-info div { font-size: 0.83rem; color: #9ca3af; margin-bottom: 5px; }
//         .ad-client-info i { width: 16px; color: #6b7280; margin-right: 6px; }
//         .ad-action-buttons { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

//         /* ----- Page header ----- */
//         .ad-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
//         .ad-page-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: white; }

//         /* ----- Settings ----- */
//         .ad-form-card { background: rgba(255,255,255,0.03); border-radius: 14px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); }
//         .ad-settings-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
//         .ad-profile-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 24px; text-align: center; }
//         .ad-profile-avatar-large { position: relative; width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 12px; cursor: pointer; overflow: hidden; border: 3px solid rgba(99,102,241,0.3); transition: 0.2s; }
//         .ad-profile-avatar-large:hover { border-color: #8b5cf6; transform: scale(1.03); }
//         .ad-profile-avatar-large img { width: 100%; height: 100%; object-fit: cover; }
//         .ad-profile-avatar-large span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
//         .ad-profile-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.1rem; opacity: 0; transition: 0.2s; }
//         .ad-profile-avatar-large:hover .ad-profile-avatar-overlay { opacity: 1; }
//         .ad-profile-card h3 { margin: 0; color: white; font-size: 1.05rem; }
//         .ad-profile-card p { margin: 2px 0; color: #9ca3af; font-size: 0.85rem; }
//         .ad-role-badge { background: rgba(99,102,241,0.15); color: #a78bfa; padding: 3px 14px; border-radius: 999px; font-size: 0.75rem; display: inline-block; margin-top: 4px; }
//         .ad-profile-details { margin-top: 16px; text-align: left; font-size: 0.85rem; }
//         .ad-profile-details div { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
//         .ad-profile-details small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
//         .ad-profile-details p { margin: 2px 0 0; color: #d1d5db; }

//         .ad-info-title { color: #a78bfa; margin-top: 0; font-size: 1rem; font-weight: 600; }
//         .ad-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
//         .ad-info-grid small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
//         .ad-info-grid p { margin: 4px 0 0; color: #d1d5db; font-size: 0.9rem; }

//         .ad-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
//         .ad-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: #d1d5db; }
//         .ad-form-group input { width: 100%; padding: 9px 12px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 0.9rem; }
//         .ad-form-group input::placeholder { color: #6b7280; }
//         .ad-form-group input:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.15); }

//         /* ----- Modal ----- */
//         .ad-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 16px; }
//         .ad-modal { background: #1a1a2e; border-radius: 16px; max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
//         .ad-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
//         .ad-modal-header h3 { margin: 0; color: #a78bfa; font-size: 1.05rem; }
//         .ad-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; transition: 0.15s; }
//         .ad-modal-close:hover { color: #d1d5db; }
//         .ad-modal-body { padding: 24px; }
//         .ad-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
//         .ad-modal-grid small { color: #9ca3af; font-weight: 500; display: block; font-size: 0.7rem; }
//         .ad-modal-grid p { margin: 4px 0 0; color: #d1d5db; font-size: 0.9rem; }
//         .ad-modal-footer { display: flex; gap: 12px; margin-top: 18px; }

//         /* ----- Loading ----- */
//         .ad-loading-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0f; }
//         .ad-loading-card { text-align: center; color: #9ca3af; }
//         .ad-spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #8b5cf6; border-radius: 50%; margin: 0 auto 16px; animation: ad-spin 0.8s linear infinite; }
//         @keyframes ad-spin { to { transform: rotate(360deg); } }

//         .ad-footer { margin-top: 8px; padding-top: 16px; text-align: center; font-size: 0.8rem; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.05); }

//         @media (max-width: 900px) {
//           .ad-kpi-grid { grid-template-columns: repeat(2, 1fr); }
//           .ad-stats-row { grid-template-columns: 1fr; }
//           .ad-actions-grid { grid-template-columns: repeat(2, 1fr); }
//           .ad-settings-grid { grid-template-columns: 1fr; }
//           .ad-header-search { display: none; }
//         }
//         @media (max-width: 640px) {
//           .ad-kpi-grid { grid-template-columns: 1fr; }
//           .ad-actions-grid { grid-template-columns: 1fr; }
//           .ad-main { padding: 16px; }
//           .ad-modal { max-width: 100%; }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default AdminDashboard;