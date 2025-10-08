import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContextAdmin from './AuthContextAdmin';
import roomDetails from './data/roomDetails';

const AddRoom = () => {
  const navigate = useNavigate();
  const { adminToken } = useContext(AuthContextAdmin);
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomType: '',
    price: '',
    floor: '', // Add floor to the state
    isBooked: false,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
      await axios.post('/api/rooms', formData, config);
      setSuccess(true);
      setError(null);
      setFormData({
        roomNumber: '',
        roomType: '',
        price: '',
        isBooked: false,
      });
      navigate('/admin/manage-rooms');
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    }
  };

  return (
    <div className="container">
      <h1>Add New Room</h1>
      {success && <div className="success-message">Room added successfully!</div>}
      {error && <div className="error-message">Error: {error}</div>}
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
          <label htmlFor="floor">Floor</label>
          <input
            type="number"
            id="floor"
            name="floor"
            value={formData.floor}
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
        <button type="submit">Add Room</button>
      </form>
    </div>
  );
};

export default AddRoom;