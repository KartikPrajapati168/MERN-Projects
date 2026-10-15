// src/components/RequirementCard.jsx
import React from 'react';

const RequirementCard = ({
  requirement,
  onDelete,
  onEdit,
  onContact,
  onReview,
  viewMode = 'owner',
  isFulfilled = false,
  isPaid = false,          // ✅ NEW — for paid status
  isInProgress = false,    // ✅ for accepted (unpaid)
  alreadyOffered = false
}) => {
  const isOwner = viewMode === 'owner';

  // ✅ Card styling based on status
  const getCardStyle = () => {
    if (isFulfilled) return { bg: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.3)', opacity: 0.9 };
    if (isPaid) return { bg: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', opacity: 0.95 };
    if (isInProgress) return { bg: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', opacity: 0.95 };
    if (alreadyOffered) return { bg: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.25)', opacity: 0.85 };
    return { bg: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', opacity: 1 };
  };

  const cardStyle = getCardStyle();

  return (
    <div
      style={{
        background: cardStyle.bg,
        backdropFilter: 'blur(10px)',
        padding: '1rem 1.2rem',
        borderRadius: '12px',
        border: cardStyle.border,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        opacity: cardStyle.opacity
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.1rem', color: 'white' }}>{requirement.material}</strong>
          <span style={{
            background: 'rgba(99,102,241,0.2)',
            padding: '0.15rem 0.6rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: '#a78bfa'
          }}>
            {requirement.materialSubtype || 'No subtype'}
          </span>

          {!isOwner && requirement.buyerName && (
            <span style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              padding: '0.15rem 0.7rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <i className="fas fa-user" style={{ fontSize: '0.65rem' }}></i>
              {requirement.buyerName}
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '1.2rem',
          flexWrap: 'wrap',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.7)',
          marginTop: '0.4rem'
        }}>
          <span>📉 Min: {requirement.minQty} kg</span>
          <span>📈 Max: {requirement.maxQty} kg</span>
          <span>💰 Max ₹{requirement.maxPrice}/kg</span>
          <span>📍 {requirement.location}</span>
        </div>

        {!isOwner && requirement.buyerName && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>
            Posted by <strong style={{ color: '#a78bfa' }}>{requirement.buyerName}</strong>
            {requirement.createdAt && (
              <> on {new Date(requirement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {isOwner ? (
          <>
            <button
              onClick={() => onEdit && onEdit(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.1)',
                color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}
            >
              <i className="fas fa-edit"></i> Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(requirement._id)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(248,113,113,0.3)',
                background: 'rgba(248,113,113,0.1)',
                color: '#f87171', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}
            >
              <i className="fas fa-trash"></i> Delete
            </button>
          </>
        ) : isFulfilled ? (
          /* ✅ FULFILLED — Deal complete */
          <>
            <button
              onClick={() => onReview && onReview(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)',
                color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
              }}
            >
              <i className="fas fa-eye"></i> Review
            </button>
            <span style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(16,185,129,0.15)',
              color: '#10b981', fontSize: '0.75rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(16,185,129,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
              <i className="fas fa-check-circle"></i> FULFILLED
            </span>
          </>
        ) : isPaid ? (
          /* ✅ PAID — Buyer ne pay kar diya, ab deliver karna hai */
          <>
            <button
              onClick={() => onReview && onReview(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)',
                color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
              }}
            >
              <i className="fas fa-eye"></i> Review
            </button>
            <span style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.2)',
              color: '#4ade80', fontSize: '0.75rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(34,197,94,0.4)',
              textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
              <i className="fas fa-rupee-sign"></i> PAID
            </span>
          </>
        ) : isInProgress ? (
          /* ✅ IN PROGRESS — Accepted but payment pending */
          <>
            <button
              onClick={() => onReview && onReview(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)',
                color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
              }}
            >
              <i className="fas fa-eye"></i> Review
            </button>
            <span style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(251,191,36,0.15)',
              color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(251,191,36,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
              <i className="fas fa-hourglass-half"></i> IN PROGRESS
            </span>
          </>
        ) : alreadyOffered ? (
          /* ✅ OFFER SENT — Waiting for buyer */
          <>
            <button
              onClick={() => onReview && onReview(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)',
                color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
              }}
            >
              <i className="fas fa-eye"></i> Review
            </button>
            <span style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(96,165,250,0.15)',
              color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(96,165,250,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
              <i className="fas fa-paper-plane"></i> OFFER SENT
            </span>
          </>
        ) : (
          /* ✅ FRESH — Send Offer button */
          <>
            <button
              onClick={() => onReview && onReview(requirement)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)',
                color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
            >
              <i className="fas fa-eye"></i> Review
            </button>
            <button
              onClick={() => onContact && onContact(requirement)}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white', cursor: 'pointer', fontSize: '0.85rem',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 12px rgba(34,197,94,0.2)'
              }}
            >
              <i className="fas fa-handshake"></i> Send Offer
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RequirementCard;