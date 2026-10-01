// src/components/DealCard.jsx
import React, { useState } from 'react';
import API from '../utils/api';
import RazorpayPaymentModal from './RazorpayPaymentModal';

const DealCard = ({ deal, userRole, onAccept, onComplete, user, requirements = [], onRefresh }) => {
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [selectedReq, setSelectedReq] = useState(''); // ✅ Requirement selection
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isGenerator = userRole === 'generator';
  const isBuyer = userRole === 'buyer';
  const colors = { requested: '#f97316', offered: '#f97316', otp_sent: '#fbbf24', otp_verified: '#60a5fa', accepted: '#eab308', completed: '#22c55e' };

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/deals/request-otp', { dealId: deal._id });
      alert(res.data.message || 'OTP sent to your email!');
      setShowOtpModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error requesting OTP');
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return setError('Enter valid 6-digit OTP');
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/deals/verify-otp', { dealId: deal._id, otp });
      alert(res.data.message || 'OTP Verified!');
      setShowOtpModal(false);
      setShowPaymentChoice(true); // ✅ OTP verify hone ke baad Payment Modal khulega
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // Step 3a: Pay via Wallet
  const handlePayViaWallet = async () => {
    if ((user?.walletBalance || 0) < deal.buyerTotalPayment) {
      return alert(`Insufficient wallet balance! Need ₹${deal.buyerTotalPayment}, you have ₹${user?.walletBalance || 0}.`);
    }
    setLoading(true);
    try {
      await API.put(`/deals/${deal._id}/accept`, { requirementId: selectedReq }); // ✅ Pass requirementId
      alert('✅ Deal accepted via Wallet! Invoice sent to email.');
      setShowPaymentChoice(false);
      if (onAccept) onAccept();
    } catch (err) {
      alert(err.response?.data?.msg || 'Wallet payment failed');
    } finally { setLoading(false); }
  };

  // Step 3b: Razorpay Success Handler
  const handleRazorpaySuccess = async (paymentId, response) => {
    try {
      await API.put(`/deals/${deal._id}/accept-razorpay`, {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        requirementId: selectedReq // ✅ Pass requirementId
      });
      alert('✅ Deal accepted via Razorpay! Invoice sent to email.');
      setShowRazorpay(false);
      setShowPaymentChoice(false);
      if (onAccept) onAccept();
    } catch (err) {
      alert('Payment verification failed: ' + (err.response?.data?.msg || err.message));
    }
  };

  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '0.8rem', borderLeft: `4px solid ${colors[deal.status] || '#6366f1'}` }}>
        <div><strong>{deal.material}</strong> | {deal.quantity}kg | ₹{deal.pricePerUnit}/kg</div>
        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Status: {deal.status.toUpperCase()} | Total: ₹{deal.totalAmount}</div>
        
        {/* Buyer Actions */}
        {(deal.status === 'offered' || deal.status === 'requested' || deal.status === 'otp_sent') && isBuyer && (
          <button onClick={handleRequestOtp} disabled={loading} style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#22c55e', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Sending OTP...' : 'Accept Deal & Pay'}
          </button>
        )}

        {deal.status === 'otp_verified' && isBuyer && (
          <button onClick={() => setShowPaymentChoice(true)} style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#60a5fa', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
            Proceed to Payment
          </button>
        )}

        {/* ✅ FIX: Mark Completed Button */}
        {deal.status === 'accepted' && (
          <button onClick={() => onComplete && onComplete(deal._id)} style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#eab308', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
            Mark Completed
          </button>
        )}

        {deal.status === 'completed' && isGenerator && (
          <span style={{ marginTop: '0.5rem', display: 'block', color: '#22c55e' }}>✅ Commission Earned: ₹{deal.platformRevenue}</span>
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#1a1a2e', padding: '24px', borderRadius: '14px', maxWidth: '400px', width: '100%', border: '1px solid rgba(99,102,241,0.3)' }}>
            <h3 style={{ color: '#60a5fa', marginTop: 0 }}>🔐 Enter OTP</h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>OTP sent to your email. Check backend terminal for Ethereal Preview URL.</p>
            {error && <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '10px' }}>⚠️ {error}</div>}
            <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" style={{ width: '100%', padding: '12px', marginBottom: '15px', textAlign: 'center', letterSpacing: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: 'white', borderRadius: '8px', fontSize: '1.2rem' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleVerifyOtp} disabled={loading} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Verifying...' : 'Verify'}</button>
              <button onClick={() => setShowOtpModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Choice Modal */}
      {showPaymentChoice && (
        <div onClick={() => setShowPaymentChoice(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: 16, maxWidth: 480, width: '100%', border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))', borderBottom: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#a78bfa' }}>💳</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Choose Payment Method</h3>
                <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>Pay for {deal.material} ({deal.quantity}kg)</p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* ✅ Requirement Select Dropdown */}
              {isBuyer && requirements.length > 0 && (
                <div className="bd-form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#d1d5db', fontSize: '0.8rem', marginBottom: '6px', display: 'block' }}>Link to Requirement (Optional)</label>
                  <select value={selectedReq} onChange={(e) => setSelectedReq(e.target.value)} className="bd-form-input" style={{ width: '100%' }}>
                    <option value="">Select a requirement</option>
                    {requirements.map(r => (
                      <option key={r._id} value={r._id}>{r.material} ({r.minQty}-{r.maxQty}kg)</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', marginBottom: 18, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>₹{deal.buyerTotalPayment.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>Includes ₹{deal.buyerCommission} (2% platform fee)</div>
              </div>

              {((user?.walletBalance || 0) >= deal.buyerTotalPayment) ? (
                <button onClick={handlePayViaWallet} disabled={loading} style={{ width: '100%', padding: '16px 20px', marginBottom: 12, borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <i className="fas fa-wallet" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i>
                      <span>Pay from Wallet</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Balance: ₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#22c55e' }}></i>
                </button>
              ) : (
                <div style={{ padding: '12px 16px', marginBottom: 12, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.78rem', color: '#fbbf24' }}>
                  <i className="fas fa-info-circle me-2"></i>
                  Wallet balance (₹{(user?.walletBalance || 0).toLocaleString('en-IN')}) is insufficient. Short by ₹{(deal.buyerTotalPayment - (user?.walletBalance || 0)).toLocaleString('en-IN')}.
                </div>
              )}

              <button onClick={() => { setShowPaymentChoice(false); setShowRazorpay(true); }} style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <i className="fas fa-credit-card" style={{ fontSize: '1.1rem' }}></i>
                    <span>Pay via Razorpay</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>Card · UPI · Netbanking · Wallet</div>
                </div>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPaymentChoice(false)} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Modal */}
      <RazorpayPaymentModal
        open={showRazorpay}
        amount={deal.buyerTotalPayment}
        purpose="deal_payment"
        dealId={deal._id}
        title={`Accept Offer - ${deal.material}`}
        onClose={() => setShowRazorpay(false)}
        onSuccess={handleRazorpaySuccess}
      />
    </>
  );
};

export default DealCard;