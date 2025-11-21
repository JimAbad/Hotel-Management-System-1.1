import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import roomDetails from './data/roomDetails';
import './Rooms.css';

function Rooms() {
  console.log('Rooms component re-rendered.');
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalRoom, setModalRoom] = useState(null);
  const [modalRoomAvailability, setModalRoomAvailability] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginConfirmation, setShowLoginConfirmation] = useState(false); // New state for confirmation dialog
  const [showPaymentForm, setShowPaymentForm] = useState(false); // New state for showing payment form
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); // 'gcash' or 'paymaya'
  const [modalPurpose, setModalPurpose] = useState('info'); // 'info' or 'book'
  const [numberOfHours, setNumberOfHours] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [taxesAndFees, setTaxesAndFees] = useState(0);
  const [total, setTotal] = useState(0);
  const [bookingType, setBookingType] = useState('myself'); // 'myself' or 'someone'
  const [userBookingCount, setUserBookingCount] = useState(0); // New state for user's booking count
  const [bookingCountLoading, setBookingCountLoading] = useState(false); // Loading state for booking count

  // Function to fetch user's current booking count
  const fetchUserBookingCount = async () => {
    if (!user || !token) {
      setUserBookingCount(0);
      return;
    }

    try {
      setBookingCountLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/my-bookings`, config);
      
      // Count active bookings (not cancelled or completed)
      const activeBookings = data.filter(booking => {
        const status = String(booking.status || '').toLowerCase();
        const checkOut = new Date(booking.checkOut);
        const today = new Date();
        return status !== 'cancelled' && status !== 'completed' && checkOut >= today;
      });
      
      setUserBookingCount(activeBookings.length);
    } catch (err) {
      console.error('Error fetching user booking count:', err);
      setUserBookingCount(0);
    } finally {
      setBookingCountLoading(false);
    }
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms/summary`);
        setSummary(response.data.summary);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // Fetch user's booking count when user or token changes
  useEffect(() => {
    fetchUserBookingCount();
  }, [user, token]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkInTime && checkOutTime && modalRoom) {
      const checkIn = new Date(`${checkInDate}T${checkInTime}`);
      const checkOut = new Date(`${checkOutDate}T${checkOutTime}`);
      const diffTime = Math.abs(checkOut - checkIn);
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      setNumberOfHours(diffHours);

      const roomPrice = modalRoom.price || 0;
      let calculatedSubtotal = diffHours * roomPrice;
      let calculatedTaxesAndFees = calculatedSubtotal * 0.12; // Assuming 12% tax
      let calculatedTotal = calculatedSubtotal + calculatedTaxesAndFees;

      // Test pricing override: Economy for exactly 3 hours totals ₱10 (no tax)
      if (modalRoom?.roomType === 'Economy' && diffHours === 3) {
        calculatedSubtotal = 10;
        calculatedTaxesAndFees = 0;
        calculatedTotal = 10;
      }

      setSubtotal(calculatedSubtotal);
      setTaxesAndFees(calculatedTaxesAndFees);
      setTotal(calculatedTotal);
    }
  }, [checkInDate, checkOutDate, checkInTime, checkOutTime, modalRoom]);

  // Helper functions for date/time validation
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    return { date, time };
  };

  const isDateTimeInPast = (date, time) => {
    if (!date || !time) return false;
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    return selectedDateTime < now;
  };

  const getMinimumCheckOutTime = (checkInDate, checkInTime) => {
    if (!checkInDate || !checkInTime) return '';
    
    const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`);
    const minCheckOutDateTime = new Date(checkInDateTime.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
    
    return minCheckOutDateTime.toTimeString().slice(0, 5);
  };

  const validateDateTime = () => {
    // Validate check-in date/time
    if (isDateTimeInPast(checkInDate, checkInTime)) {
      alert('Check-in date and time cannot be in the past.');
      return false;
    }
    
    // Validate check-out date/time
    if (isDateTimeInPast(checkOutDate, checkOutTime)) {
      alert('Check-out date and time cannot be in the past.');
      return false;
    }
    
    // Validate minimum 3-hour duration
    if (checkInDate && checkInTime && checkOutDate && checkOutTime) {
      const checkInDateTime = new Date(`${checkInDate}T${checkInTime}`);
      const checkOutDateTime = new Date(`${checkOutDate}T${checkOutTime}`);
      const diffHours = (checkOutDateTime - checkInDateTime) / (1000 * 60 * 60);
      
      if (diffHours < 3) {
        alert('Minimum booking duration is 3 hours.');
        return false;
      }
    }
    
    return true;
  };

  const generateTimeOptions = (isCheckOut = false, checkInDate = null, checkInTime = null) => {
    const times = [];
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Convert to 12-hour format
        let displayHour = hour;
        let ampm = 'AM';
        
        if (hour === 0) {
          displayHour = 12;
        } else if (hour === 12) {
          displayHour = 12;
          ampm = 'PM';
        } else if (hour > 12) {
          displayHour = hour - 12;
          ampm = 'PM';
        }
        
        const timeString24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const timeString12 = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        
        // For check-in time: disable past times if selecting today's date
        if (!isCheckOut && checkInDate === currentDate) {
          if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
            continue; // Skip past times
          }
        }
        
        // For check-out time: enforce 3-hour minimum duration
        if (isCheckOut && checkInDate && checkInTime && checkOutDate === checkInDate) {
          const checkInHour24 = parseInt(checkInTime.split(':')[0]);
          const checkInMinute24 = parseInt(checkInTime.split(':')[1]);
          
          // Calculate minimum checkout time (3 hours after check-in)
          const checkInTotalMinutes = checkInHour24 * 60 + checkInMinute24;
          const minCheckOutTotalMinutes = checkInTotalMinutes + (3 * 60); // Add 3 hours
          const currentTotalMinutes = hour * 60 + minute;
          
          if (currentTotalMinutes < minCheckOutTotalMinutes) {
            continue; // Skip times that don't meet 3-hour minimum
          }
        }
        
        times.push({ value: timeString24, display: timeString12 });
      }
    }
    return times;
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(<span key={i} className={i < rating ? 'star filled' : 'star'}>{i < rating ? '★' : '☆'}</span>);
    }
    return <div className="star-rating">{stars}</div>;
  };

  const normalizeRoomType = (type) => {
    if (!type) return '';
    if (type.includes('Presidential')) return 'Presidential';
    if (type.includes('Deluxe')) return 'Deluxe';
    if (type.includes('Suite')) return 'Suite';
    if (type.includes('Economy')) return 'Economy';
    return type; // Fallback if no match
  };

  const deriveFloorFromRoomNumber = (rn) => {
    if (!rn) return null;
    const num = parseInt(String(rn), 10);
    if (isNaN(num)) return null;
    const floor = Math.floor(num / 100);
    return floor > 0 ? floor : null;
  };

  const getDisplayFloor = (type) => {
    const economyFloor = summary.find(item => item.type?.includes('Economy'))?.floor;
    const deluxeFloor = summary.find(item => item.type?.includes('Deluxe'))?.floor;
    const itemFloor = summary.find(item => item.type === type)?.floor;
    if (type?.includes('Economy')) return economyFloor ?? itemFloor ?? 'N/A';
    if (type?.includes('Deluxe')) return deluxeFloor ?? itemFloor ?? 'N/A';
    return itemFloor ?? 'N/A';
  };

  const handleBookType = async (type) => {
    if (!user || !user.name) {
      alert('Please log in to book.');
      navigate('/login');
      return;
    }
    try {
      // Find one available room of the selected type
      const availableRooms = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        params: { roomType: type, availableOnly: true, limit: 1 }
      });
      const room = availableRooms.data.rooms?.[0];
      if (!room) {
        alert(`${type} is not available.`);
        return;
      }
      const bookingData = {
        roomNumber: room.roomNumber,
        customerName: user.name,
        customerEmail: user.email,
        checkIn: '2025-09-17',
        checkOut: '2025-09-20',
        type
      };
      const bookingResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/confirm`, {
        bookingId: bookingResponse.data.newBooking._id,
        paymentDetails: { amount: 500 }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/payment-status', { state: { success: true, booking: bookingResponse.data, customerAccountId: bookingResponse.data.customerAccountId } });
    } catch (err) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to create booking.';
      
      // Check if it's a booking limit error
      if (errorMessage.includes('Booking limit reached')) {
        alert('You have reached the maximum limit of 3 active bookings. Please cancel or complete existing bookings before making a new one.');
        setShowModal(false);
      } else {
        navigate('/payment-status', { state: { success: false, error: errorMessage } });
      }
    }
  };

  const handleMoreInfo = async (type) => {
    try {
      setModalError(null);
      setModalLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        params: { roomType: type, limit: 1 }
      });
      const room = data.rooms?.[0];
      if (!room) {
        setModalError('No room details found.');
      } else {
        const normalizedType = normalizeRoomType(room.roomType);
        const combinedRoomDetails = { ...room, ...roomDetails[normalizedType] };
        
        // Find availability information from summary data
        const roomSummary = summary.find(item => item.type === type);
        const availability = roomSummary ? roomSummary.available : 0;
        
        setModalRoom(combinedRoomDetails);
        setModalRoomAvailability(availability);
        setModalPurpose('info'); // Set purpose to info
        setShowModal(true);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to load room details.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleBookRoom = async (type) => {
    if (!user || !user.name) {
      setShowLoginConfirmation(true); // Show confirmation dialog
      return;
    }
    
    // Check booking limit
    if (userBookingCount >= 3) {
      alert('You have reached the maximum limit of 3 active bookings. Please cancel or complete existing bookings before making a new one.');
      return;
    }
    
    try {
      setModalError(null);
      setModalLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        params: { roomType: type, limit: 1 }
      });
      const room = data.rooms?.[0];
      if (!room) {
        setModalError('No room details found.');
      } else {
        const normalizedType = normalizeRoomType(room.roomType);
        const combinedRoomDetails = { ...room, ...roomDetails[normalizedType] };
        setModalRoom(combinedRoomDetails);
        setModalPurpose('book'); // Set purpose to book
        
        // Auto-fill user info if booking for myself
        if (bookingType === 'myself') {
          setGuestName(user.name || '');
          setEmail(user.email || '');
          setContactNumber(user.contactNumber || '');
        }
        
        setShowModal(true);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to load room details.');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle booking type change
  const handleBookingTypeChange = (type) => {
    setBookingType(type);
    
    if (type === 'myself' && user) {
      // Auto-fill with user information
      setGuestName(user.name || '');
      setEmail(user.email || '');
      setContactNumber(user.contactNumber || '');
    } else if (type === 'someone') {
      // Clear the fields for someone else
      setGuestName('');
      setEmail('');
      setContactNumber('');
    }
  };

  const handleConfirmLogin = () => {
    setShowLoginConfirmation(false);
    navigate('/login');
  };

  const handleCancelLogin = () => {
    setShowLoginConfirmation(false);
  };

  const handleBookSelectedRoom = async () => {
    if (!modalRoom) return;
    if (!user || !user.name) {
      alert('Please log in to book.');
      navigate('/login');
      return;
    }

    // Validate all required fields
    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      alert('Please fill in all date and time fields.');
      return;
    }

    // Validate date/time constraints
    if (!validateDateTime()) {
      return;
    }

    try {
      const checkInDateTime = `${checkInDate}T${checkInTime}`;
      const checkOutDateTime = `${checkOutDate}T${checkOutTime}`;

      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: user.name,
        customerEmail: user.email,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        adults: adults,
        children: children,
        guestName: guestName,
        contactNumber: contactNumber,
        specialRequests: '',
      };
      const bookingResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/confirm`, {
        bookingId: bookingResponse.data.newBooking._id,
        paymentDetails: { amount: modalRoom.price }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      navigate('/payment-status', { state: { success: true, booking: bookingResponse.data.newBooking, customerAccountId: bookingResponse.data.customerAccountId } });
    } catch (err) {
      console.error(err);
      navigate('/payment-status', { state: { success: false, error: err.message } });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // setSelectedRoomType(null); // This state variable is not defined, so I'm commenting it out.
    setShowPaymentModal(false); // Close payment modal as well
    setModalPurpose('info'); // Reset modal purpose
  };

  const handleProceedToPayment = async () => {
    try {
      setModalLoading(true);
      setModalError('');

      // Validate required fields
      if (!guestName || !contactNumber || !email || !checkInDate || !checkOutDate) {
        setModalError('Please fill in all required fields.');
        setModalLoading(false);
        <button className="logout-modal-close" onClick={() => setShowLogoutConfirm(false)}>×</button>
        return;
      }

      // Validate dates and times
      const checkInDateTime = new Date(`${checkInDate}T${checkInTime || '00:00'}`);
      const checkOutDateTime = new Date(`${checkOutDate}T${checkOutTime || '23:59'}`);
      
      if (checkOutDateTime <= checkInDateTime) {
        setModalError('Check-out date and time must be after check-in date and time.');
        setModalLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: guestName,
        customerEmail: email,
        contactNumber,
        checkIn: `${checkInDate}T${checkInTime || '00:00'}`,
        checkOut: `${checkOutDate}T${checkOutTime || '23:59'}`,
        adults,
        children,
        guestName,
        specialRequests: '',
        totalAmount: total
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData, config);
      const booking = response.data?.newBooking || response.data;
      // Redirect to dedicated PayMongo QR page
      setShowModal(false);
      navigate(`/paymongo-qr/${booking._id}`);
      // Optionally refresh booking count (only paid bookings will appear)
      fetchUserBookingCount();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to create booking.';
      
      // Check if it's a booking limit error
      if (errorMessage.includes('Booking limit reached')) {
        setModalError('You have reached the maximum limit of 3 active bookings. Please cancel or complete existing bookings before making a new one.');
      } else {
        setModalError(errorMessage);
      }
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return <div className="rooms-container">Loading rooms...</div>;
  }
  if (error) {
    return <div className="rooms-container">Error: {error.message}</div>;
  }

  return (
    <div className="rooms-container">
      {showLoginConfirmation && (
        <div className="modal-overlay login-modal-overlay">
          <div className="login-confirmation-modal">
            <p>You need to be logged in to book a room. Do you want to go to the login page?</p>
            <div className="confirmation-actions">
              <button onClick={handleCancelLogin} className="cancel-btn">Cancel</button>
              <button onClick={handleConfirmLogin} className="confirm-btn">OK</button>
            </div>
          </div>
        </div>
      )}
      <h1>Available Room Types</h1>
     <p style={{ color: "red" }}>You can book up to 3 rooms per account only</p>

      <div className="room-list">
        {summary.filter(({ type }) => !type?.includes('Presidential')).map(({ type, total, available }) => (
           <div key={type} className="room-card">
             <div className="room-card-header">
               <img src="/images/room1.jpg" alt={type} className="room-image" />
               <div>
                 <button className="more-info-btn" onClick={() => handleMoreInfo(type)}>
                   More info
                 </button>
                 <span className="room-price"><span>{roomDetails[normalizeRoomType(type)]?.price ? `₱${roomDetails[normalizeRoomType(type)].price} per hour` : ' per hour varies'}</span></span>
                 {available === 0 && (
                   <span className="fully-booked-badge" title="This room type is not available">Not available</span>
                 )}
               </div>
             </div>
             <div className="room-card-body">
               
               <p>Room Type: {type}</p>  
               <p>Floor: {getDisplayFloor(type)}</p>
               <p>Total Rooms: {total}</p>
               <p>Available: {available}</p>
             </div>
             <div className="room-card-footer">
               <button 
                 className="book-room-btn" 
                 disabled={available === 0 || userBookingCount >= 3} 
                 onClick={() => handleBookRoom(type)}
               >
                 {available === 0 ? 'Not available' : userBookingCount >= 3 ? '3 rooms per account' : 'Book this room'}
               </button>
             </div>
           </div>
         ))}
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {modalLoading ? (
              <div className="modal-loading">Loading...</div>
            ) : modalError ? (
              <div className="modal-error">
                <button
                  className="modal-error-close"
                  aria-label="Close error"
                  onClick={() => setModalError('')}
                >
                  ×
                </button>
                {modalError}
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <button className="modal-back" style={{ color: 'white', background: '#B8860B', }} onClick={() => handleCloseModal()}>Back</button>
                  <h2 
  className="modal-title" 
  style={{ textAlign: "center" }}
>
  {modalRoom?.roomType || modalRoom?.type}
</h2>

                </div>
                <div className="modal-amenities">
                  <h3>Amenities</h3>
                  <div className="amenities-list">
                    {modalRoom?.amenities?.map((amenity, index) => (
                      <span key={index} className="amenity-item">{amenity}</span>
                    ))}
                  </div>
                </div>
                <div className="modal-room-details">
                  <h3 style={{ textAlign: 'center' }}>Room Details</h3>

                  <div className="room-details-grid">
                    <div className="room-detail-item">
                      <p><strong>Room size:</strong> {modalRoom?.roomSize || 'N/A'}</p>
                      <p><strong>Bed type:</strong> {modalRoom?.bedType || 'N/A'}</p>
                      <p><strong>Capacity:</strong> {modalRoom?.capacity || 'N/A'}</p>
                      <p><strong>View:</strong> {modalRoom?.view || 'N/A'}</p>
                      <p><strong>Floor:</strong> {deriveFloorFromRoomNumber(modalRoom?.roomNumber) ?? modalRoom?.floor ?? roomDetails[normalizeRoomType(modalRoom?.roomType || modalRoom?.type)]?.floor ?? 'N/A'}</p>
                      <p><strong>Accessibility:</strong> {modalRoom?.accessibility || 'N/A'}</p>
                    </div>
                    <div className="room-detail-item">
                      <p><strong>Smoking:</strong> {modalRoom?.smoking || 'N/A'}</p>
                      <p><strong>Pets:</strong> {modalRoom?.pets || 'N/A'}</p>
                    </div>
                  </div>
                  {modalPurpose === 'info' && (
                    <div className="modal-actions">
                      <button 
                        className="book-room-btn" 
                        disabled={modalRoomAvailability === 0 || userBookingCount >= 3} 
                        onClick={() => handleBookRoom(modalRoom.roomType || modalRoom.type)}
                      >
                        {modalRoomAvailability === 0 ? 'Not available' : userBookingCount >= 3 ? '3 rooms per account' : 'Book this room'}
                      </button>
                    </div>
                  )}
                </div>
                {modalPurpose === 'book' && (
                  <div className="modal-body-content">
                    <div className="guest-info-section">
                      <h3>Guest Information</h3>
                      
                      {/* Booking Type Selection */}
                      <div className="booking-type-section">
                        <div className="booking-type-options">
                          <label className="radio-option">
                            <input
                              type="radio"
                              name="bookingType"
                              value="myself"
                              checked={bookingType === 'myself'}
                              onChange={(e) => handleBookingTypeChange(e.target.value)}
                            />
                            <span className="radio-label">Book for me</span>
                          </label>
                          <label className="radio-option">
                            <input
                              type="radio"
                              name="bookingType"
                              value="someone"
                              checked={bookingType === 'someone'}
                              onChange={(e) => handleBookingTypeChange(e.target.value)}
                            />
                            <span className="radio-label">Book for someone else</span>
                          </label>
                        </div>
                      </div>

                      <div className="guest-info-group">
                        <label htmlFor="guestName">Guest Name</label>
                        <input
                          type="text"
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Guest Name"
                          disabled={bookingType === 'myself'}
                          className={bookingType === 'myself' ? 'disabled-field' : ''}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="contactNumber">Contact Number</label>
                        <br></br>
                        <input
                          type="text"
                          id="contactNumber"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="Contact Number"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <br></br>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          disabled={bookingType === 'myself'}
                          className={bookingType === 'myself' ? 'disabled-field' : ''}
                        />
                      </div>

                      <h3>Stay Details</h3>
                      <div className="form-group date-group">
                        <label htmlFor="checkInDate" style={{color: 'black'}}>Check-in Date</label>
                        <input
                          type="date"
                          id="checkInDate"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          min={getCurrentDateTime().date}
                        />
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkInTime" style={{color: 'black'}}>Check-in Time</label>
                        <select
                          id="checkInTime"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        >
                          <option value="">Select time</option>
                          {generateTimeOptions(false, checkInDate).map(time => (
                            <option key={time.value} value={time.value}>{time.display}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkOutDate" style={{color: 'black'}}>Check-out Date</label>
                        <input
                          type="date"
                          id="checkOutDate"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          min={checkInDate || getCurrentDateTime().date}
                        />
                      </div>

                      <div className="form-group date-group">
                        <label htmlFor="checkOutTime" style={{color: 'black'}}>Check-out Time</label>
                        <select
                          id="checkOutTime"
                          value={checkOutTime}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                        >
                          <option value="">Select time</option>
                          {generateTimeOptions(true, checkInDate, checkInTime).map(time => (
                            <option key={time.value} value={time.value}>{time.display}</option>
                          ))}
                        </select>
                      </div>
                      <h3>Number of Guests</h3>
                      <div className="form-group guest-count-group">
                        <label htmlFor="adults" style={{color: 'black'}}>Adults</label>
                        <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                          {[...Array(10).keys()].map(i => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                      </div>
                      <div className="form-group guest-count-group">
                        <label htmlFor="children" style={{color: 'black'}}>Children (0-5 years old)</label>
                        <select id="children" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                          {[...Array(5).keys()].map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>

                      <h3>Special Request</h3>
                      <div className="form-group">
                        <textarea placeholder="Add any special requests"></textarea>
                      </div>

                    
                    </div>

                    <div className="reservation-summary-section">
                      <h3>Reservation Summary</h3>
                      <div className="summary-card">
                        <img src="/images/room1.jpg" alt="room" className="summary-room-image" />
                        <p>Room: {modalRoom?.roomType || modalRoom?.type}</p>
                        <p>Dates: {checkInDate} - {checkOutDate}</p>
                        <p>Guests: {adults} Adults, {children} Children (0-5 years old)</p>
                        <p>Rate: ₱{modalRoom?.price?.toLocaleString()} per hour</p>
                        <p>Taxes and fees: ₱{taxesAndFees.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p>Total: ₱{total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
      <div className="overlay-content">
                          <div className="modal-actions">
                            <button
                              className="book-now-btn"
                              style={{ color: 'black', backgroundColor: '#B8860B' }}
                              onClick={handleProceedToPayment}
                              disabled={modalLoading}
                            >
                              {modalLoading ? 'Booking...' : 'Book Now'}
                            </button>
                            {modalError && (
                              <div className="modal-error">
                                <button
                                  className="modal-error-close"
                                  aria-label="Close error"
                                  onClick={() => setModalError('')}
                                >
                                  ×
                                </button>
                                {modalError}
                              </div>
                            )}
                          </div>
      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Success Popup Modal */}
      {showSuccessPopup && bookingSuccessData && (
        <div className="success-popup-overlay">
          <div className="success-popup-content">
            <div className="success-popup-header">
              <span className="success-icon"></span>
              <h2 style={{ marginTop: "-30px" }}>Booking Successful!</h2>
            </div>
            <div className="success-popup-body">
              <p className="success-message">Your room has been successfully booked!</p>
              <div className="booking-details">
                <div className="detail-item">
                  <strong>Booking Reference:</strong>
                  <span className="booking-ref">{bookingSuccessData.referenceNumber || bookingSuccessData._id}</span>
                </div>
                <div className="detail-item">
                  <strong>Room Number:</strong>
                  <span>{bookingSuccessData.roomNumber}</span>
                </div>
                <div className="detail-item">
                  <strong>Check-in Date:</strong>
                  <span>{new Date(bookingSuccessData.checkIn).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <strong>Check-out Date:</strong>
                  <span>{new Date(bookingSuccessData.checkOut).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <strong>Total Amount:</strong>
                  <span className="amount">{bookingSuccessData.totalAmount ? `₱${bookingSuccessData.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A'}</span>
                </div>
              </div>
              <p className="success-note">You can view all your bookings in the "My Bookings" section.</p>
            </div>
            <div className="success-popup-footer">
              <button 
                className="view-bookings-btn" 
                onClick={() => {
                  setShowSuccessPopup(false);
                  navigate('/my-bookings');
                }}
              >
                View My Bookings
              </button>
              <button 
                className="close-popup-btn" 
                onClick={() => setShowSuccessPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rooms;