// src/components/InsufficientBalanceModal.jsx
import React from 'react';

const InsufficientBalanceModal = ({ open, required, available, onClose, onAddMoney, context }) => {
  if (!open) return null;
  const shortfall = Math.max(0, required - available);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(4px)', padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--modal-bg, #1a1a2e)',
          borderRadius: 16, maxWidth: 440, width: '100%',
          border: '1px solid rgba(248,113,113,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(239,68,68,0.08))',
          borderBottom: '1px solid rgba(248,113,113,0.2)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(248,113,113,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', color: '#f87171'
          }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary, #fff)', fontSize: '1.1rem' }}>
              Insufficient Wallet Balance
            </h3>
            <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
              {context || 'You need more funds to complete this action'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '16px 18px', marginBottom: 18
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem' }}>
              <span style={{ color: '#9ca3af' }}>Required Amount</span>
              <strong style={{ color: '#f87171' }}>₹{required.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem' }}>
              <span style={{ color: '#9ca3af' }}>Available Balance</span>
              <strong style={{ color: '#22c55e' }}>₹{available.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0 4px', marginTop: 6,
              borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.95rem'
            }}>
              <span style={{ color: '#9ca3af' }}>Shortfall</span>
              <strong style={{ color: '#fbbf24', fontSize: '1.05rem' }}>₹{shortfall.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '0 0 16px', lineHeight: 1.5 }}>
            💡 <strong style={{ color: '#a78bfa' }}>Tip:</strong> Add money to your wallet to continue. You can add as little as ₹100.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', gap: 10, justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: 'var(--text-primary, #e5e7eb)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}
          >Cancel</button>
          <button
            onClick={onAddMoney}
            style={{
              padding: '10px 22px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
            }}
          >
            <i className="fas fa-plus-circle"></i> Add Money
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientBalanceModal;