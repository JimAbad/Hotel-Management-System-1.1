import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from './AuthContext';
import roomDetails from './data/roomDetails';

function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await axios.get(`/rooms/${id}`);
        setRoom(response.data);
      } catch (err) {
        setError('Failed to fetch room details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  const handleBookNow = () => {
    if (user) {
      navigate(`/book/${id}`);
    } else {
      navigate('/login'); // Redirect to login if not authenticated
    }
  };

  if (loading) {
    return <div className="container">Loading room details...</div>;
  }

  if (error) {
    return <div className="container error-message">{error}</div>;
  }

  if (!room) {
    return <div className="container">Room not found.</div>;
  }

  const currentRoomDetails = roomDetails[room.type] || {};

  return (
    <div className="container room-details-container">
      <h2>{room.type}</h2>
      <p>Price: ${room.price}</p>
      <p>Room Size: {currentRoomDetails.roomSize || 'N/A'}</p>
      <p>Bed Type: {currentRoomDetails.bedType || 'N/A'}</p>
      <p>Capacity: {currentRoomDetails.capacity || 'N/A'}</p>
      <p>View: {currentRoomDetails.view || 'N/A'}</p>
      <p>Floor: {currentRoomDetails.floor || 'N/A'}</p>
      <p>Accessibility: {currentRoomDetails.accessibility || 'N/A'}</p>
      <p>Smoking: {currentRoomDetails.smoking || 'N/A'}</p>
      <p>Pets: {currentRoomDetails.pets || 'N/A'}</p>
      <p>Quiet Hours: {currentRoomDetails.quietHours || 'N/A'}</p>
      <p>Availability: {room.isBooked ? 'Booked' : 'Available'}</p>
      {!user && (
        <p className="auth-prompt">
          Please <Link to="/login">log in</Link> or <Link to="/signup">sign up</Link> to book this room.
        </p>
      )}
      <button onClick={handleBookNow} disabled={room.isBooked || !user}>
        {room.isBooked ? 'Booked' : 'Book Now'}
      </button>
    </div>
  );
}

export default RoomDetails;