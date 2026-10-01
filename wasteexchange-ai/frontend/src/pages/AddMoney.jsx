// src/pages/AddMoney.jsx
import React, { useState } from 'react';
import API from '../utils/api';
import RazorpayPaymentModal from '../components/RazorpayPaymentModal';

const AddMoney = ({ user, walletTransactions = [], onRefresh }) => {
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newPin, setNewPin] = useState('');
  const [showSetPin, setShowSetPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [razorpayModal, setRazorpayModal] = useState({ open: false, amount: 0, orderId: null });

  const handleSetPin = async () => {
    if (newPin.length !== 4) return alert('PIN must be exactly 4 digits');
    setPinLoading(true);
    try {
      const res = await API.post('/payment/set-pin', { pin: newPin });
      alert(res.data.message || '✅ Payment PIN set successfully!');
      setShowSetPin(false);
      setNewPin('');
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.msg || 'Error setting PIN.');
    } finally { setPinLoading(false); }
  };

  const handleAddMoney = async () => {
    if (!amount || !pin) return setError('Please enter both amount and PIN');
    if (Number(amount) < 100) return setError('Minimum amount is ₹100');
    if (pin.length !== 4) return setError('PIN must be 4 digits');
    setLoading(true); setError('');
    try {
      const orderRes = await API.post('/payment/create-order', { amount: Number(amount), purpose: 'wallet_topup' });
      setRazorpayModal({ open: true, amount: Number(amount), orderId: orderRes.data.orderId });
    } catch (err) { setError('Failed to initiate payment. Try again.'); } finally { setLoading(false); }
  };

  const handleRazorpaySuccess = async (paymentId, response) => {
    setRazorpayModal({ open: false, amount: 0, orderId: null });
    setLoading(true);
    try {
      const res = await API.post('/payment/add-money', {
        amount: Number(amount),
        pin: pin,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
      alert(res.data.message || '✅ Payment successful! Invoice sent to email.');
      setAmount(''); setPin('');
      if (onRefresh) onRefresh();
    } catch (err) { setError(err.response?.data?.message || 'Payment verification failed.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ color: 'white', marginBottom: 24, fontSize: '1.3rem' }}>💰 Add Money</h2>
      <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.06))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase' }}><i className="fas fa-wallet me-2"></i>Current Balance</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#22c55e' }}>₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</div>
      </div>

      {showSetPin ? (
        <div className="bd-content-card" style={{ marginBottom: 20, padding: '15px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h4 style={{ color: '#a78bfa', marginBottom: '10px' }}>Set Payment PIN</h4>
          <input type="password" maxLength="4" placeholder="Enter 4-digit PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className="bd-form-input" style={{ marginBottom: '10px', letterSpacing: '4px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSetPin} disabled={pinLoading} className="bd-btn-primary">{pinLoading ? 'Setting...' : 'Set PIN'}</button>
            <button onClick={() => setShowSetPin(false)} className="bd-btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button onClick={() => setShowSetPin(true)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Set / Change Payment PIN?</button>
        </div>
      )}

      <div className="bd-content-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, color: '#a78bfa', fontSize: '1rem', marginBottom: 18 }}><i className="fas fa-plus-circle me-2"></i>Add Funds</h3>
        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '9px', fontSize: '0.82rem', marginBottom: '14px' }}>⚠️ {error}</div>}
        <div className="bd-form-group">
          <label>Amount (₹)</label>
          <input type="number" className="bd-form-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount (min ₹100)" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[500, 1000, 2000, 5000, 10000].map(amt => (
            <button key={amt} type="button" onClick={() => setAmount(String(amt))} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>+₹{amt.toLocaleString('en-IN')}</button>
          ))}
        </div>
        <div className="bd-form-group">
          <label>Payment PIN (4 Digits)</label>
          <input type="password" maxLength="4" className="bd-form-input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter your 4-digit PIN" style={{ letterSpacing: '4px' }} />
        </div>
        <button onClick={handleAddMoney} className="bd-btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
          {loading ? 'Processing Payment...' : <><i className="fas fa-plus me-2"></i>Add Money</>}
        </button>
      </div>

      <div className="bd-content-card">
        <div className="bd-card-title">
          <span><i className="fas fa-history me-2" style={{ color: '#60a5fa' }}></i>Transaction History ({walletTransactions.length})</span>
        </div>
        {walletTransactions.length === 0 ? (
          <div className="bd-empty-state" style={{ padding: '32px 16px' }}><div className="bd-empty-icon">💳</div><p>No transactions yet</p></div>
        ) : (
          <div className="bd-table-wrap">
            <table className="bd-data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {walletTransactions.map(tx => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx._id}>
                      <td><small style={{ color: '#9ca3af' }}>{new Date(tx.createdAt).toLocaleString('en-IN')}</small></td>
                      <td><span style={{ color: isCredit ? '#22c55e' : '#f87171', fontWeight: 600 }}>{tx.type}</span></td>
                      <td><small style={{ color: '#9ca3af' }}>{tx.method || '—'}</small></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isCredit ? '#22c55e' : '#f87171' }}>{isCredit ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#d1d5db' }}>₹{(tx.balanceAfter || 0).toLocaleString('en-IN')}</td>
                      <td><span className="bd-status-badge bd-status-open">{tx.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RazorpayPaymentModal open={razorpayModal.open} amount={razorpayModal.amount} purpose="wallet_topup" onClose={() => setRazorpayModal({ open: false, amount: 0, orderId: null })} onSuccess={handleRazorpaySuccess} />
    </div>
  );
};

export default AddMoney;