import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './MyBookings.css';

function MyBookings() {
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();
  const { user, token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  const [cancellationText, setCancellationText] = useState('');

  // Utility function to format price with commas
  const formatPrice = (amount) => {
    if (!amount) return '0';
    return Number(amount).toLocaleString('en-US');
  };

  const displayPaymentStatus = (status) => {
    if (!status) return '';
    return String(status).toLowerCase() === 'partial' ? 'paid in partial' : status;
  };

  // Utility function to format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const dateOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    const timeOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    };
    
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    
    return `${formattedDate} at ${formattedTime}`;
  };

  // Check if booking is within 48 hours of booking date
  const isWithin48Hours = (booking) => {
    const bookingDate = new Date(booking.createdAt || booking.bookingDate);
    const now = new Date();
    const hoursDifference = (now - bookingDate) / (1000 * 60 * 60);
    return hoursDifference <= 48;
  };

  const fetchMyBookings = async () => {
    if (!user || !token) {
      setLoading(false);
      setError({ message: 'Please log in to view your bookings.' });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/bookings/my-bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Show bookings that have at least been created; optionally filter out cancelled/deleted statuses
      const allBookings = response.data || [];
      // Only show bookings that have been paid (partial or full payment)
      // Hide unpaid/pending bookings until QRPh payment is confirmed
      const visibleBookings = allBookings.filter(b => {
        const status = (b.paymentStatus || '').toLowerCase();
        return ['paid', 'partial'].includes(status);
      });
      setBookings(visibleBookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchMyBookings();
  }, [user]);

  const handleCancelClick = (booking) => {
    if (!token) {
      alert('Please log in to cancel bookings.');
      return;
    }
    const status = booking.status || booking.bookingStatus || '';
    if (!['pending', 'upcoming'].includes(status)) {
      alert('Only pending or upcoming bookings can be canceled.');
      return;
    }
    
    setSelectedBooking(booking);
    
    // Check if booking is past 48 hours
    if (!isWithin48Hours(booking)) {
      setShowWarningModal(true);
    } else {
      setShowCancelModal(true);
      setCancellationReasons([]);
      setCancellationText('');
    }
  };

  const handleWarningProceed = () => {
    setShowWarningModal(false);
    setShowCancelModal(true);
    setCancellationReasons([]);
    setCancellationText('');
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
    setSelectedBooking(null);
  };

  const handleReasonChange = (reason) => {
    setCancellationReasons(prev => {
      if (prev.includes(reason)) {
        return prev.filter(r => r !== reason);
      } else {
        return [...prev, reason];
      }
    });
  };

  const handleCancelConfirm = async () => {
    if (cancellationReasons.length === 0) {
      alert('Please select at least one reason for cancellation.');
      return;
    }

    try {
      setCancelingId(selectedBooking._id);
      
      const cancellationData = {
        cancellationReasons: cancellationReasons,
        cancellationElaboration: cancellationText.trim() || null
      };

      await axios.post(`${API_URL}/api/bookings/user-cancel/${selectedBooking._id}`, 
        cancellationData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Show success modal instead of alert
      setShowCancelModal(false);
      setShowSuccessModal(true);
      setBookings((prev) => prev.map((b) => b._id === selectedBooking._id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelingId(null);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSelectedBooking(null);
  };
  
  

  if (loading) {
    return <div className="my-bookings-container">Loading bookings...</div>;
  }

  if (error) {
    return <div className="my-bookings-container">Error: {error.message}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="no-bookings">
        <p>You don't have any bookings yet.</p>
      </div>
    );
  }
  

  return (
    <div className="my-bookings-container">
      <h1>My Bookings</h1>
      
      {/* Removed the "Delete All Cancelled Bookings" button */}
      
      <div className="bookings-list">
        {bookings.map(booking => {
          const ended = new Date(booking.checkOut) < new Date();
          return (
            <div key={booking._id} className="booking-card">
              {ended && (
                <div className="ended-warning">
                  <div className="warning-triangle"></div>
                  <div className="warning-label">time to checkout!</div>
                </div>
              )}
              <div className="booking-main">
                <h2>Room: {getRoomType(booking)}</h2>
                <p>Check-in: {formatDateTime(booking.checkIn)}</p>
                <p>Check-out: {formatDateTime(booking.checkOut)}</p>
                <p>Total Price: ₱{formatPrice(booking.totalAmount)}</p>
                {booking.paymentStatus && (
                  <p>Payment Status: {displayPaymentStatus(booking.paymentStatus)}</p>
                )}
                <p>Booking Status: {booking.status || booking.bookingStatus}</p>
                <div className="booking-actions">
                  {['pending', 'upcoming'].includes((booking.status || booking.bookingStatus)) && (
                    <button
                      onClick={() => handleCancelClick(booking)}
                      disabled={cancelingId === booking._id}
                    >
                      {cancelingId === booking._id ? 'Cancelling...' : 'Cancel booking'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 48-Hour Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content warning-modal">
            <div className="modal-header">
              <h3>Cancellation Notice</h3>
              <button 
                className="modal-close"
                onClick={handleWarningCancel}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-content">
                <div className="warning-icon">⚠️</div>
                <p className="warning-text">
                  Your booking is past 48hrs of booked date, your reservation fee will not be refunded.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={handleWarningCancel}
              >
                Cancel
              </button>
              <button 
                className="proceed-btn"
                onClick={handleWarningProceed}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header">
              <h3>Booking Cancelled</h3>
            </div>
            <div className="modal-body">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <p className="success-text">
                  Booking cancelled successfully!
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="ok-btn"
                onClick={handleSuccessClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ textAlign: 'center' }}>Cancel Booking</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="booking-info">
                <p><strong>Room:</strong> {selectedBooking?.roomNumber || 'N/A'}</p>
                <p><strong>Check-in:</strong> {selectedBooking && formatDateTime(selectedBooking.checkIn)}</p>
                <p><strong>Check-out:</strong> {selectedBooking && formatDateTime(selectedBooking.checkOut)}</p>
                <p><strong>Total Price:</strong> ₱{selectedBooking && formatPrice(selectedBooking.totalAmount)}</p>
              </div>
              
              <div className="cancellation-reasons">
                <h4>Please select reason(s) for cancellation: <span className="required"></span></h4>
                <div className="reasons-list">
                  {[
                    'Change of travel plans',
                    'Emergency situation',
                    'Found better accommodation',
                    'Financial constraints',
                    'Health issues',
                    'Work/business conflict',
                    'Weather conditions',
                    'Other personal reasons'
                  ].map((reason) => (
                    <label key={reason} className="reason-checkbox">
                      <input
                        type="checkbox"
                        checked={cancellationReasons.includes(reason)}
                        onChange={() => handleReasonChange(reason)}
                      />
                      <span className="checkmark"></span>
                      {reason}
                    </label>
                  ))}
                </div>
              </div>

              <div className="elaboration-section">
                <h4>Additional details (optional):</h4>
                <textarea
                  className="elaboration-textarea"
                  placeholder="Please provide any additional details about your cancellation..."
                  value={cancellationText}
                  onChange={(e) => setCancellationText(e.target.value)}
                  rows="4"
                />
              </div>

              
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Booking
              </button>
              <button 
                className="confirm-cancel-btn"
                onClick={handleCancelConfirm}
                disabled={cancellationReasons.length === 0 || cancelingId === selectedBooking?._id}
              >
                {cancelingId === selectedBooking?._id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
  const getRoomType = (b) => {
    if (!b) return 'N/A';
    const roomObj = b.room;
    if (roomObj && typeof roomObj === 'object' && roomObj.roomType) return roomObj.roomType;
    if (b.roomType) return b.roomType;
    return 'N/A';
  };
