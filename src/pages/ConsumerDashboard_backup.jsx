import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, MessageCircle, Send, Bot, Utensils, ThumbsUp, Globe, Mic, MicOff, AlertTriangle, Navigation, Truck, Search, Filter, Bell, User, Clock, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useTranslation } from 'react-i18next';

// --- Icon Config ---
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const FOOD_CENTERS = [
    { id: 1, name: "Moirang Bazar Food Center", address: "Moirang Bazar, Bishnupur", lat: 24.5167, lng: 93.7667, status: "open", crowd: "High", items: 45, cookedFood: true },
    { id: 2, name: "Imphal Community Kitchen", address: "Thangal Bazar, Imphal West", lat: 24.8170, lng: 93.9368, status: "open", crowd: "Low", items: 62, cookedFood: true },
    { id: 3, name: "Thoubal Relief Center", address: "Thoubal Bazar, Thoubal", lat: 24.6340, lng: 93.9856, status: "open", crowd: "Medium", items: 38, cookedFood: true },
    { id: 4, name: "Churachandpur Food Hub", address: "Tuibong, Churachandpur", lat: 24.3333, lng: 93.6833, status: "open", crowd: "Low", items: 52, cookedFood: true },
    { id: 5, name: "Kakching Distribution Center", address: "Kakching Khunou, Kakching", lat: 24.4980, lng: 93.9810, status: "open", crowd: "Medium", items: 41, cookedFood: false },
    { id: 6, name: "Ukhrul Relief Station", address: "Ukhrul Town, Ukhrul", lat: 25.0500, lng: 94.3600, status: "open", crowd: "High", items: 29, cookedFood: true },
    { id: 7, name: "Senapati Emergency Kitchen", address: "Senapati Bazar, Senapati", lat: 25.2667, lng: 94.0167, status: "open", crowd: "Low", items: 55, cookedFood: true },
    { id: 8, name: "Jiribam Food Point", address: "Jiribam Town, Jiribam", lat: 24.8050, lng: 93.1100, status: "open", crowd: "Medium", items: 34, cookedFood: false },
];

