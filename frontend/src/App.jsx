import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
 
import RoomDetails from './RoomDetails';
import Home from './Home';
import Rooms from './Rooms';
import MyBookings from './MyBookings';
import Billings from './Billings';
import ReviewsRatings from './ReviewsRatings';
import Login from './Login';
import Signup from './Signup';
import PaymentStatus from './PaymentStatus';
import './App.css';
import { useAuth } from './AuthContext';
import { FaSignInAlt, FaSignOutAlt, FaBell } from 'react-icons/fa';
import { AuthProvider } from './AuthContext';
import ViewCustomerBillAdmin from './ViewCustomerBillAdmin';
import VerifyEmail from './VerifyEmail';
import PayMongoQR from './PayMongoQR';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, token, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  console.log('User state in App.jsx:', user);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchUserNotifications = async () => {
    try {
      if (!user || !token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const bookingsRes = await fetch(`${API_URL}/api/bookings/my-bookings`, config);
      const bookingsJson = await bookingsRes.json();
      const list = Array.isArray(bookingsJson) ? bookingsJson : bookingsJson?.data || [];
      const msgs = [];
      for (const b of list) {
        try {
          const actsRes = await fetch(`${API_URL}/api/booking-activities/${b._id}`, config);
          const actsJson = await actsRes.json();
          const acts = Array.isArray(actsJson) ? actsJson : actsJson?.data || [];
          acts.forEach(a => {
            const text = a.activity || '';
            const low = String(text).toLowerCase();
            if (low.includes('room assigned') || low.includes('room reassigned')) {
              msgs.push({ id: a._id || `${b._id}-${Date.now()}`, text, ts: a.createdAt });
            }
          });
        } catch (e) { console.error(e); }
      }
      setNotifications(msgs.sort((x,y)=> new Date(y.ts) - new Date(x.ts)));
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => { fetchUserNotifications(); }, [user, token]);
  useEffect(() => {
    try { fetch(`${API_URL}/healthz`).catch(() => {}); } catch {}
  }, [API_URL]);
  useEffect(() => {
    if (!user || !token) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetchUserNotifications();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, [user, token]);
  useEffect(() => {
    if (user && user._id) {
      const raw = localStorage.getItem(`notifRead:${user._id}`);
      setReadIds(raw ? JSON.parse(raw) : []);
    } else {
      setReadIds([]);
    }
  }, [user]);

  const markAllAsRead = () => {
    const ids = notifications.map(n => n.id);
    const merged = Array.from(new Set([...(readIds || []), ...ids]));
    setReadIds(merged);
    if (user && user._id) localStorage.setItem(`notifRead:${user._id}`, JSON.stringify(merged));
  };

  const markOneAsRead = (id) => {
    if (!id) return;
    const merged = Array.from(new Set([...(readIds || []), id]));
    setReadIds(merged);
    if (user && user._id) localStorage.setItem(`notifRead:${user._id}`, JSON.stringify(merged));
  };

  useEffect(() => {
    const handler = (e) => {
      if (!notifOpen) return;
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      const inBell = bellRef.current && bellRef.current.contains(e.target);
      if (!inDropdown && !inBell) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);
  return (
    <div className="App">
      <nav className="top-nav">
        <div className="logo">
          <img src="/images/lumine nav bar.png" alt="Lumine Nav Bar Logo" onError={(e) => { e.target.src = '/images/logo.png'; }} />
        </div>
        <ul className="nav-links">
          <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link></li>
          <li><Link to="/rooms" className={location.pathname === '/rooms' ? 'active' : ''}>Rooms</Link></li>
          {user && (
            <>
              <li><Link to="/my-bookings" className={location.pathname === '/my-bookings' ? 'active' : ''}>My Bookings</Link></li>
              <li><Link to="/billings" className={location.pathname === '/billings' ? 'active' : ''}>Billings</Link></li>
            </>
          )}
          <li><Link to="/reviews-ratings" className={location.pathname === '/reviews-ratings' ? 'active' : ''}>Reviews & Ratings</Link></li>
        </ul>
        <div className="auth-controls">
          {user ? (
            <>
              <div className="notif-bell" ref={bellRef} onClick={() => setNotifOpen(v => { const next = !v; if (next) { fetchUserNotifications(); } return next; })} title="Notifications">
                <FaBell />
                {notifications.filter(n => !(readIds || []).includes(n.id)).length > 0 && (
                  <span className="notif-badge">{notifications.filter(n => !(readIds || []).includes(n.id)).length}</span>
                )}
              </div>
              <button onClick={() => setShowLogoutConfirm(true)} className="logout-btn"><FaSignOutAlt /> Logout</button>
              {notifOpen && (
                <div className="notif-dropdown" ref={dropdownRef}>
                  <div className="notif-header">
                    <span>Notifications</span>
                    <button className="notif-markall" onClick={markAllAsRead}>Mark all as read</button>
                  </div>
                  {notifications.filter(n => !(readIds || []).includes(n.id)).length === 0 ? (
                    <div className="notif-empty">No notifications</div>
                  ) : (
                    notifications.filter(n => !(readIds || []).includes(n.id)).slice(0,20).map(n => (
                      <div key={n.id} className="notif-item">
                        <span>{n.text}</span>
                        <button className="notif-close" onClick={() => markOneAsRead(n.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}><FaSignInAlt /> Log in</Link>
              <Link to="/signup" className={location.pathname === '/signup' ? 'active' : ''}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-confirmation-modal">
            <div className="logout-modal-header">
              <h3 className="logout-modal-title">Confirm Logout</h3>
              <button className="logout-modal-close" onClick={() => setShowLogoutConfirm(false)}>×</button>
            </div>
            <div className="logout-modal-body">
              Are you sure you want to logout?
            </div>
            <div className="logout-modal-footer">
              <button className="logout-cancel-btn" onClick={() => { setShowLogoutConfirm(false); navigate(-1); }}>Cancel</button>
              <button className="logout-confirm-btn" onClick={() => { setShowLogoutConfirm(false); logout(); navigate('/'); }}>Logout</button>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/billings" element={<Billings />} />
        <Route path="/reviews-ratings" element={<ReviewsRatings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/payment-status" element={<PaymentStatus />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/room-details/:id" element={<RoomDetails />} />
        <Route path="/admin/viewcustomerbills" element={<ViewCustomerBillAdmin />} />
        <Route path="/paymongo-qr/:bookingId" element={<PayMongoQR />} />
      </Routes>
    </div>
  );
}

export default App;
