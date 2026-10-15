// src/components/RazorpayPaymentModal.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const RazorpayPaymentModal = ({
  open,
  amount,
  purpose = 'deal_payment',
  dealId,
  title,
  userName = '',
  userEmail = '',
  userPhone = '',
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setLoading(false); setError(''); }
  }, [open]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const loaded = await loadRazorpayScript();
      if (!loaded) { setError('Failed to load Razorpay SDK.'); setLoading(false); return; }

      const orderRes = await API.post('/payment/create-order', { amount, purpose, dealId });
      const { orderId, amount: orderAmount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency: currency || 'INR',
        name: 'WasteExchange AI',
        description: title || 'Payment',
        order_id: orderId,

        // ✅ Buyer details shown on Razorpay checkout
        prefill: {
          name: userName || '',
          email: userEmail || '',
          contact: userPhone || '',
        },

        notes: { purpose, dealId: dealId || '' },
        theme: { color: '#6366f1' },

        handler: async (response) => {
          try {
            await onSuccess(response.razorpay_payment_id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (err) {
            console.error('Payment success handler error:', err);
            setError('Payment succeeded but verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to start payment.');
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div onClick={() => !loading && onClose?.()} style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#1a1a2e', borderRadius: 16, maxWidth: 440, width: '100%',
        border: '1px solid rgba(99,102,241,0.3)', padding: 24,
      }}>
        <h3 style={{ color: 'white', margin: '0 0 12px', fontSize: '1.1rem' }}>
          <i className="fas fa-lock me-2" style={{ color: '#a78bfa' }}></i>
          {title || 'Confirm Payment'}
        </h3>

        <div style={{
          background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12,
          marginBottom: 18, textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>Amount to Pay</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>
            ₹{(amount || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {(userName || userEmail || userPhone) && (
          <div style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.8rem',
          }}>
            <div style={{
              color: '#a78bfa', fontWeight: 700, marginBottom: 8,
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <i className="fas fa-user-circle me-1"></i> Payment From
            </div>
            {userName && <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{userName}</div>}
            {userEmail && <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: 2 }}>{userEmail}</div>}
            {userPhone && <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: 2 }}>{userPhone}</div>}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171', padding: '10px 14px', borderRadius: 9,
            fontSize: '0.82rem', marginBottom: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: 12, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#e5e7eb',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
          }}>Cancel</button>
          <button onClick={handlePayment} disabled={loading} style={{
            flex: 2, padding: 12, borderRadius: 8, border: 'none',
            background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: '0.9rem',
          }}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Opening Razorpay...</>
              : <><i className="fas fa-lock"></i> Pay ₹{(amount || 0).toLocaleString('en-IN')}</>}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#6b7280', marginTop: 14 }}>
          <i className="fas fa-shield-alt me-1" style={{ color: '#22c55e' }}></i>
          Secured by Razorpay · PCI-DSS Compliant
        </div>
      </div>
    </div>
  );
};

export default RazorpayPaymentModal;