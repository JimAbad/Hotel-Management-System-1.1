import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import RoomDetails from './RoomDetails';
import Home from './Home';
import Rooms from './Rooms';
import MyBookings from './MyBookings';
import Billings from './Billings';
import ReviewsRatings from './ReviewsRatings';
import Login from './Login';
import Signup from './Signup';
import PaymentStatus from './PaymentStatus';
// import PaymentMiniPage from './PaymentMiniPage'; // Removed as component is no longer used
import './App.css';
import { useAuth } from './AuthContext';
import { FaSignInAlt } from 'react-icons/fa';
import { AuthProvider } from './AuthContext';
import ViewCustomerBillAdmin from './ViewCustomerBillAdmin';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation(); // Correctly call useLocation hook
  const [rooms, setRooms] = useState([]);
  const { user, logout } = useAuth();
  console.log('User state in App.jsx:', user);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="App">
      <nav>
        <div className="logo">
          <img src="/src/img/lumine nav bar.png" alt="Lumine Nav Bar Logo" />
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
            <button onClick={logout} className="logout-btn">Logout</button>
          ) : (
            <>
              <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}><FaSignInAlt /> Log in</Link>
              <Link to="/signup" className={location.pathname === '/signup' ? 'active' : ''}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/billings" element={<Billings />} />
        <Route path="/reviews-ratings" element={<ReviewsRatings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/payment-status" element={<PaymentStatus />} />
        {/* <Route path="/payment-mini-page" element={<PaymentMiniPage />} /> */}
        <Route path="/room-details/:id" element={<RoomDetails />} />
        <Route path="/admin/viewcustomerbills" element={<ViewCustomerBillAdmin />} />
      </Routes>
    </div>
  );
}

export default App;
