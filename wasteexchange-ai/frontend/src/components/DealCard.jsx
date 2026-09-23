// src/components/DealCard.jsx
import React from 'react';

const DealCard = ({ deal, userRole, onAccept, onComplete }) => {
  const isGenerator = userRole === 'generator';
  const colors = { requested: '#f97316', accepted: '#eab308', completed: '#22c55e' };
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '0.8rem', borderLeft: `4px solid ${colors[deal.status] || '#6366f1'}` }}>
      <div><strong>{deal.material}</strong> | {deal.quantity}kg | ₹{deal.pricePerUnit}/kg</div>
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Status: {deal.status.toUpperCase()} | Total: ₹{deal.totalAmount}</div>
      {deal.status === 'requested' && isGenerator && <button onClick={() => onAccept(deal.id)} style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#6366f1', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>Accept Deal</button>}
      {deal.status === 'accepted' && <button onClick={() => onComplete(deal.id)} style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#22c55e', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>Mark Completed</button>}
      {deal.status === 'completed' && <span style={{ marginTop: '0.5rem', display: 'block', color: '#22c55e' }}>✅ Commission Earned: ₹{deal.platformRevenue}</span>}
    </div>
  );
};

export default DealCard;