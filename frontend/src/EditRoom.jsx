import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContextAdmin from './AuthContextAdmin';
import roomDetails from './data/roomDetails';

const EditRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminToken } = useContext(AuthContextAdmin);
  const [room, setRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: '',
    price: '',
    isBooked: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        };
        const response = await axios.get(`/api/rooms/${id}`, config);
        setRoom(response.data);
        setFormData({
          roomNumber: response.data.roomNumber,
          roomType: response.data.roomType,
          price: response.data.price,
          isBooked: response.data.isBooked,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (adminToken) {
      fetchRoom();
    }
  }, [id, adminToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      };
      await axios.put(`/api/rooms/${id}`, formData, config);
      navigate('/admin/manage-rooms');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="container">Loading room details...</div>;
  }

  if (error) {
    return <div className="container error-message">Error: {error}</div>;
  }

  if (!room) {
    return <div className="container">Room not found.</div>;
  }

  return (
    <div className="container">
      <h1>Edit Room</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="roomNumber">Room Number</label>
          <input
            type="text"
            id="roomNumber"
            name="roomNumber"
            value={formData.roomNumber}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="roomType">Room Type</label>
          <select
            id="roomType"
            name="roomType"
            value={formData.roomType}
            onChange={handleChange}
            required
          >
            <option value="">Select Room Type</option>
            {Object.keys(roomDetails).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="price">Price</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="isBooked">Is Booked</label>
          <input
            type="checkbox"
            id="isBooked"
            name="isBooked"
            checked={formData.isBooked}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Update Room</button>
      </form>
    </div>
  );
};

export default EditRoom;