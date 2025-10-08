import React, { useContext } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import AuthContextAdmin from './AuthContextAdmin';
import './LayoutAdmin.css';
import { FaTachometerAlt, FaBook, FaFileInvoiceDollar, FaStar, FaSignOutAlt } from 'react-icons/fa';
import logo from './assetsAdmin/logo - Copy.png';

const LayoutAdmin = () => {
  const { logout } = useContext(AuthContextAdmin);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Lumine Admin Logo" className="admin-logo" />
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
              <Link to="/admin/manage-rooms" className={location.pathname === '/admin/manage-rooms' ? 'active' : ''}>
                <FaBook className="icon" /> Manage Rooms
              </Link>
            </li>
            <li>
              <Link to="/admin/customer-bill" className={location.pathname === '/admin/customer-bill' ? 'active' : ''}>
                <FaFileInvoiceDollar className="icon" /> View Customer Bill
              </Link>
            </li>
            <li>
              <Link to="/admin/reviews-management" className={location.pathname === '/admin/reviews-management' ? 'active' : ''}>
                <FaStar className="icon" /> Reviews Management
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout}>
            <FaSignOutAlt className="icon" /> Logout
          </button>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default LayoutAdmin;