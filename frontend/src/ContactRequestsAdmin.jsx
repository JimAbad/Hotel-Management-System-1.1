import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthAdmin } from './AuthContextAdmin';

const ContactRequestsAdmin = () => {
  const { token } = useAuthAdmin();
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timeOptions, setTimeOptions] = useState([]);
  const [priority, setPriority] = useState('low');
  const [submitting, setSubmitting] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const generateTimeOptions = (dateStr) => {
    const opts = [];
    const now = new Date();
    const isToday = dateStr === getTodayStr();
    const startH = isToday ? now.getHours() : 0;
    const startM = isToday ? now.getMinutes() : 0;
    for (let h = startH; h <= 23; h++) {
      for (let m of [0, 30]) {
        if (h === startH && isToday && m < Math.ceil(startM / 30) * 30) continue;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const val = `${hh}:${mm}`;
        const displayHour = ((h % 12) || 12);
        const ampm = h < 12 ? 'AM' : 'PM';
        const display = `${displayHour}:${mm} ${ampm}`;
        opts.push({ value: val, display });
      }
    }
    return opts;
  };

  useEffect(() => {
    const dateStr = scheduledDate || getTodayStr();
    const opts = generateTimeOptions(dateStr);
    setTimeOptions(opts);
    if (!opts.find(o => o.value === scheduledTime)) {
      setScheduledTime(opts[0]?.value || '');
    }
  }, [scheduledDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = { Authorization: `Bearer ${token}` };
        const { data } = await axios.get(`${API_URL}/api/contact-messages`, { headers });
        const arr = Array.isArray(data) ? data : data?.data || [];
        setItems(arr);
      } catch (e) {
        setError(e.message || 'Failed to load contact messages');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [API_URL, token]);

  const filtered = (items || []).filter((x) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      String(x.name || '').toLowerCase().includes(s) ||
      String(x.roomNumber || '').toLowerCase().includes(s) ||
      String(x.message || '').toLowerCase().includes(s)
    );
  });

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  };

  const openSchedule = (item) => {
    setActive(item);
    const d = getTodayStr();
    setScheduledDate(d);
    const opts = generateTimeOptions(d);
    setTimeOptions(opts);
    setScheduledTime(opts[0]?.value || '');
    setPriority('low');
  };

  const submitTask = async () => {
    if (!active) return;
    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const dateStr = scheduledDate || getTodayStr();
      const timeStr = scheduledTime || timeOptions[0]?.value || '00:00';
      const scheduledAt = `${dateStr}T${timeStr}`;
      const when = new Date(scheduledAt);
      if (isNaN(when.getTime()) || when <= new Date()) {
        alert('Please select a future date and time.');
        setSubmitting(false);
        return;
      }
      const payload = { scheduledAt, priority };
      await axios.post(`${API_URL}/api/contact-messages/${active._id}/create-task`, payload, { headers });
      setActive(null);
      const headers2 = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`${API_URL}/api/contact-messages`, { headers: headers2 });
      const arr = Array.isArray(data) ? data : data?.data || [];
      setItems(arr);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ color: 'black' }}>
      <h2>Contact Requests</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by name, room, message"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="error-message">Error: {error}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'black' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Room</th>
              <th>Message</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No messages</td></tr>
            ) : (
              filtered.map((x) => (
                <tr key={x._id}>
                  <td>{x.name || '-'}</td>
                  <td>{x.roomNumber || '-'}</td>
                  <td>{x.message || '-'}</td>
                  <td>{x.priority || 'low'}</td>
                  <td>{x.status === 'handled' ? 'assigned' : (x.status || 'new')}</td>
                  <td>{formatDateTime(x.createdAt)}</td>
                  <td>
                    {x.status === 'assigned' || x.status === 'handled' ? (
                      <button disabled style={{ background: '#ddd', color: '#333', borderRadius: 8, padding: '8px 12px', cursor: 'not-allowed' }}>Assigned</button>
                    ) : (
                      <button onClick={() => openSchedule(x)} style={{ background: '#B8860B', color: 'white', borderRadius: 8, padding: '8px 12px' }}>Create Task</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {active && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3 style={{ color: 'black' }}>Create Task</h3>
            <div style={{ marginBottom: 8 }}>
              <label>Date</label>
              <input type="date" value={scheduledDate} min={getTodayStr()} onChange={(e) => setScheduledDate(e.target.value)} style={{ marginLeft: 10 }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Time</label>
              <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={{ marginLeft: 10 }}>
                <option value="">Select time</option>
                {timeOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.display}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ marginLeft: 10 }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="confirm-actions">
              <button className="btn-yes" onClick={submitTask} disabled={submitting}>Confirm</button>
              <button className="btn-cancel" onClick={() => setActive(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactRequestsAdmin;
