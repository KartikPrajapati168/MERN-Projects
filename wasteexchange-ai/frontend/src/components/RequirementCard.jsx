// // src/components/RequirementCard.jsx
// import React from 'react';

// const RequirementCard = ({ requirement, onDelete, onEdit, onContact, onReview, viewMode = 'owner', isFulfilled = false, isInProgress = false }) => {
//   const isOwner = viewMode === 'owner';

//   return (
//     <div
//       style={{
//         background: 'rgba(255,255,255,0.05)',
//         backdropFilter: 'blur(10px)',
//         padding: '1rem 1.2rem',
//         borderRadius: '12px',
//         border: '1px solid rgba(255,255,255,0.06)',
//         display: 'flex',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         transition: 'all 0.2s',
//         boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
//       }}
//       onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
//       onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
//     >
//       <div style={{ flex: 1 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
//           <strong style={{ fontSize: '1.1rem', color: 'white' }}>{requirement.material}</strong>
//           <span style={{ background: 'rgba(99,102,241,0.2)', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', color: '#a78bfa' }}>
//             {requirement.materialSubtype || 'No subtype'}
//           </span>

//           {!isOwner && requirement.buyerName && (
//             <span style={{
//               background: 'rgba(34,197,94,0.15)',
//               color: '#22c55e',
//               padding: '0.15rem 0.7rem',
//               borderRadius: '20px',
//               fontSize: '0.75rem',
//               fontWeight: 600,
//               display: 'inline-flex',
//               alignItems: 'center',
//               gap: '4px'
//             }}>
//               <i className="fas fa-user" style={{ fontSize: '0.65rem' }}></i>
//               {requirement.buyerName}
//             </span>
//           )}
//         </div>

//         <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem' }}>
//           <span>📉 Min: {requirement.minQty} kg</span>
//           <span>📈 Max: {requirement.maxQty} kg</span>
//           <span>💰 Max ₹{requirement.maxPrice}/kg</span>
//           <span>📍 {requirement.location}</span>
//         </div>

//         {!isOwner && requirement.buyerName && (
//           <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>
//             Posted by <strong style={{ color: '#a78bfa' }}>{requirement.buyerName}</strong>
//             {requirement.createdAt && (
//               <> on {new Date(requirement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
//             )}
//           </div>
//         )}
//       </div>

//       <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
//         {isOwner ? (
//           // ✅ Buyer sees Edit + Delete
//           <>
//             <button
//               onClick={() => onEdit && onEdit(requirement)}
//               style={{
//                 padding: '0.4rem 0.9rem',
//                 borderRadius: '6px',
//                 border: '1px solid rgba(99,102,241,0.3)',
//                 background: 'rgba(99,102,241,0.1)',
//                 color: '#818cf8',
//                 cursor: 'pointer',
//                 fontSize: '0.8rem',
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <i className="fas fa-edit"></i> Edit
//             </button>
//             <button
//               onClick={() => onDelete && onDelete(requirement._id)}
//               style={{
//                 padding: '0.4rem 0.9rem',
//                 borderRadius: '6px',
//                 border: '1px solid rgba(248,113,113,0.3)',
//                 background: 'rgba(248,113,113,0.1)',
//                 color: '#f87171',
//                 cursor: 'pointer',
//                 fontSize: '0.8rem',
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '4px'
//               }}
//             >
//               <i className="fas fa-trash"></i> Delete
//             </button>
//           </>
//         ) : isFulfilled ? (
//           // ✅ Fulfilled — no actions
//           <span style={{
//             padding: '8px 14px',
//             borderRadius: 8,
//             background: 'rgba(107,114,128,0.15)',
//             color: '#9ca3af',
//             fontSize: '0.8rem',
//             fontWeight: 700,
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: 6
//           }}>
//             <i className="fas fa-check-circle"></i> FULFILLED
//           </span>
//         ) : isInProgress ? (
//           // ✅ In-progress — Show In Progress
//           <>
//             <button
//               onClick={() => onReview && onReview(requirement)}
//               style={{
//                 padding: '0.4rem 0.9rem',
//                 borderRadius: '6px',
//                 border: '1px solid rgba(139,92,246,0.3)',
//                 background: 'rgba(139,92,246,0.1)',
//                 color: '#a78bfa',
//                 cursor: 'pointer',
//                 fontSize: '0.8rem',
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '4px',
//                 fontWeight: 600
//               }}
//             >
//               <i className="fas fa-eye"></i> Review
//             </button>
//             <span style={{
//               padding: '8px 14px',
//               borderRadius: 8,
//               background: 'rgba(251,191,36,0.15)',
//               color: '#fbbf24',
//               fontSize: '0.8rem',
//               fontWeight: 700,
//               display: 'inline-flex',
//               alignItems: 'center',
//               gap: 6
//             }}>
//               <i className="fas fa-hourglass-half"></i> IN PROGRESS
//             </span>
//           </>
//         ) : (
//           // ✅ Normal — Review + Send Offer
//           <>
//             <button
//               onClick={() => onReview && onReview(requirement)}
//               style={{
//                 padding: '0.4rem 0.9rem',
//                 borderRadius: '6px',
//                 border: '1px solid rgba(139,92,246,0.3)',
//                 background: 'rgba(139,92,246,0.1)',
//                 color: '#a78bfa',
//                 cursor: 'pointer',
//                 fontSize: '0.8rem',
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '4px',
//                 fontWeight: 600
//               }}
//               onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
//               onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
//             >
//               <i className="fas fa-eye"></i> Review
//             </button>
//             <button
//               onClick={() => onContact && onContact(requirement)}
//               style={{
//                 padding: '0.5rem 1.2rem',
//                 borderRadius: '8px',
//                 border: 'none',
//                 background: 'linear-gradient(135deg, #22c55e, #16a34a)',
//                 color: 'white',
//                 cursor: 'pointer',
//                 fontSize: '0.85rem',
//                 fontWeight: 600,
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '6px',
//                 boxShadow: '0 4px 12px rgba(34,197,94,0.2)'
//               }}
//             >
//               <i className="fas fa-handshake"></i> Send Offer
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default RequirementCard;



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
  isInProgress = false,
  alreadyOffered = false   // ✅ NEW
}) => {
  const isOwner = viewMode === 'owner';

  return (
    <div
      style={{
        background: alreadyOffered ? 'rgba(139,92,246,0.04)' : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 1.2rem',
        borderRadius: '12px',
        border: alreadyOffered ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        opacity: alreadyOffered ? 0.85 : 1
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.1rem', color: 'white' }}>{requirement.material}</strong>
          <span style={{ background: 'rgba(99,102,241,0.2)', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', color: '#a78bfa' }}>
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

        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem' }}>
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
          <span style={{
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(16,185,129,0.15)',
            color: '#10b981', fontSize: '0.75rem', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(16,185,129,0.3)'
          }}>
            <i className="fas fa-check-circle"></i> FULFILLED
          </span>
        ) : alreadyOffered ? (
          // ✅ NEW: Already sent offer
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
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e', fontSize: '0.75rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              textTransform: 'uppercase', letterSpacing: '0.3px'
            }}>
              <i className="fas fa-paper-plane"></i> Offer Sent
            </span>
          </>
        ) : isInProgress ? (
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
              color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <i className="fas fa-hourglass-half"></i> IN PROGRESS
            </span>
          </>
        ) : (
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