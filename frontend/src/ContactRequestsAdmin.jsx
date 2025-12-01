import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthAdmin } from './AuthContextAdmin';

const ContactRequestsAdmin = () => {
  const { token: contextToken } = useAuthAdmin();
  const token = contextToken || localStorage.getItem('tokenAdmin');
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [category, setCategory] = useState('Cleaning');
  const [miscOption, setMiscOption] = useState('Submit');
  const [priority, setPriority] = useState('low');
  const [submitting, setSubmitting] = useState(false);





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
    setCategory('Cleaning');
    setMiscOption('Submit');
    setPriority('low');
  };

  const handleComplete = async (item) => {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      await axios.delete(`${API_URL}/api/contact-messages/${item._id}`, { headers });
      const headers2 = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`${API_URL}/api/contact-messages`, { headers: headers2 });
      const arr = Array.isArray(data) ? data : data?.data || [];
      setItems(arr);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to complete request');
    }
  };

  const submitTask = async () => {
    if (!active) return;
    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      // Handle different categories
      if (category === 'Miscellaneous' && miscOption === 'Comply') {
        // Keep in contact requests with complied status
        await axios.put(`${API_URL}/api/contact-messages/${active._id}/status`, { status: 'complied' }, { headers });
      } else {
        // Send to requests collection (Cleaning, Maintenance, or Miscellaneous with Submit)
        const now = new Date();
        const scheduledAt = now.toISOString(); // Use current time for requests
        const requestCategory = category === 'Miscellaneous' ? 'misc' : category.toLowerCase();
        const payload = { scheduledAt, category: requestCategory, priority };
        await axios.post(`${API_URL}/api/contact-messages/${active._id}/create-task`, payload, { headers });
      }
      
      setActive(null);
      const headers2 = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`${API_URL}/api/contact-messages`, { headers: headers2 });
      const arr = Array.isArray(data) ? data : data?.data || [];
      setItems(arr);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to process request');
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
                  <td>{x.status === 'handled' ? 'assigned' : (x.status === 'complied' ? 'complied' : (x.status || 'new'))}</td>
                  <td>{formatDateTime(x.createdAt)}</td>
                  <td>
                    {x.status === 'assigned' || x.status === 'handled' ? (
                      <button disabled style={{ background: '#ddd', color: '#333', borderRadius: 8, padding: '8px 12px', cursor: 'not-allowed' }}>Assigned</button>
                    ) : x.status === 'complied' ? (
                      <button onClick={() => handleComplete(x)} style={{ background: '#28a745', color: 'white', borderRadius: 8, padding: '8px 12px' }}>Complete</button>
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
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginLeft: 10 }}>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Miscellaneous">Miscellaneous</option>
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
            {category === 'Miscellaneous' && (
              <div style={{ marginBottom: 8 }}>
                <label>Action</label>
                <div style={{ marginLeft: 10 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    <input type="radio" value="Submit" checked={miscOption === 'Submit'} onChange={(e) => setMiscOption(e.target.value)} />
                    Submit to Requests
                  </label>
                  <label style={{ display: 'block' }}>
                    <input type="radio" value="Comply" checked={miscOption === 'Comply'} onChange={(e) => setMiscOption(e.target.value)} />
                    Comply Here
                  </label>
                </div>
              </div>
            )}
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
