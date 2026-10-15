// src/components/ListingCard.jsx
import React from 'react';

const ListingCard = ({ listing, onDelete, onEdit }) => {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 1.2rem',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.1rem', color: 'white' }}>{listing.material}</strong>
          <span style={{ background: 'rgba(99,102,241,0.2)', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', color: '#a78bfa' }}>
            {listing.materialSubtype || 'No subtype'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          <span>⚖️ {listing.quantity} kg</span>
          <span>💰 ₹{listing.price}/kg</span>
          <span>📍 {listing.location}</span>
        </div>
        {listing.description && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
            {listing.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onEdit(listing)}
          style={{
            padding: '0.3rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.1)',
            color: '#818cf8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDelete(listing._id)}
          style={{
            padding: '0.3rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid rgba(248,113,113,0.3)',
            background: 'rgba(248,113,113,0.1)',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default ListingCard;