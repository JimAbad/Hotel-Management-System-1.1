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
    checkOutDate: '',
    adults: '1',
    children: '0',
    specialRequest: ''
  });
  const [reservationSummary, setReservationSummary] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState(null);

 
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extendTime, setExtendTime] = useState(''); 
  const [extendHours, setExtendHours] = useState(3); // default minimum hours

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchRooms();
    }
  }, [statusFilter, searchQuery, token]);



  // Helper: pick the first existing field name from your API result
  const pick = (obj, keys) => keys.find((k) => obj?.[k] !== undefined && obj?.[k] !== null) && obj[keys.find((k) => obj?.[k] !== undefined && obj?.[k] !== null)];

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d) ? String(val) : d.toLocaleDateString();
  };

  // Map backend variations → unified values for the row
  const getCheckIn = (b) =>
    pick(b, ["checkInDate", "checkinDate", "check_in", "checkIn", "startDate", "fromDate", "dateFrom"]);
  const getCheckOut = (b) =>
    pick(b, ["checkOutDate", "checkoutDate", "check_out", "checkOut", "endDate", "toDate", "dateTo"]);
  const getBookingStatus = (b) =>
    pick(b, ["status", "bookingStatus", "booking_status", "state", "reservationStatus"]);

  // TIME HELPERS – ensure these are defined once, here

  // get check-in / check-out time fields from booking
  const getCheckInTime = (b) => {
    const v = getCheckIn(b);
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d; // return Date object
  };

  const getCheckOutTime = (b) => {
    const v = getCheckOut(b);
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d; // return Date object
  };

  // format a Date or "HH[:mm]" → "h AM/PM"
  const formatHourLabel = (timeVal) => {
    if (!timeVal) return "";
    let h;

    if (timeVal instanceof Date) {
      if (isNaN(timeVal)) return "";
      h = timeVal.getHours();
    } else {
      const [hhStr] = String(timeVal).split(":");
      h = Number(hhStr);
    }

    if (isNaN(h)) return "";
    h = ((h % 24) + 24) % 24; // 0–23
    const suffix = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${suffix}`;
  };

  // combine date + time for table display, with fallback hours
  const formatDateTimeLabel = (dateVal, timeVal, fallbackHour) => {
    const datePart = formatDate(dateVal); // uses the same Date for date part

    // try to use the real time (Date from getCheckInTime / getCheckOutTime)
    let displayLabel = formatHourLabel(timeVal);

    // if there is no time in the Date (or parsing failed), fall back
    if (!displayLabel && (fallbackHour || fallbackHour === 0)) {
      displayLabel = formatHourLabel(String(fallbackHour));
    }

    const timePart = displayLabel ? ` ${displayLabel}` : "";
    return `${datePart}${timePart}`;
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (["pending"].includes(s)) return "pending";
    if (["confirmed", "reserved"].includes(s)) return "confirmed";
    if (["occupied"].includes(s)) return "confirmed";
    if (["cancelled", "canceled"].includes(s)) return "cancelled";
    if (["completed", "checked-out", "finished"].includes(s)) return "completed";
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
      const res = await axios.get(`${API_BASE}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res?.data?.rooms || res?.data?.data || [];
      const normalized = Array.isArray(list) ? list : [];
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

  // NEW: build final checkout datetime based on chosen date + hour
  const buildNewCheckout = (booking, dateOverride, timeOverride) => {
    const currentDate = toDateSafe(getCheckOut(booking)) || new Date();
    const base = new Date(currentDate);

    if (dateOverride) {
      const [y, m, d] = dateOverride.split('-').map(Number);
      if (y && m && d) {
        base.setFullYear(y, m - 1, d);
      }
    }

    if (timeOverride) {
      const hour = Number(timeOverride); // we will pass plain hour like "1", "2", ...
      if (!isNaN(hour)) {
        base.setHours(hour, 0, 0, 0);
      }
    } else {
      const coTime = getCheckOutTime(booking);
      if (coTime instanceof Date && !isNaN(coTime)) {
        base.setHours(coTime.getHours(), coTime.getMinutes(), 0, 0);
      }
    }

    return base;
  };

  // NEW: compute allowed checkout hours (00–23) based on rules
  const getAllowedHours = (booking, dateOverride) => {
    const now = new Date();

    // today (for comparison)
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    // if user selected a date, compare with today
    let isSameDayAsToday = true;
    if (dateOverride) {
      const [y, m, d] = dateOverride.split('-').map(Number);
      if (y && m && d) {
        isSameDayAsToday = (y === todayY && m - 1 === todayM && d === todayD);
      }
    }

    const opts = [];

    if (isSameDayAsToday) {
      // Same day as NOW → only allow 3 hours or more after current hour
      const curH = now.getHours();
      const startHour = curH + 3;
      for (let h = startHour; h <= 23; h++) {
        if (h < 0 || h > 23) continue;
        opts.push(h);
      }
    } else {
      // Different day → extending by days, allow 1–23
      for (let h = 1; h <= 23; h++) {
        opts.push(h);
      }
    }

    return opts;
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

  // NEW: open extend modal
  const handleOpenExtend = (booking) => {
    setSelectedBooking(booking);
    const currentCo = getCheckOut(booking);

    let defaultDate = getTodayStr();
    const d = toDateSafe(currentCo);
    if (d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      defaultDate = `${yyyy}-${mm}-${dd}`;
    }
    setExtendDate(defaultDate);

    const allowed = getAllowedHours(booking, defaultDate);
    if (allowed.length > 0) {
      setExtendTime(String(allowed[0]));
    } else {
      setExtendTime('');
    }

    setShowExtendModal(true);
  };

  // NEW: confirm extend booking
  const handleConfirmExtend = async () => {
    if (!selectedBooking) return;
    if (!extendDate || !extendTime) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const newCheckoutDateObj = buildNewCheckout(
        selectedBooking,
        extendDate,
        extendTime
      );

      const iso = newCheckoutDateObj.toISOString();

      await axios.put(
        `${API_BASE}/api/bookings/${selectedBooking._id}`,
        {
          newCheckOut: iso
        },
        config
      );

      setShowExtendModal(false);
      setSelectedBooking(null);
      setExtendDate('');
      setExtendTime('');
      fetchBookings();
    } catch (err) {
      console.error('Error extending booking:', err);
      alert(err?.response?.data?.message || err.message);
    }
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
    const rateByType = { standard: 100, deluxe: 150, suite: 250 };
    const baseRate = rateByType[String(newBooking.roomType || '').toLowerCase()] ?? 100;
    const hours = Math.ceil(
      (new Date(newBooking.checkOutDate) - new Date(newBooking.checkInDate)) / (1000 * 60 * 60)
    );
    const total = baseRate * Math.max(hours, 1);
    return {
      dates: `${new Date(newBooking.checkInDate).toLocaleDateString()} - ${new Date(newBooking.checkOutDate).toLocaleDateString()}`,
      guests: `${newBooking.adults} Adult${Number(newBooking.adults) > 1 ? 's' : ''}, ${newBooking.children} Child${Number(newBooking.children) > 1 ? 'ren' : ''}`,
      rate: `₱${baseRate.toLocaleString()} per hour`,
      total: `₱${total.toLocaleString()}`
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
              {filtered.map((b) => (
                <tr key={b._id}>
                  <td>{b.referenceNumber || `BK${String(b._id || '').slice(-6)}`}</td>
                  <td>{b.guestName || b.customerName || b.name || '-'}</td>
                  <td>{getRoomDisplay(b)}</td>
                  <td>{formatDateTimeLabel(getCheckIn(b), getCheckInTime(b), 14 /* 2 PM */)}</td>
                  <td>{formatDateTimeLabel(getCheckOut(b), getCheckOutTime(b), 12 /* 12 PM */)}</td>
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
                        disabled={["cancelled", "completed"].includes(String(getBookingStatus(b) || '').toLowerCase())}
                        onClick={() => handleAssignRoom(b)}
                      >
                        Assign Room
                      </button>

                      {/* NEW: Extend button */}
                      <button
                        className="assign-btn"
                        disabled={["cancelled","completed"].includes(String(getBookingStatus(b) || '').toLowerCase())}
                        onClick={() => handleOpenExtend(b)}
                      >
                        Extend
                      </button>

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

      {/* NEW: Extend Booking Modal */}
      {showExtendModal && selectedBooking && (
        <div className="modal-overlay extend-booking-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Extend Booking</h3>
              <button onClick={() => setShowExtendModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Guest:</strong> {selectedBooking.guestName || selectedBooking.customerName || '-'}
              </p>
              <p>
                <strong>Reference:</strong> {selectedBooking.referenceNumber || `BK${String(selectedBooking._id || '').slice(-6)}`}
              </p>
              <p>
                <strong>Current Check-out:</strong>{" "}
                {formatDate(getCheckOut(selectedBooking))}{" "}
                {formatHourLabel(getCheckOutTime(selectedBooking)) || ""}
              </p>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>
                  New Check-out Day:
                </label>
                <input
                  type="date"
                  value={extendDate}
                  min={(() => {
                    const cur = getCheckOut(selectedBooking);
                    const d = toDateSafe(cur);
                    if (!d) return getTodayStr();
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                  })()}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setExtendDate(newDate);

                    const hours = getAllowedHours(selectedBooking, newDate);
                    if (hours.length > 0) {
                      setExtendTime(String(hours[0]));
                    } else {
                      setExtendTime('');
                    }
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>
                  New Check-out Time (hours only):
                </label>
                <select
                  value={extendTime}
                  onChange={(e) => setExtendTime(e.target.value)}
                >
                  <option value="">Select hour</option>
                  {getAllowedHours(selectedBooking, extendDate).map((h) => (
                    <option key={h} value={String(h)}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>


              <div className="form-actions" style={{ marginTop: 16 }}>
                <button
                  className="save-btn"
                  disabled={!extendDate || !extendTime}
                  onClick={handleConfirmExtend}
                >
                  Save
                </button>
                <button
                  className="cancel-btn"
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                >
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
    </div>
  );
};
export default ManageBookingAdmin;
