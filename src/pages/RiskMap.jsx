import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { ArrowLeft, ShieldAlert, MapPin, Clock, Users } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Hardcoded district coordinates for prototype
const DISTRICT_COORDINATES = {
  "Ukhrul": { lat: 25.067, lng: 94.363 },
  "Imphal": { lat: 24.817, lng: 93.936 },
  "Churachandpur": { lat: 24.333, lng: 93.683 },
  "Thoubal": { lat: 24.634, lng: 93.985 },
  "Bishnupur": { lat: 24.628, lng: 93.758 }
};

const DEFAULT_CENTER = { lat: 24.817, lng: 93.9368 }; // Imphal

// Mock centers to show "other centers normally"
const OTHER_CENTERS = [
  { id: 1, name: "Imphal Central", lat: 24.817, lng: 93.9368 },
  { id: 2, name: "Thoubal Relief", lat: 24.634, lng: 93.9856 },
  { id: 3, name: "Moirang Hub", lat: 24.5167, lng: 93.7667 }
];

// Custom pulsing red marker for crisis
const PulsingMarkerIcon = L.divIcon({
  className: 'custom-pulsing-icon',
  html: `<div class="relative flex items-center justify-center w-12 h-12">
           <span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
           <span class="relative inline-flex rounded-full h-6 w-6 bg-red-600 border-2 border-white shadow-lg items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
           </span>
         </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

// Standard center marker
const CenterIcon = L.divIcon({
  className: 'center-icon',
  html: `<div class="w-8 h-8 bg-emerald-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// Helper component to fly to the target location
const MapController = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 13, { duration: 2 });
    }
  }, [coords, map]);
  return null;
};

const RiskMap = ({ district: propDistrict, onBack }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const district = propDistrict || searchParams.get('district');
  
  const targetCoords = DISTRICT_COORDINATES[district] || DEFAULT_CENTER;
  const isTargetFound = !!DISTRICT_COORDINATES[district];

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="h-screen w-full relative bg-slate-900">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-[1000]">
        <button 
          onClick={handleBack} 
          className="bg-white text-slate-800 px-4 py-2 rounded-xl shadow-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      {/* Map */}
      <MapContainer center={[targetCoords.lat, targetCoords.lng]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapController coords={targetCoords} />

        {/* Crisis Marker */}
        {isTargetFound && (
          <Marker position={[targetCoords.lat, targetCoords.lng]} icon={PulsingMarkerIcon}>
            <Popup className="custom-popup">
              <div className="p-2">
                <h3 className="font-bold text-red-600">CRITICAL ALERT</h3>
                <p className="text-sm font-medium">{district} Crisis</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other Centers */}
        {OTHER_CENTERS.map(center => (
          <Marker key={center.id} position={[center.lat, center.lng]} icon={CenterIcon}>
            <Popup>
              <div className="font-bold text-emerald-700">{center.name}</div>
              <div className="text-xs text-slate-500">Operational</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Details Panel */}
      {isTargetFound && (
        <div className="absolute bottom-0 right-0 m-4 z-[1000] w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-red-100 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-white animate-pulse" size={24} />
                <div>
                  <h2 className="text-lg font-black text-white leading-none">CRISIS ALERT</h2>
                  <p className="text-red-100 text-xs font-medium mt-0.5">Live Incident Report</p>
                </div>
              </div>
              <span className="bg-white/20 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-white/30">
                Critical
              </span>
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Communal Crisis in {district}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><MapPin size={20} /></div>
                  <div><p className="text-xs text-slate-400 font-bold uppercase">Location</p><p className="text-sm font-bold text-slate-800">{district} District, Manipur</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Users size={20} /></div>
                  <div><p className="text-xs text-slate-400 font-bold uppercase">Affected Population</p><p className="text-sm font-bold text-slate-800">3,200 People</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"><Clock size={20} /></div>
                  <div><p className="text-xs text-slate-400 font-bold uppercase">Time Detected</p><p className="text-sm font-bold text-slate-800">18 min ago</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskMap;
