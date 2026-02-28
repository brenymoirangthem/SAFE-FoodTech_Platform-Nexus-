import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Package,
  Plus,
  Globe,
  ShieldAlert,
  Map as MapIcon,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Timer,
  PackageCheck,
  Truck,
  MessageSquare,
  Send,
  X,
  Bell,
  Users,
  Download,
  Radio,
  FileText,
  WifiOff,
  Building2,
  Camera,
  ChevronDown,
  Loader2,
  LayoutDashboard,
  User,
  MoreHorizontal,
  Navigation,
  Activity,
  ChevronRight,
  XCircle,
  Clock,
  Phone,
  LogOut,
  TrendingUp,
  Droplets,
  Wind,
  Flame,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import RiskMap from "./RiskMap";

// --- ADDED FIREBASE IMPORTS ---
// import { database } from '../firebase';
// import { ref, onValue } from 'firebase/database';

const API = "http://localhost:8000";

/* -------------------- DIGIT + CURRENCY LOCALIZATION (ALL LANGS) -------------------- */
const DIGIT_MAP = {
  en: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  or: ["୦", "୧", "୨", "୩", "୪", "୫", "୬", "୭", "୮", "୯"],
  mni: ["꯰", "꯱", "꯲", "꯳", "꯴", "꯵", "꯶", "꯷", "꯸", "꯹"],
};

function localizeDigits(str, lang) {
  const key = (lang || "en").split("-")[0]; 
  const map = DIGIT_MAP[key] || DIGIT_MAP.en;
  return String(str).replace(/\d/g, (d) => map[Number(d)]);
}

function formatNumber(n, lang) {
  const base = new Intl.NumberFormat("en-IN").format(Number(n) || 0);
  return localizeDigits(base, lang);
}

function formatCurrencyINR(amount, lang) {
  const base = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

  return localizeDigits(base, lang);
}

/* --------------------------- Toast (no library) -------------------------- */
function ToastStack({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "w-[320px] rounded-2xl border shadow-[0_16px_40px_rgba(15,23,42,0.18)]",
            "backdrop-blur bg-white/90 px-4 py-3 flex items-start gap-3",
            t.type === "success"
              ? "border-emerald-200"
              : t.type === "error"
                ? "border-rose-200"
                : "border-slate-200",
          ].join(" ")}
        >
          <div className="mt-0.5">
            {t.type === "success" ? (
              <CheckCircle2 className="text-emerald-600" size={18} />
            ) : t.type === "error" ? (
              <AlertTriangle className="text-rose-600" size={18} />
            ) : (
              <Timer className="text-slate-600" size={18} />
            )}
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{t.title}</div>
            {t.message ? <div className="text-xs text-slate-600 mt-0.5">{t.message}</div> : null}
          </div>

          <button
            onClick={() => remove(t.id)}
            className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center"
            type="button"
          >
            <X size={14} className="text-slate-600" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Small UI Helpers --------------------------- */
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// --- REDESIGN HELPER COMPONENTS ---

function MetricCard({ title, value, icon, color, bgColor }) {
  return (
    <div className={`${bgColor} ${color} p-4 rounded-2xl shadow-sm`}>
      <div className="flex justify-between items-start">
        <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center">
          {icon}
        </div>
        <MoreHorizontal size={20} className="opacity-50 cursor-pointer" />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-semibold opacity-80">{title}</p>
      </div>
    </div>
  );
}

