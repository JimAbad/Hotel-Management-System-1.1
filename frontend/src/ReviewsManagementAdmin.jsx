import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FaTrash } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';

const ReviewsManagementAdmin = () => {
  const { token } = useAuthAdmin();
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortDate, setSortDate] = useState('newest');
  const [sortRating, setSortRating] = useState('high');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [token, search, ratingFilter, sortDate, sortRating, dateFrom, dateTo]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search || undefined,
        rating: ratingFilter === 'all' ? undefined : ratingFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortDate,
        sortRating,
      };
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/reviews`, { params, ...config });
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setRatingFilter('all');
    setSortDate('newest');
    setSortRating('high');
    setDateFrom('');
    setDateTo('');
  };

  const renderStars = (n) => {
    const count = Math.max(0, Math.min(5, Number(n) || 0));
    return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count);
  };

  const filtered = useMemo(() => reviews, [reviews]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/reviews/${confirmDeleteId}`, config);
      setConfirmDeleteId(null);
      fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  if (loading) return <div>Loading reviews...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="reviews-management-admin" style={{ padding: '16px' }}>
      <h2 style={{ color: 'rgb(227,182,19)' }}>Reviews Management</h2>
      <div className="reviews-toolbar" style={{ color: '#000', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          placeholder="Search by Reference or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#000', height: '36px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', width: '220px' }}
        />
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} style={{ color: '#000', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
          <option value="all">Rating</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5</option>
        </select>
        <select value={sortDate} onChange={(e) => setSortDate(e.target.value)} style={{ color: '#000', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
          <option value="newest">Sort By Date: Newest</option>
          <option value="oldest">Sort By Date: Oldest</option>
        </select>
        <select value={sortRating} onChange={(e) => setSortRating(e.target.value)} style={{ color: '#000', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
          <option value="high">Sort By Rating: High to Low</option>
          <option value="low">Sort By Rating: Low to High</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ color: '#000', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ color: '#000', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }} />
        <button onClick={resetFilters} style={{ height: '36px', padding: '0 12px', borderRadius: '8px' }}>Reset</button>
      </div>
      <table className="reviews-table" style={{ color: '#000' }}>
        <thead>
          <tr>
            <th>Reference Number</th>
            <th>Customer Name</th>
            <th>Date</th>
            <th>Overall Rating</th>
            <th>Service Quality</th>
            <th>Room Quality</th>
            <th>Detailed Feedback</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody style={{ color: '#000' }}>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="8">No reviews found.</td>
            </tr>
          ) : (
            filtered.map((r) => {
              const ref = r?.booking?.referenceNumber ? `REF: ${r.booking.referenceNumber}` : '-';
              const name = r?.booking?.customerName || r?.customer?.fullName || '-';
              const date = r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-';
              const overall = `${r?.overallRating || 0} / 5`;
              const detail = r?.detailedFeedback || '';
              const short = detail.length > 40 ? detail.slice(0, 40) + '...' : detail;
              return (
                <tr key={r._id} style={{ color: '#000' }}>
                  <td>{ref}</td>
                  <td>{name}</td>
                  <td>{date}</td>
                  <td>{overall}</td>
                  <td>{renderStars(r?.serviceQuality)}</td>
                  <td>{renderStars(r?.roomQuality)}</td>
                  <td>
                    {short} {detail.length > 40 && <button onClick={() => alert(detail)} style={{ backgroundColor: '#000', color: '#fff' }}>Read more</button>}
                  </td>
                  <td>
                    <button className="delete-btn" onClick={() => setConfirmDeleteId(r._id)}>Delete</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="reviews-footer" style={{ color: '#000' }}>Showing {filtered.length} of {filtered.length} reviews</div>
      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this review record?</p>
            <p>This will also delete all related feedback about this review.</p>
            <div className="modal-actions">
              <button onClick={handleDelete}>Yes, Delete.</button>
              <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManagementAdmin;
