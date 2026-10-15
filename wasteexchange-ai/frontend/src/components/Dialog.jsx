// src/components/Dialog.jsx
import React, { useEffect } from 'react';

const Dialog = ({ open, type = 'info', title, message, onConfirm, onCancel, confirmText, cancelText, danger, loading }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const isConfirm = type === 'confirm';
  const isSuccess = type === 'success';
  const isDanger = type === 'danger' || danger;

  const config = {
    success: { icon: 'check-circle', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    error: { icon: 'exclamation-circle', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    danger: { icon: 'exclamation-triangle', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    warning: { icon: 'exclamation-triangle', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    info: { icon: 'info-circle', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    confirm: { icon: 'question-circle', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  }[type] || { icon: 'info-circle', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        padding: 20,
        animation: 'dialogFadeIn 0.15s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e',
          borderRadius: 16,
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${config.color}44`,
          overflow: 'hidden',
          animation: 'dialogScaleIn 0.2s ease-out',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: config.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.color,
              fontSize: '1.3rem',
              flexShrink: 0,
            }}
          >
            <i className={`fas fa-${config.icon}`}></i>
          </div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            {title && (
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>
                {title}
              </h3>
            )}
            {message && (
              <div
                style={{
                  margin: title ? '8px 0 0' : 0,
                  color: '#9ca3af',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line'
                }}
              >
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px 20px',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          {isConfirm && (
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: 9,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: '#e5e7eb',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                opacity: loading ? 0.5 : 1,
                transition: '0.15s',
              }}
            >
              {cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: 9,
              border: 'none',
              background: isDanger
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 4px 14px ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
              opacity: loading ? 0.6 : 1,
              transition: '0.15s',
            }}
          >
            {loading && <i className="fas fa-spinner fa-spin"></i>}
            {confirmText || (isConfirm ? 'Confirm' : 'OK')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogScaleIn { 
          from { opacity: 0; transform: scale(0.92); } 
          to { opacity: 1; transform: scale(1); } 
        }
      `}</style>
    </div>
  );
};

export default Dialog;