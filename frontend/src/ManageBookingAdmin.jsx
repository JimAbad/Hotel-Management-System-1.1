import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaHistory } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ManageBookingAdmin.css';

const ManageBookingAdmin = () => {
  const { token } = useAuthAdmin();
  const API_BASE = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    const base = envNorm && envNorm !== originNorm ? envNorm : fallback;
    return base.replace(/\/+$/, '');
  })();

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
  const [holidays, setHolidays] = useState([]);
  const [assignableRooms, setAssignableRooms] = useState([]);
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
    checkInTime: '',
    checkOutDate: '',
    checkOutTime: '',
    adults: '1',
    children: '0',
    specialRequest: ''
  });
  const [reservationSummary, setReservationSummary] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutBookingId, setCheckoutBookingId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchRooms();
      fetchHolidays();
    }
  }, [statusFilter, searchQuery, token]);

  const fetchHolidays = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/holidays`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res?.data?.holidays || res?.data?.data || [];
      setHolidays(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load holidays', e);
      setHolidays([]);
    }
  };



  // Helper: pick the first existing field name from your API result
  const pick = (obj, keys) => keys.find((k) => obj?.[k] !== undefined && obj?.[k] !== null) && obj[keys.find((k) => obj?.[k] !== undefined && obj?.[k] !== null)];

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    // Include both date and time
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Map backend variations → unified values for the row
  const getCheckIn = (b) =>
    pick(b, ["checkInDate", "checkinDate", "check_in", "checkIn", "startDate", "fromDate", "dateFrom"]);
  const getCheckOut = (b) =>
    pick(b, ["checkOutDate", "checkoutDate", "check_out", "checkOut", "endDate", "toDate", "dateTo"]);
  const getBookingStatus = (b) =>
    pick(b, ["status", "bookingStatus", "booking_status", "state", "reservationStatus"]);

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (["pending"].includes(s)) return "pending";
    if (["confirmed", "reserved"].includes(s)) return "confirmed";
    if (["occupied"].includes(s)) return "confirmed";
    if (["cancelled", "canceled"].includes(s)) return "cancelled";
    if (["completed", "checked-out", "finished"].includes(s)) return "completed";
    if (["time to check-out"].includes(s)) return "checkout-pending";
    return "";
  };

  const normalizeType = (t) => {
    const s = String(t || '').toLowerCase();
    if (!s) return '';
    if (['economy', 'standard', 'solo', 'basic'].includes(s)) return 'Economy';
    if (['deluxe'].includes(s)) return 'Deluxe';
    if (['suite', 'family suite'].includes(s)) return 'Suite';
    if (['presidential'].includes(s)) return 'Presidential';
    return t;
  };

  const getRoomTypeFromBooking = (b) => {
    if (!b) return '';
    const r = b.room;
    if (r && typeof r === 'object' && r.roomType) return r.roomType;
    if (b.roomType) return b.roomType;
    if (typeof r === 'string' && r) {
      const match = (rooms || []).find((room) => String(room._id) === String(r));
      if (match && match.roomType) return match.roomType;
      return '';
    }
    return '';
  };

  const getRoomDisplay = (b) => {
    const rn = (b.roomNumber !== undefined && b.roomNumber !== null && b.roomNumber !== '' && b.roomNumber !== 0)
      ? b.roomNumber
      : (b.room && typeof b.room === 'object' && b.room.roomNumber !== undefined && b.room.roomNumber !== null && b.room.roomNumber !== '' && b.room.roomNumber !== 0)
        ? b.room.roomNumber
        : undefined;
    return rn !== undefined ? rn : 'To be assigned';
  };

  const toDateSafe = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d) ? null : d;
  };

  const isOverlapping = (aStart, aEnd, bStart, bEnd) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    return aStart < bEnd && bStart < aEnd;
  };

  const isRoomAvailableForBooking = (room, booking) => {
    const rn = room?.roomNumber;
    const currentRn = getRoomDisplay(booking);
    const targetCi = toDateSafe(getCheckIn(booking));
    const targetCo = toDateSafe(getCheckOut(booking));

    if (!rn) return false;
    // Must match type when the booking has a known room type.
    // For legacy bookings without a stored roomType, allow any matching-status room.
    const bookingType = normalizeType(getRoomTypeFromBooking(booking));
    if (bookingType) {
      const typeOk = normalizeType(room.roomType) === bookingType;
      if (!typeOk) return false;
    }
    // Exclude already assigned to this booking
    if (currentRn && String(currentRn) === String(rn)) return false;
    // Must be available by status
    const statusOk = String(room.status || 'available').toLowerCase() === 'available';
    if (!statusOk) return false;

    // If booking has no dates, cannot evaluate overlap — allow selection
    if (!targetCi || !targetCo) return true;

    // Exclude rooms with overlapping active bookings
    for (const b of bookings) {
      // skip this booking
      if (String(b?._id || '') === String(booking?._id || '')) continue;
      const st = String(getBookingStatus(b) || '').toLowerCase();
      const isActive = !['cancelled', 'completed'].includes(st);
      if (!isActive) continue;
      const bn = getRoomDisplay(b);
      if (!bn || String(bn) !== String(rn)) continue;
      const bCi = toDateSafe(getCheckIn(b));
      const bCo = toDateSafe(getCheckOut(b));
      if (isOverlapping(targetCi, targetCo, bCi, bCo)) {
        return false;
      }
    }
    return true;
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res?.data?.bookings || res?.data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
      // removed adminNotifications aggregation — bell dropdown in LayoutAdmin handles admin notifications
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      // Fetch all rooms (no pagination limit) for accurate availability checking
      const res = await axios.get(`${API_BASE}/api/rooms?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res?.data?.rooms || res?.data?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      console.log('Fetched rooms:', normalized.length, 'rooms');
      setRooms(normalized);
      return normalized;
    } catch (e) {
      console.error('Failed to load rooms', e);
      setRooms([]);
      return [];
    }
  };



  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const getNextHalfHour = () => {
    const d = new Date();
    d.setSeconds(0); d.setMilliseconds(0);
    const mins = d.getMinutes();
    if (mins < 30) {
      d.setMinutes(30);
    } else {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0);
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  };

  // Generate 30-minute interval time options
  const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const time24 = `${hh}:${mm}`;
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${hour12}:${mm} ${ampm}`;
        options.push({ value: time24, label });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Filter time options based on current date/time
  const getFilteredTimeOptions = (isCheckIn = true, selectedDate = '') => {
    const today = getTodayStr();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return timeOptions.filter(opt => {
      const [h, m] = opt.value.split(':').map(Number);
      // If selected date is today, disable past times
      if (selectedDate === today) {
        if (h < currentHour) return false;
        if (h === currentHour && m <= currentMin) return false;
      }
      // If check-out and same date as check-in, must be after check-in time
      if (!isCheckIn && newBooking.checkInDate === newBooking.checkOutDate && newBooking.checkInTime) {
        const [ciH, ciM] = newBooking.checkInTime.split(':').map(Number);
        if (h < ciH) return false;
        if (h === ciH && m <= ciM) return false;
      }
      return true;
    });
  };

  // Check room availability by type
  const getRoomAvailability = () => {
    const availability = { Economy: false, Deluxe: false, Suite: false };

    console.log('Checking room availability, rooms:', rooms);

    (rooms || []).forEach(room => {
      const rt = String(room.roomType || room.type || '').toLowerCase().trim();
      const roomStatus = String(room.status || '').toLowerCase().trim();
      const isAvailable = roomStatus === 'available';

      console.log(`Room ${room.roomNumber}: type="${rt}", status="${roomStatus}", isAvailable=${isAvailable}`);

      if (isAvailable) {
        if (rt.includes('economy') || rt.includes('standard') || rt.includes('solo') || rt.includes('basic')) {
          availability.Economy = true;
        }
        if (rt.includes('deluxe')) {
          availability.Deluxe = true;
        }
        if (rt.includes('suite') || rt.includes('family')) {
          availability.Suite = true;
        }
      }
    });

    console.log('Room availability result:', availability);

    return availability;
  };

  const roomAvailability = getRoomAvailability();


  // removed admin billing-derived notifications — centralized in LayoutAdmin bell dropdown

  // Removed toast popups in favor of bell dropdown notifications

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

  const handleDelete = (bookingId) => {
    setDeleteBookingId(bookingId);
    setShowDeleteModal(true);
  };

  const confirmDeleteBooking = async () => {
    if (!deleteBookingId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE}/api/bookings/${deleteBookingId}`, {
        ...config,
        data: { cancellationReasons: ['Admin deletion'], cancellationElaboration: '' }
      });
      setShowDeleteModal(false);
      setDeleteBookingId(null);
      fetchBookings();
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert(err?.response?.data?.message || err.message);
    }
  };

  const handleAddBooking = () => setShowAddModal(true);

  const calculateReservationSummary = () => {
    const rateByType = { economy: 100, deluxe: 150, suite: 250 };
    const baseRate = rateByType[String(newBooking.roomType || '').toLowerCase()] ?? 100;

    // Combine date and time for accurate calculation
    const checkInDateTime = new Date(`${newBooking.checkInDate}T${newBooking.checkInTime || '00:00'}`);
    const checkOutDateTime = new Date(`${newBooking.checkOutDate}T${newBooking.checkOutTime || '00:00'}`);

    const hours = Math.ceil(
      (checkOutDateTime - checkInDateTime) / (1000 * 60 * 60)
    );
    let subtotal = baseRate * Math.max(hours, 1);

    // Check if check-in date is a holiday
    const checkInDateOnly = newBooking.checkInDate;
    const holiday = holidays.find(h => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === checkInDateOnly && h.isActive;
    });

    let holidayInfo = '';
    if (holiday) {
      const multiplier = holiday.priceMultiplier || 1.05;
      subtotal = subtotal * multiplier;
      holidayInfo = ` (includes ${Math.round((multiplier - 1) * 100)}% holiday surcharge)`;
    }

    return {
      dates: `${checkInDateTime.toLocaleString()} - ${checkOutDateTime.toLocaleString()}`,
      guests: `${newBooking.adults} Adult${Number(newBooking.adults) > 1 ? 's' : ''}, ${newBooking.children} Child${Number(newBooking.children) > 1 ? 'ren' : ''}`,
      rate: `₱${baseRate.toLocaleString()} per hour${holidayInfo}`,
      total: `₱${subtotal.toLocaleString()}`
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

      // Build the booking data with cash payment (admin bookings are paid in cash)
      const bookingData = {
        ...newBooking,
        // Combine date and time for checkIn/checkOut
        checkIn: `${newBooking.checkInDate}T${newBooking.checkInTime || '12:00'}`,
        checkOut: `${newBooking.checkOutDate}T${newBooking.checkOutTime || '12:00'}`,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        customerName: newBooking.guestName,
        customerEmail: newBooking.email
      };

      await axios.post(`${API_BASE}/api/bookings`, bookingData, config);
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
          checkInTime: '',
          checkOutDate: '',
          checkOutTime: '',
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

  // Removed isAssigned visual usage to keep Assign button visibly enabled for ongoing bookings

  const handleAssignRoom = async (booking) => {
    setSelectedBooking(booking);
    setSelectedRoomNumber('');
    const roomList = rooms.length ? rooms : await fetchRooms();
    const eligible = (roomList || []).filter((r) => isRoomAvailableForBooking(r, booking));
    setAssignableRooms(eligible);
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

  const handleCheckoutClick = (booking) => {
    if (!booking || !booking._id) return;
    setCheckoutBookingId(booking._id);
    setShowCheckoutModal(true);
  };

  const confirmCheckout = async () => {
    if (!checkoutBookingId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_BASE}/api/bookings/${checkoutBookingId}/checkout`, {}, config);
      setShowCheckoutModal(false);
      setCheckoutBookingId(null);
      fetchBookings();
    } catch (err) {
      console.error('Error checking out booking:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to check out booking');
    }
  };

  // ADD: compute filtered rows based on search + status
  const filtered = React.useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    const sf = (statusFilter || "").toLowerCase();
    return (bookings || []).filter((b) => {
      const name = (b.guestName || b.customerName || b.name || "").toLowerCase();
      const status = String(getBookingStatus(b) || "").toLowerCase();
      const okSearch = !q || name.includes(q);
      const okStatus = !sf || status === sf;
      return okSearch && okStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  return (
    <div className="booking-management">
      {/* Toast popups removed — admin notifications now centralized in bell dropdown */}
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
            <option value="occupied">Occupied</option>

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
              {filtered.map((b) => (
                <tr key={b._id}>
                  <td>{b.referenceNumber || `BK${String(b._id || '').slice(-6)}`}</td>
                  <td>{b.guestName || b.customerName || b.name || '-'}</td>
                  <td>{getRoomDisplay(b)}</td>
                  <td>{formatDate(getCheckIn(b))}</td>
                  <td>{formatDate(getCheckOut(b))}</td>
                  <td>
                    {(() => {
                      const status = getBookingStatus(b);
                      return (
                        <span className={`status ${getStatusClass(status)}`}>
                          {status ?? "-"}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {/* Details button stays “More Info” */}
                    <button className="activity-btn" title="More Info" onClick={() => handleViewActivity(b)}>
                      More Info
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="assign-btn"
                        disabled={["cancelled", "completed", "time to check-out"].includes(String(getBookingStatus(b) || '').toLowerCase())}
                        onClick={() => handleAssignRoom(b)}
                      >
                        Assign Room
                      </button>
                      {['occupied', 'time to check-out'].includes(String(getBookingStatus(b) || '').toLowerCase()) && (
                        <button
                          className="checkout-btn"
                          onClick={() => handleCheckoutClick(b)}
                        >
                          Check-Out
                        </button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(b._id)}>
                        Delete
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
                    {(rooms || [])
                      .filter((room) => isRoomAvailableForBooking(room, selectedBooking))
                      .map((room) => (
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
                    <label style={{ color: '#000', fontWeight: '500' }}>Room Type:</label>
                    <select
                      name="roomType"
                      value={newBooking.roomType}
                      onChange={handleNewBookingChange}
                      required
                    >
                      <option value="">Select Room Type</option>
                      <option value="Economy" disabled={!roomAvailability.Economy}>
                        Economy {!roomAvailability.Economy ? '(Unavailable)' : ''}
                      </option>
                      <option value="Deluxe" disabled={!roomAvailability.Deluxe}>
                        Deluxe {!roomAvailability.Deluxe ? '(Unavailable)' : ''}
                      </option>
                      <option value="Suite" disabled={!roomAvailability.Suite}>
                        Suite {!roomAvailability.Suite ? '(Unavailable)' : ''}
                      </option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000', fontWeight: '500' }}>Guest Name:</label>
                    <input
                      type="text"
                      name="guestName"
                      value={newBooking.guestName}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000', fontWeight: '500' }}>Contact Number:</label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={newBooking.contactNumber}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000', fontWeight: '500' }}>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={newBooking.email}
                      onChange={handleNewBookingChange}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ color: '#000', fontWeight: '500' }}>Check-in Date:</label>
                      <input
                        type="date"
                        name="checkInDate"
                        value={newBooking.checkInDate}
                        onChange={handleNewBookingChange}
                        min={getTodayStr()}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ color: '#000', fontWeight: '500' }}>Check-in Time:</label>
                      <select
                        name="checkInTime"
                        value={newBooking.checkInTime}
                        onChange={handleNewBookingChange}
                        required
                      >
                        <option value="">Select Time</option>
                        {getFilteredTimeOptions(true, newBooking.checkInDate).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ color: '#000', fontWeight: '500' }}>Check-out Date:</label>
                      <input
                        type="date"
                        name="checkOutDate"
                        value={newBooking.checkOutDate}
                        onChange={handleNewBookingChange}
                        min={newBooking.checkInDate || getTodayStr()}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ color: '#000', fontWeight: '500' }}>Check-out Time:</label>
                      <select
                        name="checkOutTime"
                        value={newBooking.checkOutTime}
                        onChange={handleNewBookingChange}
                        required
                      >
                        <option value="">Select Time</option>
                        {getFilteredTimeOptions(false, newBooking.checkOutDate).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000', fontWeight: '500' }}>Number of Adults:</label>
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
                    <label style={{ color: '#000', fontWeight: '500' }}>Number of Children:</label>
                    <input
                      type="number"
                      name="children"
                      value={newBooking.children}
                      onChange={handleNewBookingChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000', fontWeight: '500' }}>Special Requests:</label>
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
                {assignableRooms.map((r) => (
                  <option key={r._id || r.roomNumber} value={r.roomNumber}>
                    Room {r.roomNumber} — {r.roomType}
                  </option>
                ))}
              </select>
              {(assignableRooms.length === 0) && (
                <div className="error" style={{ marginTop: 8 }}>
                  No available rooms for the booked type.
                </div>
              )}
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
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'black' }}>Confirm Delete</h3>
            </div>
            <div className="modal-body" style={{ color: 'black' }}>
              Are you sure you want to delete this booking?
            </div>
            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="cancel-btn cancel-danger" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="ok-btn" onClick={confirmDeleteBooking}>Okay</button>
            </div>
          </div>
        </div>
      )}
      {showCheckoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ color: 'black' }}>Confirm Check-Out</h3>
            </div>
            <div className="modal-body" style={{ color: 'black' }}>
              Proceed to check-out?
            </div>
            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="cancel-btn cancel-danger" onClick={() => { setShowCheckoutModal(false); setCheckoutBookingId(null); }}>Cancel</button>
              <button className="ok-btn" onClick={confirmCheckout}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManageBookingAdmin;
