import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaHistory } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ManageBookingAdmin.css';

const ManageBooking = () => {
  const { token } = useAuthAdmin();
  const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [editForm, setEditForm] = useState({
    bookingStatus: '',
    checkOutDate: '',
    roomNumber: ''
  });
  const [newBooking, setNewBooking] = useState({
    roomType: '',
    guestName: '',
    contactNumber: '',
    email: '',
    checkInDate: '',
    checkOutDate: '',
    adults: '1',
    children: '0',
    specialRequest: ''
  });
  const [reservationSummary, setReservationSummary] = useState(null);

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchRooms();
    }
  }, [statusFilter, searchQuery, token]);

  const parseList = (payload) => {
    if (Array.isArray(payload)) return payload;
    return (
      payload?.data?.bookings ||
      payload?.bookings ||
      payload?.data ||
      payload?.results ||
      []
    );
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt) ? String(d) : dt.toLocaleDateString();
  };

  const getRoomDisplay = (b) => {
    if (!b) return 'N/A';
    const room = b.room;
    // If room is an object, try common fields
    if (room && typeof room === 'object') {
      if (room.roomNumber !== undefined && room.roomNumber !== null && room.roomNumber !== '') {
        return room.roomNumber;
      }
      if (room.number !== undefined && room.number !== null && room.number !== '') {
        return room.number;
      }
    }
    // If booking has a direct roomNumber
    if (b.roomNumber !== undefined && b.roomNumber !== null && b.roomNumber !== '') {
      return b.roomNumber;
    }
    // If room is just a string id/label
    if (typeof room === 'string' && room) {
      return room;
    }
    return 'N/A';
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter, search: searchQuery }
      };
      const res = await axios.get(`${API_BASE}/api/bookings`, config);
      const list = parseList(res.data);
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
      setError(err?.response?.data?.message || err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res?.data?.rooms || res?.data?.data || [];
      setRooms(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load rooms', e);
      setRooms([]);
    }
  };

  const fetchBookingActivities = async (bookingId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_BASE}/api/booking-activities/${bookingId}`, config);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (err) {
      console.error('Error fetching booking activities:', err);
      return [];
    }
  };

  const handleViewActivity = async (booking) => {
    setSelectedBooking(booking);
    const bookingActivities = await fetchBookingActivities(booking._id);
    setActivities(bookingActivities);
    setShowActivityModal(true);
  };

  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    const co = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
    setEditForm({
      bookingStatus: booking.bookingStatus || '',
      checkOutDate: co && !isNaN(co) ? co.toISOString().slice(0, 10) : '',
      roomNumber: booking?.room?.roomNumber ?? booking?.roomNumber ?? ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_BASE}/api/bookings/${selectedBooking._id}`, editForm, config);
      setShowEditModal(false);
      fetchBookings();
    } catch (err) {
      console.error('Error updating booking:', err);
      alert(err?.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`${API_BASE}/api/bookings/${bookingId}`, config);
        fetchBookings();
      } catch (err) {
        console.error('Error deleting booking:', err);
        alert(err?.response?.data?.message || err.message);
      }
    }
  };

  const handleAddBooking = () => setShowAddModal(true);

  const calculateReservationSummary = () => {
<<<<<<< HEAD
    const baseRate = 50;
    const start = new Date(newBooking.checkInDate);
    const end = new Date(newBooking.checkOutDate);
    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const total = baseRate * nights;

    return {
      dates: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      guests: `${newBooking.adults} Adult${Number(newBooking.adults) > 1 ? 's' : ''}, ${newBooking.children} Child${Number(newBooking.children) > 1 ? 'ren' : ''}`,
      rate: `$${baseRate} per night`,
      total: `$${total}`
=======
    const rateByType = { Economy: 100, Deluxe: 150, Suite: 250 };
    const baseRate = rateByType[newBooking.roomType] ?? 100;
    const hours = Math.ceil(
      (new Date(newBooking.checkOutDate) - new Date(newBooking.checkInDate)) / (1000 * 60 * 60)
    );
    const total = baseRate * Math.max(hours, 1);
    return {
      dates: `${new Date(newBooking.checkInDate).toLocaleDateString()} - ${new Date(newBooking.checkOutDate).toLocaleDateString()}`,
      guests: `${newBooking.adults} Adult${newBooking.adults > 1 ? 's' : ''}, ${newBooking.children} Child${newBooking.children > 1 ? 'ren' : ''}`,
      rate: `₱${baseRate.toLocaleString()} per hour`,
      total: `₱${total.toLocaleString()}`
>>>>>>> e79bb3fdb16e71c1bb90f9294a91655ef284aa5b
    };
  };

  const handleNewBookingChange = (e) => {
    const { name, value } = e.target;
    setNewBooking((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewBookingSubmit = (e) => {
    e.preventDefault();
    setReservationSummary(calculateReservationSummary());
  };

  const handleConfirmBooking = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/api/bookings`, newBooking, config);
      setShowConfirmModal(true);
      setTimeout(() => {
        setShowConfirmModal(false);
        setShowAddModal(false);
        setNewBooking({
          roomType: '',
          guestName: '',
          contactNumber: '',
          email: '',
          checkInDate: '',
          checkOutDate: '',
          adults: '1',
          children: '0',
          specialRequest: ''
        });
        fetchBookings();
      }, 1200);
    } catch (err) {
      console.error('Error creating booking:', err);
      alert(err?.response?.data?.message || err.message);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    switch (String(status).toLowerCase()) {
      case 'pending': return 'pending';
      case 'confirmed': return 'confirmed';
      case 'cancelled': return 'cancelled';
      case 'completed': return 'completed';
      default: return '';
    }
  };

  // Helper: does this booking already have a room?
  const isAssigned = (b) =>
    !!(b?.room?.roomNumber || b?.roomNumber || (typeof b?.room === 'string' && b.room));

  const handleAssignRoom = async (booking) => {
    setSelectedBooking(booking);
    setSelectedRoomNumber('');
    if (rooms.length === 0) await fetchRooms();
    setShowAssignModal(true);
  };

  const confirmAssignRoom = async () => {
    if (!selectedBooking || !selectedRoomNumber) return;
    try {
      await axios.put(
        `${API_BASE}/api/bookings/${selectedBooking._id}`,
        { roomNumber: selectedRoomNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAssignModal(false);
      setSelectedBooking(null);
      setSelectedRoomNumber('');
      // refresh list
      if (typeof fetchBookings === 'function') await fetchBookings();
    } catch (e) {
      console.error('Assign room failed:', e);
      alert(e?.response?.data?.message || e.message || 'Failed to assign room');
    }
  };

  return (
    <div className="booking-management">
      <div className="booking-header">
        <h2>Booking List</h2>
        <div className="booking-actions">
          <input
            type="text"
            placeholder="Search by Customer Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">Filter by Booking Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={handleAddBooking} className="add-booking-btn">
            Add Booking +
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="table-container">
          <table>
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
              {Array.isArray(bookings) && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.referenceNumber || `BK${String(booking._id || '').slice(-6)}`}</td>
                    <td>{booking.guestName || booking.customerName || booking.name || '-'}</td>
                    <td>{getRoomDisplay(booking)}</td>
                    <td>{formatDate(booking.checkInDate || booking.checkinDate || booking.startDate)}</td>
                    <td>{formatDate(booking.checkOutDate || booking.checkoutDate || booking.endDate)}</td>
                    <td>
                      <span className={`status ${getStatusClass(booking.bookingStatus)}`}>
                        {booking.bookingStatus || '-'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="activity-btn"    // keep existing class so styling stays the same
                        title="More Info"
                        onClick={() => handleViewActivity(booking)} // ...existing handler...
                      >
                        More Info
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`assign-btn ${isAssigned(booking) ? 'assigned' : ''}`}
                          disabled={isAssigned(booking)}
                          onClick={() => handleAssignRoom(booking)}
                        >
                          Assign Room
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(booking._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#666' }}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Booking Activities</h3>
              <button onClick={() => setShowActivityModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="booking-details">
                <p><strong>Guest:</strong> {selectedBooking?.guestName}</p>
                <p><strong>Reference:</strong> {selectedBooking?.referenceNumber}</p>
                <p><strong>Status:</strong> {selectedBooking?.bookingStatus}</p>
              </div>
              <div className="activity-list">
                {activities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-date">{formatDate(activity.timestamp)} {new Date(activity.timestamp).toLocaleTimeString()}</span>
                    <span className="activity-description">{activity.description}</span>
                  </div>
                ))}
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
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Booking Status:</label>
                  <select
                    value={editForm.bookingStatus}
                    onChange={(e) => setEditForm({ ...editForm, bookingStatus: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Check-out Date:</label>
                  <input
                    type="date"
                    value={editForm.checkOutDate}
                    onChange={(e) => setEditForm({ ...editForm, checkOutDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Room:</label>
                  <select
                    value={editForm.roomNumber}
                    onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                  >
                    <option value="">Select Room</option>
                    {rooms.map((room) => (
                      <option key={room.roomNumber || room._id} value={room.roomNumber}>
                        Room {room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Changes</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">Cancel</button>
                </div>
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
              {!reservationSummary ? (
                <form onSubmit={handleNewBookingSubmit}>
                  <div className="form-group">
                    <label>Room Type:</label>
                    <select
                      name="roomType"
                      value={newBooking.roomType}
                      onChange={handleNewBookingChange}
                      required
                    >
                      <option value="">Select Room Type</option>
                      <option value="standard">Standard</option>
                      <option value="deluxe">Deluxe</option>
                      <option value="suite">Suite</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Guest Name:</label>
                    <input
                      type="text"
                      name="guestName"
                      value={newBooking.guestName}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number:</label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={newBooking.contactNumber}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={newBooking.email}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-in Date:</label>
                    <input
                      type="date"
                      name="checkInDate"
                      value={newBooking.checkInDate}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Date:</label>
                    <input
                      type="date"
                      name="checkOutDate"
                      value={newBooking.checkOutDate}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Adults:</label>
                    <input
                      type="number"
                      name="adults"
                      value={newBooking.adults}
                      onChange={handleNewBookingChange}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Children:</label>
                    <input
                      type="number"
                      name="children"
                      value={newBooking.children}
                      onChange={handleNewBookingChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Special Requests:</label>
                    <textarea
                      name="specialRequest"
                      value={newBooking.specialRequest}
                      onChange={handleNewBookingChange}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="next-btn">
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="reservation-summary">
                  <h4>Reservation Summary</h4>
                  <div className="summary-details">
                    <p><strong>Guest Name:</strong> {newBooking.guestName}</p>
                    <p><strong>Room Type:</strong> {newBooking.roomType}</p>
                    <p><strong>Dates:</strong> {reservationSummary.dates}</p>
                    <p><strong>Guests:</strong> {reservationSummary.guests}</p>
                    <p><strong>Rate:</strong> {reservationSummary.rate}</p>
                    <p><strong>Total:</strong> {reservationSummary.total}</p>
                  </div>
                  <div className="form-actions">
                    <button onClick={handleConfirmBooking} className="confirm-btn">
                      Confirm Booking
                    </button>
                    <button
                      onClick={() => setReservationSummary(null)}
                      className="back-btn"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showConfirmModal && (
        <div className="success-modal">
          <div className="success-content">
            <h3>Success!</h3>
            <p>Booking has been created successfully.</p>
          </div>
        </div>
      )}

      {/* Assign Room Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assign Room</h3>
              <button onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <label>Select Room:</label>
              <select
                value={selectedRoomNumber}
                onChange={(e) => setSelectedRoomNumber(e.target.value)}
              >
                <option value="">Select a room</option>
                {rooms.map((r) => (
                  <option key={r._id || r.roomNumber} value={r.roomNumber}>
                    Room {r.roomNumber} — {r.roomType || r.type || 'Type'}
                  </option>
                ))}
              </select>
              <div className="form-actions" style={{ marginTop: 12 }}>
                <button className="save-btn" onClick={confirmAssignRoom} disabled={!selectedRoomNumber}>
                  Assign
                </button>
                <button className="cancel-btn" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// Add the ManageBookingAdmin component
const ManageBookingAdmin = () => {
  return (
    <div className="manage-booking-admin">
      <h2>Manage Bookings</h2>
      <div className="booking-table">
        {/* This placeholder referenced BookingTable which doesn't exist; keeping real component renders above */}
      </div>
    </div>
  );
};

export default ManageBooking;