import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Siren, LogOut, Activity, Globe, CheckCircle, XCircle, AlertTriangle, Clock, WifiOff 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';

const EmergencyDashboard = () => {
    const { t, i18n } = useTranslation();
    const [riskZones, setRiskZones] = useState(() => {
        const saved = localStorage.getItem('emergency_riskZones');
        return saved ? JSON.parse(saved) : [];
    });
    const [pendingAlerts, setPendingAlerts] = useState(() => {
        const saved = localStorage.getItem('emergency_pendingAlerts');
        return saved ? JSON.parse(saved) : [];
    });
    const [allAlerts, setAllAlerts] = useState(() => {
        const saved = localStorage.getItem('emergency_allAlerts');
        return saved ? JSON.parse(saved) : [];
    });
    const [addresses, setAddresses] = useState({});
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const getAddress = async (lat, lng, alertId) => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const addr = res.data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setAddresses(prev => ({ ...prev, [alertId]: addr }));
        } catch {
            setAddresses(prev => ({ ...prev, [alertId]: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        }
    };

    const fetchData = async () => {
        try {
          const [alertsRes, riskRes] = await Promise.all([
            axios.get('http://localhost:8000/sos-alerts'),
            axios.get('http://localhost:8000/risk-zones')
          ]);
    
          const alerts = alertsRes.data;
          setAllAlerts(alerts);
          setPendingAlerts(alerts.filter(a => a.status === 'pending'));
          setRiskZones(riskRes.data);
          
          localStorage.setItem('emergency_allAlerts', JSON.stringify(alerts));
          localStorage.setItem('emergency_pendingAlerts', JSON.stringify(alerts.filter(a => a.status === 'pending')));
          localStorage.setItem('emergency_riskZones', JSON.stringify(riskRes.data));
          
          // Fetch addresses for pending alerts
          const pendingAlertsList = alerts.filter(a => a.status === 'pending');
          pendingAlertsList.forEach(alert => {
            getAddress(alert.lat, alert.lng, alert.id);
          });
        } catch (err) { console.error("Sync Error:", err); }
      };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // Inject translations for Emergency Dashboard
    useEffect(() => {
        if (i18n.addResourceBundle) {
            i18n.addResourceBundle('hi', 'translation', {
                'offline_msg': 'ऑफ़लाइन मोड - लाइव अपडेट रुके हुए हैं', 
                'logout': 'लॉग आउट',
                'emergency_command': 'आपातकालीन कमांड',
                'official_only': 'केवल आधिकारिक उपयोग',
                'pending_alerts': 'लंबित अलर्ट',
                'no_pending': 'कोई लंबित अलर्ट नहीं',
                'verify': 'सत्यापित करें',
                'reject': 'अस्वीकार करें',
                'system_status': 'सिस्टम स्थिति',
                'database': 'डेटाबेस',
                'total_alerts': 'कुल अलर्ट',
                'pending': 'लंबित',
                'risk_zones': 'जोखिम क्षेत्र',
                'online': 'ऑनलाइन',
                'active': 'सक्रिय',
                'live_map': 'लाइव रणनीतिक मानचित्र',
                'danger_zones': 'खतरा क्षेत्र',
                'danger_zone': 'खतरा क्षेत्र',
                'radius': 'त्रिज्या',
                'verified_alert': 'सत्यापित अलर्ट'
            }, true, true);

            i18n.addResourceBundle('mni', 'translation', {
                'offline_msg': 'ꯑꯣꯐꯂꯥꯏꯟ ꯃꯣꯗ - ꯂꯥꯏꯕ ꯑꯞꯗꯦꯠ ꯂꯦꯞꯂꯤ', 
                'logout': 'ꯂꯣꯒ ꯑꯥꯎꯠ',
                'emergency_command': 'ꯏꯃꯔꯖꯦꯟꯁꯤ ꯀꯃꯥꯟꯗ',
                'official_only': 'ꯑꯣꯐꯤꯁꯤꯑꯦꯜꯒꯤꯗꯃꯛꯇ',
                'pending_alerts': 'ꯂꯦꯞꯂꯤꯕ ꯑꯦꯂꯔꯠ',
                'no_pending': 'ꯂꯦꯞꯂꯤꯕ ꯑꯦꯂꯔꯠ ꯂꯩꯇꯦ',
                'verify': 'ꯆꯦꯛꯁꯤꯟꯕ',
                'reject': 'ꯌꯥꯗꯕ',
                'system_status': 'ꯁꯤꯁ꯭ꯇꯦꯝ ꯁ꯭ꯇꯦꯇꯁ',
                'database': 'ꯗꯦꯇꯥꯕꯦꯖ',
                'total_alerts': 'ꯑꯄꯨꯅꯕ ꯑꯦꯂꯔꯠ',
                'pending': 'ꯂꯦꯞꯂꯤꯕ',
                'risk_zones': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ',
                'online': 'ꯑꯣꯅꯂꯥꯏꯟ',
                'active': 'ꯑꯦꯛꯇꯤꯕ',
                'live_map': 'ꯂꯥꯏꯕ ꯃꯦꯞ',
                'danger_zones': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ',
                'danger_zone': 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯃꯐꯝ',
                'radius': 'ꯔꯦꯗꯤꯌꯁ',
                'verified_alert': 'ꯆꯦꯛꯁꯤꯟꯕ ꯑꯦꯂꯔꯠ'
            }, true, true);

            i18n.addResourceBundle('or', 'translation', {
                'offline_msg': 'ଅଫଲାଇନ୍ ମୋଡ୍ - ଲାଇଭ୍ ଅପଡେଟ୍ ବନ୍ଦ ଅଛି', 
                'logout': 'ଲଗ୍ ଆଉଟ୍',
                'emergency_command': 'ଜରୁରୀକାଳୀନ କମାଣ୍ଡ',
                'official_only': 'କେବଳ ସରକାରୀ ବ୍ୟବହାର',
                'pending_alerts': 'ବିଚାରାଧୀନ ଆଲର୍ଟ',
                'no_pending': 'କୌଣସି ବିଚାରାଧୀନ ଆଲର୍ଟ ନାହିଁ',
                'verify': 'ଯାଞ୍ଚ କରନ୍ତୁ',
                'reject': 'ପ୍ରତ୍ୟାଖ୍ୟାନ',
                'system_status': 'ସିଷ୍ଟମ୍ ସ୍ଥିତି',
                'database': 'ଡାଟାବେସ୍',
                'total_alerts': 'ମୋଟ ଆଲର୍ଟ',
                'pending': 'ବିଚାରାଧୀନ',
                'risk_zones': 'ବିପଦ ଅଞ୍ଚଳ',
                'online': 'ଅନଲାଇନ୍',
                'active': 'ସକ୍ରିୟ',
                'live_map': 'ଲାଇଭ୍ ମାନଚିତ୍ର',
                'danger_zones': 'ବିପଦ ଅଞ୍ଚଳ',
                'danger_zone': 'ବିପଦ ଅଞ୍ଚଳ',
                'radius': 'ବ୍ୟାସାର୍ଦ୍ଧ',
                'verified_alert': 'ଯାଞ୍ଚ ହୋଇଥିବା ଆଲର୍ଟ'
            }, true, true);
        }
    }, [i18n]);

    const handleVerify = async (alertId) => {
        try {
            await axios.post(`http://localhost:8000/sos-alerts/${alertId}/verify`);
            fetchData();
        } catch (err) {
            console.error('Verify failed:', err);
        }
    };

    const handleReject = async (alertId) => {
        try {
            await axios.post(`http://localhost:8000/sos-alerts/${alertId}/reject`);
            fetchData();
        } catch (err) {
            console.error('Reject failed:', err);
        }
    };

    const toggleLanguage = () => {
        const langs = ['en', 'hi', 'mni', 'or'];
        const current = langs.indexOf(i18n.language) > -1 ? langs.indexOf(i18n.language) : 0;
        const next = (current + 1) % langs.length;
        const nextLang = langs[next];
        i18n.changeLanguage(nextLang);
        localStorage.setItem('foodtech_language', nextLang);
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
            localStorage.removeItem('foodtech_user');
            navigate('/login');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900 font-sans text-gray-100 p-4 md:p-0 overflow-hidden">
            {/* Offline Indicator */}
            {!isOnline && (
                <div className="absolute top-0 left-0 w-full bg-red-600/90 backdrop-blur-md text-white py-1 px-4 text-center text-xs font-bold z-[100] flex items-center justify-center gap-2 border-b border-red-500/50">
                    <WifiOff size={14} />
                    {t('offline_msg', "OFFLINE MODE - Live updates paused")}
                </div>
            )}

            <div className="flex-1 flex flex-col relative overflow-hidden rounded-3xl md:rounded-none shadow-2xl md:shadow-none bg-gray-800 w-full h-full border border-gray-700 md:border-none">
            <nav className="bg-red-900 text-white px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center shadow-lg border-b border-red-700 gap-3 md:gap-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-xl font-bold flex items-center gap-2 tracking-wider"><Siren className="animate-pulse"/> {t('emergency_command', 'EMERGENCY COMMAND')}</h1>
                    <span className="text-xs bg-red-950 px-2 py-1 rounded text-red-200 border border-red-800">{t('official_only', 'OFFICIAL USE ONLY')}</span>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-between md:justify-end">
                    <button onClick={toggleLanguage} className="bg-red-800 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-red-700">
                        <Globe size={14}/> {i18n.language === 'en' ? 'EN' : i18n.language === 'hi' ? 'HI' : i18n.language === 'mni' ? 'MNI' : 'OR'}
                    </button>
                    <button onClick={handleLogout} className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg flex gap-2 text-sm border border-red-700">
                        <LogOut size={16}/> {t('logout')}
                    </button>
                </div>
            </nav>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-96 h-[40%] md:h-full bg-gray-800 border-r border-gray-700 p-4 space-y-4 overflow-y-auto order-2 md:order-1">
                    <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <h2 className="text-red-400 font-bold flex items-center gap-2 mb-3"><AlertTriangle size={18}/> {t('pending_alerts', 'Pending Alerts')} ({pendingAlerts.length})</h2>
                        {pendingAlerts.length === 0 ? (
                            <div className="text-sm text-gray-400">{t('no_pending', 'No pending alerts')}</div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {pendingAlerts.map(alert => (
                                    <div key={alert.id} className="bg-gray-900/50 p-3 rounded border border-red-500/30">
                                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                            <Clock size={12}/> {new Date(alert.timestamp).toLocaleString()}
                                        </div>
                                        <div className="text-sm font-semibold text-white mb-1">{alert.sender_name}</div>
                                        <div className="text-xs text-gray-300 mb-2">{alert.reason}</div>
                                        <div className="text-xs text-gray-500 mb-2">{addresses[alert.id] || 'Loading address...'}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleVerify(alert.id)} className="flex-1 bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                <CheckCircle size={12}/> {t('verify', 'Verify')}
                                            </button>
                                            <button onClick={() => handleReject(alert.id)} className="flex-1 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                <XCircle size={12}/> {t('reject', 'Reject')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-gray-700/30 border border-gray-600 rounded-lg">
                        <h2 className="text-blue-400 font-bold flex items-center gap-2 mb-2"><Activity size={18}/> {t('system_status', 'System Status')}</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span>{t('database', 'Database')}:</span> <span className="text-green-400">{t('online', 'Online')}</span></div>
                            <div className="flex justify-between"><span>{t('total_alerts', 'Total Alerts')}:</span> <span className="text-yellow-400">{allAlerts.length}</span></div>
                            <div className="flex justify-between"><span>{t('pending', 'Pending')}:</span> <span className="text-orange-400">{pendingAlerts.length}</span></div>
                            <div className="flex justify-between"><span>{t('risk_zones', 'Risk Zones')}:</span> <span className="text-red-400">{riskZones.length} {t('active', 'Active')}</span></div>
                        </div>
                    </div>
                </div>

                {/* Main Map */}
                <div className="flex-1 relative h-[60%] md:h-full order-1 md:order-2">
                    <MapContainer center={[24.8170, 93.9368]} zoom={11} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {riskZones.map(zone => (
                            <Circle 
                                key={zone.id} 
                                center={[zone.lat, zone.lng]} 
                                radius={zone.radius}
                                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
                            >
                                <Popup>
                                    <div className="text-center">
                                        <b className="text-red-600 uppercase">{t('danger_zone', 'DANGER ZONE')}</b><br/>
                                        {zone.reason}<br/>
                                        <span className="text-xs text-gray-600">{t('radius', 'Radius')}: {zone.radius}m</span>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}
                        {allAlerts.filter(a => a.status === 'verified').map(alert => (
                            <Marker key={`alert-${alert.id}`} position={[alert.lat, alert.lng]} icon={L.divIcon({
                                className: 'custom-icon',
                                html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 16px;">⚠</span></div>`
                            })}>
                                <Popup>
                                    <div>
                                        <b className="text-red-600">{t('verified_alert', 'Verified Alert')}</b><br/>
                                        <span className="text-xs">{alert.sender_name}</span><br/>
                                        <span className="text-xs">{alert.reason}</span><br/>
                                        <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</span>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="absolute top-4 right-4 z-[400] bg-black/80 text-white p-2 rounded text-xs border border-gray-600">
                        {t('live_map', 'Live Strategic Map')} - {riskZones.length} {t('danger_zones', 'Danger Zones')}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default EmergencyDashboard;