import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import AuthContextAdmin from './AuthContextAdmin';
import './LayoutAdmin.css';
import { FaTachometerAlt, FaBook, FaFileInvoiceDollar, FaStar, FaSignOutAlt, FaBell } from 'react-icons/fa';

const LayoutAdmin = () => {
  const { logout, token } = useContext(AuthContextAdmin);
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1backend.onrender.com';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const bookingsResp = await fetch(`${API_URL}/api/bookings`, { headers });
      const bookings = await bookingsResp.json();
      const list = Array.isArray(bookings) ? bookings : bookings?.data || [];
      const needAssign = list.filter(b => {
        const rn = b.roomNumber || (b.room && b.room.roomNumber);
        const st = String(b.status || '').toLowerCase();
        return !rn && !['cancelled','completed'].includes(st);
      }).map(b => ({ id: b._id, text: `Booking ${b.referenceNumber || String(b._id).slice(-6)} needs room assignment` }));

      const billsResp = await fetch(`${API_URL}/api/billings/admin`, { headers });
      const billsJson = await billsResp.json();
      const bills = billsJson?.data || [];
      const food = bills.filter(x => String(x.description || '').toLowerCase().includes('food')).map(x => ({ id: x._id, text: `Food order: ${x.description}` }));

      const cleanResp = await fetch(`${API_URL}/api/requests/cleaning`, { headers });
      const cleanJson = await cleanResp.json();
      const cleanReqs = cleanJson?.data || [];
      const cleanMsgs = cleanReqs.map(r => ({ id: r._id, text: `Cleaning request: Room ${r.roomNumber || r.booking?.roomNumber || ''} at ${new Date(r.scheduledAt).toLocaleString()}` }));

      setNotifications([...needAssign, ...food, ...cleanMsgs]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadNotifications(); }, [token]);

  const [readIds, setReadIds] = useState([]);
  useEffect(() => {
    const raw = localStorage.getItem('admin_notifs_read');
    setReadIds(raw ? JSON.parse(raw) : []);
  }, []);
  const markAllAsRead = () => {
    const ids = notifications.map(n => n.id);
    const merged = Array.from(new Set([...(readIds || []), ...ids]));
    setReadIds(merged);
    localStorage.setItem('admin_notifs_read', JSON.stringify(merged));
  };
  const markOneAsRead = (id) => {
    const merged = Array.from(new Set([...(readIds || []), id]));
    setReadIds(merged);
    localStorage.setItem('admin_notifs_read', JSON.stringify(merged));
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

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2> Lumine</h2>
          <p>Admin</p>
          <div className="admin-bell" ref={bellRef} onClick={() => setNotifOpen(v => { const next = !v; if (next) { loadNotifications(); } return next; })} title="Notifications">
            <FaBell />
            {notifications.filter(n => !(readIds || []).includes(n.id)).length > 0 && (
              <span className="notif-badge">{notifications.filter(n => !(readIds || []).includes(n.id)).length}</span>
            )}
          </div>
          {notifOpen && (
            <div className="admin-notif-dropdown" ref={dropdownRef}>
              <div className="notif-header"><span>Notifications</span><button className="notif-markall" onClick={markAllAsRead}>Mark all as read</button></div>
              {notifications.filter(n => !(readIds || []).includes(n.id)).length === 0 ? (
                <div className="notif-empty">No notifications</div>
              ) : (
                notifications.filter(n => !(readIds || []).includes(n.id)).slice(0,20).map(n => (
                  <div key={n.id} className="notif-item"><span>{n.text}</span><button className="notif-close" onClick={() => markOneAsRead(n.id)}>×</button></div>
                ))
              )}
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/admin/dashboard" className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
                <FaTachometerAlt className="icon" /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin/manage-booking" className={location.pathname === '/admin/manage-booking' ? 'active' : ''}>
                <FaBook className="icon" /> Manage Bookings
              </Link>
            </li>
            <li>
              <NavLink to="/admin/customer-bills">Customer Bills</NavLink>
            </li>
            <li>
              <Link to="/admin/reviews-management" className={location.pathname === '/admin/reviews-management' ? 'active' : ''}>
                <FaStar className="icon" /> Reviews Management
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setShowLogoutConfirm(true)}>
            <FaSignOutAlt className="icon" /> Logout
          </button>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>

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
              <button className="logout-cancel-btn" onClick={cancelLogout}>Cancel</button>
              <button className="logout-confirm-btn" onClick={confirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutAdmin;
