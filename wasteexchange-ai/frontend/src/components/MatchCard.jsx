// src/components/MatchCard.jsx
import React from 'react';

const MatchCard = ({ item, type, onSendRequest }) => {
  const isBuyer = type === 'buyer';
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '10px', marginBottom: '0.8rem', border: '1px solid rgba(99,102,241,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong>{isBuyer ? item.material : item.listingMaterial || item.material}</strong><span style={{ marginLeft: '1rem', background: '#6366f1', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem' }}>Match: {item.matchScore}%</span></div>
        {isBuyer && <button onClick={() => onSendRequest(item.id)} style={{ padding: '0.3rem 1rem', background: '#22c55e', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>Request</button>}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>📍 {item.location} | Qty: {item.quantity || item.minQty}-{item.maxQty}kg</div>
    </div>
  );
};

export default MatchCard;