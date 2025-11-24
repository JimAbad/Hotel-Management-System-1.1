import { useState } from 'react';
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
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
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
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1backend.onrender.com';
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  console.log('User state in App.jsx:', user);

  

  

  return (
    <div className="App">
      <nav>
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
            <button onClick={() => setShowLogoutConfirm(true)} className="logout-btn"><FaSignOutAlt /> Logout</button>
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
