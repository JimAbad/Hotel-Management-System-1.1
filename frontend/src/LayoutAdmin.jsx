import React, { useContext, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import AuthContextAdmin from './AuthContextAdmin';
import './LayoutAdmin.css';
import { FaTachometerAlt, FaBook, FaFileInvoiceDollar, FaStar, FaSignOutAlt } from 'react-icons/fa';

const LayoutAdmin = () => {
  const { logout } = useContext(AuthContextAdmin);
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2> Lumine</h2>
          <p>Admin</p>
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