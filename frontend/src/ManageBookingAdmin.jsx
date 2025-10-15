import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaHistory } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ManageBookingAdmin.css';

const ManageBooking = () => {
  const { token } = useAuthAdmin();
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
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
    checkInTime: '',
    checkOutTime: '',
    adults: '1',
    children: '0',
    specialRequest: ''
  });

  // Helper: get today's local date string (YYYY-MM-DD)
  const getTodayLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper: round current time up to next 30 minutes for today's date
  const getMinTimeForDate = (selectedDate) => {
    const today = getTodayLocalDateString();
    if (!selectedDate || selectedDate !== today) return '00:00';
    const now = new Date();
    now.setSeconds(0, 0);
    const remainder = now.getMinutes() % 30;
    if (remainder !== 0) {
      now.setMinutes(now.getMinutes() + (30 - remainder));
    }
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const to12HourLabel = (timeStr) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
  };

  // Utility: add minutes to HH:MM and clamp within same day
  const addMinutesToSlot = (hhmm, minutes) => {
    if (!hhmm) return hhmm;
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + minutes;
    if (total >= 24 * 60) total = 24 * 60 - 1; // 23:59
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    return `${nh}:${nm}`;
  };

  const crossesMidnight = (hhmm, minutes) => {
    if (!hhmm) return false;
    const [h, m] = hhmm.split(':').map(Number);
    return (h * 60 + m + minutes) >= 24 * 60;
  };

  const getNextDateString = (dateStr) => {
    if (!dateStr) return dateStr;
    const d = new Date(`${dateStr}T00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };

  // Disable past 30-min slots for today's check-in
  const isSlotDisabled = (selectedDate, slot) => {
    const today = getTodayLocalDateString();
    const dateToCheck = selectedDate || today; // treat empty date as today
    if (dateToCheck !== today) return false;
    const min = getMinTimeForDate(dateToCheck);
    return slot < min;
  };

  const getCheckInOptions = (selectedDate) => {
    const min = getMinTimeForDate(selectedDate);
    return generateTimeSlots().filter((t) => selectedDate === getTodayLocalDateString() ? t >= min : true);
  };
  
  // Disable past 30-min slots for today's check-out
  const isCheckOutSlotDisabled = (selectedDate, slot) => {
    const today = getTodayLocalDateString();
    const dateToCheck = selectedDate || today; // treat empty date as today
    // If same-day checkout as check-in, enforce a minimum of 3 hours
    if (newBooking.checkInDate && dateToCheck === newBooking.checkInDate) {
      if (crossesMidnight(newBooking.checkInTime, 180)) {
        return true;
      }
      const earliest = addMinutesToSlot(newBooking.checkInTime, 180);
      return slot < earliest;
    }
    if (dateToCheck === today) {
      const min = getMinTimeForDate(dateToCheck);
      return slot < min;
    }
    return false;
  };

  // Default check-in time selection when date changes (or initially)
  useEffect(() => {
    const slots = generateTimeSlots();
    const firstAvailable = slots.find((t) => !isSlotDisabled(newBooking.checkInDate, t));
    if (firstAvailable && newBooking.checkInTime !== firstAvailable) {
      setNewBooking((prev) => ({ ...prev, checkInTime: firstAvailable }));
    }
  }, [newBooking.checkInDate]);

  // Default check-out time selection when date changes (or initially)
  useEffect(() => {
    const slots = generateTimeSlots();
    const firstAvailable = slots.find((t) => !isCheckOutSlotDisabled(newBooking.checkOutDate, t));
    if (firstAvailable && newBooking.checkOutTime !== firstAvailable) {
      setNewBooking((prev) => ({ ...prev, checkOutTime: firstAvailable }));
    }
  }, [newBooking.checkOutDate]);
  const [reservationSummary, setReservationSummary] = useState(null);

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchRooms();
    }
  }, [statusFilter, searchQuery, token]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/bookings`,
        {
          ...config,
          params: {
            status: statusFilter,
            search: searchQuery
          }
        }
      );
      setBookings(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`, config);
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const fetchBookingActivities = async (bookingId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/booking-activities/${bookingId}`, config);
      return data;
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
    setEditForm({
      bookingStatus: booking.bookingStatus,
      checkOutDate: booking.checkOutDate.split('T')[0],
      roomId: booking.room?._id || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/bookings/${selectedBooking._id}`,
        editForm,
        config
      );
      setShowEditModal(false);
      fetchBookings();
    } catch (err) {
      console.error('Error updating booking:', err);
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}`, config);
        fetchBookings();
      } catch (err) {
        console.error('Error deleting booking:', err);
      }
    }
  };

  const handleAddBooking = () => {
    setShowAddModal(true);
  };

  const calculateReservationSummary = () => {
    // Determine per-hour rate by selected room type
    const hourlyRates = {
      Economy: 100,
      Deluxe: 200,
      Presidential: 400,
      Suite: 450,
    };
    const baseRate = hourlyRates[newBooking.roomType] || 100;
    const taxRate = 0.12;
    const rateWithTax = baseRate * (1 + taxRate);
    const start = newBooking.checkInDate && newBooking.checkInTime ? new Date(`${newBooking.checkInDate}T${newBooking.checkInTime}`) : new Date(newBooking.checkInDate);
    const end = newBooking.checkOutDate && newBooking.checkOutTime ? new Date(`${newBooking.checkOutDate}T${newBooking.checkOutTime}`) : new Date(newBooking.checkOutDate);
    const diffMs = Math.max(0, end - start);
    const hoursRaw = diffMs / (1000 * 60 * 60);
    const hours = Math.ceil(hoursRaw);
    const total = Math.round(rateWithTax * hours);
    
    return {
      dates: `${new Date(newBooking.checkInDate).toLocaleDateString()} - ${new Date(newBooking.checkOutDate).toLocaleDateString()}`,
      guests: `${newBooking.adults} Adult${newBooking.adults > 1 ? 's' : ''}, ${newBooking.children} Child${newBooking.children > 1 ? 'ren' : ''}`,
      rate: `₱${Number(rateWithTax).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} per hour (tax included)`,
      total: `₱${Number(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    };
  };

  const handleNewBookingChange = (e) => {
    const { name, value } = e.target;
    setNewBooking(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewBookingSubmit = async (e) => {
    e.preventDefault();
    // Enforce minimum 3-hour duration before showing summary
    const checkInDateTime = newBooking.checkInDate && newBooking.checkInTime
      ? `${newBooking.checkInDate}T${newBooking.checkInTime}`
      : `${newBooking.checkInDate}T00:00`;
    const checkOutDateTime = newBooking.checkOutDate && newBooking.checkOutTime
      ? `${newBooking.checkOutDate}T${newBooking.checkOutTime}`
      : `${newBooking.checkOutDate}T23:59`;
    if (new Date(checkOutDateTime) - new Date(checkInDateTime) < 3 * 60 * 60 * 1000) {
      alert('Minimum booking duration is 3 hours.');
      return;
    }
    const summary = calculateReservationSummary();
    setReservationSummary(summary);
  };

  const handleConfirmBooking = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const checkInDateTime = newBooking.checkInDate && newBooking.checkInTime
        ? `${newBooking.checkInDate}T${newBooking.checkInTime}`
        : `${newBooking.checkInDate}T00:00`;
      const checkOutDateTime = newBooking.checkOutDate && newBooking.checkOutTime
        ? `${newBooking.checkOutDate}T${newBooking.checkOutTime}`
        : `${newBooking.checkOutDate}T23:59`;
      // Enforce minimum 3-hour duration
      if (new Date(checkOutDateTime) - new Date(checkInDateTime) < 3 * 60 * 60 * 1000) {
        alert('Minimum booking duration is 3 hours.');
        return;
      }
      const payload = {
        ...newBooking,
        checkInDate: checkInDateTime,
        checkOutDate: checkOutDateTime,
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, payload, config);
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
          checkInTime: '',
          checkOutTime: '',
          adults: '1',
          children: '0',
          specialRequest: ''
        });
        fetchBookings();
      }, 2000);
    } catch (err) {
      console.error('Error creating booking:', err);
    }
  };

  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/bookings/${bookingId}/payment-status`,
        { paymentStatus },
        config
      );
      fetchBookings();
    } catch (err) {
      console.error('Error updating payment status:', err);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      case 'completed':
        return 'completed';
      default:
        return '';
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
                <th>Payment Status</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.referenceNumber}</td>
                  <td>{booking.guestName}</td>
                  <td>{booking.room || 'N/A'}</td>
                  <td>{new Date(booking.checkInDate).toLocaleString()}</td>
                  <td>{new Date(booking.checkOutDate).toLocaleString()}</td>
                  <td>
                    <span className={`status ${getStatusClass(booking.bookingStatus)}`}>
                      {booking.bookingStatus}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <select
                        value={booking.paymentStatus || 'pending'}
                        onChange={(e) => updatePaymentStatus(booking._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                      {booking.paymentStatus === 'pending' && booking.createdAt &&
                        (Date.now() - new Date(booking.createdAt).getTime()) > 24 * 60 * 60 * 1000 && (
                        <span style={{ color: '#B8860B', fontSize: '12px', marginTop: '4px' }}>Need to check payment</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className="activity-btn"
                      onClick={() => handleViewActivity(booking)}
                    >
                      <FaHistory /> Activity
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(booking)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(booking._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                <p><strong>Guest:</strong> {selectedBooking.guestName}</p>
                <p><strong>Reference:</strong> {selectedBooking.referenceNumber}</p>
                <p><strong>Status:</strong> {selectedBooking.bookingStatus}</p>
              </div>
              <div className="activity-list">
                {activities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-date">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
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
                    onChange={(e) =>
                      setEditForm({ ...editForm, bookingStatus: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkOutDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Room:</label>
                  <select
                    value={editForm.roomNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, roomNumber: e.target.value })
                    }
                  >
                    <option value="">Select Room</option>
                    {rooms.map((room) => (
                      <option key={room.roomNumber} value={room.roomNumber}>
                        Room {room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
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
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-in Time:</label>
                    <select
                      name="checkInTime"
                      value={newBooking.checkInTime}
                      onChange={handleNewBookingChange}
                      required
                    >
                      {generateTimeSlots().map((t) => (
                        <option key={`admin-cin-${t}`} value={t} disabled={isSlotDisabled(newBooking.checkInDate, t)}>
                          {to12HourLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Check-out Date:</label>
                    <input
                      type="date"
                      name="checkOutDate"
                      value={newBooking.checkOutDate}
                      onChange={handleNewBookingChange}
                      min={
                        newBooking.checkInDate
                          ? (crossesMidnight(newBooking.checkInTime, 180)
                            ? getNextDateString(newBooking.checkInDate)
                            : newBooking.checkInDate)
                          : new Date().toISOString().split('T')[0]
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Time:</label>
                    <select
                      name="checkOutTime"
                      value={newBooking.checkOutTime}
                      onChange={handleNewBookingChange}
                      required
                    >
                      {generateTimeSlots().map((t) => (
                        <option key={`admin-cout-${t}`} value={t} disabled={isCheckOutSlotDisabled(newBooking.checkOutDate, t)}>
                          {to12HourLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default time selection when dates change */}
                  {(() => {
                    // Imperative updates inside render avoided; left as helpers in useEffect below
                    return null;
                  })()}
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
    </div>
  );
};
// Add the ManageBookingAdmin component
const ManageBookingAdmin = () => {
  return (
    <div className="manage-booking-admin">
      <h2>Manage Bookings</h2>
      <div className="booking-table">
        <BookingTable />
      </div>
    </div>
  );
};

export default ManageBooking;