import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaTrash, FaStar, FaRegStar } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ViewCustomerBillAdmin.css';

const ReviewsManagementAdmin = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [sortDate, setSortDate] = useState('newest');
  const [sortRating, setSortRating] = useState('high');
  const [confirmId, setConfirmId] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { token } = useAuthAdmin();
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1-backend.onrender.com';

  useEffect(() => {
    fetchReviews();
  }, [token]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/reviews`, config);
      const arr = Array.isArray(data) ? data : data?.data || [];
      setReviews(arr);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    setConfirmId(reviewId);
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/reviews/${confirmId}`, config);
      setConfirmId(null);
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetControls = () => {
    setSearch('');
    setFilterRating('');
    setSortDate('newest');
    setSortRating('high');
  };

  const normalized = (reviews || []).map((r) => ({
    _id: r._id,
    referenceNumber: r?.booking?.referenceNumber || r?.referenceNumber || r?.referencenumber || '-',
    customerName: r?.customer?.fullName || r?.customername || '-',
    createdAt: r?.createdAt,
    overallRating: r?.overallRating ?? r?.rating ?? 0,
    serviceQuality: r?.serviceQuality ?? 0,
    roomQuality: r?.roomQuality ?? 0,
    detailedFeedback: r?.detailedFeedback || r?.comment || '',
  }));

  const filtered = normalized.filter((item) => {
    const s = search.trim().toLowerCase();
    const okSearch = s
      ? String(item.referenceNumber || '').toLowerCase().includes(s) || String(item.customerName || '').toLowerCase().includes(s)
      : true;
    const okRating = filterRating ? Number(item.overallRating || 0) === Number(filterRating) : true;
    return okSearch && okRating;
  });

  const sortedByDate = [...filtered].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return sortDate === 'newest' ? db - da : da - db;
  });

  const displayed = [...sortedByDate].sort((a, b) => {
    const ra = Number(a.overallRating || 0);
    const rb = Number(b.overallRating || 0);
    return sortRating === 'high' ? rb - ra : ra - rb;
  });

  const renderStars = (n) => {
    const val = Number(n || 0);
    return (
      <span className="stars">
        {Array.from({ length: 5 }).map((_, i) => (i < val ? <FaStar key={i} /> : <FaRegStar key={i} />))}
      </span>
    );
  };

  const formatRef = (x) => {
    if (!x) return '-';
    const s = String(x);
    return s.startsWith('REF:') ? s : `REF: ${s}`;
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setEditedComment(review.comment);
    setEditedRating(review.rating);
  };

  const handleUpdate = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.put(`${API_URL}/api/reviews/${editingReview._id}`, { comment: editedComment, rating: editedRating }, config);
      setEditingReview(null);
      setEditedComment('');
      setEditedRating(0);
      fetchReviews();
    } catch (err) {
      console.error("Error updating review:", err);
      setError(err.message);
    }
  };

  if (loading) return <div className="view-customer-bill-container">Loading reviews...</div>;
  if (error) return <div className="view-customer-bill-container">Error: {error}</div>;

  return (
    <div className="view-customer-bill-container">
      <div className="reviews-card">
        <h1 className="reviews-title">Reviews Management</h1>
        <div className="controls">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Reference or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
            <option value="">Rating</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <select className="filter-select" value={sortDate} onChange={(e) => setSortDate(e.target.value)}>
            <option value="newest">Sort By Date: Newest</option>
            <option value="oldest">Sort By Date: Oldest</option>
          </select>
          <select className="filter-select" value={sortRating} onChange={(e) => setSortRating(e.target.value)}>
            <option value="high">Sort By Rating: High to Low</option>
            <option value="low">Sort By Rating: Low to High</option>
          </select>
          <button className="reset-pill" onClick={resetControls}>Reset</button>
        </div>

        <table className="bill-table">
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
          <tbody>
          {displayed.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ color: 'black' }}>No reviews found.</td>
            </tr>
          ) : (
            displayed.map((r) => (
              <tr key={r._id}>
                <td style={{ color: 'black' }}>{formatRef(r.referenceNumber)}</td>
                <td style={{ color: 'black' }}>{r.customerName || '-'}</td>
                <td style={{ color: 'black' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                <td style={{ color: 'black' }}>{r.overallRating ? `${r.overallRating} / 5` : '-'}</td>
                <td style={{ color: 'black' }}>{renderStars(r.serviceQuality)}</td>
                <td style={{ color: 'black' }}>{renderStars(r.roomQuality)}</td>
                <td style={{ color: 'black' }}>
                  {(() => {
                    const full = r.detailedFeedback || '-';
                    const isLong = full.length > 80;
                    const showFull = !!expanded[r._id];
                    const text = isLong && !showFull ? `${full.slice(0, 80)}…` : full;
                    return (
                      <span>
                        {text} {isLong && (
                          <button type="button" className="read-more" onClick={() => toggleExpand(r._id)}>
                            {showFull ? 'Read less' : 'Read more'}
                          </button>
                        )}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  <button onClick={() => handleDelete(r._id)} className="delete-btn">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>

      {confirmId && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3 style={{ color: 'black' }}>Confirm Deletion</h3>
            <p style={{ color: 'black' }}>Are you sure you want to delete this review record?</p>
            <p style={{ color: 'black' }}>This will also delete all related feedback about this review.</p>
            <div className="confirm-actions">
              <button className="btn-yes" onClick={confirmDelete}>Yes, Delete.</button>
              <button className="btn-cancel" onClick={() => setConfirmId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManagementAdmin;
