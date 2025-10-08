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
  const [showPaymentForm, setShowPaymentForm] = useState(false); // New state for showing payment form
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); // 'gcash' or 'paymaya'
  const [modalPurpose, setModalPurpose] = useState('info'); // 'info' or 'book'
  const [numberOfNights, setNumberOfNights] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
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
    setShowQrCode(false); // Reset QR code visibility
    setModalPurpose('info'); // Reset modal purpose
  };

  const handleProceedToPayment = async () => {
    console.log('handleProceedToPayment function called.');
    try {
      setModalLoading(true);
      setModalError('');

      // Validate required fields
      if (!guestName || !contactNumber || !email || !checkInDate || !checkOutDate) {
        setModalError('Please fill in all required fields.');
        setModalLoading(false);
        return;
      }

      // Validate dates
      if (new Date(checkOutDate) <= new Date(checkInDate)) {
        setModalError('Check-out date must be after check-in date.');
        setModalLoading(false);
        return;
      }

      // Create booking first
      console.log('Creating booking...');
      console.log('Current user:', user);
      console.log('Modal room data:', modalRoom);
      
      const bookingData = {
        roomNumber: modalRoom.roomNumber,
        customerName: guestName,
        customerEmail: email,
        contactNumber: contactNumber,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: adults,
        children: children,
        guestName: guestName,
        specialRequests: '',
        totalAmount: modalRoom.price,
        downPayment: modalRoom.price * 0.1, // 10% down payment
        paymentMethod: selectedPaymentMethod, // Store selected payment method
        paymentType: 'ewallet' // Specify this is an e-wallet payment
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

      // Create e-wallet payment source
      console.log(`Creating ${selectedPaymentMethod} payment source...`);
      console.log('Selected payment method before switch:', selectedPaymentMethod);
      let formattedChannelCode = `PH_${selectedPaymentMethod.toUpperCase()}`;

      let channelCode;
      switch (formattedChannelCode) {
        case 'PH_GCASH':
          channelCode = 'PH_GCASH';
          break;
        case 'PH_PAYMAYA':
          channelCode = 'PH_PAYMAYA';
          break;
        case 'PH_GRABPAY':
          channelCode = 'PH_GRABPAY';
          break;
        default:
          console.error('Invalid e-wallet type. Supported: PH_GCASH, PH_PAYMAYA, PH_GRABPAY');
          return;
      }

      // Calculate 10% down payment amount
      const downPaymentAmount = parseFloat(booking.totalAmount) * 0.1;
      
      const ewalletData = {
        channelCode,
        amount: downPaymentAmount.toFixed(2),
        currency: 'PHP',
        bookingId: booking._id,
        successReturnUrl: `${window.location.origin}/payment-success?bookingId=${booking._id}`,
        failureReturnUrl: `${window.location.origin}/payment-failed?bookingId=${booking._id}`,
      };

      const ewalletResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/payment/create-ewallet-payment-source`,
        ewalletData,
        config
      );

      console.log('E-wallet source created:', ewalletResponse.data);

      // Redirect to e-wallet payment page
      if (ewalletResponse.data.redirectUrl) {
        console.log('Redirecting to:', ewalletResponse.data.redirectUrl);
        window.location.href = ewalletResponse.data.redirectUrl;
      } else {
        throw new Error('No redirect URL received from payment provider');
      }

    } catch (err) {
      console.error('Payment error:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'An error occurred while processing your payment.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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
                  <button className="modal-back" style={{ color: 'white', background: '#333', }} onClick={() => handleCloseModal()}>Back</button>
                  <h2 className="modal-title">{modalRoom?.roomType || modalRoom?.type}</h2>
                </div>
                <div className="modal-amenities">
                  <h3>Amenities</h3>
                  <div className="amenities-list">
                    {modalRoom?.amenities?.map((amenity, index) => (
                      <span key={index} className="amenity-item">{amenity}</span>
                    ))}
                  </div>
                  <p>Cancellation Policy: Free cancellation before 24 hours of check-in. After that, {modalRoom?.price} will be charged.</p>
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
                        <p>Rate: ₱{modalRoom?.price} per night</p>
                        <p>Taxes and fees: ₱{taxesAndFees.toFixed(2)}</p>
                        <p>Total: ₱{total.toFixed(2)}</p>
                      </div>
                      <div className={`overlay-content ${showQrCode ? 'show-qr' : ''}`}>
                        <p className="cancellation-note" style={{ fontSize: '15px', color: 'black', marginTop: '10px' }}>
                          Note: 
                          The cancellation fee is ₱{ (total * 0.1).toFixed(2) }. You’ll be charged ₱{ (total * 0.1).toFixed(2) } today; any remaining balance (payable at the hotel front desk) will be settled at check-in.
                        </p>
                        <div className="modal-actions">
                          {!showPaymentForm && (
                            <button
                              className="proceed-payment-btn" style={{ color: 'black', backgroundColor: '#B8860B' }}
                              onClick={() => {
                                console.log('Proceed to Down Payment button clicked.');
                                setShowQrCode(false); // Remove QR code step
                                setShowPaymentForm(true); // Show payment form
                                console.log('showPaymentForm set to true.');
                              }}
                            >
                              Proceed to Down Payment
                            </button>
                          )}
                        </div>
                        {showPaymentForm && (
                          <div className="payment-details" style={{ color: 'black' }}>
                            <h3>Choose Payment Method</h3>
                            <div className="payment-methods" style={{ marginBottom: '20px' }}>
                              <div className="payment-method-option" style={{ 
                                border: '2px solid #ddd', 
                                borderRadius: '8px', 
                                padding: '15px', 
                                marginBottom: '10px',
                                cursor: 'pointer',
                                backgroundColor: selectedPaymentMethod === 'gcash' ? '#e8f5e8' : 'white'
                              }} onClick={() => setSelectedPaymentMethod('gcash')}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="gcash" 
                                    checked={selectedPaymentMethod === 'gcash'}
                                    onChange={() => setSelectedPaymentMethod('gcash')}
                                    style={{ marginRight: '10px' }}
                                  />
                                  <div>
                                    <strong>GCash</strong>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                      Pay using your GCash e-wallet
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="payment-method-option" style={{ 
                                border: '2px solid #ddd', 
                                borderRadius: '8px', 
                                padding: '15px', 
                                marginBottom: '10px',
                                cursor: 'pointer',
                                backgroundColor: selectedPaymentMethod === 'paymaya' ? '#e8f5e8' : 'white'
                              }} onClick={() => setSelectedPaymentMethod('paymaya')}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="paymaya" 
                                    checked={selectedPaymentMethod === 'paymaya'}
                                    onChange={() => setSelectedPaymentMethod('paymaya')}
                                    style={{ marginRight: '10px' }}
                                  />
                                  <div>
                                    <strong>PayMaya</strong>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                      Pay using your PayMaya e-wallet
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                           
                            
                            <button
                              className="confirm-payment-btn"
                              onClick={handleProceedToPayment}
                              disabled={modalLoading || !selectedPaymentMethod}
                              style={{ 
                                backgroundColor: selectedPaymentMethod ? '#B8860B' : '#ccc',
                                cursor: selectedPaymentMethod ? 'pointer' : 'not-allowed'
                              }}
                            >
                              {modalLoading ? 'Processing...' : `Pay with ${selectedPaymentMethod.toUpperCase()}`}
                            </button>
                            {modalError && <div className="modal-error">{modalError}</div>}
                          </div>
                        )}
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
                  <strong>Check-in Date:</strong>
                  <span>{new Date(bookingSuccessData.checkIn).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <strong>Check-out Date:</strong>
                  <span>{new Date(bookingSuccessData.checkOut).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <strong>Down Payment (10%):</strong>
                  <span className="amount">₱{(bookingSuccessData.totalAmount * 0.1)?.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <strong>Remaining Balance:</strong>
                  <span className="amount">₱{(bookingSuccessData.totalAmount * 0.9)?.toFixed(2)}</span>
                </div>
                {bookingSuccessData.paymentStatus && (
                  <div className="detail-item">
                    <strong>Payment Status:</strong>
                    <span className={`payment-status ${bookingSuccessData.paymentStatus}`}>
                      {bookingSuccessData.paymentStatus === 'paid' ? '✅ Paid' : 
                       bookingSuccessData.paymentStatus === 'pending' ? '⏳ Pending' : 
                       bookingSuccessData.paymentStatus}
                    </span>
                  </div>
                )}
                {bookingSuccessData.paymentIntentId && (
                  <div className="detail-item">
                    <strong>Payment ID:</strong>
                    <span className="payment-id">{bookingSuccessData.paymentIntentId}</span>
                  </div>
                )}
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