import React, { useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

function DeleteCancelledBookings() {
  const { token } = useContext(AuthContext);

  const handleDeleteCancelled = async () => {
    if (!token) {
      alert('You must be logged in to perform this action.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete all cancelled bookings? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/cancelled`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert(response.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete cancelled bookings.');
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Delete Cancelled Bookings</h2>
      <button onClick={handleDeleteCancelled} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Delete All Cancelled Bookings
      </button>
    </div>
  );
}

export default DeleteCancelledBookings;