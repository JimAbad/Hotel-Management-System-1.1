import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './MyBookings.css';

function MyBookings() {
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();
  const { user, token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  const [cancellationText, setCancellationText] = useState('');
  const [showCleaningModal, setShowCleaningModal] = useState(false);
  const [cleaningDate, setCleaningDate] = useState('');
  const [cleaningTime, setCleaningTime] = useState('');
  const [cleaningDesc, setCleaningDesc] = useState('');
  const [cleanSubmitting, setCleanSubmitting] = useState(false);
  const [showCleanSuccess, setShowCleanSuccess] = useState(false);
  const [requestedRooms, setRequestedRooms] = useState({});
  const [timeOptions, setTimeOptions] = useState([]);

  // Utility function to format price with commas
  const formatPrice = (amount) => {
    if (!amount) return '0';
    return Number(amount).toLocaleString('en-US');
  };

  const displayPaymentStatus = (status) => {
    if (!status) return '';
    return String(status).toLowerCase() === 'partial' ? 'paid in partial' : status;
  };

  const getRoomType = (b) => {
    if (!b) return 'N/A';
    const roomObj = b.room;
    if (roomObj && typeof roomObj === 'object' && roomObj.roomType) return roomObj.roomType;
    if (b.roomType) return b.roomType;
    return 'N/A';
  };

  const getRoomHeader = (b) => {
    // If booking.roomNumber is set (not null/empty/0), use it
    if (b && b.roomNumber !== undefined && b.roomNumber !== null && b.roomNumber !== '' && b.roomNumber !== 0) {
      return `Room: ${b.roomNumber}`;
    }
    // Otherwise, booking.room might be a populated object (but only use it if booking.roomNumber is not set)
    if (b && b.room && typeof b.room === 'object' && b.room.roomNumber !== undefined && b.room.roomNumber !== null && b.room.roomNumber !== '' && b.room.roomNumber !== 0 && (!('roomNumber' in b) || b.roomNumber == null || b.roomNumber === '' || b.roomNumber === 0)) {
      return 'Room: To be assigned';
    }
    // Default fallback
    return 'Room: To be assigned';
  };

  // Utility function to format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const dateOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

    return `${formattedDate} at ${formattedTime}`;
  };

  // Check if booking is within 48 hours of booking date
  const isWithin48Hours = (booking) => {
    const bookingDate = new Date(booking.createdAt || booking.bookingDate);
    const now = new Date();
    const hoursDifference = (now - bookingDate) / (1000 * 60 * 60);
    return hoursDifference <= 48;
  };

  const fetchMyBookings = async () => {
    if (!user || !token) {
      setLoading(false);
      setError({ message: 'Please log in to view your bookings.' });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/bookings/my-bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Show bookings that have at least been created; optionally filter out cancelled/deleted statuses
      const allBookings = response.data || [];
      // Only show bookings that have been paid (partial or full payment)
      // Hide unpaid/pending bookings until QRPh payment is confirmed
      const visibleBookings = allBookings.filter(b => {
        const status = (b.paymentStatus || '').toLowerCase();
        return ['paid', 'partial'].includes(status);
      });
      setBookings(visibleBookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    if (!user || !token) return;
    fetchMyBookings();
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetchMyBookings();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, [user, token]);

  const handleCancelClick = (booking) => {
    if (!token) {
      alert('Please log in to cancel bookings.');
      return;
    }
    const status = booking.status || booking.bookingStatus || '';
    if (!['pending', 'upcoming'].includes(status)) {
      alert('Only pending or upcoming bookings can be canceled.');
      return;
    }

    setSelectedBooking(booking);

    // Check if booking is past 48 hours
    if (!isWithin48Hours(booking)) {
      setShowWarningModal(true);
    } else {
      setShowCancelModal(true);
      setCancellationReasons([]);
      setCancellationText('');
    }
  };

  const handleWarningProceed = () => {
    setShowWarningModal(false);
    setShowCancelModal(true);
    setCancellationReasons([]);
    setCancellationText('');
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
    setSelectedBooking(null);
  };

  const handleReasonChange = (reason) => {
    setCancellationReasons(prev => {
      if (prev.includes(reason)) {
        return prev.filter(r => r !== reason);
      } else {
        return [...prev, reason];
      }
    });
  };

  const handleCancelConfirm = async () => {
    if (cancellationReasons.length === 0) {
      alert('Please select at least one reason for cancellation.');
      return;
    }

    try {
      setCancelingId(selectedBooking._id);

      const cancellationData = {
        cancellationReasons: cancellationReasons,
        cancellationElaboration: cancellationText.trim() || null
      };

      await axios.post(`${API_URL}/api/bookings/user-cancel/${selectedBooking._id}`,
        cancellationData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Show success modal instead of alert
      setShowCancelModal(false);
      setShowSuccessModal(true);
      setBookings((prev) => prev.map((b) => b._id === selectedBooking._id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelingId(null);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSelectedBooking(null);
  };
  const openCleaning = (booking) => {
    setSelectedBooking(booking);
    setCleaningDate('');
    setCleaningTime('');
    setCleaningDesc('');
    setShowCleaningModal(true);
  };
  const fetchMyCleaningRequests = async () => {
    if (!user || !token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const resp = await axios.get(`${API_URL}/api/requests/cleaning/my`, config);
      const list = resp?.data?.data || [];
      const rooms = {};
      list.forEach(r => { const rn = String(r.roomNumber || r?.booking?.roomNumber || '').trim(); if (rn) rooms[rn] = true; });
      setRequestedRooms(rooms);
    } catch (err) { console.error(err); }
  };
  useEffect(() => {
    fetchMyCleaningRequests();
    const onVis = () => { if (document.visibilityState === 'visible') fetchMyCleaningRequests(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user, token]);

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
  const formatDisplayTime = (hhmm) => {
    const [hh, mm] = hhmm.split(':');
    let h = parseInt(hh, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    if (h > 12) h = h - 12;
    return `${h}:${mm} ${ampm}`;
  };
  const buildTimeOptions = (dateStr) => {
    if (!dateStr) return [];
    const startHHMM = dateStr === getTodayStr() ? getNextHalfHour() : '00:00';
    const [startH, startM] = startHHMM.split(':').map(x => parseInt(x, 10));
    const opts = [];
    for (let h = startH; h <= 23; h++) {
      for (let m of [0, 30]) {
        if (h === startH && m < startM) continue;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const val = `${hh}:${mm}`;
        opts.push(val);
      }
    }
    return opts;
  };
  useEffect(() => {
    const opts = buildTimeOptions(cleaningDate);
    setTimeOptions(opts);
    if (!opts.includes(cleaningTime)) setCleaningTime('');
  }, [cleaningDate]);
  const isValidSelection = () => {
    if (!cleaningDate || !cleaningTime) return false;
    const now = new Date();
    const when = new Date(`${cleaningDate}T${cleaningTime}`);
    if (isNaN(when.getTime())) return false;
    if (when <= now) return false;
    const mins = parseInt(cleaningTime.split(':')[1] || '0', 10);
    if (mins % 30 !== 0) return false;
    if (cleaningDate === getTodayStr()) {
      const [mh, mm] = getNextHalfHour().split(':');
      const minToday = new Date(`${cleaningDate}T${mh}:${mm}`);
      if (when < minToday) return false;
    }
    return true;
  };
  const submitCleaning = async () => {
    if (!selectedBooking || !isValidSelection()) return;
    try {
      setCleanSubmitting(true);
      const when = `${cleaningDate}T${cleaningTime}`;
      const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
      await axios.post(`${API_URL}/api/requests/cleaning`, { bookingId: selectedBooking._id, scheduledAt: when, description: cleaningDesc || '' }, config);
      setShowCleaningModal(false);
      setShowCleanSuccess(true);
      const rn = selectedBooking?.roomNumber;
      if (rn) setRequestedRooms(prev => ({ ...prev, [rn]: true }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to submit cleaning request');
    } finally {
      setCleanSubmitting(false);
    }
  };



  if (loading) {
    return <div className="my-bookings-container">Loading bookings...</div>;
  }

  if (error) {
    return <div className="my-bookings-container">Error: {error.message}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="no-bookings">
        <p>You don't have any bookings yet.</p>
      </div>
    );
  }


  return (
    <div className="my-bookings-container">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1>My Bookings</h1>

      </div>

      {/* Removed the "Delete All Cancelled Bookings" button */}

      {/* Redundant toast notifications removed — rely on bell dropdown in navbar */}
      <div className="bookings-list">
        {bookings.map(booking => {
          const ended = new Date(booking.checkOut) < new Date();
          return (
            <div key={booking._id} className="booking-card">
              {ended && (
                <div className="ended-warning">
                  <div className="warning-triangle"></div>
                  <div className="warning-label">time to checkout!</div>
                </div>
              )}
              <div className="booking-main">
                <h2>{getRoomHeader(booking)}</h2>
                <p>Check-in: {formatDateTime(booking.checkIn)}</p>
                <p>Check-out: {formatDateTime(booking.checkOut)}</p>
                <p>Total Price: ₱{formatPrice(booking.totalAmount)}</p>
                {booking.paymentStatus && (
                  <p>Payment Status: {displayPaymentStatus(booking.paymentStatus)}</p>
                )}
                <p>Booking Status: {booking.status || booking.bookingStatus}</p>
                <div className="booking-actions">
                  {['pending', 'upcoming'].includes((booking.status || booking.bookingStatus)) && (
                    <button
                      onClick={() => handleCancelClick(booking)}
                      disabled={cancelingId === booking._id}
                    >
                      {cancelingId === booking._id ? 'Cancelling...' : 'Cancel booking'}
                    </button>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 48-Hour Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content warning-modal">
            <div className="modal-header">
              <h3>Cancellation Notice</h3>
              <button
                className="modal-close"
                onClick={handleWarningCancel}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-content">
                <div className="warning-icon">⚠️</div>
                <p className="warning-text">
                  Your booking is past 48hrs of booked date, your reservation fee will not be refunded.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={handleWarningCancel}
              >
                Cancel
              </button>
              <button
                className="proceed-btn"
                onClick={handleWarningProceed}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header">
              <h3>Booking Cancelled</h3>
            </div>
            <div className="modal-body">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <p className="success-text">
                  Booking cancelled successfully!
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="ok-btn"
                onClick={handleSuccessClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showCleanSuccess && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header">
              <h3>Request Submitted</h3>
            </div>
            <div className="modal-body">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <p className="success-text">Cleaning request submitted.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="ok-btn" onClick={() => { setShowCleanSuccess(false); setSelectedBooking(null); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showCleaningModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ textAlign: 'center' }}>Request Cleaning</h3>
              <button
                className="modal-close"
                onClick={() => setShowCleaningModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="booking-info">
                <p><strong>Room:</strong> {selectedBooking && (selectedBooking.roomNumber !== undefined && selectedBooking.roomNumber !== null && selectedBooking.roomNumber !== '' && selectedBooking.roomNumber !== 0 ? selectedBooking.roomNumber : 'To be assigned')}</p>
                <p><strong>Check-in:</strong> {selectedBooking && formatDateTime(selectedBooking.checkIn)}</p>
                <p><strong>Check-out:</strong> {selectedBooking && formatDateTime(selectedBooking.checkOut)}</p>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={cleaningDate} onChange={(e) => setCleaningDate(e.target.value)} min={getTodayStr()} />
              </div>
              <div className="form-group">
                <label>Time</label>
                <select value={cleaningTime} onChange={(e) => setCleaningTime(e.target.value)}>
                  <option value="">Select time</option>
                  {timeOptions.map(t => (
                    <option key={t} value={t}>{formatDisplayTime(t)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={cleaningDesc} onChange={(e) => setCleaningDesc(e.target.value)} rows="3" placeholder="Optional"></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowCleaningModal(false)}
              >
                Close
              </button>
              <button
                className="confirm-cancel-btn"
                onClick={submitCleaning}
                disabled={!isValidSelection() || cleanSubmitting}
              >
                {cleanSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ textAlign: 'center' }}>Cancel Booking</h3>
              <button
                className="modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="booking-info">
                <p><strong>Room:</strong> {selectedBooking && (selectedBooking.roomNumber !== undefined && selectedBooking.roomNumber !== null && selectedBooking.roomNumber !== '' && selectedBooking.roomNumber !== 0 ? selectedBooking.roomNumber : 'To be assigned')}</p>
                <p><strong>Check-in:</strong> {selectedBooking && formatDateTime(selectedBooking.checkIn)}</p>
                <p><strong>Check-out:</strong> {selectedBooking && formatDateTime(selectedBooking.checkOut)}</p>
                <p><strong>Total Price:</strong> ₱{selectedBooking && formatPrice(selectedBooking.totalAmount)}</p>
              </div>

              <div className="cancellation-reasons">
                <h4>Please select reason(s) for cancellation: <span className="required"></span></h4>
                <div className="reasons-list">
                  {[
                    'Change of travel plans',
                    'Emergency situation',
                    'Found better accommodation',
                    'Financial constraints',
                    'Health issues',
                    'Work/business conflict',
                    'Weather conditions',
                    'Other personal reasons'
                  ].map((reason) => (
                    <label key={reason} className="reason-checkbox">
                      <input
                        type="checkbox"
                        checked={cancellationReasons.includes(reason)}
                        onChange={() => handleReasonChange(reason)}
                      />
                      <span className="checkmark"></span>
                      {reason}
                    </label>
                  ))}
                </div>
              </div>

              <div className="elaboration-section">
                <h4>Additional details (optional):</h4>
                <textarea
                  className="elaboration-textarea"
                  placeholder="Please provide any additional details about your cancellation..."
                  value={cancellationText}
                  onChange={(e) => setCancellationText(e.target.value)}
                  rows="4"
                />
              </div>


            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Booking
              </button>
              <button
                className="confirm-cancel-btn"
                onClick={handleCancelConfirm}
                disabled={cancellationReasons.length === 0 || cancelingId === selectedBooking?._id}
              >
                {cancelingId === selectedBooking?._id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