function Pill({ variant = "gray", children, className = "" }) {
  const map = {
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${map[variant] || map.gray} ${className}`}>
      {children}
    </span>
  );
}

// --- SUB-COMPONENTS ---
function LiveStorageMonitoring({ iotData }) {
  const dataToDisplay = iotData && iotData.length > 0 ? iotData : [
    { temp: "--", humidity: "--", gas: "Normal", smoke: "Normal", status: "normal", location: "No Data" }
  ];
  
  return (
    <div className="px-4 mb-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Live Storage Monitoring</h3>
        <button className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          IoT Active
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {dataToDisplay.map((sensor, idx) => (
          <SingleSensorUnit key={idx} sensorData={sensor} />
        ))}
      </div>
    </div>
  );
}

function SingleSensorUnit({ sensorData }) {
  if (!sensorData) return null;
  const riskLevel = sensorData.status === "warning" || (typeof sensorData.temp === 'number' && sensorData.temp > 30) ? "CRITICAL" :
                    (typeof sensorData.temp === 'number' && sensorData.temp > 27) ? "WARNING" : "SAFE";

  return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 md:p-5">
        <div className={`mb-3 md:mb-6 p-3 md:p-5 rounded-xl md:rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-4 ${
          riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-100 text-red-800' :
          riskLevel === 'WARNING' ? 'bg-amber-50 border-amber-100 text-amber-800' :
          'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${
              riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-600' :
              riskLevel === 'WARNING' ? 'bg-amber-100 text-amber-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              <Thermometer size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h4 className="font-black text-base md:text-lg uppercase tracking-tight">{sensorData.location || "Storage Unit"}</h4>
              <p className="text-xs font-bold opacity-80">Status: {riskLevel}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl md:text-4xl font-black">{sensorData.temp}°C</div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-70">Temperature</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <SensorCard icon={<Droplets size={14} className="md:w-5 md:h-5" />} label="Humidity" value={`${sensorData.humidity}%`} status="Elevated" statusColor="text-amber-700 bg-amber-50 border-amber-200" iconBg="bg-blue-100 text-blue-600" />
          <SensorCard icon={<Wind size={14} className="md:w-5 md:h-5" />} label="Gas Level" value={sensorData.gas || "Normal"} status="Air quality risk" statusColor="text-amber-700 bg-amber-50 border-amber-200" iconBg="bg-slate-100 text-slate-600" />
          <SensorCard icon={<Flame size={14} className="md:w-5 md:h-5" />} label="Smoke Level" value={sensorData.smoke || "Normal"} status="No smoke detected" statusColor="text-emerald-700 bg-emerald-50 border-emerald-200" iconBg="bg-red-100 text-red-600" />
        </div>
      </div>
  );
}

function SensorCard({ icon, label, value, status, statusColor, iconBg }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2 md:p-4 border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-1 md:mb-2">
        <div className={`p-1.5 md:p-2 rounded-lg ${iconBg} bg-opacity-10 text-opacity-100`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-lg md:text-2xl font-black text-slate-900">{value}</div>
        <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
const SupplierDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Toasts (Moved up to avoid reference errors)
  const [toasts, setToasts] = useState([]);
  const toast = (type, title, message = "") => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    setToasts((p) => [{ id, type, title, message }, ...p].slice(0, 4));
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 2600);
  };
  const removeToast = (id) => setToasts((p) => p.filter((x) => x.id !== id));

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [centerInfo, setCenterInfo] = useState(null);
  const [centerStatus, setCenterStatus] = useState({ isOpen: true, lastUpdated: null });
  const [showCenterSetup, setShowCenterSetup] = useState(false);
  const [centerForm, setCenterForm] = useState({ name: '', address: '', lat: 24.8170, lng: 93.9368, phone: '', type: 'Distribution Center' });
  const [geocoding, setGeocoding] = useState(false);
  const [mapClickEnabled, setMapClickEnabled] = useState(true);
  const [supplierEmail, setSupplierEmail] = useState(localStorage.getItem('supplier_email') || '');
  const [lastSync, setLastSync] = useState(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showRiskMap, setShowRiskMap] = useState(false);
  const [showCrisisMap, setShowCrisisMap] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  
  // Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('foodtech_language') || 'en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [crowdLevel, setCrowdLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('crowd_level');
      return saved || 'Low';
    } catch (e) { return 'Low'; }
  });

  // Add item form
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    unit: "packets",
    category: "Cooked Food",
  });

  const [iotData, setIotData] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { sender: "AI", content: "Hi Supplier 👋 I'm your Nexus Smart Assistant. Ask me about low stock, incoming orders from the **Consumer Dashboard**, or spoilage risks.", type: "received" },
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosReason, setSOSReason] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [riskZones, setRiskZones] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'warning', title: 'Low Stock Alert', message: 'Tomatoes below 30 units', time: '2 min ago', read: false },
    { id: 2, type: 'success', title: 'Order Fulfilled', message: 'Order #123 delivered successfully', time: '5 min ago', read: false },
    { id: 3, type: 'error', title: 'Spoilage Risk', message: 'Milk temperature rising', time: '10 min ago', read: true },
  ]);
  const chatEndRef = useRef(null);

  // Crisis Alerts State - Show only recent/active alerts
  const [crisisAlerts, setCrisisAlerts] = useState([
    { id: 1, source: 'News API', location: 'Ukhrul', type: 'Communal Crisis', severity: 'critical', time: '18 min ago', affected: 3200, confidence: 'High' },
  ]);

  // Orders - filter out rejected requests
  const orders = useMemo(() => {
    return (requests || []).filter(r => r && r.status !== 'rejected');
  }, [requests]);

  const lowStockItems = useMemo(() => (inventory || []).filter((i) => Number(i.quantity) < 30), [inventory]);

  // Sync local status/crowd with fetched centerInfo
  useEffect(() => {
    if (centerInfo) {
      setCenterStatus(prev => ({
        ...prev,
        isOpen: centerInfo.status === 'open'
      }));
      if (centerInfo.crowd) {
        setCrowdLevel(centerInfo.crowd);
      }
    }
  }, [centerInfo]);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    toast('success', 'Notifications Cleared', 'All notifications removed');
  };

  // Generate notifications from low stock
  useEffect(() => {
    if (lowStockItems.length > 0) {
      const newNotifs = lowStockItems.map(item => ({
        id: `low-${item.id}`,
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity} ${item.unit})`,
        time: 'Just now',
        read: false
      }));
      
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifs.filter(n => !existingIds.has(n.id));
        return [...uniqueNew, ...prev];
      });
    }
  }, [lowStockItems]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Spoilage rows (with localized digits)
  const spoilageRows = useMemo(() => {
    const base =
      iotData?.length > 0
        ? iotData
        : [
          { id: 1, location: "Tomatoes", temp: 22, humidity: 78, status: "warning", food_quality: "Risk" },
          { id: 2, location: "Milk", temp: 6, humidity: 70, status: "ok", food_quality: "Good" },
          { id: 3, location: "Spinach", temp: 10, humidity: 66, status: "ok", food_quality: "Good" },
          { id: 4, location: "Water", temp: 18, humidity: 55, status: "ok", food_quality: "Good" },
        ];

    return base.map((s, idx) => {
      const risk = s.status === "warning" || (s.food_quality !== "Good" && s.food_quality !== "Fresh");
      const hours = risk ? 8 + (idx % 4) * 2 : 48;
      const percent = risk ? 68 : 66;
      return { ...s, risk, hours, percent };
    });
  }, [iotData]);

  // Export functions
  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'inventory') {
      csvContent = 'Item,Quantity,Unit,Category\n';
      inventory.forEach(item => {
        csvContent += `${item.name},${item.quantity},${item.unit},${item.category}\n`;
      });
      filename = 'inventory_report.csv';
    } else if (type === 'orders') {
      csvContent = 'Order ID,Consumer,Item,Quantity,Status\n';
      orders.forEach(order => {
        csvContent += `${order.id},${order.consumer_name},${order.item_name},${order.quantity},${order.status}\n`;
      });
      filename = 'orders_report.csv';
    } else if (type === 'spoilage') {
      csvContent = 'Location,Temperature,Humidity,Status,Risk Level\n';
      spoilageRows.forEach(item => {
        csvContent += `${item.location},${item.temp}°C,${item.humidity}%,${item.status},${item.risk ? 'High' : 'Low'}\n`;
      });
      filename = 'spoilage_report.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    toast('success', 'Report Exported', `${filename} downloaded successfully`);
  };

  const handleDeleteAccount = async () => {
    const user = JSON.parse(localStorage.getItem('foodtech_user'));
    if (!user || !user.email) return;
    
    try {
      await axios.post(`${API}/delete-supplier`, {
        email: user.email,
        password: deletePassword
      });
      localStorage.removeItem('foodtech_user');
      localStorage.removeItem('supplier_email');
      navigate('/login');
    } catch (err) {
      toast("error", "Deletion failed", err.response?.data?.detail || "Deletion failed");
    }
  };

  const handleDeleteCenter = async () => {
    if (!centerInfo?.id) return;
    if (!confirm("Are you sure you want to delete your center? This will remove it from the map and stop all incoming requests.")) return;

    try {
      await axios.delete(`${API}/centers/${centerInfo.id}`);
      setCenterInfo(null);
      toast("success", "Center Deleted", "You are no longer listed on the map.");
      fetchData(); // This will trigger showCenterSetup(true)
    } catch (err) {
      // Check if failure is due to pending orders
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("pending orders")) {
        if (confirm("You have pending orders. Do you want to REJECT them all and delete the center immediately?")) {
          try {
            await axios.delete(`${API}/centers/${centerInfo.id}?force=true`);
            setCenterInfo(null);
            toast("success", "Center Deleted", "Pending orders were rejected.");
            fetchData();
          } catch (forceErr) {
            toast("error", "Delete Failed", forceErr.response?.data?.detail || "Could not delete center");
          }
        }
      } else {
        toast("error", "Delete Failed", err.response?.data?.detail || "Could not delete center");
      }
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast('error', 'Empty Message', 'Please enter a broadcast message');
      return;
    }

    if (!centerInfo?.id) {
      toast('error', 'No Center', 'Register center to send broadcasts');
      return;
    }

    try {
      await axios.post(`${API}/messages/${centerInfo.id}`, {
        sender: centerInfo.name || 'Supplier',
        content: `📢 BROADCAST: ${broadcastMessage}`,
        sender_type: 'supplier'
      });
      
      toast('success', 'Broadcast Sent', `Message sent to consumers`);
      setBroadcastMessage('');
      setShowBroadcast(false);
    } catch (err) {
      toast('error', 'Broadcast Failed', 'Check connection');
    }
  };

  const sendSOSAlert = async () => {
    if (!sosReason.trim()) {
      toast('error', 'Empty Message', 'Please describe the emergency');
      return;
    }

    try {
      // Get supplier location (you can use a fixed location or get from user)
      const supplierLocation = { lat: 24.8170, lng: 93.9368 }; // Default to Imphal

      await axios.post('http://localhost:8000/sos-alert', {
        lat: supplierLocation.lat,
        lng: supplierLocation.lng,
        reason: sosReason,
        sender_name: 'Supplier',
        sender_type: 'supplier'
      });

      setShowSOSModal(false);
      setSOSReason('');
      toast('success', 'SOS Alert Sent', 'Emergency Command Center notified. Danger zone created on map.');
    } catch (err) {
      toast('error', 'SOS Failed', 'Could not send alert. Check backend connection.');
    }
  };

  const toggleCenterStatus = async () => {
    if (!centerInfo?.id) return toast("error", "No Center", "Please register your center first.");

    const newIsOpen = !centerStatus.isOpen;
    const statusStr = newIsOpen ? 'open' : 'closed';
    
    setCenterStatus({
      isOpen: newIsOpen,
      lastUpdated: new Date().toISOString()
    });
    setCenterInfo(prev => ({ ...prev, status: statusStr }));

    try {
      await axios.patch(`${API}/centers/${centerInfo.id}`, { status: statusStr });
      toast('success', 'Status Synced', `Center is now ${newIsOpen ? 'OPEN' : 'CLOSED'}`);
    } catch (err) {
      console.error("Sync failed:", err.response?.data);
      toast('warning', 'Updated Locally', 'Will sync on refresh');
    }
  };

  const updateCrowdLevel = async (level) => {
    if (!centerInfo?.id) return toast("error", "No Center", "Please register your center first.");
    
    setCrowdLevel(level);
    setCenterInfo(prev => ({ ...prev, crowd: level }));
    localStorage.setItem('crowd_level', level);

    try {
      await axios.patch(`${API}/centers/${centerInfo.id}`, { crowd: level });
      toast('success', 'Crowd Synced', `Crowd level: ${level}`);
    } catch (err) {
      toast('warning', 'Updated Locally', 'Will sync on refresh');
    }
  };

  const toggleLanguage = () => {
    const langs = ["en", "hi", "mni", "or"];
    const current = langs.indexOf(lang) > -1 ? langs.indexOf(lang) : 0;
    const next = (current + 1) % langs.length;
    const nextLang = langs[next];
    i18n.changeLanguage(nextLang);
    localStorage.setItem('foodtech_language', nextLang);
    toast("info", "Language changed", `Now using: ${nextLang.toUpperCase()}`);
  };

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('foodtech_language');
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("foodtech_user");
      localStorage.removeItem("supplier_email");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

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

  // Inject translations for Supplier Dashboard
  useEffect(() => {
    if (i18n.addResourceBundle) {
      i18n.addResourceBundle('hi', 'translation', {
        'item.onion': 'प्याज़', 'item.ginger': 'अदरक', 'item.dal': 'दाल',
        'item.rice_meals': 'चावल का भोजन', 'item.dal_chawal': 'दाल चावल', 'item.water': 'पानी',
        'add_item': 'वस्तु जोड़ें', 'delete_item': 'वस्तु हटाएं?', 'delete_desc': 'यह इन्वेंट्री से वस्तु को हटा देगा।',
        'cancel': 'रद्द करें', 'delete': 'हटाएं', 'submit': 'जमा करें', 'item_name': 'वस्तु का नाम', 'quantity': 'मात्रा',
        'risk_manager': 'जोखिम क्षेत्र प्रबंधक', 'close': 'बंद करें', 'risk_zone': 'जोखिम क्षेत्र',
        'click_delete': 'हटाने के लिए सर्कल पर क्लिक करें', 'tip': 'सुझाव', 'risk_tip': 'जोखिम क्षेत्र जोड़ने के लिए मानचित्र पर क्लिक करें।',
        'map_help': 'क्षेत्र जोड़ने के लिए मानचित्र पर क्लिक करें', 'offline_msg': 'आप ऑफ़लाइन हैं - सिंक रुका हुआ है'
      }, true, true);

      i18n.addResourceBundle('mni', 'translation', {
        'item.onion': 'ꯇꯤꯂꯍꯧ', 'item.ginger': 'ꯁꯤꯡ', 'item.dal': 'ꯍꯋꯥꯏ',
        'item.rice_meals': 'ꯆꯥꯛ', 'item.dal_chawal': 'ꯗꯥꯜ ꯆꯥꯋꯜ', 'item.water': 'ꯏꯁꯤꯡ',
        'add_item': 'ꯄꯣꯠ ꯍꯥꯞꯆꯤꯟꯕ', 'delete_item': 'ꯄꯣꯠ ꯂꯧꯊꯣꯛꯄ?', 'delete_desc': 'ꯃꯁꯤꯅ ꯏꯅꯚꯦꯟꯇꯔꯤꯗꯒꯤ ꯄꯣꯠ ꯂꯧꯊꯣꯛꯀꯅꯤ꯫',
        'cancel': 'ꯇꯣꯛꯄ', 'delete': 'ꯂꯧꯊꯣꯛꯄ', 'submit': 'ꯁꯕꯃꯤꯠ', 'item_name': 'ꯄꯣꯠꯀꯤ ꯃꯤꯡ', 'quantity': 'ꯃꯁꯤꯡ',
        'risk_manager': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ ꯃꯦꯅꯦꯖꯔ', 'close': 'ꯊꯤꯡꯕ', 'risk_zone': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ',
        'click_delete': 'ꯂꯧꯊꯣꯛꯅꯕ ꯁꯔꯀꯜꯗ ꯀ꯭ꯂꯤꯛ ꯇꯧꯕꯤꯌꯨ', 'tip': 'ꯄꯥꯎꯇꯥꯛ', 'risk_tip': 'ꯃꯦꯞꯇ ꯀ꯭ꯂꯤꯛ ꯇꯧꯔꯒ ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ ꯍꯥꯞꯆꯤꯟꯕꯤꯌꯨ꯫',
        'map_help': 'ꯃꯐꯝ ꯍꯥꯞꯆꯤꯟꯅꯕ ꯃꯦꯞꯇ ꯀ꯭ꯂꯤꯛ ꯇꯧꯕꯤꯌꯨ', 'offline_msg': 'ꯅꯍꯥꯛ ꯑꯣꯐꯂꯥꯏꯟꯗ ꯂꯩꯔꯤ - ꯁꯤꯡꯛ ꯇꯧꯕ ꯂꯦꯞꯂꯤ'
      }, true, true);

      i18n.addResourceBundle('or', 'translation', {
        'item.onion': 'ପିଆଜ', 'item.ginger': 'ଅଦା', 'item.dal': 'ଡାଲି',
        'item.rice_meals': 'ଭାତ ଖାଦ୍ୟ', 'item.dal_chawal': 'ଡାଲି ଚାଉଳ', 'item.water': 'ପାଣି',
        'add_item': 'ଆଇଟମ୍ ଯୋଡନ୍ତୁ', 'delete_item': 'ଆଇଟମ୍ ହଟାଇବେ?', 'delete_desc': 'ଏହା ଇନଭେଣ୍ଟୋରୀରୁ ଆଇଟମ୍ ହଟାଇଦେବ।',
        'cancel': 'ବାତିଲ୍ କରନ୍ତୁ', 'delete': 'ହଟାନ୍ତୁ', 'submit': 'ଦାଖଲ କରନ୍ତୁ', 'item_name': 'ଆଇଟମ୍ ନାମ', 'quantity': 'ପରିମାଣ',
        'risk_manager': 'ବିପଦ ଅଞ୍ଚଳ ପରିଚାଳକ', 'close': 'ବନ୍ଦ କରନ୍ତୁ', 'risk_zone': 'ବିପଦ ଅଞ୍ଚଳ',
        'click_delete': 'ହଟାଇବା ପାଇଁ ସର୍କଲ୍ ରେ କ୍ଲିକ୍ କରନ୍ତୁ', 'tip': 'ପରାମର୍ଶ', 'risk_tip': 'ବିପଦ ଅଞ୍ଚଳ ଯୋଡିବା ପାଇଁ ମାନଚିତ୍ରରେ କ୍ଲିକ୍ କରନ୍ତୁ।',
        'map_help': 'ଅଞ୍ଚଳ ଯୋଡିବା ପାଇଁ ମାନଚିତ୍ରରେ କ୍ଲିକ୍ କରନ୍ତୁ', 'offline_msg': 'ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି - ସିଙ୍କ୍ ବନ୍ଦ ଅଛି'
      }, true, true);
    }
  }, [i18n]);

  // --- UPDATED FETCH DATA (No IoT from Python) ---
  // --- ROBUST FETCH DATA ---
  const fetchData = async () => {
    try {
      // 1. Check Center Status
      const email = localStorage.getItem('supplier_email');
      let currentCenterId = null;
      if (email) {
        const centerRes = await axios.get(`${API}/centers/supplier/${email}`, { timeout: 5000 }).catch(() => null);
        if (centerRes && centerRes.data.exists) {
          setCenterInfo(centerRes.data.center);
          currentCenterId = centerRes.data.center.id;
        } else {
          setShowCenterSetup(true);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch Dashboard Data independently
      const results = await Promise.allSettled([
        axios.get(`${API}/inventory`, { timeout: 5000 }),
        currentCenterId ? axios.get(`${API}/food-requests?center_id=${currentCenterId}`, { timeout: 5000 }) : Promise.resolve({ data: [] }),
        axios.get(`${API}/risk-zones`, { timeout: 5000 }),
        axios.get(`${API}/alerts`, { timeout: 5000 }), // This handles the 404 alert error
        axios.get(`${API}/iot/spoilage`, { timeout: 5000 })
      ]);

      // Map results back to state only if successful
      if (results[0].status === 'fulfilled') setInventory(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setRequests(results[1].value.data || []);
      if (results[2].status === 'fulfilled') setRiskZones(results[2].value.data || []);
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value.data)) {
        const alerts = results[3].value.data || [];
        setCrisisAlerts(alerts.map(a => ({
          ...a,
          source: a.source || 'News API',
          affected: a.affected || 3200,
          confidence: a.confidence || 'High'
        })));
      }
      if (results[4].status === 'fulfilled') setIotData(results[4].value.data || []);

      setLastSync(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
      setLoading(false); // Page will still render with whatever data is available
    }
  };

  // --- INTEGRATED FIREBASE LISTENER ---
  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => setLoading(false), 8000);

    fetchData(); // Initial load for your backend data
    
    // Poll for IoT updates every 2 seconds to show simulation
    const interval = setInterval(() => {
      axios.get(`${API}/iot/spoilage`)
        .then(res => {
          if (Array.isArray(res.data)) setIotData(res.data);
        })
        .catch(e => console.error("IoT Poll Error", e));
    }, 2000);

    return () => {
      clearTimeout(safetyTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages.length]);

  const todaysSalesAmount = 5400;
  const todaysSales = formatCurrencyINR(todaysSalesAmount, lang);
  const ordersCompleted = formatNumber(orders.filter((o) => o.status === "Delivered").length || 12, lang);
  const totalItems = formatNumber(inventory.length || 145, lang);

  // Inventory CRUD
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity === "") return toast("error", "Missing fields", "Enter name + quantity.");

    try {
      if (!centerInfo?.id) return toast("error", "No Center", "Please register your center first.");
      await axios.post(`${API}/inventory`, { ...newItem, quantity: parseFloat(newItem.quantity), center_id: centerInfo.id });


      // Optimistic update for offline feel
      const updated = [...inventory, { ...newItem, id: Date.now(), quantity: parseFloat(newItem.quantity), center_id: centerInfo.id }];
      setInventory(updated);
      try { localStorage.setItem('supplier_inventory', JSON.stringify(updated)); } catch (e) {}

      setShowAddModal(false);
      setNewItem({ name: "", quantity: "", unit: "kg", category: "Vegetables" });
      toast("success", "Item added");
      fetchData();
    } catch (err) {
      toast("error", "Add failed", err?.response?.data?.detail || "Check backend.");
    }
  };

  const handleUpdate = async (item) => {
    const newQty = prompt(`Enter new quantity for ${item.name}:`, item.quantity);
    if (newQty === null) return;
    if (newQty === "" || isNaN(newQty)) return toast("error", "Invalid quantity", "Enter a number.");

    try {
      if (!centerInfo?.id) return toast("error", "No Center", "Please register your center first.");
      await axios.put(`${API}/inventory/${item.id}`, {
        name: item.name,
        quantity: parseFloat(newQty),
        unit: item.unit,
        category: item.category,
        center_id: centerInfo.id,
      });
      toast("success", "Updated quantity");
      fetchData();
    } catch (err) {
      toast("error", "Update failed", err?.response?.data?.detail || "Check backend.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/inventory/${deleteId}`);
      setDeleteId(null);
      toast("success", "Item deleted");
      fetchData();
    } catch (err) {
      toast("error", "Delete failed", "Check backend.");
    }
  };

  const addDefaults = async () => {
    const defaults = [
      { name: t("item.onion", { defaultValue: "Onion" }), quantity: 50, unit: "kg", category: "Vegetables" },
      { name: t("item.ginger", { defaultValue: "Ginger" }), quantity: 15, unit: "kg", category: "Vegetables" },
      { name: t("item.dal", { defaultValue: "Dal" }), quantity: 30, unit: "kg", category: "Grains" },
      { name: t("item.rice_meals", { defaultValue: "Rice Meals" }), quantity: 100, unit: "packets", category: "Cooked Food" },
      { name: t("item.dal_chawal", { defaultValue: "Dal Chawal" }), quantity: 80, unit: "packets", category: "Cooked Food" },
      { name: t("item.water", { defaultValue: "Water" }), quantity: 200, unit: "bottles", category: "Beverages" },
    ];
    try {
      if (!centerInfo?.id) return toast("error", "No Center", "Please register your center first.");
      for (const it of defaults) await axios.post(`${API}/inventory`, { ...it, center_id: centerInfo.id });
      toast("success", "Defaults added", "Onion + Ginger + Dal");
      fetchData();
    } catch (e) {
      toast("error", "Defaults failed", "Check backend.");
    }
  };

  const handleFulfill = async (id) => {
    try {
      const res = await axios.post(`${API}/fulfill-request/${id}`);
      toast("success", "Fulfilled", res?.data?.message || "Order fulfilled.");
      fetchData();
    } catch (err) {
      toast("error", "Fulfill failed", err?.response?.data?.detail || "Check backend.");
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason || !reason.trim()) {
      toast("error", "Rejection cancelled", "Reason is required");
      return;
    }

    try {
      await axios.post(`${API}/reject-request/${id}`, { reason: reason.trim() });
      toast("success", "Request Rejected", "Consumer will be notified");
      fetchData();
    } catch (err) {
      toast("error", "Reject failed", err?.response?.data?.detail || "Check backend.");
    }
  };

  // Risk zones
  const geocodeAddress = async () => {
    if (!centerForm.address.trim()) {
      toast('error', 'No Address', 'Please enter an address first');
      return;
    }

    setGeocoding(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: centerForm.address,
          format: 'json',
          limit: 1
        }
      });

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setCenterForm({...centerForm, lat: parseFloat(lat), lng: parseFloat(lon)});
        toast('success', 'Location Found!', 'Address mapped successfully');
      } else {
        toast('error', 'Not Found', 'Could not find this address. Try being more specific or use map click.');
      }
    } catch (err) {
      toast('error', 'Geocoding Failed', 'Please try again or click on map');
    } finally {
      setGeocoding(false);
    }
  };

  const openCenterSetup = () => {
    if (centerInfo) {
      setCenterForm({
        name: centerInfo.name || '',
        address: centerInfo.address || '',
        lat: centerInfo.lat || 24.8170,
        lng: centerInfo.lng || 93.9368,
        phone: centerInfo.phone || '',
        type: centerInfo.type || 'Distribution Center'
      });
    }
    setShowCenterSetup(true);
  };

  const handleCenterSetup = async (e) => {
    e.preventDefault();
    if (!centerForm.name || !centerForm.address || !centerForm.phone) {
      toast('error', 'Missing Fields', 'Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/centers`, {
        ...centerForm,
        supplier_email: supplierEmail
      });
      toast('success', centerInfo ? 'Center Updated' : 'Center Registered', 'Your distribution center details have been saved.');
      setShowCenterSetup(false);
      fetchData();
    } catch (err) {
      toast('error', 'Registration Failed', err?.response?.data?.detail || 'Please try again');
    }
  };

  const handleSetupMapClick = (latlng) => {
    if (mapClickEnabled) {
      setCenterForm({...centerForm, lat: latlng.lat, lng: latlng.lng});
      toast('success', 'Location Set', `Coordinates: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    }
  };

  const handleMapClick = async (latlng) => {
    const reason = prompt("Enter reason for Risk Zone:");
    if (!reason) return;

    try {
      await axios.post(`${API}/risk-zones`, { lat: latlng.lat, lng: latlng.lng, radius: 500, reason });
      toast("success", "Risk zone added");
      fetchData();
    } catch (err) {
      toast("error", "Add zone failed");
    }
  };

  const handleDeleteZone = async (id) => {
    if (!confirm("Remove this risk zone?")) return;
    try {
      await axios.delete(`${API}/risk-zones/${id}`);
      toast("success", "Zone removed");
      fetchData();
    } catch (err) {
      toast("error", "Delete zone failed");
    }
  };



  // Stock rows (localized)
  const stockRows = useMemo(() => {
    const base = inventory.length
      ? inventory.slice(0, 3).map((x) => ({ id: x.id, name: x.name }))
      : [
        { id: 1, name: "Tomatoes" },
        { id: 2, name: "Milk" },
        { id: 3, name: "Spinach" },
      ];
    return base.map((r, idx) => {
      const temp = idx === 0 ? "22°C" : idx === 1 ? "8°C" : "6°C";
      const risk = idx === 0;
      return { ...r, temp, risk };
    });
  }, [inventory]);

  // AI Chat
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput.trim();
    setAiInput("");
    setAiMessages((p) => [...p, { sender: "You", content: userText, type: "sent" }]);
    setIsAiTyping(true);

    try {
      // Attempt real AI chat
      const res = await axios.post(`${API}/ai-chat`, {
        query: userText,
        context: {
          inventory: inventory,
          orders: orders,
          center: centerInfo
        }
      });
      setAiMessages((p) => [...p, { sender: "AI", content: res.data.response, type: "received" }]);
      setIsAiTyping(false);
      return;
    } catch (err) {
      console.log("AI Backend unavailable, using simulation");
    }

    // Simulate AI thinking and streaming
    setTimeout(async () => {
      const q = userText.toLowerCase();
      let reply = "I'm monitoring the system. You can ask me about low stock, orders pending from the **Consumer Dashboard**, spoilage risk levels, or request a restock plan.";

      if (q.includes("stock") || q.includes("low")) {
        reply = lowStockItems.length
          ? `I've analyzed your inventory. You have ${lowStockItems.length} items running low: ${lowStockItems.map((x) => x.name).slice(0, 6).join(", ")}. I recommend restocking these soon to meet demands from the **Consumer Dashboard**.`
          : "Great news! All stock levels are currently within safe margins. No immediate restock required.";
      } else if (q.includes("spoil") || q.includes("risk") || q.includes("quality")) {
        const bad = spoilageRows.filter((x) => x.risk);
        reply = bad.length
          ? `Alert: Spoilage risk detected for ${bad.map((x) => x.location).join(", ")}. The IoT sensors indicate unfavorable conditions. You should prioritize these for the next batch of orders.`
          : "All storage units are operating at optimal temperature and humidity. Spoilage risk is minimal.";
      } else if (q.includes("order")) {
        reply = orders.length
          ? `You currently have ${orders.length} active orders processed via the **Consumer Dashboard**. Please fulfill the pending ones to maintain high supplier ratings.`
          : "There are no new orders from the **Consumer Dashboard** at the moment. Keep your inventory ready for the next peak period.";
      }

      // Create empty message to stream into
      setAiMessages((p) => [...p, { sender: "AI", content: "", type: "received" }]);
      setIsAiTyping(false);

      // Streaming effect
      let currentContent = "";
      const words = reply.split(" ");
      for (let i = 0; i < words.length; i++) {
        currentContent += (i === 0 ? "" : " ") + words[i];
        setAiMessages((p) => {
          const updated = [...p];
          updated[updated.length - 1].content = currentContent;
          return updated;
        });
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40));
      }
    }, 800);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const currentCrisis = crisisAlerts[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-900"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 mb-6 relative">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <Package className="absolute inset-0 m-auto text-emerald-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Loading supplier data...</h2>
          <div className="flex items-center gap-2 text-emerald-400/60 text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Syncing IoT Nodes
          </div>
          <button onClick={handleLogout} className="mt-8 text-slate-500 hover:text-slate-300 text-xs font-bold underline transition-colors z-20">
            Logout / Cancel
          </button>
        </div>
      </div>
    );
  }

  if (showCenterSetup) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-emerald-700 to-emerald-500 rounded-b-[3rem] shadow-lg z-0" />
        
        {/* Floating Orbs for premium feel */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl z-0" />
        <div className="absolute top-20 right-10 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl z-0" />

        <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl z-10 overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-500">
          {/* Header */}
          <div className="bg-white/50 p-8 pb-6 text-center border-b border-slate-100">
             <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner border border-emerald-100 group">
               <Package className="text-emerald-600 w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
             </div>
             <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Set Up Your Center</h1>
             <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">Enter your distribution center information before accessing the Supplier Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleCenterSetup} className="p-8 space-y-6">
             {/* Name */}
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                 Center Name <span className="text-red-500">*</span>
               </label>
               <div className="relative group">
                 <Building2 className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                 <input 
                   required
                   value={centerForm.name}
                   onChange={e => setCenterForm({...centerForm, name: e.target.value})}
                   className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                   placeholder="Sendra Food Center"
                 />
               </div>
             </div>

             {/* Location */}
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                 Center Location <span className="text-red-500">*</span>
               </label>
               <div className="relative group">
                 <MapPin className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                 <input 
                   required
                   value={centerForm.address}
                   onChange={e => setCenterForm({...centerForm, address: e.target.value})}
                   className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                   placeholder="Ukhrul District, Manipur"
                 />
                 <button 
                   type="button" 
                   onClick={geocodeAddress} 
                   disabled={geocoding || !centerForm.address}
                   className="absolute right-2 top-2 p-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-sm transition-all disabled:opacity-50" 
                   title="Locate on Map"
                 >
                   {geocoding ? <Loader2 size={18} className="animate-spin" /> : <MapIcon size={18} />}
                 </button>
               </div>
             </div>

             {/* Latitude & Longitude */}
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                   Latitude <span className="text-red-500">*</span>
                 </label>
                 <input 
                   required
                   type="number"
                   step="any"
                   value={centerForm.lat}
                   onChange={e => setCenterForm({...centerForm, lat: parseFloat(e.target.value)})}
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                   placeholder="24.8170"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                   Longitude <span className="text-red-500">*</span>
                 </label>
                 <input 
                   required
                   type="number"
                   step="any"
                   value={centerForm.lng}
                   onChange={e => setCenterForm({...centerForm, lng: parseFloat(e.target.value)})}
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                   placeholder="93.9368"
                 />
               </div>
             </div>

             {/* Type Dropdown */}
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Center Type</label>
               <div className="relative group">
                 <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none">
                   <Package size={20} />
                 </div>
                 <select 
                   className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 appearance-none cursor-pointer"
                   value={centerForm.type || 'Distribution Center'}
                   onChange={e => setCenterForm({...centerForm, type: e.target.value})}
                 >
                   <option>Distribution Center</option>
                   <option>Community Kitchen</option>
                   <option>NGO Storage</option>
                   <option>Relief Camp</option>
                 </select>
                 <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={16} />
               </div>
             </div>

             {/* Phone */}
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                 Contact Phone <span className="text-red-500">*</span>
               </label>
               <div className="relative group">
                 <Phone className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                 <input 
                   required
                   type="tel"
                   value={centerForm.phone}
                   onChange={e => setCenterForm({...centerForm, phone: e.target.value})}
                   className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                   placeholder="+91 98765 43210"
                 />
               </div>
             </div>

             {/* Photo Upload */}
             <div className="pt-2">
               <button type="button" className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 group">
                 <div className="p-2 bg-slate-100 rounded-full group-hover:bg-emerald-100 transition-colors">
                    <Camera size={18} className="group-hover:scale-110 transition-transform" />
                 </div>
                 Upload Center Photo (Optional)
               </button>
             </div>

             {/* Submit */}
             <div className="pt-4 space-y-4">
               <button 
                 type="submit" 
                 disabled={!centerForm.name || !centerForm.address || !centerForm.phone}
                 className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
               >
                 {loading ? <Loader2 className="animate-spin" /> : 'Register Center'}
               </button>
               
               <button 
                 type="button"
                 onClick={() => navigate('/')}
                 className="w-full text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors flex items-center justify-center gap-1 py-2"
               >
                 Cancel and return home
               </button>
               <button 
                 type="button"
                 onClick={handleLogout}
                 className="w-full text-red-400 hover:text-red-600 text-sm font-bold transition-colors flex items-center justify-center gap-1 py-2"
               >
                 Logout
               </button>
             </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-slate-400/80 text-[10px] font-bold uppercase tracking-widest">
          SAFE Platform • Official Government Portal
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 font-sans text-slate-800">
      <ToastStack toasts={toasts} remove={removeToast} />
      
      <div className="max-w-md mx-auto md:max-w-full">

      {/* 1) TOP HEADER */}
      <header className="px-4 py-2 md:pt-4 md:pb-2 sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm md:static md:bg-transparent">
        <div className="bg-white rounded-xl md:rounded-3xl shadow-sm border border-slate-100 p-3 md:p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-600 rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Package className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">Supplier Dashboard</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Smart Aid For Food Emergency</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNotificationsOpen(true)} className="relative p-1.5 md:p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <div onClick={() => setShowSettingsModal(true)} className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer flex items-center justify-center text-slate-500">
              <User className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 md:p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* 2) CRISIS ALERT CARD */}
      {currentCrisis && (
        <div className="px-4 mb-6 max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl border-2 border-red-400 shadow-2xl shadow-red-500/30 overflow-hidden flex flex-col md:flex-row items-center md:max-h-[110px] animate-pulse">
            <div className="bg-red-800/50 px-5 py-3 md:w-64 border-r-2 border-red-400 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 text-white">
                <ShieldAlert size={20} className="animate-bounce" />
                <span className="font-black text-sm uppercase tracking-wider">🚨 Crisis Alert</span>
              </div>
              <div className="font-black text-white text-xl leading-none mt-1 truncate drop-shadow-lg">{currentCrisis.type}</div>
            </div>
            <div className="flex-1 px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm w-full">
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Location</div>
                  <div className="font-bold text-white truncate">{currentCrisis.location || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Severity</div>
                  <div className="font-black text-yellow-300 text-lg">{currentCrisis.severity?.toUpperCase() || 'UNKNOWN'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Affected</div>
                  <div className="font-bold text-white">{currentCrisis.affected || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Time</div>
                  <div className="font-bold text-white">{currentCrisis.time || 'Just now'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Source</div>
                  <div className="font-bold text-white truncate">{currentCrisis.source || 'System'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-200 uppercase">Confidence</div>
                  <div className={`font-black ${currentCrisis.confidence === 'High' ? 'text-green-300' : 'text-yellow-300'}`}>{currentCrisis.confidence || 'Medium'}</div>
                </div>
              </div>
              <button 
                onClick={() => setShowCrisisMap(true)} 
                className="w-full md:w-auto px-6 py-3 bg-white text-red-600 rounded-xl text-sm font-black hover:bg-red-50 transition-all shadow-lg whitespace-nowrap border-2 border-white"
              >
                🗺️ View Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2) METRIC TILES */}
      <div id="summary" className="px-4 mb-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          {/* Active Requests */}
          <div className="bg-orange-50 rounded-xl p-2 md:p-3 shadow-sm border border-orange-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="text-orange-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-orange-600 shadow-sm">
                <Activity className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-4xl font-black text-slate-900">{formatNumber(16, lang)}</h3>
              <p className="text-[8px] md:text-sm text-orange-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Active Requests</p>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-blue-50 rounded-xl p-2 md:p-3 shadow-sm border border-blue-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Timer className="text-blue-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-blue-600 shadow-sm">
                <Timer className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-4xl font-black text-slate-900">{formatNumber(5, lang)}</h3>
              <p className="text-[8px] md:text-sm text-blue-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Pending</p>
            </div>
          </div>

          {/* Meals Delivered */}
          <div className="bg-green-50 rounded-xl p-2 md:p-3 shadow-sm border border-green-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <PackageCheck className="text-green-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-green-600 shadow-sm">
                <PackageCheck className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-4xl font-black text-slate-900">{ordersCompleted}</h3>
              <p className="text-[8px] md:text-sm text-green-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Delivered</p>
            </div>
          </div>

          {/* Total Items */}
          <div className="bg-teal-50 rounded-xl p-2 md:p-3 shadow-sm border border-teal-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="text-teal-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-teal-600 shadow-sm">
                <Package className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-4xl font-black text-slate-900">{totalItems}</h3>
              <p className="text-[8px] md:text-sm text-teal-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Total Items</p>
            </div>
          </div>

           {/* Alerts */}
           <div className="bg-red-50 rounded-xl p-2 md:p-3 shadow-sm border border-red-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="text-red-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-red-600 shadow-sm">
                <AlertTriangle className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-4xl font-black text-slate-900">{formatNumber(3, lang)}</h3>
              <p className="text-[8px] md:text-sm text-red-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Alerts</p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-purple-50 rounded-xl p-2 md:p-3 shadow-sm border border-purple-100 flex flex-col justify-between h-20 md:h-40 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute right-0 top-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="text-purple-500 w-12 h-12 md:w-20 md:h-20" />
            </div>
            <div className="flex justify-between items-start">
              <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-2xl text-purple-600 shadow-sm">
                <TrendingUp className="w-3 h-3 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-base md:text-4xl font-black text-slate-900 truncate">{todaysSales}</h3>
              <p className="text-[8px] md:text-sm text-purple-700 font-bold uppercase tracking-wide mt-0.5 md:mt-1">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Storage Monitoring */}
      <LiveStorageMonitoring iotData={iotData} />

      {/* 4) CENTER CONTROLS */}
      <div className="px-4 mb-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Operations Control</h3>
            <button onClick={handleDeleteCenter} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors" title="Delete Center">
               <Trash2 size={14} /> Delete Center
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Center Status</h3>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Currently {centerStatus.isOpen ? 'accepting' : 'not accepting'} requests</p>
            </div>
            <button
              onClick={toggleCenterStatus}
              className={`relative w-10 h-6 md:w-16 md:h-9 rounded-full transition-colors duration-300 ${centerStatus.isOpen ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 md:w-7 md:h-7 bg-white rounded-full shadow-md transition-transform duration-300 ${centerStatus.isOpen ? 'left-5 md:left-8' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <h3 className="font-bold text-slate-900 text-sm">Crowd Level</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  onClick={() => updateCrowdLevel(level)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    crowdLevel === level
                      ? level === 'Low' ? 'bg-green-500 text-white shadow-md' 
                      : level === 'Medium' ? 'bg-yellow-500 text-white shadow-md' 
                      : 'bg-red-500 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 5) QUICK ACTIONS */}
      <div className="px-4 mb-6 max-w-6xl mx-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Quick Actions</h3>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => scrollToSection('inventory')} className="flex flex-col items-center gap-1.5 min-w-[70px] md:min-w-[80px]">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
              <Package className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-600">Inventory</span>
          </button>
          <button onClick={() => scrollToSection('orders')} className="flex flex-col items-center gap-1.5 min-w-[70px] md:min-w-[80px]">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors">
              <FileText className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-600">Requests</span>
          </button>
          <button onClick={() => setShowRiskMap(true)} className="flex flex-col items-center gap-1.5 min-w-[70px] md:min-w-[80px]">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors">
              <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-600">Risk Map</span>
          </button>
          <button onClick={() => setChatOpen(true)} className="flex flex-col items-center gap-1.5 min-w-[70px] md:min-w-[80px]">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-600">Chat</span>
          </button>
        </div>
      </div>

      {/* 3) RECENT REQUESTS */}
      <div id="orders" className="px-4 mb-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">Recent Requests</h2>
            <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Center</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Request Type</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ETA</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.slice(0, 5).map((req) => (
                  <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{req.consumer_name}</span>
                        <span className="text-xs text-slate-400">ID: #{req.id}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${req.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Truck size={12} className="mr-1.5"/>
                        {req.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center text-slate-600 font-medium text-sm">
                        <Clock size={14} className="mr-2 text-slate-400" />
                        20 min
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status !== 'completed' ? (
                          <>
                            <button 
                              onClick={() => handleReject(req.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleFulfill(req.id)}
                              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-md hover:bg-slate-800 transition-transform active:scale-95"
                            >
                              Complete
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CheckCircle2 size={14}/> Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4) NEAREST FOOD (Inventory) */}
      <div id="inventory" className="px-4 mb-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                <Navigation size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Manage Stock</p>
              </div>
            </div>
            <button onClick={() => setShowAddModal(true)} className="text-blue-600 text-sm font-bold hover:underline">
              + Add Item
            </button>
          </div>

          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {inventory.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 gap-2 md:gap-4">
                <div className="flex items-start gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 shrink-0">
                    <Package size={16} className="md:w-5 md:h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-slate-900 mb-0.5 md:mb-1">{item.name}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500">Delivery Center • {item.quantity} {item.unit}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1 sm:mt-0">
                  <button 
                    onClick={() => setDeleteId(item.id)}
                    className="flex-1 sm:flex-none py-1 md:py-2 px-2 md:px-4 rounded-lg md:rounded-xl border border-slate-200 text-slate-600 text-[10px] md:text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    Remove
                  </button>
                  <button 
                    onClick={() => handleUpdate(item)}
                    className="flex-1 sm:flex-none py-1 md:py-2 px-3 md:px-6 rounded-lg md:rounded-xl bg-green-600 text-white text-[10px] md:text-sm font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-transform active:scale-95"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-24 left-0 right-0 mx-auto w-max bg-amber-600/90 backdrop-blur-md text-white py-1 px-4 text-center text-xs font-bold z-[100] rounded-full shadow-lg">
          <WifiOff size={14} className="inline mr-2" />
          {t('offline_msg', "You're offline - Sync paused")}
        </div>
      )}

      {/* 6) FLOATING ACTION BUTTON */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
        <button onClick={() => setShowAddModal(true)} className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-xl shadow-slate-300 border-2 border-white">
          <Plus size={24} />
        </button>
      </div>

      {/* 6) BOTTOM NAVBAR (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => scrollToSection('summary')} className="flex flex-col items-center gap-1 text-blue-600">
          <LayoutDashboard size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => scrollToSection('orders')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <FileText size={24} />
          <span className="text-[10px] font-medium">Requests</span>
        </button>
        <div className="w-8"></div> {/* Spacer for FAB */}
        <button onClick={() => setChatOpen(true)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <MessageSquare size={24} />
          <span className="text-[10px] font-bold">Chat</span>
        </button>
        <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <User size={24} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>

      {/* Modals & Sidebars */}
      {showExport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Download size={28} />
                <div>
                  <h2 className="text-2xl font-black">Export Reports</h2>
                  <p className="text-sm text-indigo-100 mt-1">Download data in CSV format</p>
                </div>
              </div>
              <button
                onClick={() => setShowExport(false)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <button
                onClick={() => exportToCSV('inventory')}
                className="w-full p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 transition-all group"
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <Package size={28} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-slate-900">Inventory Report</div>
                      <div className="text-sm text-slate-600 mt-1">{formatNumber(inventory.length || 145, lang)} items • Full stock details</div>
                    </div>
                  </div>
                  <FileText size={24} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => exportToCSV('orders')}
                className="w-full p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-all group"
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
                      <Truck size={28} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-slate-900">Orders Report</div>
                      <div className="text-sm text-slate-600 mt-1">{formatNumber(orders.length || 28, lang)} orders • Fulfillment status</div>
                    </div>
                  </div>
                  <FileText size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => exportToCSV('spoilage')}
                className="w-full p-6 rounded-2xl border-2 border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 transition-all group"
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-rose-500 flex items-center justify-center">
                      <Thermometer size={28} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-slate-900">Spoilage Report</div>
                      <div className="text-sm text-slate-600 mt-1">IoT monitoring • Temperature & humidity data</div>
                    </div>
                  </div>
                  <FileText size={24} className="text-rose-600 group-hover:scale-110 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showBroadcast && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Radio size={28} className="animate-pulse" />
                <div>
                  <h2 className="text-2xl font-black">Emergency Broadcast</h2>
                  <p className="text-sm text-red-100 mt-1">Send urgent message to all consumers</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcast(false)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <div className="font-bold mb-1">Crisis Alert System</div>
                    This will send an immediate notification to <span className="font-bold">{formatNumber(1247, lang)} active consumers</span> in Manipur region.
                  </div>
                </div>
              </div>

              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Enter emergency message (e.g., New food center opened at Imphal East, Road blockage at NH-2, Weather alert)..."
                className="w-full h-32 border-2 border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
              />

              <div className="flex items-center justify-between mt-6">
                <div className="text-xs text-slate-500">
                  {broadcastMessage.length}/500 characters
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBroadcast(false)}
                    className="px-6 py-3 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-semibold transition"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendBroadcast}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    type="button"
                  >
                    <Radio size={18} />
                    Send Broadcast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSOSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-red-500">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShieldAlert size={28} className="animate-pulse" />
                <div>
                  <h2 className="text-2xl font-black">Emergency SOS</h2>
                  <p className="text-sm text-red-100 mt-1">Report danger zone</p>
                </div>
              </div>
              <button
                onClick={() => { setShowSOSModal(false); setSOSReason(''); }}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <div className="font-bold mb-1">Official Alert</div>
                    As a supplier, your alert will be <span className="font-bold">immediately verified</span> and added as a danger zone on the map.
                  </div>
                </div>
              </div>

              <textarea
                value={sosReason}
                onChange={(e) => setSOSReason(e.target.value)}
                placeholder="Describe the danger (violence, flood, road blockage, fire, etc.)..."
                className="w-full h-32 border-2 border-red-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowSOSModal(false); setSOSReason(''); }}
                  className="px-6 py-3 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-semibold transition"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={sendSOSAlert}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  type="button"
                >
                  <ShieldAlert size={18} />
                  Send SOS Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      <aside className={`fixed right-0 top-0 h-screen bg-white border-l border-slate-200 shadow-2xl transition-all duration-300 z-50 flex flex-col ${notificationsOpen ? 'w-full md:w-[350px]' : 'w-0'}`}>
        {notificationsOpen && (
          <>
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} />
                <h3 className="font-bold text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{unreadCount}</span>
                )}
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bell size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${notif.read
                      ? 'bg-white border-slate-200 opacity-60'
                      : 'bg-white border-slate-300 shadow-md hover:shadow-lg'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${notif.type === 'warning' ? 'bg-amber-500' :
                        notif.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                        } ${!notif.read && 'animate-pulse'}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900">{notif.title}</div>
                        <div className="text-xs text-slate-600 mt-1">{notif.message}</div>
                        <div className="text-[10px] text-slate-400 mt-2">{notif.time}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-white border-t border-slate-200">
                <button
                  onClick={clearAllNotifications}
                  className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
                  type="button"
                >
                  Clear All
                </button>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Premium Chat Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white/80 backdrop-blur-xl border-l border-slate-200/50 shadow-2xl z-50 transform transition-all duration-500 ease-in-out flex flex-col ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {chatOpen && (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight">Nexus Assistant</div>
                  <div className="text-[10px] text-emerald-100 font-medium uppercase tracking-widest opacity-80">
                    AI Intelligence
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide bg-slate-50/30">
              {aiMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.type === "sent" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ring-1 ring-black/5 ${m.type === "sent"
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 rounded-tl-none border-l-4 border-emerald-500 border border-slate-200"
                    }`}>
                    {m.content || (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400 px-1 uppercase tracking-tighter">
                    {m.sender} • {m.type === "sent" ? "User" : "Nexus Assistant"}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex flex-col items-start translate-y-2 opacity-100 transition-all duration-300">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border-l-4 border-emerald-500 border border-slate-200">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-emerald-500 italic text-xs font-semibold">Nexus is analyzing system state...</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-5 bg-white border-t border-slate-100">
              <form onSubmit={handleSendChat} className="flex flex-col gap-3">
                <div className="relative group">
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask Nexus AI about inventory..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder-slate-400 group-hover:bg-slate-100/50 pr-14"
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || isAiTyping}
                    className={`absolute right-2 top-2 p-2.5 rounded-xl transition-all ${aiInput.trim() && !isAiTyping
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 text-center font-bold tracking-tight uppercase opacity-70">
                  AI aggregates data across Nexus Platform
                </div>
              </form>
            </div>
          </>
        )}
      </aside>

      {/* Other Modals */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-md shadow-2xl border border-slate-200">
            <div className="font-semibold text-slate-900 text-lg">{t("delete_item", { defaultValue: "Delete item?" })}</div>
            <div className="text-sm text-slate-500 mt-2">{t("delete_desc", { defaultValue: "This will remove the item from inventory." })}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold hover:bg-slate-50" type="button">
                {t("cancel", { defaultValue: "Cancel" })}
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700" type="button">
                {t("delete", { defaultValue: "Delete" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[92%] max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">{t("add_item", { defaultValue: "➕ Add Item" })}</h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              <input
                className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder={t("item_name", { defaultValue: "Item name" })}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />

              <input
                className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200"
                type="number"
                placeholder={t("quantity", { defaultValue: "Quantity" })}
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              />

              <select
                className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                <option>Vegetables</option>
                <option>Grains</option>
                <option>Oil</option>
                <option>Cooked Food</option>
                <option>Beverages</option>
                <option>Medicine</option>
              </select>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl">
                  {t("cancel", { defaultValue: "Cancel" })}
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">
                  {t("submit", { defaultValue: "Submit" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRiskMap && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[92%] h-[92%] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-[#E14B4B] text-white px-5 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert /> {t("risk_manager", { defaultValue: "Risk Zone Manager" })}
              </h2>
              <button onClick={() => setShowRiskMap(false)} className="bg-white/15 hover:bg-white/20 px-4 py-2 rounded-xl font-semibold" type="button">
                {t("close", { defaultValue: "Close" })}
              </button>
            </div>

            <div className="flex-1 relative">
              <MapContainer center={[24.817, 93.9368]} zoom={11} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onMapClick={handleMapClick} />

                {riskZones.filter(z => z && typeof z.lat === 'number' && typeof z.lng === 'number').map((zone) => (
                  <Circle
                    key={zone.id}
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius}
                    pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.3 }}
                    eventHandlers={{ click: () => handleDeleteZone(zone.id) }}
                  >
                    <Popup>
                      <div className="text-left">
                        <b className="text-red-600 uppercase">{t("risk_zone", { defaultValue: "RISK ZONE" })}</b>
                        <div className="mt-1">{zone.reason}</div>
                        <div className="mt-2 text-xs text-slate-500">({t("click_delete", { defaultValue: "Click circle to delete" })})</div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>

              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-4 py-3 rounded-2xl shadow border border-slate-200">
                <div className="text-sm font-semibold text-slate-900">{t("tip", { defaultValue: "Tip" })}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {t("risk_tip", { defaultValue: "Click on map to add a risk zone. Click a circle to delete." })}
                </div>
              </div>

              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-3 rounded-2xl shadow border border-slate-200">
                <div className="text-xs font-semibold text-slate-800 inline-flex items-center gap-2">
                  <MapIcon size={16} /> {t("map_help", { defaultValue: "Click map to add zone" })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCrisisMap && (
        <div className="fixed inset-0 z-[100]">
          <RiskMap district={currentCrisis?.location} onBack={() => setShowCrisisMap(false)} />
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[92%] max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">👥 Team Management</h3>
              <button onClick={() => setShowTeamModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">B</div>
                <div>
                  <div className="font-bold text-sm">Breny</div>
                  <div className="text-xs text-slate-500">Logistics Manager</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">S</div>
                <div>
                  <div className="font-bold text-sm">Sinthoiba</div>
                  <div className="text-xs text-slate-500">Inventory Specialist</div>
                </div>
              </div>
              <button className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:bg-slate-50 hover:border-slate-400 transition">
                + Add Team Member
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-2xl w-[92%] max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">⚙️ Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg"><Bell size={18} /></div>
                  <span className="font-medium text-slate-700">Notifications</span>
                </div>
                <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Globe size={18} /></div>
                  <span className="font-medium text-slate-700">Language</span>
                </div>
                <select
                  value={lang}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value);
                    localStorage.setItem('foodtech_language', e.target.value);
                    toast("info", "Language changed", `Now using: ${e.target.value.toUpperCase()}`);
                  }}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mni">Manipuri</option>
                  <option value="or">Odia</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Building2 size={18} /></div>
                  <span className="font-medium text-slate-700">Center Info</span>
                </div>
                <button onClick={() => { setShowSettingsModal(false); openCenterSetup(); }} className="w-full py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold hover:bg-slate-50 text-slate-700">
                  Edit Center Details
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button onClick={() => { setShowSettingsModal(false); setShowDeleteConfirm(true); }} className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition flex items-center justify-center gap-2">
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-white p-6 rounded-2xl w-[92%] max-w-sm shadow-2xl border border-red-100">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Delete Account?</h3>
              <p className="text-sm text-slate-500 mt-1">
                This action is permanent. Your center and inventory data will be removed.
              </p>
            </div>

            {orders.some(o => o.status !== 'Delivered' && o.status !== 'Rejected') && (
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 font-medium flex gap-2">
                 <AlertTriangle size={16} className="shrink-0" />
                 Warning: You have active orders. You must fulfill or reject them before deleting.
               </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Confirm Password</label>
                <input 
                  type="password" 
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
              
              <button 
                onClick={handleDeleteAccount}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
              >
                Confirm Deletion
              </button>
              <button 
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                className="w-full py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierDashboard;