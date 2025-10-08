import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthAdmin } from '../context/AuthContextAdmin';
import './ManageBookingAdmin.css';

const ManageBookingAdmin = () => {
  const { token } = useAuthAdmin();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activities, setActivities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    specialRequests: '',
    status: 'pending'
  });
  const [newBookingData, setNewBookingData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    specialRequests: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchRooms();
    }
  }, [token, statusFilter, searchTerm]);

  const fetchBookings = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined
        }
      };
      const response = await axios.get('/api/bookings', config);
      console.log('Fetched bookings:', response.data);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/api/rooms', config);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchBookingActivities = async (bookingId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`/api/booking-activities/${bookingId}`, config);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching booking activities:', error);
    }
  };

  const handleViewActivity = async (booking) => {
    setSelectedBooking(booking);
    await fetchBookingActivities(booking._id);
    setShowActivityModal(true);
  };

  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    setEditFormData({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      roomId: booking.room._id,
      checkIn: new Date(booking.checkIn).toISOString().split('T')[0],
      checkOut: new Date(booking.checkOut).toISOString().split('T')[0],
      numberOfGuests: booking.numberOfGuests,
      specialRequests: booking.specialRequests,
      status: booking.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/bookings/${selectedBooking._id}`, editFormData, config);
      setSuccessMessage('Booking updated successfully');
      setShowEditModal(false);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`/api/bookings/${bookingId}`, config);
        setSuccessMessage('Booking cancelled successfully');
        fetchBookings();
      } catch (error) {
        console.error('Error cancelling booking:', error);
      }
    }
  };

  const handleAddBooking = () => {
    setShowAddModal(true);
  };

  const handleNewBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/api/bookings', newBookingData, config);
      setSuccessMessage('New booking created successfully');
      setShowAddModal(false);
      setNewBookingData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        roomId: '',
        checkIn: '',
        checkOut: '',
        numberOfGuests: 1,
        specialRequests: ''
      });
      fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  return (
    <div className="manage-booking-container">
      <h2>Booking List</h2>
      
      <div className="booking-controls">
        <input
          type="text"
          placeholder="Search by Customer Name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="all">Filter by Booking Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <button onClick={handleAddBooking} className="add-booking-btn">
          Add Booking +
        </button>
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
          <button onClick={() => setSuccessMessage('')}>&times;</button>
        </div>
      )}

      <div className="booking-table-container">
        <table className="booking-table">
          <thead>
            <tr>
              <th>Reference Number</th>
              <th>Customer Name</th>
              <th>Room Number</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Booking Status</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking._id}>
                <td>{booking.referenceNumber}</td>
                <td>{booking.customerName}</td>
                <td>{booking.room?.roomNumber}</td>
                <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
                <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleViewActivity(booking)}
                    className="activity-btn"
                  >
                    Activity
                  </button>
                </td>
                <td className="action-buttons">
                  <button
                    onClick={() => handleEditClick(booking)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(booking._id)}
                    className="delete-btn"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Booking Activities</h3>
              <button onClick={() => setShowActivityModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="activity-details">
                <h4>Booking Reference: {selectedBooking.referenceNumber}</h4>
                <div className="activity-list">
                  {activities.map((activity) => (
                    <div key={activity._id} className="activity-item">
                      <p>{activity.activity}</p>
                      <span className={`status-badge ${getStatusClass(activity.status)}`}>
                        {activity.status}
                      </span>
                      <small>{new Date(activity.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Booking</h3>
              <button onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit} className="booking-form">
                <div className="form-group">
                  <label>Customer Name:</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, customerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editFormData.customerEmail}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, customerEmail: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone:</label>
                  <input
                    type="tel"
                    value={editFormData.customerPhone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, customerPhone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room:</label>
                  <select
                    value={editFormData.roomId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, roomId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room._id} value={room._id}>
                        {room.roomNumber} - {room.roomType}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Check-in:</label>
                  <input
                    type="date"
                    value={editFormData.checkIn}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, checkIn: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-out:</label>
                  <input
                    type="date"
                    value={editFormData.checkOut}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, checkOut: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Number of Guests:</label>
                  <input
                    type="number"
                    value={editFormData.numberOfGuests}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        numberOfGuests: parseInt(e.target.value)
                      })
                    }
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Special Requests:</label>
                  <textarea
                    value={editFormData.specialRequests}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, specialRequests: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button type="submit" className="submit-btn">
                  Update Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Booking</h3>
              <button onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleNewBookingSubmit} className="booking-form">
                <div className="form-group">
                  <label>Customer Name:</label>
                  <input
                    type="text"
                    value={newBookingData.customerName}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, customerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={newBookingData.customerEmail}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, customerEmail: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone:</label>
                  <input
                    type="tel"
                    value={newBookingData.customerPhone}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, customerPhone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room:</label>
                  <select
                    value={newBookingData.roomId}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, roomId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room._id} value={room._id}>
                        {room.roomNumber} - {room.roomType}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Check-in:</label>
                  <input
                    type="date"
                    value={newBookingData.checkIn}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, checkIn: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-out:</label>
                  <input
                    type="date"
                    value={newBookingData.checkOut}
                    onChange={(e) =>
                      setNewBookingData({ ...newBookingData, checkOut: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Number of Guests:</label>
                  <input
                    type="number"
                    value={newBookingData.numberOfGuests}
                    onChange={(e) =>
                      setNewBookingData({
                        ...newBookingData,
                        numberOfGuests: parseInt(e.target.value)
                      })
                    }
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Special Requests:</label>
                  <textarea
                    value={newBookingData.specialRequests}
                    onChange={(e) =>
                      setNewBookingData({
                        ...newBookingData,
                        specialRequests: e.target.value
                      })
                    }
                  />
                </div>
                <button type="submit" className="submit-btn">
                  Create Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBookingAdmin;