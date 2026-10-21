import React, { useState, useEffect, useRef, useMemo } from 'react';
import { groupInventoryByCenter, getMenuFromInventory } from '../utils/inventoryMenu';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    MapPin, Search, SlidersHorizontal, List, Shield, Crosshair, Download, LogOut, AlertTriangle, Bot, Navigation, Send, Utensils, Mic, MicOff, ThumbsUp, WifiOff, MapPinOff, Phone, Lock, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||"https://safe-foodtech-api.onrender.com";

const FOOD_CENTERS = [
    { id: 1, name: "Moirang Bazar Food Center", address: "Moirang Bazar, Bishnupur", lat: 24.5167, lng: 93.7667, status: "open", crowd: "High", items: 45, cookedFood: true, menu: ["Rice Meals", "Dal Chawal", "Khichdi", "Vegetable Curry", "Chapati Pack"] },
    { id: 2, name: "Imphal Community Kitchen", address: "Thangal Bazar, Imphal West", lat: 24.8170, lng: 93.9368, status: "open", crowd: "Low", items: 62, cookedFood: true, menu: ["Rice Meals", "Dal Chawal", "Hot Soup", "Chapati Pack", "Vegetable Curry"] },
    { id: 3, name: "Thoubal Relief Center", address: "Thoubal Bazar, Thoubal", lat: 24.6340, lng: 93.9856, status: "open", crowd: "Medium", items: 38, cookedFood: true, menu: ["Khichdi", "Dal Chawal", "Rice Meals", "Hot Soup"] },
    { id: 4, name: "Churachandpur Food Hub", address: "Tuibong, Churachandpur", lat: 24.3333, lng: 93.6833, status: "open", crowd: "Low", items: 52, cookedFood: true, menu: ["Rice Meals", "Vegetable Curry", "Chapati Pack", "Dal Chawal", "Khichdi"] },
    { id: 5, name: "Kakching Distribution Center", address: "Kakching Khunou, Kakching", lat: 24.4980, lng: 93.9810, status: "open", crowd: "Medium", items: 41, cookedFood: false, menu: ["Rice", "Dal", "Wheat Flour", "Onion", "Potato", "Tomato"] },
    { id: 6, name: "Ukhrul Relief Station", address: "Ukhrul Town, Ukhrul", lat: 25.0500, lng: 94.3600, status: "open", crowd: "High", items: 29, cookedFood: true, menu: ["Rice Meals", "Dal Chawal", "Chapati Pack"] },
    { id: 7, name: "Senapati Emergency Kitchen", address: "Senapati Bazar, Senapati", lat: 25.2667, lng: 94.0167, status: "open", crowd: "Low", items: 55, cookedFood: true, menu: ["Rice Meals", "Khichdi", "Hot Soup", "Vegetable Curry", "Dal Chawal"] },
    { id: 8, name: "Jiribam Food Point", address: "Jiribam Town, Jiribam", lat: 24.8050, lng: 93.1100, status: "open", crowd: "Medium", items: 34, cookedFood: false, menu: ["Rice", "Dal", "Wheat Flour", "Potato", "Onion"] },
];

// --- Helper Component (Must be outside to avoid re-mounting) ---
const RecenterMap = ({ loc, trigger }) => {
    const map = useMap();
    useEffect(() => {
        if (loc && loc.lat && loc.lng) {
            map.flyTo([loc.lat, loc.lng], 15, { duration: 2 });
        }
    }, [loc, map, trigger]);
    return null;
};

// --- Helper: Distance Calculation (Moved outside) ---
const calculateDistance = (origin, target) => {
    if (!origin || !target || !target.lat || !target.lng) return "N/A";
    const R = 6371;
    const dLat = (target.lat - origin.lat) * Math.PI / 180;
    const dLng = (target.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(target.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
};

// --- Helper: Data Validation ---
const validateCenters = (data) => {
    if (!Array.isArray(data)) return [];
    return data.filter(c => 
        c && 
        (typeof c.lat === 'number' || (typeof c.lat === 'string' && !isNaN(parseFloat(c.lat)))) &&
        (typeof c.lng === 'number' || (typeof c.lng === 'string' && !isNaN(parseFloat(c.lng))))
    ).map(c => ({ ...c, lat: parseFloat(c.lat), lng: parseFloat(c.lng) }));
};

// --- Component: Map View (Extracted for reuse/safety) ---
const MapComponent = ({ userLoc, centers, routePath, truckPosition, truckProgress, riskZones, t, recenterTrigger }) => {
    return (
        <MapContainer center={[24.8170, 93.9368]} zoom={10} style={{ height: "100%", width: "100%" }} zoomControl={true}>
            <RecenterMap loc={userLoc} trigger={recenterTrigger} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {centers.map(c => (c.lat && c.lng ? (
                <Marker
                    key={c.id}
                    position={[c.lat, c.lng]}
                    icon={L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 18px;">📍</div></div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })}
                >
                    <Popup className="custom-popup">
                        <div className="bg-white rounded-lg p-3 min-w-[200px]">
                            <h3 className="font-bold text-green-600 text-sm mb-2">{t(`center_names.${c.id}`, c.name)}</h3>
                            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><span className="text-green-500">📍</span> {c.address}</p>
                            <div className="flex gap-2 flex-wrap mb-2">
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">{c.status === 'open' ? t('open', 'OPEN') : t('closed', 'CLOSED')}</span>
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">{c.crowd} {t('crowd', 'Crowd')}</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ) : null))}
            
            {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', iconSize: [40, 40], iconAnchor: [20, 40] })}><Popup>Your Location</Popup></Marker>}

            {truckPosition && (
                <Marker position={truckPosition} icon={L.divIcon({ className: 'truck-marker', html: `<div style="font-size: 24px;">🚚</div>` })}>
                    <Popup>Delivery Truck ({truckProgress}%)</Popup>
                </Marker>
            )}

            {routePath.length > 0 && <Polyline positions={routePath} color="#10b981" weight={6} opacity={0.9} dashArray="10, 5" />}

            {riskZones.map(zone => (zone.lat && zone.lng ? (
                <React.Fragment key={zone.id}>
                    <Circle center={[zone.lat, zone.lng]} radius={zone.radius} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }}>
                        <Popup>
                            <div className="text-center">
                                <b className="text-red-600">DANGER ZONE</b><br/>{zone.reason}
                            </div>
                        </Popup>
                    </Circle>
                </React.Fragment>
            ) : null))}
        </MapContainer>
    );
};

const ConsumerDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [centerMenus, setCenterMenus] = useState({});
    const { t, i18n } = useTranslation();
    const [userLoc, setUserLoc] = useState(null);
    const [centers, setCenters] = useState(FOOD_CENTERS);
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // Modal & Feature States
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showSOSModal, setShowSOSModal] = useState(false);
    const [sosReason, setSOSReason] = useState('');
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [reqItem, setReqItem] = useState({ name: '', quantity: '1', plateSize: 'full', deliveryType: 'pickup', unit: 'kg' });
    const [feedbackText, setFeedbackText] = useState('');
    const [isListening, setIsListening] = useState(false);

    // Guest Phone Verification State
    const [showPhoneAuthModal, setShowPhoneAuthModal] = useState(false);
    const [guestPhone, setGuestPhone] = useState('');
    const [guestOTP, setGuestOTP] = useState('');
    const [generatedOTP, setGeneratedOTP] = useState(null);

    // Routing States
    const [routePath, setRoutePath] = useState([]); // Stores the road coordinates
    const [truckPosition, setTruckPosition] = useState(null); // Live truck location
    const [truckProgress, setTruckProgress] = useState(0); // 0-100% progress

    const [riskZones, setRiskZones] = useState(() => {
        try { 
            const saved = localStorage.getItem('consumer_riskZones'); 
            const parsed = saved ? JSON.parse(saved) : null;
            const validated = validateCenters(parsed); // Reuse validation for zones
            return validated; 
        } catch(e) { return []; }
    }); // Danger zones

    // Calculate nearest low-crowded center
    const nearestCenter = useMemo(() => {
        if (!userLoc) return null;

        // Filter out closed centers
        const availableCenters = centers.filter(c => c.status === 'open');

        if (availableCenters.length === 0) return null;

        // Calculate distance and find nearest
        const centersWithDistance = availableCenters.map(center => {
            const R = 6371; // Earth radius in km
            const dLat = (center.lat - userLoc.lat) * Math.PI / 180;
            const dLng = (center.lng - userLoc.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(center.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            return { ...center, distance: distance.toFixed(1) };
        });

        // Sort by distance and return nearest
        return centersWithDistance.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))[0];
    }, [userLoc, centers]);

    // Chat States
    const [activeChat, setActiveChat] = useState(null);
    const [msgText, setMsgText] = useState("");
    const [aiMessages, setAiMessages] = useState([{ sender: 'AI Bot', content: 'Hello! I am your FoodTech Assistant.', self: false }]);
    // Search & Filter UI states
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChip, setActiveChip] = useState(null); // 'open' | 'nearest' | 'low' | 'hot' | null
    const [isTyping, setIsTyping] = useState(false);
    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [showFilters, setShowFilters] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            localStorage.removeItem('foodtech_user');
            navigate('/login');
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    // Real-time location tracking
    /*useEffect(() => {
        let watchId;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationError(false);
                },
                (err) => console.warn("Location watch error:", err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);*/


// Location is requested only when the user chooses to share it.
    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(() => { scrollToBottom(); }, [aiMessages, activeChat, isTyping]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (i18n.addResourceBundle) {
            i18n.addResourceBundle('en', 'translation', {
                'quantity': 'Quantity'
            }, true, true);
            i18n.addResourceBundle('hi', 'translation', {
                'nearest_center': 'निकटतम केंद्र', 'crowd': 'भीड़', 'hot_meals': 'गर्म भोजन', 'menu_available': 'मेनू उपलब्ध', 'delivery_truck': 'डिलीवरी ट्रक रास्ते में है', 'directions': 'केंद्र के लिए दिशा-निर्देश', 'away': 'दूर', 'progress': 'प्रगति', 'truck_on_way': 'ट्रक आपके स्थान के रास्ते पर है', 'truck_arrived': 'ट्रक आ गया है!', 'follow_route': 'खाद्य केंद्र तक पहुंचने के लिए नीले मार्ग का अनुसरण करें', 'request_delivery': 'डिलीवरी का अनुरोध करें', 'ai_help': 'एआई सहायता', 'nearest_centers': 'निकटतम केंद्र', 'feedback': 'प्रतिक्रिया', 'open': 'खुला', 'closed': 'बंद', 'cancel_pickup': 'पिकअप रद्द करें', 'request_pickup': 'पिकअप का अनुरोध करें', 'chat': 'चैट', 'you': 'आप', 'danger_zone': 'खतरा क्षेत्र', 'avoid_area': 'इस क्षेत्र से बचें', 'do_not_enter': 'प्रवेश न करें', 'ai_assistant': 'एआई सहायक', 'supplier_support': 'आपूर्तिकर्ता सहायता', 'type_message': 'संदेश टाइप करें...', 'request_food': 'भोजन का अनुरोध करें', 'collection_method': 'संग्रह विधि', 'pickup_at_center': 'केंद्र पर पिकअप', 'delivery': 'डिलीवरी', 'delivery_warning': 'डिलीवरी केवल तभी उपलब्ध है जब ट्रक खाली हो। तत्काल जरूरतों के लिए, पिकअप चुनें।', 'food_type': 'भोजन का प्रकार', 'select_food': '-- भोजन चुनें --', 'cooked_food': 'पकाया हुआ भोजन (खाने के लिए तैयार)', 'raw_veg': 'कच्ची सब्जियां', 'grains': 'अनाज और स्टेपल', 'plate_size': 'प्लेट का आकार', 'half_plate': 'हाफ प्लेट', 'full_plate': 'फुल प्लेट', 'quantity': 'मात्रा', 'cancel': 'रद्द करें', 'send_request': 'अनुरोध भेजें', 'send_feedback': 'प्रतिक्रिया भेजें', 'submit': 'जमा करें', 'emergency_sos': 'आपातकालीन एसओएस', 'sos_desc': 'आपका स्थान आपातकालीन कमांड सेंटर को भेजा जाएगा', 'describe_emergency': 'आपातकाल का वर्णन करें (हिंसा, बाढ़, आग, चिकित्सा आपातकाल, आदि)...', 'send_sos': 'एसओएस भेजें', 'logout': 'लॉग आउट', 'consumer_app': 'उपभोक्ता पोर्टल', 'sos_btn': 'एसओएस'
            }, true, true);
            i18n.addResourceBundle('mni', 'translation', {
                'nearest_center': 'ꯈ꯭ꯋꯥꯏꯗꯒꯤ ꯅꯛꯄ ꯁꯦꯟꯇꯔ', 'crowd': 'ꯃꯤꯌꯥꯝ', 'hot_meals': 'ꯑꯁꯥꯕ ꯆꯥꯛ', 'menu_available': 'ꯃꯦꯅꯨ ꯐꯪꯉꯤ', 'delivery_truck': 'ꯗꯦꯂꯤꯕꯔꯤ ꯇ꯭ꯔꯛ ꯂꯥꯛꯂꯤ', 'directions': 'ꯂꯝꯕꯤ ꯇꯥꯛꯄ', 'away': 'ꯂꯥꯞꯄ', 'progress': 'ꯆꯪꯁꯤꯟꯕ', 'truck_on_way': 'ꯇ꯭ꯔꯛ ꯂꯥꯛꯂꯤ', 'truck_arrived': 'ꯇ꯭ꯔꯛ ꯌꯧꯔꯛꯂꯦ!', 'follow_route': 'ꯁꯦꯟꯇꯔ ꯌꯧꯅꯕ ꯍꯤꯒꯣꯛ ꯃꯆꯨꯒꯤ ꯂꯝꯕꯤ ꯏꯟꯕꯤꯌꯨ', 'request_delivery': 'ꯗꯦꯂꯤꯕꯔꯤ ꯅꯤꯕ', 'ai_help': 'AI ꯃꯇꯦꯡ', 'nearest_centers': 'ꯅꯛꯅꯕ ꯁꯦꯟꯇꯔꯁꯤꯡ', 'feedback': 'ꯐꯤꯗꯕꯦꯛ', 'open': 'ꯍꯥꯡꯉꯤ', 'closed': 'ꯊꯤꯡꯉꯤ', 'cancel_pickup': 'ꯄꯤꯛꯑꯞ ꯇꯣꯛꯄ', 'request_pickup': 'ꯄꯤꯛꯑꯞ ꯅꯤꯕ', 'chat': 'ꯋꯥꯔꯤ ꯁꯥꯟꯅꯕ', 'you': 'ꯅꯍꯥꯛ', 'danger_zone': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ', 'avoid_area': 'ꯃꯐꯝ ꯑꯁꯤꯗꯒꯤ ꯂꯥꯞꯊꯣꯛꯎ', 'do_not_enter': 'ꯆꯪꯒꯅꯨ', 'ai_assistant': 'AI ꯑꯦꯁꯤꯁꯇꯦꯟ', 'supplier_support': 'ꯁꯄ꯭ꯂꯥꯏꯌꯔ ꯁꯄꯣꯔꯠ', 'type_message': 'ꯃꯦꯁꯦꯖ ꯏꯕ...', 'request_food': 'ꯆꯥꯛ-ꯊꯨꯝ ꯅꯤꯕ', 'collection_method': 'ꯂꯧꯕꯒꯤ ꯃꯑꯣꯡ', 'pickup_at_center': 'ꯁꯦꯟꯇꯔꯗ ꯂꯧꯕ', 'delivery': 'ꯗꯦꯂꯤꯕꯔꯤ', 'delivery_warning': 'ꯇ꯭ꯔꯛ ꯂꯩꯕ ꯃꯇꯝꯗꯈꯛ ꯗꯦꯂꯤꯕꯔꯤ ꯐꯪꯒꯅꯤ꯫ ꯊꯨꯅ ꯗꯔꯀꯥꯔ ꯑꯣꯏꯔꯕꯗꯤ ꯄꯤꯛꯑꯞ ꯈꯟꯕꯤꯌꯨ꯫', 'food_type': 'ꯆꯥꯛ-ꯊꯨꯝ ꯃꯈꯜ', 'select_food': '-- ꯈꯟꯕꯤꯌꯨ --', 'cooked_food': 'ꯊꯣꯡꯂꯕ ꯆꯥꯛ', 'raw_veg': 'ꯍꯤꯗꯥꯛ-ꯅꯥꯄꯤ', 'grains': 'ꯆꯦꯡ-ꯍꯋꯥꯏ', 'plate_size': 'ꯄ꯭ꯂꯦꯠ ꯁꯥꯏꯖ', 'half_plate': 'ꯍꯥꯐ ꯄ꯭ꯂꯦꯠ', 'full_plate': 'ꯐꯨꯜ ꯄ꯭ꯂꯦꯠ', 'quantity': 'ꯃꯁꯤꯡ', 'cancel': 'ꯇꯣꯛꯄ', 'send_request': 'ꯔꯤꯀ꯭ꯋꯦꯁ ꯊꯥꯕ', 'send_feedback': 'ꯐꯤꯗꯕꯦꯛ ꯊꯥꯕ', 'submit': 'ꯁꯕꯃꯤꯠ ꯇꯧꯕ', 'emergency_sos': 'ꯏꯃꯔꯖꯦꯟꯁꯤ SOS', 'sos_desc': 'ꯅꯍꯥꯛꯀꯤ ꯂꯩꯐꯝ ꯏꯃꯔꯖꯦꯟꯁꯤ ꯀꯃꯥꯟ ꯁꯦꯟꯇꯔꯗ ꯌꯧꯍꯟꯒꯅꯤ', 'describe_emergency': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯇꯧ ꯇꯥꯛꯄ (ꯏꯁꯤꯡ ꯏꯆꯥꯎ, ꯃꯩ ꯆꯥꯛꯄ, ꯑꯅꯥ-ꯂꯥꯌꯦꯡ, ꯑꯁꯤꯅꯆꯤꯡꯕ)...', 'send_sos': 'SOS ꯊꯥꯕ', 'logout': 'ꯂꯣꯒ ꯑꯥꯎꯠ', 'consumer_app': 'ꯀꯟꯁꯨꯃꯔ ꯑꯦꯞ', 'sos_btn': 'SOS'
            }, true, true);
            i18n.addResourceBundle('or', 'translation', {
                'nearest_center': 'ନିକଟତମ କେନ୍ଦ୍ର', 'crowd': 'ଭିଡ଼', 'hot_meals': 'ଗରମ ଖାଦ୍ୟ', 'menu_available': 'ମେନୁ ଉପଲବ୍ଧ', 'delivery_truck': 'ଡେଲିଭରି ଟ୍ରକ୍ ରାସ୍ତାରେ ଅଛି', 'directions': 'କେନ୍ଦ୍ରକୁ ଦିଗ', 'away': 'ଦୂର', 'progress': 'ଅଗ୍ରଗତି', 'truck_on_way': 'ଟ୍ରକ୍ ଆପଣଙ୍କ ସ୍ଥାନକୁ ଆସୁଛି', 'truck_arrived': 'ଟ୍ରକ୍ ପହଞ୍ଚିଛି!', 'follow_route': 'ଖାଦ୍ୟ କେନ୍ଦ୍ରରେ ପହଞ୍ଚିବା ପାଇଁ ନୀଳ ରାସ୍ତା ଅନୁସରଣ କରନ୍ତୁ', 'request_delivery': 'ଡେଲିଭରି ଅନୁରୋଧ କରନ୍ତୁ', 'ai_help': 'AI ସାହାଯ୍ୟ', 'nearest_centers': 'ନିକଟତମ କେନ୍ଦ୍ର', 'feedback': 'ମତାମତ', 'open': 'ଖୋଲା', 'closed': 'ବନ୍ଦ', 'cancel_pickup': 'ପିକଅପ୍ ବାତିଲ୍ କରନ୍ତୁ', 'request_pickup': 'ପିକଅପ୍ ଅନୁରୋଧ କରନ୍ତୁ', 'chat': 'ଚାଟ୍', 'you': 'ଆପଣ', 'danger_zone': 'ବିପଦ ଅଞ୍ଚଳ', 'avoid_area': 'ଏହି ଅଞ୍ଚଳରୁ ଦୂରେଇ ରୁହନ୍ତୁ', 'do_not_enter': 'ପ୍ରବେଶ କରନ୍ତୁ ନାହିଁ', 'ai_assistant': 'AI ସହାୟକ', 'supplier_support': 'ଯୋଗାଣକାରୀ ସହାୟତା', 'type_message': 'ବାର୍ତ୍ତା ଟାଇପ୍ କରନ୍ତୁ...', 'request_food': 'ଖାଦ୍ୟ ଅନୁରୋଧ କରନ୍ତୁ', 'collection_method': 'ସଂଗ୍ରହ ପଦ୍ଧତି', 'pickup_at_center': 'କେନ୍ଦ୍ରରେ ପିକଅପ୍', 'delivery': 'ଡେଲିଭରି', 'delivery_warning': 'ଟ୍ରକ୍ ଖାଲି ଥିଲେ ହିଁ ଡେଲିଭରି ଉପଲବ୍ଧ। ଜରୁରୀ ଆବଶ୍ୟକତା ପାଇଁ, ପିକଅପ୍ ବାଛନ୍ତୁ।', 'food_type': 'ଖାଦ୍ୟ ପ୍ରକାର', 'select_food': '-- ଖାଦ୍ୟ ବାଛନ୍ତୁ --', 'cooked_food': 'ରନ୍ଧା ଖାଦ୍ୟ', 'raw_veg': 'କଞ୍ଚା ପରିବା', 'grains': 'ଶସ୍ୟ', 'plate_size': 'ପ୍ଲେଟ୍ ଆକାର', 'half_plate': 'ହାଫ୍ ପ୍ଲେଟ୍', 'full_plate': 'ଫୁଲ୍ ପ୍ଲେଟ୍', 'quantity': 'ପରିମାଣ', 'cancel': 'ବାତିଲ୍ କରନ୍ତୁ', 'send_request': 'ଅନୁରୋଧ ପଠାନ୍ତୁ', 'send_feedback': 'ମତାମତ ପଠାନ୍ତୁ', 'submit': 'ଦାଖଲ କରନ୍ତୁ', 'emergency_sos': 'ଜରୁରୀକାଳୀନ SOS', 'sos_desc': 'ଆପଣଙ୍କ ସ୍ଥାନ ଜରୁରୀକାଳୀନ କମାଣ୍ଡ ସେଣ୍ଟରକୁ ପଠାଯିବ', 'describe_emergency': 'ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି ବର୍ଣ୍ଣନା କରନ୍ତୁ...', 'send_sos': 'SOS ପଠାନ୍ତୁ', 'logout': 'ଲଗ୍ ଆଉଟ୍', 'consumer_app': 'ଉପଭୋକ୍ତା ଆପ୍', 'sos_btn': 'SOS'
            }, true, true);
        }
    }, [i18n]);

    useEffect(() => {
        let isMounted = true;
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 5000);

        const initDashboard = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 800));

  /*              if (navigator.geolocation) {
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                                timeout: 8000, 
                                enableHighAccuracy: false,
                                maximumAge: 30000
                            });
                        });
                        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setLocationError(false);
                    } catch (error) {
                        console.warn("Location timeout, using network location");
                        try {
                            const pos = await new Promise((resolve, reject) => {
                                navigator.geolocation.getCurrentPosition(resolve, reject, { 
                                    timeout: 5000, 
                                    enableHighAccuracy: false
                                });
                            });
                            setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setLocationError(false);
                        } catch (e) {
                            console.error("Location failed:", e.message);
                            setLocationError(true);
                        }
                    }
                }
*/
                // Fetch inventory and centers
            
      const centersRes = await axios.get(
        `${API_BASE_URL}/centers`,
        { timeout: 5000 }
      );

      const inventoryRes = await axios.get(
        `${API_BASE_URL}/inventory`,
        { timeout: 5000 }
      );

      const inventoryData = Array.isArray(inventoryRes.data)
        ? inventoryRes.data
        : [];

      setInventory(inventoryData);

                const validData = validateCenters(centersRes.data);
                let newCenters = [];
                if (validData.length > 0) {
                    newCenters = validData.map(c => ({
                        ...c,
                        items: c.items || 50,
                        cookedFood: true
                    }));
                    const allCenters = [...FOOD_CENTERS, ...newCenters];
                    const uniqueCenters = Array.from(new Map(allCenters.map(item => [String(item.id), item])).values());
                    setCenters(uniqueCenters);
                    localStorage.setItem('consumer_centers', JSON.stringify(uniqueCenters));
                } else {
                    setCenters(FOOD_CENTERS);
                    localStorage.removeItem('consumer_centers');
                }

                // Build menu for each center from inventory
                const grouped = groupInventoryByCenter(inventoryData);
                const menus = {};
                for (const centerId in grouped) {
                    menus[centerId] = getMenuFromInventory(grouped[centerId]);
                }
                setCenterMenus(menus);

                // Fetch risk zones
                try {
                    const res = await axios.get(`${API_BASE_URL}/risk-zones`, { timeout: 5000 });
                    const validZones = validateCenters(res.data);
                    setRiskZones(validZones);
                    localStorage.setItem('consumer_riskZones', JSON.stringify(validZones));
                } catch { console.log('No risk zones'); }
            } catch (err) {
                console.error("Dashboard init error", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        initDashboard();
        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

    // Poll for request updates and notifications
    useEffect(() => {
        const checkRequests = async () => {
            const user = JSON.parse(localStorage.getItem('foodtech_user'));
            if (!user) return;
            
            try {
                const res = await axios.get(`${API_BASE_URL}/food-requests`);
                const myReqs = res.data.filter(r => r.consumer_name === user.name);

                myReqs.forEach(req => {
                    if (req.status === 'rejected' && req.rejection_reason === "Center is not available. Choose other center." && !localStorage.getItem(`notified_${req.id}`)) {
                        alert(`Order for ${req.item_name} cancelled: Center is not available. Choose other center.`);
                        localStorage.setItem(`notified_${req.id}`, 'true');
                    }
                });
            } catch { } 
        };

        const interval = setInterval(checkRequests, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-refresh centers every 10 seconds
    useEffect(() => {
        const refreshCenters = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/centers`, { timeout: 5000 });
                const validData = validateCenters(res.data);
                if (validData.length > 0) {
                    const newCenters = validData.map(c => ({
                        ...c,
                        items: c.items || 50,
                        cookedFood: true,
                        menu: c.menu || ['Rice Meals', 'Dal Chawal']
                    }));
                    const allCenters = [...FOOD_CENTERS, ...newCenters];
                    const uniqueCenters = Array.from(new Map(allCenters.map(item => [String(item.id), item])).values());
                    setCenters(uniqueCenters);
                }
            } catch { }
        };

        const interval = setInterval(refreshCenters, 10000);
        return () => clearInterval(interval);
    }, []);

    // Filtered centers for UI (search + chips)
    const filteredCenters = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        // start from all centers
        let list = Array.isArray(centers) ? centers.slice() : [];

        // Apply text search (name, address, menu)
        if (term) {
            list = list.filter(c => {
                const inName = c.name.toLowerCase().includes(term);
                const inAddr = c.address.toLowerCase().includes(term);
                const inMenu = c.menu && c.menu.some(m => m.toLowerCase().includes(term));
                return inName || inAddr || inMenu;
            });
        }

        // Apply chip filters
        if (activeChip === 'open') {
            list = list.filter(c => c.status === 'open');
        } else if (activeChip === 'low') {
            list = list.filter(c => c.crowd === 'Low');
        } else if (activeChip === 'hot') {
            list = list.filter(c => c.cookedFood);
        }

        // Nearest acts as a sort (requires location)
        if (activeChip === 'nearest' && userLoc) {
            list.sort((a, b) => {
                const distA = parseFloat(calculateDistance(userLoc, a)) || Infinity;
                const distB = parseFloat(calculateDistance(userLoc, b)) || Infinity;
                return distA - distB;
            });
        }

        return list;
    }, [centers, searchTerm, activeChip, userLoc]);

    // --- Voice Command ---
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Browser not supported."); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-US';
        setIsListening(true);
        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const numberMatch = transcript.match(/(\d+)/);
            let quantity = '1';
            let name = transcript;
            if (numberMatch) {
                quantity = numberMatch[0];
                name = transcript.replace(quantity, '').replace('kg', '').replace('litres', '').trim();
            }
            setReqItem({ name: name, quantity: quantity });
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
    };

    const handleSOS = async () => {
        setShowSOSModal(true);
    };

    const sendSOSAlert = async () => {
        if (!sosReason.trim()) {
            alert('Please describe the emergency');
            return;
        }

        if (!userLoc) {
            alert('Location access required to send SOS');
            return;
        }

        const user = JSON.parse(localStorage.getItem('foodtech_user'));

        try {
            await axios.post(`${API_BASE_URL}/sos-alert`, {
                lat: userLoc.lat,
                lng: userLoc.lng,
                reason: sosReason,
                sender_name: user.name,
                sender_type: 'consumer'
            });

            setShowSOSModal(false);
            setSOSReason('');
            alert('SOS Alert sent to Emergency Command Center! Help is on the way.');
        } catch (err) {
            alert('Failed to send SOS. Please try again.');
        }
    };

    // --- FETCH SAFE ROUTE (AVOIDING DANGER ZONES) ---
    const getRoadRoute = async (start, end, showTruck = true) => {
        if (!start || !end) {
            alert("Cannot navigate: Your location is not yet available. Please wait or enable GPS.");
            return;
        }
        try {
            // Call backend safe route API
            const response = await axios.get(`${API_BASE_URL}/safe-route`, {
                params: {
                    start_lat: start.lat,
                    start_lng: start.lng,
                    end_lat: end.lat,
                    end_lng: end.lng
                }
            });

            if (response.data) {
                const routeData = response.data;
                
                // Build route path: start -> waypoints -> end
                let coordinates = [[routeData.start.lat, routeData.start.lng]];
                if (routeData.waypoints && routeData.waypoints.length > 0) {
                    coordinates = coordinates.concat(routeData.waypoints);
                }
                coordinates.push([routeData.end.lat, routeData.end.lng]);
                
                setRoutePath(coordinates);

                // Show alert if route has danger zones
                if (routeData.has_danger_zones) {
                    alert(`⚠️ Route adjusted to avoid ${routeData.danger_zones.length} danger zone(s). Follow the blue path on map.`);
                }

                // Start truck animation only if showTruck is true (for delivery)
                if (showTruck) {
                    setTruckPosition(coordinates[0]);
                    setTruckProgress(0);
                    animateTruck(coordinates);
                } else {
                    setTruckPosition(null);
                    setTruckProgress(0);
                }
            }
        } catch (error) {
            console.error("Safe routing error:", error);
            // Fallback to straight line if API fails
            setRoutePath([[start.lat, start.lng], [end.lat, end.lng]]);
            alert("Could not calculate safe route. Showing direct path.");
        }
    };

    // Animate truck moving along route
    const animateTruck = (coordinates) => {
        let step = 0;
        const totalSteps = coordinates.length;
        const interval = setInterval(() => {
            if (step < totalSteps) {
                setTruckPosition(coordinates[step]);
                setTruckProgress(Math.round((step / totalSteps) * 100));
                step++;
            } else {
                clearInterval(interval);
            }
        }, 200); // Update every 200ms for smooth animation
    };

    const handleRequestFood = async () => {
        if (!reqItem.name) {
            alert("Please select a food item.");
            return;
        }
        
        const userStr = localStorage.getItem('foodtech_user');
        if (!userStr) {
            alert("You must be logged in to request food.");
            return;
        }
        const user = JSON.parse(userStr);

        // Security: Guest Verification Check
        if (user.isGuest && !user.phoneVerified) {
            setShowPhoneAuthModal(true);
            return;
        }

        const qty = parseFloat(reqItem.quantity);
        if (isNaN(qty) || qty <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        try {
            const payload = {
                consumer_name: user.name || "Guest",
                item_name: reqItem.name,
                quantity: qty,
                center_id: selectedCenter?.id || null,
                center_name: selectedCenter?.name || null,
                delivery_type: reqItem.deliveryType,
                phone: user.phone || "Not Provided",
                is_priority: reqItem.isPriority || false
            };
            
            await axios.post(`${API_BASE_URL}/request-food`, payload);

            setShowRequestModal(false);

            // Show route for both pickup and delivery
            if (userLoc && selectedCenter) {
                console.log('Selected Center:', selectedCenter.name, selectedCenter.lat, selectedCenter.lng);
                console.log('User Location:', userLoc.lat, userLoc.lng);
                
                if (reqItem.deliveryType === 'delivery') {
                    // Delivery: truck goes from center to user (with truck animation)
                    await getRoadRoute(selectedCenter, userLoc, true);
                    alert(`Delivery Request Sent! Truck will deliver from ${selectedCenter.name}. Track on map.`);
                } else {
                    // Pickup: user goes from their location to center (no truck, just directions)
                    await getRoadRoute(userLoc, selectedCenter, false);
                    alert(`Pickup Request Confirmed! Follow the blue route on map to reach ${selectedCenter.name}.`);
                }
            } else {
                alert(reqItem.deliveryType === 'delivery' ? "Delivery Request Sent!" : "Pickup Request Confirmed!");
            }

            setReqItem({ name: '', quantity: '1', plateSize: 'full', deliveryType: 'pickup', unit: 'kg' });
            setSelectedCenter(null);

        } catch (e) { 
            console.error("Request failed:", e);
            let errorMsg = "Please check your connection.";
            if (e.response) {
                errorMsg = e.response.data?.detail || `Server Error (${e.response.status})`;
            } else if (e.request) {
                errorMsg = "No response from server. Ensure backend is running.";
            } else {
                errorMsg = e.message;
            }
            alert(`Failed to send food request: ${errorMsg}`); 
        }
    };

    const handleSendOTP = async () => {
        if (!guestPhone || guestPhone.length < 10) {
            alert("Please enter a valid 10-digit phone number");
            return;
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/send-otp`, { phone: guestPhone });
            setGeneratedOTP(res.data.otp);
            alert(`OTP Sent: ${res.data.otp}\n(If using real SMS, check your phone)`);
        } catch (e) {
            console.error(e);
            const msg = e.response?.data?.detail || "Ensure backend is running.";
            alert(`Failed to send OTP: ${msg}`);
        }
    };

    const handleVerifyOTP = () => {
        if (guestOTP === generatedOTP) {
            const user = JSON.parse(localStorage.getItem('foodtech_user'));
            user.phoneVerified = true;
            user.phone = guestPhone;
            localStorage.setItem('foodtech_user', JSON.stringify(user));
            setShowPhoneAuthModal(false);
            alert("Phone Verified! Sending request...");
            handleRequestFood();
        } else {
            alert("Incorrect OTP. Please try again.");
        }
    };



    const handleFeedback = async () => { alert("Feedback Sent!"); setShowFeedbackModal(false); };

    // Helper: determine if selected food is a cooked/plate item
    const isCookedFood = (name) => {
        if (!name) return false;
        const cookedList = ['rice meals', 'dal chawal', 'khichdi', 'vegetable curry', 'chapati pack', 'hot soup'];
        return cookedList.some(k => name.toLowerCase().includes(k));
    };

    // When user picks a cooked food, clear unit (kg/l/units) since it's plate-based
    useEffect(() => {
        if (isCookedFood(reqItem.name)) {
            setReqItem(prev => ({ ...prev, unit: '' }));
        } else if (!reqItem.unit) {
            // ensure default unit for non-cooked items
            setReqItem(prev => ({ ...prev, unit: prev.unit || 'kg' }));
        }
    }, [reqItem.name]);

    // --- AI CHIP HANDLER ---
    const handleAIChip = (prompt) => {
        const userMsg = { sender: 'You', content: prompt, self: true };
        setAiMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            let responseContent = "";
            let cards = [];
            const lowerPrompt = prompt.toLowerCase();

            if (lowerPrompt.includes('nearest')) {
                responseContent = "Here are the nearest open centers:";
                cards = centers
                    .filter(c => c.status === 'open')
                    .map(c => ({ ...c, distance: calculateDistance(userLoc, c) }))
                    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
                    .slice(0, 3);
            } else if (lowerPrompt.includes('meals')) {
                responseContent = "These centers have meals available:";
                cards = centers
                    .filter(c => c.status === 'open' && c.menu && c.menu.length > 0)
                    .map(c => ({ ...c, distance: calculateDistance(userLoc, c) }))
                    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
                    .slice(0, 3);
            } else if (lowerPrompt.includes('low crowd')) {
                responseContent = "Found these centers with low crowd:";
                cards = centers
                    .filter(c => c.status === 'open' && c.crowd === 'Low')
                    .map(c => ({ ...c, distance: calculateDistance(userLoc, c) }))
                    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
                    .slice(0, 3);
            } else if (lowerPrompt.includes('delivery')) {
                responseContent = "To request delivery, select a center on the map and click 'Request Delivery'. Or use the 'Navigate' button on a center card.";
            } else if (lowerPrompt.includes('emergency')) {
                responseContent = "For immediate help, please press the red SOS button on the bottom right of your screen.";
            } else {
                responseContent = "I can help you find food. Try one of the suggestions above.";
            }

            setAiMessages(prev => [...prev, {
                sender: 'SAFE Assistant',
                content: responseContent,
                self: false,
                cards: cards
            }]);
            setIsTyping(false);
        }, 800);
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!msgText) return;
        
        // Add user message
        setAiMessages(prev => [...prev, { sender: 'You', content: msgText, self: true }]);
        const userQuery = msgText;
        setMsgText("");
        setIsTyping(true);

        // AI Response Logic
        try {
            // Attempt to call backend AI service
            const response = await axios.post(`${API_BASE_URL}/ai-chat`, {
                query: userQuery,
                context: {
                    user_location: userLoc,
                    centers: centers
                }
            });
            setAiMessages(prev => [...prev, { sender: 'AI Bot', content: response.data.response, self: false }]);
            setIsTyping(false);
        } catch (error) {
            console.warn("AI Backend unreachable, using local fallback logic.");
            setTimeout(() => {
                let aiResponse = "";
                const lowerQuery = userQuery.toLowerCase();

                if (lowerQuery.includes('nearest') || lowerQuery.includes('closest') || lowerQuery.includes('near')) {
                    if (nearestCenter) {
                        aiResponse = `The nearest food center is ${nearestCenter.name}, located ${nearestCenter.distance} km away.`;
                    } else {
                        aiResponse = "Please enable location access to find the nearest center.";
                    }
                } else if (lowerQuery.includes('open') || lowerQuery.includes('available')) {
                    const openCenters = centers.filter(c => c.status === 'open');
                    aiResponse = `Currently ${openCenters.length} centers are open: ${openCenters.slice(0, 3).map(c => c.name).join(', ')}.`;
                } else {
                    aiResponse = "I can help you find food centers, check availability, and more. Try asking: 'Which center is nearest?'";
                }

                setAiMessages(prev => [...prev, { sender: 'AI Bot', content: aiResponse, self: false }]);
                setIsTyping(false);
            }, 800);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-200/20 via-slate-50 to-slate-50"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <MapPin className="absolute inset-0 m-auto text-green-500" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-wide">Loading consumer data...</h2>
                    <div className="flex items-center gap-2 text-green-600/60 text-xs font-mono uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Locating nearby centers
                    </div>
                </div>
            </div>
        );
    }

    // --- 1️⃣ HEADER BAR (FIXED TOP) ---
    const renderHeader = () => (
        <header className="relative shrink-0 z-50 bg-white/90 backdrop-blur-md shadow-sm px-4 py-3 flex justify-between items-center h-16 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Shield size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-base font-black text-slate-900 leading-none tracking-tight">Consumer App</h1>
                    <p className="text-[10px] text-slate-500 font-medium">Emergency Response · SAFE</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => {
                    setIsLocating(true);
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => {
                                setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                                setRecenterTrigger(prev => prev + 1);
                                setIsLocating(false);
                            },
                            (err) => {
                                console.error("Geolocation error:", err);
                                setLocationError(true);  
                                setIsLocating(false);
                            },
                            { enableHighAccuracy: true }
                        );
                    } else {
                        alert("Geolocation is not supported by your browser.");
                        setIsLocating(false);
                    }
                }} className="p-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100" title="Locate Me">
                    {isLocating ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Crosshair size={20} />}
                </button>
                {deferredPrompt && (
                    <button onClick={handleInstallClick} className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Install App">
                        <Download size={20} />
                    </button>
                )}

                {/* Location Error Indicator */}
                {locationError && (
                    <div className="w-full bg-blue-600/90 backdrop-blur-md text-white py-1 px-4 text-center text-xs font-bold z-[60] flex items-center justify-center gap-2 border-b border-blue-500/50 shrink-0">
                        <MapPinOff size={14} />
                        <span>Location access blocked. Enable in browser settings for local results.</span>
                        <span>Location access blocked. Using default location (Imphal).</span>
                    </div>
                )}
                <button onClick={handleLogout} className="p-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );

    // --- 2️⃣ SEARCH BAR SECTION ---
    const renderSearchBar = () => (
        <div className="px-1 py-3 z-40">
            <div className="flex gap-2">
                <div className="flex-1 relative shadow-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search centers, area, food..."
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 placeholder-slate-400 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors shadow-sm border border-slate-200 ${showFilters ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                    <SlidersHorizontal size={20} />
                </button>
                <button
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors shadow-sm border border-slate-200 ${isListExpanded ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                    {isListExpanded ? <MapPin size={20} /> : <List size={20} />}
                </button>
            </div>
        </div>
    );

    // --- 3️⃣ FILTER CHIPS ROW ---
    const renderFilterChips = () => {
        if (!showFilters) return null;
        return (
        <div className="pb-2 px-1 z-40 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
                {[
                    { label: 'All', value: null },
                    { label: 'Nearby', value: 'nearest' },
                    { label: 'Hot Meals', value: 'hot' },
                    { label: 'Low Crowd', value: 'low' },
                    { label: 'Open Now', value: 'open' }
                ].map((chip) => {
                    const isActive = activeChip === chip.value;
                    return (
                        <button
                            key={chip.label}
                            onClick={() => setActiveChip(isActive ? null : chip.value)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors border shadow-sm ${isActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {chip.label}
                        </button>
                    );
                })}
            </div>
        </div>
        );
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-gray-50 font-sans flex flex-col overflow-hidden">
                {/* Offline Indicator */}
                {!isOnline && (
                    <div className="w-full bg-amber-600/90 backdrop-blur-md text-white py-1 px-4 text-center text-xs font-bold z-[60] flex items-center justify-center gap-2 border-b border-amber-500/50 shrink-0">
                        <WifiOff size={14} />
                        {t('offline_msg', "You're offline - Some features may be limited")}
                    </div>
                )}
                
                {/* Header */}
                {renderHeader()}

                <div className="flex-1 w-full md:max-w-7xl mx-auto px-3 py-3 overflow-hidden flex flex-col md:flex-row gap-4 relative">
                    {/* Left Panel (Mobile: Full width, Desktop: 1/3 width) */}
                    <div className="flex flex-col w-full md:w-1/3 h-full overflow-hidden">
                        <div className="shrink-0">
                            {renderSearchBar()}
                            {renderFilterChips()}
                        </div>

                        {/* Mobile Map Position - Sticky/Fixed height */}
                        {isMobile && (
                            <div className="shrink-0 w-full h-[35vh] rounded-2xl overflow-hidden shadow-md border border-slate-200 mb-3 relative z-0">
                                <MapComponent userLoc={userLoc} centers={filteredCenters} routePath={routePath} truckPosition={truckPosition} truckProgress={truckProgress} riskZones={riskZones} t={t} recenterTrigger={recenterTrigger} />
                            </div>
                        )}

                        {/* Scrollable List Section */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 md:pb-0 pr-1">
                            {filteredCenters.map((c) => (
                                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{c.name}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <MapPin size={12} /> {c.address}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.crowd === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {c.crowd}
                                            </span>
                                            <p className="text-xs font-bold text-emerald-600 mt-1">
                                                {calculateDistance(userLoc, c)} km
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-3 mb-3">
                                        {c.cookedFood && (
                                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">
                                                Hot Meals
                                            </span>
                                        )}
                                        {(c.menu || []).slice(0, 3).map((item, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200">
                                                {item}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => {
                                                setSelectedCenter(c);
                                                setReqItem(prev => ({ ...prev, deliveryType: 'delivery' }));
                                                setShowRequestModal(true);
                                            }}
                                            className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700"
                                        >
                                            Request Delivery
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setSelectedCenter(c);
                                                setReqItem(prev => ({ ...prev, deliveryType: 'pickup' }));
                                                setShowRequestModal(true);
                                            }}
                                            className="py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                                        >
                                            Request Pickup
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Section */}
                    {!isMobile && (
                        <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-md border border-slate-200 relative z-0">
                            <MapComponent userLoc={userLoc} centers={filteredCenters} routePath={routePath} truckPosition={truckPosition} truckProgress={truckProgress} riskZones={riskZones} t={t} recenterTrigger={recenterTrigger} />
                        </div>
                    )}
                </div>

                {/* FABs */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                    <button onClick={handleSOS} className="bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-300 hover:bg-red-700 transition-transform hover:scale-110">
                        <AlertTriangle size={24} />
                    </button>
                    <button onClick={() => setActiveChat('ai')} className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-300 hover:bg-emerald-700 transition-transform hover:scale-110">
                        <Bot size={24} />
                    </button>
                </div>
                
            {activeChat && (
                <div className={`absolute bottom-0 w-full md:w-96 md:bottom-20 md:left-4 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border-2 border-slate-200 flex flex-col z-50 overflow-hidden h-[60vh] md:h-[500px]`}>
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center">
                        <div>
                            <span className="font-black flex gap-2 text-base items-center">
                                <Bot size={20} />
                                SAFE Assistant
                            </span>
                        </div>
                        <button onClick={() => setActiveChat(null)} className="hover:bg-white/20 rounded-lg p-2 transition-all"><span className="text-xl">×</span></button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white space-y-3">
                        {/* Quick Prompts Chips */}
                        {aiMessages.length === 1 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {["Nearest center open now?", "What meals available near me?", "Low crowd centers?", "How to request delivery?", "Emergency help"].map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAIChip(prompt)}
                                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors font-medium"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {aiMessages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3 rounded-2xl text-sm max-w-[85%] shadow-sm ${m.self ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-white border border-slate-200'}`}>
                                    {m.content}
                                </div>
                                {/* Render Mini Cards if available */}
                                {m.cards && m.cards.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto w-full mt-2 pb-2 px-1">
                                        {m.cards.map(c => (
                                            <div key={c.id} className="min-w-[180px] bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                                                <div className="font-bold text-slate-800 text-xs truncate">{c.name}</div>
                                                <div className="text-[10px] text-slate-500 mb-2">{c.distance} km • {c.crowd} Crowd</div>
                                                <button 
                                                    onClick={() => { getRoadRoute(userLoc, c, false); setActiveChat(null); }}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                                                >
                                                    Navigate
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="p-3 rounded-2xl text-sm max-w-[80%] shadow-sm bg-white border border-slate-200 mr-auto w-16">
                                <div className="flex gap-1 items-center h-full pl-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendChatMessage} className="p-4 border-t-2 border-slate-100 flex gap-3 bg-white">
                        <input
                            value={msgText}
                            onChange={e => setMsgText(e.target.value)}
                            className="flex-1 text-sm outline-none px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all"
                            placeholder={t('type_message', 'Type message...')}
                        />
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            {/* Security: Guest Phone Verification Modal */}
            {showPhoneAuthModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70]">
                    <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl border border-slate-200 relative">
                        <button onClick={() => setShowPhoneAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
                                <Shield size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Guest Verification</h3>
                            <p className="text-xs text-slate-500">Verify phone number to request food</p>
                        </div>
                        
                        {!generatedOTP ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="tel" 
                                        placeholder="Phone Number" 
                                        className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={guestPhone}
                                        onChange={(e) => setGuestPhone(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleSendOTP} className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                                    Send OTP
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Enter OTP" 
                                        className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={guestOTP}
                                        onChange={(e) => setGuestOTP(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleVerifyOTP} className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition">
                                    Verify & Continue
                                </button>
                                <div className="flex justify-between items-center mt-2">
                                    <button onClick={() => setGeneratedOTP(null)} className="text-slate-500 text-xs hover:underline">
                                        Change Number
                                    </button>
                                    <button onClick={handleSendOTP} className="text-blue-600 text-xs hover:underline font-bold">
                                        Resend OTP
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showRequestModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-3xl w-96 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <Utensils size={24} className="text-white" />
                                    </div>
                                    {t('request_food')}
                                </h3>
                                {selectedCenter && (
                                    <p className="text-xs text-slate-600 mt-2 ml-16">📍 From: <span className="font-bold text-green-600">{t(`center_names.${selectedCenter.id}`, selectedCenter.name)}</span></p>
                                )}
                            </div>
                            <button onClick={startListening} className={`p-3 rounded-xl transition-all shadow-md ${isListening ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                        </div>
                        {isListening && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center"><p className="text-sm text-red-600 font-bold flex items-center justify-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>Listening...</p></div>}
                        <div className="space-y-4">
                            {/* Delivery Type Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('collection_method', 'Collection Method')}</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setReqItem({ ...reqItem, deliveryType: 'pickup' })}
                                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${reqItem.deliveryType === 'pickup'
                                            ? 'bg-green-500 text-white border-green-500'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                                            }`}
                                    >
                                        🏪 {t('pickup_at_center', 'Pickup at Center')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReqItem({ ...reqItem, deliveryType: 'delivery' })}
                                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${reqItem.deliveryType === 'delivery'
                                            ? 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                            }`}
                                    >
                                        🚚 {t('delivery', 'Delivery')}
                                    </button>
                                </div>
                                {reqItem.deliveryType === 'delivery' && (
                                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                        ⚠️ {t('delivery_warning', 'Delivery only available when truck is free. For urgent needs, choose pickup.')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('food_type')}</label>
                                <select className="w-full border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all" onChange={(e) => setReqItem({ ...reqItem, name: e.target.value })} value={reqItem.name}>
                                    <option value="">{t('select_food', '-- Select Food --')}</option>
                                    {selectedCenter && centerMenus[selectedCenter.id] && centerMenus[selectedCenter.id].length > 0 ? (
                                        <optgroup label={`📋 ${t('menu_available', 'Available')} at ${t(`center_names.${selectedCenter.id}`, selectedCenter.name)}`}>
                                            {centerMenus[selectedCenter.id].map((item, idx) => (
                                                <option key={idx} value={item}>{item}</option>
                                            ))}
                                        </optgroup>
                                    ) : (
                                        <>
                                            <optgroup label={`🍛 ${t('cooked_food', 'Cooked Food (Ready to Eat)')}`}>
                                                <option value="Rice Meals">Rice Meals</option>
                                                <option value="Dal Chawal">Dal Chawal</option>
                                                <option value="Khichdi">Khichdi</option>
                                                <option value="Vegetable Curry">Vegetable Curry</option>
                                                <option value="Chapati Pack">Chapati Pack</option>
                                                <option value="Hot Soup">Hot Soup</option>
                                            </optgroup>
                                            <optgroup label={`🥬 ${t('raw_veg', 'Raw Vegetables')}`}>
                                                <option value="Onion">Onion</option>
                                                <option value="Potato">Potato</option>
                                                <option value="Tomato">Tomato</option>
                                            </optgroup>
                                            <optgroup label={`🌾 ${t('grains', 'Grains & Staples')}`}>
                                                <option value="Rice">Rice</option>
                                                <option value="Dal">Dal</option>
                                                <option value="Wheat Flour">Wheat Flour</option>
                                            </optgroup>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Plate Size Selection (Only for Cooked Food) */}
                            {['Rice Meals', 'Dal Chawal', 'Khichdi', 'Vegetable Curry', 'Chapati Pack', 'Hot Soup'].includes(reqItem.name) && (
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('plate_size', 'Plate Size')}</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setReqItem({ ...reqItem, plateSize: 'half' })}
                                            className={`py-2 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${reqItem.plateSize === 'half'
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                                }`}
                                        >
                                            🍽️ {t('half_plate', 'Half Plate')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReqItem({ ...reqItem, plateSize: 'full' })}
                                            className={`py-2 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${reqItem.plateSize === 'full'
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                                }`}
                                        >
                                            🍽️ {t('full_plate', 'Full Plate')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                                    {t('quantity')}
                                    {!isCookedFood(reqItem.name) && (
                                        <span className="text-xs"> (kg/L)</span>
                                    )}
                                </label>
                                <div className="flex gap-2">
                                    <input type="number" min={isCookedFood(reqItem.name) ? 1 : 0} className="flex-1 border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all" value={reqItem.quantity} onChange={e => setReqItem({ ...reqItem, quantity: e.target.value })} />
                                    {!isCookedFood(reqItem.name) && (
                                        <select
                                            className="w-24 border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all bg-white"
                                            value={reqItem.unit}
                                            onChange={e => setReqItem({ ...reqItem, unit: e.target.value })}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="l">l</option>
                                            <option value="units">units</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                                <input 
                                    type="checkbox" 
                                    id="priorityCheck" 
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={reqItem.isPriority || false}
                                    onChange={(e) => setReqItem({...reqItem, isPriority: e.target.checked})}
                                />
                                <label htmlFor="priorityCheck" className="text-xs text-blue-800 font-medium cursor-pointer">
                                    <strong>Priority Request:</strong> For Child (&lt;10y), Senior (&gt;60y), or Differently Abled. We will prioritize this delivery.
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8"><button onClick={() => setShowRequestModal(false)} className="px-6 py-3 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">{t('cancel')}</button><button onClick={handleRequestFood} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">{t('send_request')}</button></div>
                    </div>
                </div>
            )}

            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-3xl w-96 shadow-2xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <ThumbsUp size={24} className="text-white" />
                            </div>
                            <h3 className="font-black text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{t('send_feedback')}</h3>
                        </div>
                        <textarea className="w-full border-2 border-slate-200 p-4 rounded-xl h-32 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all resize-none" placeholder="Share your experience..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowFeedbackModal(false)} className="px-6 py-3 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">{t('cancel')}</button><button onClick={handleFeedback} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">{t('submit')}</button></div>
                    </div>
                </div>
            )}

            {/* SOS Alert Modal */}
            {showSOSModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-3xl w-96 shadow-2xl border-2 border-red-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                                <AlertTriangle size={24} className="text-white" />
                            </div>
                            <h3 className="font-black text-2xl bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">{t('emergency_sos', 'Emergency SOS')}</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{t('sos_desc', 'Your location will be sent to Emergency Command Center')}</p>
                        <textarea
                            className="w-full border-2 border-red-200 p-4 rounded-xl h-32 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all resize-none"
                            placeholder={t('describe_emergency', 'Describe the emergency (violence, flood, fire, medical emergency, etc.)...')}
                            value={sosReason}
                            onChange={e => setSOSReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowSOSModal(false); setSOSReason(''); }} className="px-6 py-3 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">{t('cancel', 'Cancel')}</button>
                            <button onClick={sendSOSAlert} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                                <AlertTriangle size={18} /> {t('send_sos', 'Send SOS')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsumerDashboard;