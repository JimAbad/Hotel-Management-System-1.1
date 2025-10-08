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

  const handleCancel = async (bookingId, currentStatus) => {
    try {
      if (!token) {
        alert('Please log in to cancel bookings.');
        return;
      }
      const status = currentStatus || '';
      if (!['pending', 'upcoming'].includes(status)) {
        alert('Only pending or upcoming bookings can be canceled.');
        return;
      }
      const confirmed = window.confirm('Are you sure you want to cancel this booking?');
      if (!confirmed) return;

      setCancelingId(bookingId);
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/user-cancel/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
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
            <p>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</p>
            <p>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</p>
            <p>Total Price: ₱{booking.totalAmount}</p>
          
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
    </div>
  );
}

export default MyBookings;
