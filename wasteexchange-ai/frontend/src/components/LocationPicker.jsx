// src/components/LocationPicker.jsx
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationPicker = ({ onLocationSelect, defaultLocation }) => {
  const [position, setPosition] = useState(defaultLocation || [23.0225, 72.5714]);
  const [address, setAddress] = useState('');

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);

        // ✅ Updated fetch to extract city, state, pincode
        // src/components/LocationPicker.jsx me ye part update karo
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const addr = data.display_name || `${lat}, ${lng}`;
            const addressParts = data.address || {};

            // ✅ Extract city, state, pincode
            const city = addressParts.city || addressParts.town || addressParts.village || addressParts.suburb || '';
            const state = addressParts.state || '';
            const pincode = addressParts.postcode || '';
            const country = addressParts.country || 'India';

            setAddress(addr);

            // ✅ Pass all data back to parent
            onLocationSelect({
              address: addr,
              coordinates: [lat, lng],
              city: city,
              state: state,
              pincode: pincode,
              country: country
            });
          })
          .catch(() => {
            const addr = `${lat}, ${lng}`;
            setAddress(addr);
            onLocationSelect({ address: addr, coordinates: [lat, lng] });
          });
      }
    });
    return position ? <Marker position={position} /> : null;
  };

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <LocationMarker />
      </MapContainer>
      {address && (
        <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', marginTop: '0.5rem', borderRadius: '8px', color: 'white' }}>
          📍 {address}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;














































// import React, { useState } from 'react';
// import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';

// // Fix default marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// const LocationPicker = ({ onLocationSelect, defaultLocation }) => {
//   const [position, setPosition] = useState(defaultLocation || [23.0225, 72.5714]);
//   const [address, setAddress] = useState('');

//   const LocationMarker = () => {
//     useMapEvents({
//       click(e) {
//         const { lat, lng } = e.latlng;
//         setPosition([lat, lng]);
//         // Reverse geocode using Nominatim
//         fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
//           .then(res => res.json())
//           .then(data => {
//             const addr = data.display_name || `${lat}, ${lng}`;
//             setAddress(addr);
//             onLocationSelect({ address: addr, coordinates: [lat, lng] });
//           })
//           .catch(() => {
//             const addr = `${lat}, ${lng}`;
//             setAddress(addr);
//             onLocationSelect({ address: addr, coordinates: [lat, lng] });
//           });
//       }
//     });
//     return position ? <Marker position={position} /> : null;
//   };

//   return (
//     <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
//       <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
//         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
//         <LocationMarker />
//       </MapContainer>
//       {address && (
//         <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', marginTop: '0.5rem', borderRadius: '8px', color: 'white' }}>
//           📍 {address}
//         </div>
//       )}
//     </div>
//   );
// };

// export default LocationPicker;