const ConsumerDashboard = () => {
    const { t, i18n } = useTranslation();
    const [userLoc, setUserLoc] = useState(null);
    const [centers] = useState(FOOD_CENTERS);
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // Modal & Feature States
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [reqItem, setReqItem] = useState({ name: '', quantity: '1', plateSize: 'full' });
    const [feedbackText, setFeedbackText] = useState('');
    const [isListening, setIsListening] = useState(false);

    // Routing States
    const [routePath, setRoutePath] = useState([]); // Stores the road coordinates
    const [routeInfo, setRouteInfo] = useState(null); // Stores distance/duration
    const [truckPosition, setTruckPosition] = useState(null); // Live truck location
    const [truckProgress, setTruckProgress] = useState(0); // 0-100% progress

    // Calculate nearest low-crowded center
    const nearestCenter = useMemo(() => {
        if (!userLoc) return null;

        // Filter out high-crowded centers
        const availableCenters = centers.filter(c => c.crowd !== 'High' && c.status === 'open');

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
    const [supplierMessages, setSupplierMessages] = useState([]);
    const [aiMessages, setAiMessages] = useState([{ sender: 'AI Bot', content: 'Hello! I am your FoodTech Assistant. How can I help you today?', self: false }]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ openNow: false, nearest: false, hotMeals: false, lowStock: false });
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const toggleLanguage = () => {
        const langs = ['en', 'hi', 'mni', 'or'];
        const current = langs.indexOf(i18n.language) > -1 ? langs.indexOf(i18n.language) : 0;
        const next = (current + 1) % langs.length;
        i18n.changeLanguage(langs[next]);
    };

    const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(() => { scrollToBottom(); }, [supplierMessages, aiMessages, activeChat]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => alert("Please enable location for routing.")
            );
        }
        const interval = setInterval(() => {
            axios.get('http://localhost:8000/messages').then(res => setSupplierMessages(res.data.reverse()));
            setLastUpdated(new Date());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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

    const handleSOS = async () => { if (confirm("Send SOS?")) alert(t('sos_sent')); };

    // --- FETCH DYNAMIC ROAD ROUTE (OSRM API) ---
    const getRoadRoute = async (start, end) => {
        try {
            // OSRM Public API (Free, No Key Needed)
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await axios.get(url);

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];

                // Convert [lon, lat] to [lat, lon] for Leaflet
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                setRoutePath(coordinates);

                // Set Info
                setRouteInfo({
                    distance: (route.distance / 1000).toFixed(1) + " km",
                    duration: (route.duration / 60).toFixed(0) + " min"
                });

                // Start truck animation from food center
                setTruckPosition(coordinates[0]);
                setTruckProgress(0);
                animateTruck(coordinates);
            }
        } catch (error) {
            console.error("Routing Error:", error);
            // Fallback to straight line if API fails
            setRoutePath([[start.lat, start.lng], [end.lat, end.lng]]);
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
        if (!reqItem.name) return;
        const user = JSON.parse(localStorage.getItem('foodtech_user'));

        try {
            await axios.post('http://localhost:8000/request-food', {
                consumer_name: user.name, item_name: reqItem.name, quantity: parseFloat(reqItem.quantity)
            });
            setShowRequestModal(false);
            setReqItem({ name: '', quantity: '1', plateSize: 'full' });

            // --- CALCULATE DYNAMIC ROUTE ---
            if (userLoc) {
                const center = centers[1]; // Defaulting to Imphal Center
                await getRoadRoute(center, userLoc);
                alert(`Request Sent! Showing road path from ${center.name}`);
            } else {
                alert("Request Sent! (Enable location to see route)");
            }

        } catch (e) { alert("Error sending request."); }
    };

    const openGoogleMaps = () => {
        if (userLoc && centers[1]) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${centers[1].lat},${centers[1].lng}&destination=${userLoc.lat},${userLoc.lng}&travelmode=driving`;
            window.open(url, '_blank');
        }
    };

    const handleFeedback = async () => { alert("Feedback Sent!"); setShowFeedbackModal(false); };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!msgText) return;
        const user = JSON.parse(localStorage.getItem('foodtech_user'));
        if (activeChat === 'supplier') {
            await axios.post('http://localhost:8000/messages', { sender: user.name, content: msgText });
            const res = await axios.get('http://localhost:8000/messages');
            setSupplierMessages(res.data.reverse());
        } else {
            setAiMessages(prev => [...prev, { sender: 'You', content: msgText, self: true }]);
            setIsAiTyping(true);
            
            // Simulate AI response with realistic delay
            setTimeout(() => {
                const responses = [
                    "I can help you find the nearest food center. Would you like me to show you?",
                    "Based on your location, I recommend visiting Imphal Community Kitchen - it has low crowd and hot meals available.",
                    "You can request food by clicking the 'Request Food' button. What would you like to order?",
                    "All our food centers are currently open. The nearest one is " + (nearestCenter ? nearestCenter.distance + " km away." : "being calculated."),
                    "I can assist you with food requests, finding centers, or answering questions about our service."
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                setAiMessages(prev => [...prev, { sender: 'AI Bot', content: randomResponse, self: false }]);
                setIsAiTyping(false);
            }, 1500);
        }
        setMsgText("");
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Premium Header */}
            <header className="relative bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white px-6 py-5 flex justify-between items-center shadow-2xl z-20 border-b-4 border-green-400">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                        <MapPin size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black drop-shadow-md tracking-tight">{t('consumer_app')}</h1>
                        <p className="text-xs text-green-100 font-semibold">Smart Aid for Food Emergencies</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <button onClick={toggleLanguage} className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold hover:bg-white/20 transition-all shadow-md">
                        <Globe size={16} /> {i18n.language === 'en' ? 'EN' : i18n.language === 'hi' ? 'HI' : i18n.language === 'mni' ? 'MNI' : 'OR'}
                    </button>
                    <button onClick={handleSOS} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all border border-red-500">
                        <AlertTriangle size={18} className="animate-pulse" /> {t('sos_btn')}
                    </button>
                    <button onClick={() => navigate('/login')} className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/20 transition-all">{t('logout')}</button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row relative">
                {/* Premium Sidebar */}
                <div className="w-full md:w-[420px] bg-white/80 backdrop-blur-xl shadow-2xl z-10 flex flex-col border-r border-slate-200/50 relative">
                    <div className="p-6 space-y-5 overflow-y-auto h-full">

                        {/* NEAREST CENTER RECOMMENDATION */}
                        {nearestCenter && (
                            <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl p-5 shadow-xl border border-green-400 animate-in fade-in slide-in-from-top duration-500">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                            <Navigation size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-100 font-bold uppercase tracking-wider">Nearest Center</p>
                                            <p className="text-2xl font-black text-white">{nearestCenter.distance} km</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        <span className="text-xs font-black text-white flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                            {nearestCenter.crowd}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
                                    <h4 className="font-bold text-white text-sm mb-1">{nearestCenter.name}</h4>
                                    <p className="text-xs text-green-100 flex items-center gap-1">
                                        <MapPin size={11} />
                                        {nearestCenter.address}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-white">📦 {nearestCenter.items} items</span>
                                    </div>
                                    {nearestCenter.cookedFood && (
                                        <div className="bg-orange-500/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-orange-300/50">
                                            <span className="text-xs font-bold text-white">🍛 Hot Meals</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        if (userLoc) {
                                            getRoadRoute(nearestCenter, userLoc);
                                        }
                                    }}
                                    className="w-full bg-white hover:bg-green-50 text-green-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    <Truck size={16} />
                                    Get Directions
                                </button>
                            </div>
                        )}

                        {/* ROUTE INFO CARD WITH TRUCK TRACKING */}
                        {routePath.length > 0 && routeInfo && (
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-left duration-500 border border-emerald-400">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Truck size={14} className="animate-bounce" /> Delivery Truck En Route
                                        </p>
                                        <h3 className="text-3xl font-black text-white">{routeInfo.duration}</h3>
                                        <p className="text-sm text-emerald-100 mt-1">{routeInfo.distance} away</p>
                                    </div>
                                    <button onClick={openGoogleMaps} className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl hover:bg-white/30 text-xs font-bold flex items-center gap-1.5 border border-white/30 transition-all">
                                        <Navigation size={14} /> Open
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-white/90 mb-1">
                                        <span>Progress</span>
                                        <span className="font-bold">{truckProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-white h-full rounded-full transition-all duration-300 ease-linear"
                                            style={{ width: `${truckProgress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                    {truckProgress < 100 ? 'Truck is on the way to your location' : 'Truck has arrived!'}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowRequestModal(true)} className="group relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white py-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Utensils size={28} className="relative z-10" />
                                <span className="text-sm relative z-10">{t('request_food')}</span>
                            </button>
                            <button onClick={() => setActiveChat('ai')} className="group relative bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:via-teal-700 hover:to-teal-800 text-white py-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Bot size={28} className="relative z-10" />
                                <span className="text-sm relative z-10">{t('ai_help')}</span>
                            </button>
                        </div>

                        {/* Centers List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></span>
                                    {t('nearest_centers')}
                                </h3>
                                <button onClick={() => setShowFeedbackModal(true)} className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-semibold transition-colors">
                                    <ThumbsUp size={13} /> {t('feedback')}
                                </button>
                            </div>
                            {centers.map(center => (
                                <div key={center.id} className="group relative bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 border-2 border-slate-100 hover:border-emerald-300 transition-all shadow-md hover:shadow-2xl hover:scale-[1.02]">
                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4">
                                        <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider shadow-md ${center.status === 'open' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                            }`}>{center.status === 'open' ? '● OPEN' : '● CLOSED'}</span>
                                    </div>

                                    {/* Center Info */}
                                    <div className="pr-20 mb-4">
                                        <h4 className="font-bold text-[16px] text-slate-900 leading-tight mb-2">{center.name}</h4>
                                        <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
                                            <MapPin size={12} className="text-emerald-600 flex-shrink-0" />
                                            <span>{center.address}</span>
                                        </p>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <div className={`w-2.5 h-2.5 rounded-full ${center.crowd === 'High' ? 'bg-red-500 animate-pulse' : center.crowd === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                                                }`}></div>
                                            <span className="text-[11px] font-bold text-slate-700">{center.crowd}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <span className="text-[11px] font-bold text-slate-700">📦 {center.items}</span>
                                        </div>
                                        {center.cookedFood && (
                                            <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1.5 rounded-lg border border-orange-200">
                                                <span className="text-[11px] font-black text-orange-700">🍛 Hot Meals</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => setActiveChat('supplier')}
                                        className="w-full text-[12px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all group-hover:scale-[1.02]"
                                    >
                                        <MessageCircle size={14} /> {t('chat_supplier')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative z-0">
                    <MapContainer center={[24.8170, 93.9368]} zoom={10} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        {centers.map(c => (
                            <Marker
                                key={c.id}
                                position={[c.lat, c.lng]}
                                icon={L.divIcon({
                                    className: 'custom-marker',
                                    html: `<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 18px;">📍</div></div>`,
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 40]
                                })}
                            >
                                <Popup className="custom-popup">
                                    <div style="min-width: 200px;">
                                        <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #059669;">{c.name}</h3>
                                        <p style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">{c.address}</p>
                                        <div style="display: flex; gap: 8px; font-size: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                                            <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-weight: 600;">{c.status.toUpperCase()}</span>
                                            <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-weight: 600;">{c.crowd} Crowd</span>
                                            {c.cookedFood && <span style="background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-weight: 600;">🍛 Hot Meals</span>}
                                        </div>
                                        <p style="font-size: 11px; font-weight: 600; color: #374151;">📦 {c.items} Items Available</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                        {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={L.icon({ iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', iconSize: [40, 40], iconAnchor: [20, 40] })}><Popup><b style="color: #16a34a;">{t('you')}</b><br /><span style="font-size: 11px; color: #6b7280;">Your Current Location</span></Popup></Marker>}

                        {/* LIVE TRUCK MARKER */}
                        {truckPosition && (
                            <Marker
                                position={truckPosition}
                                icon={L.divIcon({
                                    className: 'truck-marker',
                                    html: `<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; box-shadow: 0 6px 20px rgba(249,115,22,0.5); display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;"><div style="color: white; font-size: 24px;">🚚</div></div>`,
                                    iconSize: [48, 48],
                                    iconAnchor: [24, 24]
                                })}
                            >
                                <Popup>
                                    <div style="min-width: 160px; text-align: center;">
                                        <h3 style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #f97316;">🚚 Delivery Truck</h3>
                                        <p style="font-size: 11px; color: #374151; font-weight: 600;">Progress: {truckProgress}%</p>
                                        <p style="font-size: 10px; color: #6b7280; margin-top: 4px;">{truckProgress < 100 ? 'On the way to you' : 'Arrived!'}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* --- DYNAMIC ROAD PATH (Premium Gradient) --- */}
                        {routePath.length > 0 && (
                            <Polyline
                                positions={routePath}
                                color="#10b981"
                                weight={6}
                                opacity={0.9}
                                dashArray="10, 5"
                            />
                        )}
                    </MapContainer>
                </div>
            </div>

            {/* Chat Widget & Modals (Preserved) */}
            {activeChat && (
                <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 flex flex-col z-50 overflow-hidden">
                    <div className={`${activeChat === 'ai' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'} text-white p-4 flex justify-between items-center`}>
                        <span className="font-black flex gap-2 text-base items-center">{activeChat === 'ai' ? <Bot size={20} /> : <MessageCircle size={20} />}{activeChat === 'ai' ? t('ai_assistant') : t('supplier_support')}</span>
                        <button onClick={() => setActiveChat(null)} className="hover:bg-white/20 rounded-lg p-2 transition-all"><span className="text-xl">×</span></button>
                    </div>
                    <div className="h-80 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white space-y-3">
                        {activeChat === 'supplier' ? supplierMessages.map((m, i) => <div key={i} className={`p-3 rounded-2xl text-sm max-w-[80%] shadow-sm ${m.sender === (JSON.parse(localStorage.getItem('foodtech_user'))?.name) ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white ml-auto' : 'bg-white border border-slate-200'}`}>{m.content}</div>) : aiMessages.map((m, i) => <div key={i} className={`p-3 rounded-2xl text-sm max-w-[80%] shadow-sm ${m.self ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ml-auto' : 'bg-white border border-slate-200'}`}>{m.content}</div>)}
                        {isAiTyping && activeChat === 'ai' && (
                            <div className="p-3 rounded-2xl text-sm max-w-[80%] bg-white border border-slate-200 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </div>
                                <span className="text-slate-500 text-xs">AI is typing...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendChatMessage} className="p-4 border-t-2 border-slate-100 flex gap-3 bg-white"><input value={msgText} onChange={e => setMsgText(e.target.value)} className="flex-1 text-sm outline-none px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all" placeholder={t('type_message')} /><button type="submit" className={`${activeChat === 'ai' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'} text-white p-3 rounded-xl shadow-md hover:shadow-lg transition-all`}><Send size={18} /></button></form>
                </div>
            )}

            {showRequestModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-3xl w-96 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <Utensils size={24} className="text-white" />
                                </div>
                                {t('request_food')}
                            </h3>
                            <button onClick={startListening} className={`p-3 rounded-xl transition-all shadow-md ${isListening ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                        </div>
                        {isListening && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center"><p className="text-sm text-red-600 font-bold flex items-center justify-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>Listening...</p></div>}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('food_type')}</label>
                                <select className="w-full border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all" onChange={(e) => setReqItem({ ...reqItem, name: e.target.value })} value={reqItem.name}>
                                    <option value="">-- Select Food --</option>
                                    <optgroup label="🍛 Cooked Food (Ready to Eat)">
                                        <option value="Rice Meals">Rice Meals</option>
                                        <option value="Dal Chawal">Dal Chawal</option>
                                        <option value="Khichdi">Khichdi</option>
                                        <option value="Vegetable Curry">Vegetable Curry</option>
                                        <option value="Chapati Pack">Chapati Pack</option>
                                        <option value="Hot Soup">Hot Soup</option>
                                    </optgroup>
                                    <optgroup label="🥬 Raw Vegetables">
                                        <option value="Onion">Onion</option>
                                        <option value="Potato">Potato</option>
                                        <option value="Tomato">Tomato</option>
                                    </optgroup>
                                    <optgroup label="🌾 Grains & Staples">
                                        <option value="Rice">Rice</option>
                                        <option value="Dal">Dal</option>
                                        <option value="Wheat Flour">Wheat Flour</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Plate Size Selection (Only for Cooked Food) */}
                            {['Rice Meals', 'Dal Chawal', 'Khichdi', 'Vegetable Curry', 'Chapati Pack', 'Hot Soup'].includes(reqItem.name) && (
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Plate Size</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setReqItem({ ...reqItem, plateSize: 'half' })}
                                            className={`py-2 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${reqItem.plateSize === 'half'
                                                    ? 'bg-orange-500 text-white border-orange-500'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                                }`}
                                        >
                                            🍽️ Half Plate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReqItem({ ...reqItem, plateSize: 'full' })}
                                            className={`py-2 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${reqItem.plateSize === 'full'
                                                    ? 'bg-orange-500 text-white border-orange-500'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                                }`}
                                        >
                                            🍽️ Full Plate
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quantity (Only for Raw Items) */}
                            {!['Rice Meals', 'Dal Chawal', 'Khichdi', 'Vegetable Curry', 'Chapati Pack', 'Hot Soup'].includes(reqItem.name) && reqItem.name && (
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('quantity')}
                                        <span className="text-xs"> (kg/L)</span>
                                    </label>
                                    <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all" value={reqItem.quantity} onChange={e => setReqItem({ ...reqItem, quantity: e.target.value })} />
                                </div>
                            )}

                            {/* Number of Plates (Only for Cooked Food) */}
                            {['Rice Meals', 'Dal Chawal', 'Khichdi', 'Vegetable Curry', 'Chapati Pack', 'Hot Soup'].includes(reqItem.name) && (
                                <div><label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Number of Plates</label><input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all" value={reqItem.quantity} onChange={e => setReqItem({ ...reqItem, quantity: e.target.value })} min="1" /></div>
                            )}
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
        </div>
    );
};

export default ConsumerDashboard;