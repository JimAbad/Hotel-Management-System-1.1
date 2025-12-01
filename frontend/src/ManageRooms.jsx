import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthAdmin } from './AuthContextAdmin';
import roomDetails from './data/roomDetails';
import './ManageRooms.css';

const ManageRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuthAdmin();
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        await axios.delete(`${API_URL}/api/rooms/${id}`, config);
        setRooms(rooms.filter((room) => room._id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await axios.get(`${API_URL}/api/rooms`, config);
        setRooms(response.data.rooms);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchRooms();
    }
  }, [token]);

  if (loading) {
    return <div className="container">Loading rooms...</div>;
  }

  if (error) {
    return <div className="container error-message">Error: {error}</div>;
  }

  const deriveFloorFromRoomNumber = (rn) => {
    if (!rn) return null;
    const num = parseInt(String(rn), 10);
    if (isNaN(num)) return null;
    const floor = Math.floor(num / 100);
    return floor > 0 ? floor : null;
  };

  return (
    <div className="container">
      <h1>Manage Rooms</h1>
      <button onClick={() => navigate('/admin/manage-rooms/add')}>Add New Room</button>
      <div className="room-list">
        {rooms.length > 0 ? (
          rooms.map((room) => {
            const details = roomDetails[room.roomType] || {};
            return (
              <div key={room._id} className="room-card">
                <h3>{room.roomType} - {room.roomNumber}</h3>
                <p>Price: ${room.price}</p>
                <p>Status: {room.isBooked ? 'Booked' : 'Available'}</p>
                <p>Room Size: {details.roomSize || 'N/A'}</p>
                <p>Bed Type: {details.bedType || 'N/A'}</p>
                <p>Capacity: {details.capacity || 'N/A'}</p>
                <p>View: {details.view || 'N/A'}</p>
                <p>Floor: {deriveFloorFromRoomNumber(room.roomNumber) || room.floor || details.floor || 'N/A'}</p>
                <p>Smoking: {details.smoking ? 'Yes' : 'No'}</p>
                <p>Pets: {details.pets ? 'Yes' : 'No'}</p>
                <p>Quiet Hours: {details.quietHours || 'N/A'}</p>
                <p>Accessibility: {details.accessibility ? 'Yes' : 'No'}</p>
                <button onClick={() => navigate(`/admin/manage-rooms/edit/${room._id}`)}>Edit</button>
                <button onClick={() => handleDelete(room._id)}>Delete</button>
              </div>
            );
          })
        ) : (
          <p>No rooms found.</p>
        )}
      </div>
    </div>
  );
};

export default ManageRooms;
