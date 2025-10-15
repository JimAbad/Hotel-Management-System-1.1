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
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginConfirmation, setShowLoginConfirmation] = useState(false); // New state for confirmation dialog
  const [showQrCode, setShowQrCode] = useState(false); // Reset QR code visibility
  const [showPaymentForm, setShowPaymentForm] = useState(false); // Deprecated: payment removed
  // Time inputs for booking
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  // Per-hour base rates by room type
  const HOURLY_RATES = {
    Economy: 100,
    Deluxe: 200,
    Presidential: 400,
    Suite: 450,
  };

  // Helper: get today's local date string (YYYY-MM-DD)
  const getTodayLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper: round current time up to the next 30-minute interval when date is today
  const getMinTimeForDate = (selectedDate) => {
    const today = getTodayLocalDateString();
    if (!selectedDate || selectedDate !== today) return '00:00';
    const now = new Date();
    now.setSeconds(0, 0);
    const remainder = now.getMinutes() % 30;
    if (remainder !== 0) {
      now.setMinutes(now.getMinutes() + (30 - remainder));
    }
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Generate 30-min time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const to12HourLabel = (timeStr) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
  };

  // Utility: add minutes to HH:MM and clamp within same day
  const addMinutesToSlot = (hhmm, minutes) => {
    if (!hhmm) return hhmm;
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + minutes;
    if (total >= 24 * 60) total = 24 * 60 - 1; // 23:59
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    return `${nh}:${nm}`;
  };

  const crossesMidnight = (hhmm, minutes) => {
    if (!hhmm) return false;
    const [h, m] = hhmm.split(':').map(Number);
    return (h * 60 + m + minutes) >= 24 * 60;
  };

  const getNextDateString = (dateStr) => {
    if (!dateStr) return dateStr;
    const d = new Date(`${dateStr}T00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };

  // Disable past 30-min slots for today's check-in
  const isSlotDisabled = (selectedDate, slot) => {
    const today = getTodayLocalDateString();
    const dateToCheck = selectedDate || today; // treat empty date as today
    if (dateToCheck !== today) return false;
    const min = getMinTimeForDate(dateToCheck);
    return slot < min;
  };

  // Disable past 30-min slots for today's check-out
  const isCheckOutSlotDisabled = (selectedDate, slot) => {
    const today = getTodayLocalDateString();
    const dateToCheck = selectedDate || today; // treat empty date as today
    // If same-day checkout as check-in, enforce a minimum of 3 hours
    if (checkInDate && dateToCheck === checkInDate) {
      if (crossesMidnight(checkInTime, 180)) {
        // No same-day checkout available if +3h crosses midnight
        return true;
      }
      const earliest = addMinutesToSlot(checkInTime, 180);
      return slot < earliest;
    }
    // Otherwise, for today, still prevent selecting past times
    if (dateToCheck === today) {
      const min = getMinTimeForDate(dateToCheck);
      return slot < min;
    }
    return false;
  };

  const getCheckInOptions = (selectedDate) => {
    const min = getMinTimeForDate(selectedDate);
    return generateTimeSlots().filter((t) => selectedDate === getTodayLocalDateString() ? t >= min : true);
  };

  // Default time selection when date changes (or initially)
  useEffect(() => {
    const slots = generateTimeSlots();
    const firstAvailable = slots.find((t) => !isSlotDisabled(checkInDate, t));
    if (firstAvailable && checkInTime !== firstAvailable) {
      setCheckInTime(firstAvailable);
    }
  }, [checkInDate]);

  useEffect(() => {
    const slots = generateTimeSlots();
    const firstAvailable = slots.find((t) => !isCheckOutSlotDisabled(checkOutDate, t));
    if (firstAvailable && checkOutTime !== firstAvailable) {
      setCheckOutTime(firstAvailable);
    }
  }, [checkOutDate]);
  const [modalPurpose, setModalPurpose] = useState('info'); // 'info' or 'book'
  const [numberOfNights, setNumberOfNights] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [taxesAndFees, setTaxesAndFees] = useState(0);
  const [total, setTotal] = useState(0);
  const [displayRate, setDisplayRate] = useState(0);

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

  useEffect(() => {
    if (checkInDate && checkOutDate && modalRoom) {
      // Compute per-hour pricing using selected times when available
      const start = checkInTime ? new Date(`${checkInDate}T${checkInTime}`) : new Date(checkInDate);
      const end = checkOutTime ? new Date(`${checkOutDate}T${checkOutTime}`) : new Date(checkOutDate);
      const diffMs = Math.max(0, end - start);
      const hoursRaw = diffMs / (1000 * 60 * 60);
      const hours = Math.ceil(hoursRaw);
      setNumberOfNights(hours); // repurpose for hours

      const hourlyRates = {
        Economy: 100,
        Deluxe: 200,
        Presidential: 400,
        Suite: 450,
      };
      const roomType = modalRoom?.roomType || modalRoom?.type;
      const baseRate = hourlyRates[roomType] ?? (modalRoom.price || 0);
      const taxRate = 0.12;
      const rateWithTax = baseRate * (1 + taxRate);
      setDisplayRate(rateWithTax);
      const calculatedSubtotal = hours * rateWithTax;
      setSubtotal(calculatedSubtotal);

      // Taxes are included in the hourly price
      setTaxesAndFees(0);

      setTotal(Math.round(calculatedSubtotal));
    }
  }, [checkInDate, checkOutDate, checkInTime, checkOutTime, modalRoom]);

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
        alert(`${type} is fully booked.`);
        return;
      }
      const bookingData = {
        roomNumber: room.roomNumber,
        customerName: user.name,
        customerEmail: user.email,
        checkIn: new Date().toISOString().split('T')[0] + 'T12:00',
        checkOut: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + 'T12:00',
        type
      };
      const bookingResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSuccessPopup(true);
      setBookingSuccessData(bookingResponse.data);
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Failed to create booking');
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
        setModalRoom(combinedRoomDetails);
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
        setShowModal(true);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to load room details.');
    } finally {
      setModalLoading(false);
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
    try {
      // Build full DateTime strings using selected date and time
      const checkInDateTime = checkInDate && checkInTime ? `${checkInDate}T${checkInTime}` : `${checkInDate}T00:00`;
      const checkOutDateTime = checkOutDate && checkOutTime ? `${checkOutDate}T${checkOutTime}` : `${checkOutDate}T23:59`;
      if (!checkInDate || !checkOutDate || !checkInTime || !checkOutTime) {
        alert('Please select both date and time for check-in and check-out.');
        return;
      }
      if (new Date(checkOutDateTime) <= new Date(checkInDateTime)) {
        alert('Check-out must be after check-in.');
        return;
      }
      // Enforce minimum of 3 hours between check-in and check-out
      if (new Date(checkOutDateTime) - new Date(checkInDateTime) < 3 * 60 * 60 * 1000) {
        alert('Minimum booking duration is 3 hours.');
        return;
      }
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
      setShowModal(false);
      setBookingSuccessData(bookingResponse.data);
      setShowSuccessPopup(true);
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Failed to create booking');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // setSelectedRoomType(null); // This state variable is not defined, so I'm commenting it out.
    setShowPaymentModal(false); // Close payment modal as well
    setShowQrCode(false); // Reset QR code visibility
    setModalPurpose('info'); // Reset modal purpose
  };

  const handleProceedToPayment = async () => {
    console.log('handleProceedToPayment (booking only) called.');
    try {
      setModalLoading(true);
      setModalError('');

      // Validate required fields
      if (!guestName || !contactNumber || !email || !checkInDate || !checkOutDate) {
        setModalError('Please fill in all required fields.');
        setModalLoading(false);
        return;
      }

      // Build full DateTime values for accurate validation
      const checkInDateTime = checkInDate && checkInTime ? `${checkInDate}T${checkInTime}` : `${checkInDate}T00:00`;
      const checkOutDateTime = checkOutDate && checkOutTime ? `${checkOutDate}T${checkOutTime}` : `${checkOutDate}T23:59`;

      // Validate chronological order (allows same-day if time is later)
      if (new Date(checkOutDateTime) <= new Date(checkInDateTime)) {
        setModalError('Check-out must be after check-in.');
        setModalLoading(false);
        return;
      }

      // Enforce minimum 3 hours duration
      if (new Date(checkOutDateTime) - new Date(checkInDateTime) < 3 * 60 * 60 * 1000) {
        setModalError('Minimum booking duration is 3 hours.');
        setModalLoading(false);
        return;
      }

      // Create booking (no payment)
      console.log('Creating booking...');
      console.log('Current user:', user);
      console.log('Modal room data:', modalRoom);
      
      // Use computed DateTime values above
      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: guestName,
        customerEmail: email,
        contactNumber: contactNumber,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        adults: adults,
        children: children,
        guestName: guestName,
        specialRequests: ''
      };

      console.log('Booking data to send:', bookingData);

      const token = localStorage.getItem('token');
      console.log('Token being used:', token);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('Attempting to create booking...');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/bookings`,
        bookingData,
        config
      );

      console.log('Booking created:', response.data);
      console.log('Response data from booking creation:', JSON.stringify(response.data));
      const booking = response.data;
      setShowModal(false);
      setBookingSuccessData(booking);
      setShowSuccessPopup(true);

    } catch (err) {
      console.error('Booking error:', err);
      let errorMessage = err.response?.data?.message || err.message || 'An error occurred while creating your booking.';
      setModalError(errorMessage);
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
      <div className="room-list">
        {summary.map(({ type, total, available }) => (
          <div key={type} className="room-card">
            <div className="room-card-header">
              <img src="/src/img/room1.jpg" alt={type} className="room-image" />
              <div>
                <button className="more-info-btn" onClick={() => handleMoreInfo(type)}>
                  More info
                </button>
                <span className="room-price">
                  <span>
                    {HOURLY_RATES[normalizeRoomType(type)]
                      ? `₱${Number(HOURLY_RATES[normalizeRoomType(type)]).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} per hour`
                      : 'per hour varies'}
                  </span>
                </span>
                {available === 0 && (
                  <span className="fully-booked-badge" title="This room type is fully booked">Fully booked</span>
                )}
              </div>
            </div>
            <div className="room-card-body">
              
              <p>Room Type: {type}</p>  
              <p>Floor: {summary.find(item => item.type === type)?.floor || 'N/A'}</p>
              <p>Total Rooms: {total}</p>
              <p>Available: {available}</p>
              {HOURLY_RATES[normalizeRoomType(type)] && (
                <p>Rate: ₱{Number(HOURLY_RATES[normalizeRoomType(type)]).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} per hour</p>
              )}
            </div>
            <div className="room-card-footer">
              <button className="book-room-btn" disabled={available === 0} onClick={() => handleBookRoom(type)}>
                {available === 0 ? 'Fully booked' : 'Book this room'}
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
              <div className="modal-error">{modalError}</div>
            ) : (
              <>
                <div className="modal-header">
                  <button className="modal-back" style={{ color: 'white', background: '#B8860B', }} onClick={() => handleCloseModal()}>Back</button>
                  <h2 className="modal-title">{modalRoom?.roomType || modalRoom?.type}</h2>
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
                  <h3>Room Details</h3>
                  <div className="room-details-grid">
                    <div className="room-detail-item">
                      <p><strong>Room size:</strong> {modalRoom?.roomSize || 'N/A'}</p>
                      <p><strong>Bed type:</strong> {modalRoom?.bedType || 'N/A'}</p>
                      <p><strong>Capacity:</strong> {modalRoom?.capacity || 'N/A'}</p>
                      <p><strong>View:</strong> {modalRoom?.view || 'N/A'}</p>
                      
                      <p><strong>Accessibility:</strong> {modalRoom?.accessibility || 'N/A'}</p>
                    </div>
                    <div className="room-detail-item">
                      <p><strong>Smoking:</strong> {modalRoom?.smoking || 'N/A'}</p>
                      <p><strong>Pets:</strong> {modalRoom?.pets || 'N/A'}</p>
                    </div>
                  </div>
                  {modalPurpose === 'info' && (
                    <div className="modal-actions">
                      <button className="book-room-btn" onClick={() => handleBookRoom(modalRoom.roomType || modalRoom.type)}>
                        Book this room
                      </button>
                    </div>
                  )}
                </div>
                {modalPurpose === 'book' && (
                  <div className="modal-body-content">
                    <div className="guest-info-section">
                      <h3>Guest Information</h3>
                      <div className="guest-info-group">
                       
                        <input
                          type="text"
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Guest Name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="contactNumber"> </label>
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
                        <label htmlFor="email"></label>
                        <br></br>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </div>

                      <h3>Stay Details</h3>
                      <div className="form-group date-group">
                        <label htmlFor="checkInDate">Check-in Date</label>
                      <input
                        type="date"
                        id="checkInDate"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        min={getTodayLocalDateString()}
                      />
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkInTime">Check-in Time</label>
                        <select
                          id="checkInTime"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        >
                          {generateTimeSlots().map((t) => (
                            <option key={`cin-${t}`} value={t} disabled={isSlotDisabled(checkInDate, t)}>
                              {to12HourLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkOutDate">Check-out Date</label>
                      <input
                        type="date"
                        id="checkOutDate"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        min={
                          checkInDate
                            ? (crossesMidnight(checkInTime, 180)
                              ? getNextDateString(checkInDate)
                              : checkInDate)
                            : getTodayLocalDateString()
                        }
                      />
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkOutTime">Check-out Time</label>
                        <select
                          id="checkOutTime"
                          value={checkOutTime}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                        >
                          {generateTimeSlots().map((t) => (
                            <option key={`cout-${t}`} value={t} disabled={isCheckOutSlotDisabled(checkOutDate, t)}>
                              {to12HourLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <h3>Number of Guests</h3>
                      <div className="form-group guest-count-group">
                        <label htmlFor="adults">Adults</label>
                        <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                          {[...Array(10).keys()].map(i => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                      </div>
                      <div className="form-group guest-count-group">
                        <label htmlFor="children">Children (0-5 years old)</label>
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
                        <img src="/src/img/room1.jpg" alt="room" className="summary-room-image" />
                        <p>Room: {modalRoom?.roomType || modalRoom?.type}</p>
                        <p>Dates: {checkInDate} - {checkOutDate}</p>
                        <p>Guests: {adults} Adults, {children} Children (0-5 years old)</p>
                        <p>Rate: ₱{Number(displayRate).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} per hour (tax included)</p>
                        
                        <p>Total: ₱{Number(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className={`overlay-content ${showQrCode ? 'show-qr' : ''}`}>
                        <p className="cancellation-note" style={{ fontSize: '15px', color: 'black', marginTop: '10px' }}>
                          Note: 
                          The cancellation fee is ₱{ (total * 0.1).toFixed(2) }. You’ll be charged ₱{ (total * 0.1).toFixed(2) } today; any remaining balance (payable at the hotel front desk) will be settled at check-in.
                        </p>
                        <div className="modal-actions">
                          <button
                            className="proceed-payment-btn" style={{ color: 'black', backgroundColor: '#B8860B' }}
                            onClick={handleProceedToPayment}
                          >
                            Book Now
                          </button>
                          {modalError && <div className="modal-error">{modalError}</div>}
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
              <span className="success-icon">🎉</span>
              <h2>Booking Successful!</h2>
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
                  <strong>Check-in:</strong>
                  <span>{new Date(bookingSuccessData.checkIn).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <strong>Check-out:</strong>
                  <span>{new Date(bookingSuccessData.checkOut).toLocaleString()}</span>
                </div>
                {/* Payment-related details removed */}
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