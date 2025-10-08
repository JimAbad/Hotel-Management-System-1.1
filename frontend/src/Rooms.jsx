import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import './Rooms.css';

function Rooms() {
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
  const [modalPurpose, setModalPurpose] = useState('info'); // 'info' or 'book'
  const [numberOfNights, setNumberOfNights] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [taxesAndFees, setTaxesAndFees] = useState(0);
  const [total, setTotal] = useState(0);

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
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const diffTime = Math.abs(checkOut - checkIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNumberOfNights(diffDays);

      const roomPrice = modalRoom.price || 0;
      const calculatedSubtotal = diffDays * roomPrice;
      setSubtotal(calculatedSubtotal);

      const calculatedTaxesAndFees = calculatedSubtotal * 0.12; // Assuming 12% tax
      setTaxesAndFees(calculatedTaxesAndFees);

      setTotal(calculatedSubtotal + calculatedTaxesAndFees);
    }
  }, [checkInDate, checkOutDate, modalRoom]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(<span key={i} className={i < rating ? 'star filled' : 'star'}>{i < rating ? '★' : '☆'}</span>);
    }
    return <div className="star-rating">{stars}</div>;
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
        checkInDate: '2025-09-17',
        checkOutDate: '2025-09-20',
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
      navigate('/payment-status', { state: { success: false, error: err.message } });
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
        setModalRoom(room);
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
        setModalRoom(room);
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
      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: user.name,
        customerEmail: user.email,
        checkIn: checkInDate,
        checkOut: checkOutDate,
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
        paymentDetails: { amount: 500 }
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
    setShowQrCode(false); // Reset QR code visibility
    setModalPurpose('info'); // Reset modal purpose
  };

  const handleConfirmPayment = async () => {
    if (!modalRoom) return;
    if (!user || !user.name) {
      alert('Please log in to book.');
      navigate('/login');
      return;
    }
    try {
      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: user.name,
        customerEmail: user.email,
        checkIn: checkInDate,
        checkOut: checkOutDate,
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
        bookingId: bookingResponse.data._id,
        paymentDetails: { amount: (total * 0.1).toFixed(2) } // Sending 10% of total as down payment
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
              {available > 0 ? (
                <div>
                  <button className="more-info-btn" onClick={() => handleMoreInfo(type)}>
                    More info
                  </button>
                  <span className="room-price"><span> per night varies</span></span>
                </div>
              ) : null}
            </div>
            <div className="room-card-body">
              {renderStars(4)}
              <p>Room Type: {type}</p>
              <p>Floor: {summary.find(item => item.type === type)?.floor || 'N/A'}</p>
              <p>Total Rooms: {total}</p>
              <p>Available: {available}</p>
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
                  <button className="modal-back" onClick={() => handleCloseModal()}>Back</button>
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
                      <p><strong>Floor:</strong> {modalRoom?.floor || 'N/A'}</p>
                      <p><strong>Accessibility:</strong> {modalRoom?.accessibility || 'N/A'}</p>
                    </div>
                    <div className="room-detail-item">
                      <p><strong>Smoking:</strong> {modalRoom?.smoking || 'N/A'}</p>
                      <p><strong>Pets:</strong> {modalRoom?.pets || 'N/A'}</p>
                      <p><strong>Quiet hours:</strong> {modalRoom?.quietHours || 'N/A'}</p>
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
                        <label htmlFor="guestName">Guest Name</label>
                        <input
                          type="text"
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Guest Name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="contactNumber">Contact Number</label>
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
                        />
                      </div>
                      <div className="form-group date-group">
                        <label htmlFor="checkOutDate">Check-out Date</label>
                        <input
                          type="date"
                          id="checkOutDate"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                        />
                      </div>

                      <h3>Number of Guests</h3>
                      <div className="form-group guest-count-group">
                        <label htmlFor="adults">Adults</label>
                        <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                          {[...Array(10).keys()].map(i => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                      </div>
                      <div className="form-group guest-count-group">
                        <label htmlFor="children">Children</label>
                        <select id="children" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                          {[...Array(5).keys()].map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>

                      <h3>Special Request</h3>
                      <div className="form-group">
                        <textarea placeholder="Add any special requests"></textarea>
                      </div>

                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="agreeTerms" />
                        <label htmlFor="agreeTerms">I agree to the booking terms</label>
                      </div>
                    </div>

                    <div className="reservation-summary-section">
                      <h3>Reservation Summary</h3>
                      <div className="summary-card">
                        <img src="/src/img/room1.jpg" alt="room" className="summary-room-image" />
                        <p>Room: {modalRoom?.roomType || modalRoom?.type}</p>
                        <p>Dates: {checkInDate} - {checkOutDate}</p>
                        <p>Guests: {adults} Adults, {children} Children</p>
                        <p>Rate: ${modalRoom?.price} per night</p>
                        <p>Taxes and fees: ${taxesAndFees.toFixed(2)}</p>
                        <p>Total: ${total.toFixed(2)}</p>
                      </div>
                      <div className={`overlay-content ${showQrCode ? 'show-qr' : ''}`}>
                        <p className="cancellation-note" style={{ fontSize: '15px', color: 'black', marginTop: '10px' }}>
                          Note: 
                          The cancellation fee is ${ (total * 0.1).toFixed(2) }. You’ll be charged ${ (total * 0.1).toFixed(2) } today; any remaining balance (payable at the hotel front desk) will be settled at check-in.
                        </p>
                        <div className="modal-actions">
                          <button
                            className="proceed-payment-btn"
                            onClick={() => {
                              setShowQrCode(true); // Show QR code instead of opening a new modal
                            }}
                          >
                            Proceed to Down Payment
                          </button>
                        </div>
                        <div className="qr-code-section">
                          <p>Scan to Pay {(total * 0.1).toFixed(2)} Down Payment</p>
                          {/* Placeholder for QR Code Image */}
                          <img src="/src/img/qr-code.png" alt="QR Code" className="qr-code-image" />
                          <button className="confirm-payment-btn" onClick={handleConfirmPayment}>
                            Confirm Payment
                          </button>
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
    </div>
  );
}

export default Rooms;