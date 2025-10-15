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
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState({ id: null, status: '' });
  const [cancelError, setCancelError] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const predefinedReasons = [
    'Change of plans',
    'Found a different date',
    'Price concerns',
    'Booking mistake',
    'Illness or emergency',

  ];

  const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      // Exclude cancelled bookings from the UI list
      const visibleBookings = (response.data || []).filter(
        (b) => (b.status || b.bookingStatus) !== 'cancelled'
      );
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

  const handleCancel = (bookingId, currentStatus) => {
    if (!token) {
      alert('Please log in to cancel bookings.');
      return;
    }
    const status = currentStatus || '';
    if (!['pending', 'upcoming'].includes(status)) {
      alert('Only pending or upcoming bookings can be canceled.');
      return;
    }
    setCancelTarget({ id: bookingId, status });
    setCancelReason('');
    setCancelError(null);
    setSelectedReasons([]);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelTarget.id) return;
    try {
      setCancelingId(cancelTarget.id);
      setCancelError(null);
      const combinedReason = [...selectedReasons, (cancelReason || '').trim()]
        .filter(Boolean)
        .join(' | ');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/user-cancel/${cancelTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: combinedReason }
      });
      setBookings((prev) => prev.filter((b) => b._id !== cancelTarget.id));
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelingId(null);
    }
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelTarget({ id: null, status: '' });
    setCancelReason('');
    setCancelError(null);
    setSelectedReasons([]);
  };
  
  const handleReasonToggle = (reason, checked) => {
    setSelectedReasons((prev) =>
      checked ? [...prev, reason] : prev.filter((r) => r !== reason)
    );
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
            <p>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</p>
            <p>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</p>
            <p>Total Price: ₱{formatMoney(booking.totalAmount)}</p>

            <p>Booking Status: {booking.status || booking.bookingStatus}</p>
            <div className="booking-actions">
              {['pending', 'upcoming'].includes((booking.status || booking.bookingStatus)) && (
                <button
                  onClick={() => handleCancel(booking._id, booking.status || booking.bookingStatus)}
                  disabled={cancelingId === booking._id}
                >
                  {cancelingId === booking._id ? 'Cancelling...' : 'Cancel booking'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
           
           <button
  style={{
    color: 'white',
    backgroundColor: '#B8860B',
    padding: '5px 10px',
    fontSize: '20px',
    borderRadius: '12px',
  }}
  onClick={closeCancelModal}
>
  Back
</button>

     <h3 style={{ paddingRight: '20%' }}>Cancel Booking</h3>



              <br></br>
              
            </div>
            <div className="modal-body">
              <p>Please provide a reason for cancellation.</p>
              <div className="form-group">
                <label style={{ color: 'black' }}>Select reason(s)</label>
                <div className="reason-checklist">
                  {predefinedReasons.map((r) => (
                    <label key={r} className="reason-option">
                      <input
                        type="checkbox"
                        checked={selectedReasons.includes(r)}
                        onChange={(e) => handleReasonToggle(r, e.target.checked)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
             <label style={{ color: 'black' }}>Elaborate (optional)</label>


                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="tell us more..."
                  rows={3}
                />
              </div>
              {cancelError && <div className="modal-error">{cancelError}</div>}
              <div className="form-actions">
                <button className="confirm-btn" style={{ color: 'black', backgroundColor: '#B8860B' }} onClick={confirmCancel} disabled={cancelingId === cancelTarget.id}>
                  {cancelingId === cancelTarget.id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
               
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
