import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './MyBookings.css';

function MyBookings() {
  const { user, token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [deletingCancelled, setDeletingCancelled] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  const [cancellationText, setCancellationText] = useState('');

  // Utility function to format price with commas
  const formatPrice = (amount) => {
    if (!amount) return '0';
    return Number(amount).toLocaleString('en-US');
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

  const fetchMyBookings = async () => {
    if (!user || !token) {
      setLoading(false);
      setError({ message: 'Please log in to view your bookings.' });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/my-bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBookings(response.data);
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
    setShowCancelModal(true);
    setCancellationReasons([]);
    setCancellationText('');
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

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings/user-cancel/${selectedBooking._id}`, 
        cancellationData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Show cancellation details to user
      const { cancellationFee, refundAmount } = response.data;
      alert(`Booking cancelled successfully!\nCancellation Fee: ₱${cancellationFee.toFixed(2)}\nRefund Amount: ₱${refundAmount.toFixed(2)}`);

      setBookings((prev) => prev.filter((b) => b._id !== selectedBooking._id));
      setShowCancelModal(false);
      setSelectedBooking(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelingId(null);
    }
  };
  
  const deleteAllCancelledBookings = async () => {
    if (window.confirm("Are you sure you want to delete all cancelled bookings?")) {
      try {
        setDeletingCancelled(true);
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/user-cancelled`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
    
        // Refresh bookings after successful deletion
        await fetchMyBookings();
    
        alert("All cancelled bookings have been deleted.");
      } catch (error) {
        console.error("Error deleting cancelled bookings:", error);
        if (error.response?.status === 404) {
          alert(error.response.data.message || "No cancelled bookings found.");
        } else {
          alert("Failed to delete cancelled bookings. Please try again.");
        }
      } finally {
        setDeletingCancelled(false);
      }
    }
  };

  if (loading) {
    return <div className="my-bookings-container">Loading bookings...</div>;
  }

  if (error) {
    return <div className="my-bookings-container">Error: {error.message}</div>;
  }

if (bookings.length === 0) {
    return <div className="no-bookings">
          <p>You don't have any bookings yet.</p>
        </div>
  }
  // Check if there are any cancelled bookings
  const hasCancelledBookings = bookings.some(booking => 
    booking.status === 'cancelled' || booking.bookingStatus === 'cancelled'
  );

  return (
    <div className="my-bookings-container">
      <h1>My Bookings</h1>
      
      {/* Removed the "Delete All Cancelled Bookings" button */}
      
      <div className="bookings-list">
        {bookings.map(booking => (
          <div key={booking._id} className="booking-card">
            <h2>Room: {booking.roomNumber || 'N/A'}</h2>
            <p>Check-in: {formatDateTime(booking.checkIn)}</p>
            <p>Check-out: {formatDateTime(booking.checkOut)}</p>
            <p>Total Price: ₱{formatPrice(booking.totalAmount)}</p>
          
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
        ))}
      </div>

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
