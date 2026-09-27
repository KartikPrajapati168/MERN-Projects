// src/components/RazorpayPaymentModal.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';

// Load Razorpay script once
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const RazorpayPaymentModal = ({ open, amount, purpose, dealId, title, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (open) {
            try {
                setUser(JSON.parse(localStorage.getItem('currentUser') || '{}'));
            } catch (e) { /* ignore */ }
            setError('');
        }
    }, [open]);

    if (!open) return null;

    const handlePayment = async () => {
        setLoading(true);
        setError('');

        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setError('Failed to load Razorpay. Check your internet.');
                setLoading(false);
                return;
            }

            const orderRes = await API.post('/payment/create-order', {
                amount: amount,
                purpose: purpose || 'deal_payment',
                dealId: dealId
            });

            const { orderId, key, currency } = orderRes.data;

            const options = {
                key: key,
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                name: 'WasteExchange AI',
                description: title || 'Payment',
                order_id: orderId,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.contactPhone || ''
                },
                theme: { color: '#6366f1' },
                handler: async (response) => {
                    // ✅ Pass full response so parent can verify + call appropriate endpoint
                    setLoading(false);
                    onSuccess(response.razorpay_payment_id, response);
                },
                modal: {
                    ondismiss: () => setLoading(false)
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                setError('Payment failed: ' + (response.error?.description || 'Unknown'));
                setLoading(false);
            });
            rzp.open();
        } catch (err) {
            setError('Error: ' + (err.response?.data?.msg || err.message));
            setLoading(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--modal-bg, #1a1a2e)',
                    borderRadius: 16, maxWidth: 420, width: '100%',
                    border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden'
                }}
            >
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
                    borderBottom: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', gap: 12
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', color: '#a78bfa'
                    }}>💳</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary, #fff)', fontSize: '1.1rem' }}>
                            Secure Payment
                        </h3>
                        <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                            {title || 'Complete your payment'}
                        </p>
                    </div>
                </div>

                <div style={{ padding: '20px 24px' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12, padding: '18px 20px', marginBottom: 18, textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Amount to Pay
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa', letterSpacing: '-0.5px' }}>
                            ₹{amount.toLocaleString('en-IN')}
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(248,113,113,0.1)',
                            border: '1px solid rgba(248,113,113,0.3)',
                            color: '#f87171', padding: '10px 14px', borderRadius: 9,
                            fontSize: '0.82rem', marginBottom: 14
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#6b7280', marginBottom: 14 }}>
                        <i className="fas fa-lock" style={{ color: '#22c55e' }}></i>
                        Secured by Razorpay · PCI-DSS Compliant
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '10px 20px', borderRadius: 9,
                            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                            color: 'var(--text-primary, #e5e7eb)', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '0.9rem', opacity: loading ? 0.5 : 1
                        }}
                    >Cancel</button>
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        style={{
                            padding: '10px 24px', borderRadius: 9, border: 'none',
                            background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '0.9rem',
                            display: 'inline-flex', alignItems: 'center', gap: 8
                        }}
                    >
                        {loading ? (
                            <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                        ) : (
                            <><i className="fas fa-credit-card"></i> Pay ₹{amount.toLocaleString('en-IN')}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RazorpayPaymentModal;