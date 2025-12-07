import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './ReviewsRatings.css';

function ReviewsRatings() {
  const { user } = useContext(AuthContext);
  const [pendingBookings, setPendingBookings] = useState([]); // Checked-out bookings awaiting review
  const [myReviews, setMyReviews] = useState([]); // User's submitted reviews
  const [publicReviews, setPublicReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoomType, setFilterRoomType] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterStar, setFilterStar] = useState(0);
  const [activeTab, setActiveTab] = useState('toReview');

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    overallRating: 5,
    serviceQuality: 5,
    roomQuality: 5,
    detailedFeedback: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user && user.token) {
        // Fetch both pending bookings and submitted reviews
        const [pendingResp, reviewsResp] = await Promise.all([
          axios.get(`${API_URL}/api/reviews/pending`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          axios.get(`${API_URL}/api/reviews/myreviews`, {
            headers: { Authorization: `Bearer ${user.token}` },
          })
        ]);
        setPendingBookings(Array.isArray(pendingResp.data) ? pendingResp.data : []);
        setMyReviews(Array.isArray(reviewsResp.data) ? reviewsResp.data : reviewsResp.data?.data || []);
        setActiveTab('toReview');
        setPublicReviews([]);
      } else {
        const resp = await axios.get(`${API_URL}/api/reviews/public`);
        const list = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
        setPublicReviews(list);
        setPendingBookings([]);
        setMyReviews([]);
        setActiveTab('reviews');
      }
    } catch (err) {
      if (!user || !user?.token) {
        setPublicReviews([]);
        setPendingBookings([]);
        setMyReviews([]);
        setActiveTab('reviews');
        setError(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Open review modal for a booking
  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setReviewForm({
      overallRating: 5,
      serviceQuality: 5,
      roomQuality: 5,
      detailedFeedback: ''
    });
    setShowReviewModal(true);
  };

  // Submit review to backend
  const handleSubmitReview = async () => {
    if (!selectedBooking || !user?.token) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/reviews`, {
        booking: selectedBooking._id,
        customer: user._id || user.id,
        roomNumber: selectedBooking.roomNumber,
        overallRating: reviewForm.overallRating,
        serviceQuality: reviewForm.serviceQuality,
        roomQuality: reviewForm.roomQuality,
        detailedFeedback: reviewForm.detailedFeedback
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Close modal and refresh data
      setShowReviewModal(false);
      setSelectedBooking(null);
      await loadData();
      setActiveTab('reviewed'); // Switch to reviewed tab to show the new review
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating component
  const StarRating = ({ value, onChange, label }) => (
    <div className="star-rating-input">
      <label>{label}</label>
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= value ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            style={{ cursor: 'pointer', fontSize: '24px' }}
          >
            {star <= value ? '⭐' : '☆'}
          </span>
        ))}
        <span className="rating-value">{value}/5</span>
      </div>
    </div>
  );

  if (loading) {
    return <div className="reviews-ratings-container">Loading reviews...</div>;
  }

  if (error) {
    return <div className="reviews-ratings-container">Error: {error.message}</div>;
  }

  // Filter pending bookings
  const filteredPending = (pendingBookings || []).filter((booking) => {
    const matchesRoomType = filterRoomType ? String(booking?.roomType || '').toLowerCase().includes(filterRoomType.toLowerCase()) : true;
    const matchesReference = searchReference ? String(booking?.referenceNumber || '').toLowerCase().includes(searchReference.toLowerCase()) : true;
    return matchesRoomType && matchesReference;
  });

  // Filter submitted reviews
  const filteredReviews = (myReviews || []).filter((review) => {
    const matchesRoomType = filterRoomType ? String(review?.roomNumber || review?.booking?.roomNumber || '').toLowerCase().includes(filterRoomType.toLowerCase()) : true;
    const matchesReference = searchReference ? String(review?.booking?.referenceNumber || '').toLowerCase().includes(searchReference.toLowerCase()) : true;
    const matchesStar = filterStar ? Number(review?.overallRating || 0) >= filterStar : true;
    return matchesRoomType && matchesReference && matchesStar;
  });

  const filteredPublic = (publicReviews || []).filter((r) => {
    const overall = Number(r?.overallRating ?? r?.rating ?? 0);
    const name = String(r?.customerName || r?.customername || r?.customer?.fullName || r?.customer?.name || '').toLowerCase();
    const matchesStar = filterStar ? overall >= filterStar : true;
    const matchesCustomer = searchCustomer ? name.includes(searchCustomer.toLowerCase()) : true;
    return matchesStar && matchesCustomer;
  });

  const toReviewCount = pendingBookings.length;
  const reviewedCount = myReviews.length;
  const totalPublicCount = publicReviews.length;

  return (
    <div className="my-reviews-page">
      <h1>{user && user.token ? 'My Reviews' : 'Reviews & Ratings'}</h1>
      <div className="my-reviews-content">
        <div className="filters-summary-section">
          <div className="filters-card">
            <h2>Filters</h2>
            {user && user.token ? (
              <>
                <div className="filter-group">
                  <label htmlFor="roomTypeFilter">Filter by Room Type</label>
                  <select id="roomTypeFilter" value={filterRoomType} onChange={(e) => setFilterRoomType(e.target.value)}>
                    <option value="">All Room Types</option>
                    <option value="Economy">Economy</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label htmlFor="searchReference">Search by Reference</label>
                  <input type="text" id="searchReference" value={searchReference} onChange={(e) => setSearchReference(e.target.value)} placeholder="Search by Reference" />
                </div>
              </>
            ) : (
              <div className="filter-group">
                <label htmlFor="searchCustomer">Search by Customer</label>
                <input type="text" id="searchCustomer" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} placeholder="Search by Customer" />
              </div>
            )}
            <div className="filter-group">
              <label>Filter by Star</label>
              <div className="star-filter-options">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className={`star-option ${filterStar === star ? 'selected' : ''}`} onClick={() => setFilterStar(filterStar === star ? 0 : star)}>
                    {'⭐'.repeat(star)} {star} star
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="summary-card">
            <h2>Summary</h2>
            {user && user.token ? (
              <>
                <p>To Review: <span>{toReviewCount}</span></p>
                <p>Reviewed: <span>{reviewedCount}</span></p>
              </>
            ) : (
              <p>Total Reviews: <span>{totalPublicCount}</span></p>
            )}
          </div>
        </div>

        <div className="reviews-display-section">
          {user && user.token ? (
            <>
              <div className="tabs">
                <button className={activeTab === 'toReview' ? 'active' : ''} onClick={() => setActiveTab('toReview')}>To Review ({toReviewCount})</button>
                <button className={activeTab === 'reviewed' ? 'active' : ''} onClick={() => setActiveTab('reviewed')}>Reviewed ({reviewedCount})</button>
              </div>
              <div className="reviews-list">
                {activeTab === 'toReview' ? (
                  filteredPending.length > 0 ? (
                    filteredPending.map((booking) => (
                      <div key={booking._id} className="review-card to-review-card">
                        <div className="booking-info">
                          <h3>Room {booking.roomNumber || '-'}</h3>
                          <p><strong>Room Type:</strong> {booking.roomType || '-'}</p>
                          <p><strong>Reference:</strong> {booking.referenceNumber || '-'}</p>
                          <p><strong>Check-in:</strong> {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : '-'}</p>
                          <p><strong>Check-out:</strong> {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className="review-actions">
                          <button className="submit-review-btn" onClick={() => openReviewModal(booking)}>Write a Review</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'black' }}>No bookings to review. Check back after your stay!</p>
                  )
                ) : (
                  filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <div key={review._id} className="review-card reviewed-card">
                        <h3>Room {review.roomNumber || review.booking?.roomNumber || '-'}</h3>
                        <p><strong>Date:</strong> {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '-'}</p>
                        <p><strong>Overall Rating:</strong> {'⭐'.repeat(review.overallRating || 0)} ({review.overallRating}/5)</p>
                        <p><strong>Service Quality:</strong> {'⭐'.repeat(review.serviceQuality || 0)} ({review.serviceQuality}/5)</p>
                        <p><strong>Room Quality:</strong> {'⭐'.repeat(review.roomQuality || 0)} ({review.roomQuality}/5)</p>
                        {review.detailedFeedback && <p><strong>Feedback:</strong> {review.detailedFeedback}</p>}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'black' }}>No reviews submitted yet.</p>
                  )
                )}
              </div>
            </>
          ) : (
            <>
              <div className="reviews-list">
                {filteredPublic.length > 0 ? (
                  filteredPublic.map((r) => (
                    <div key={r._id || `${r.customername}-${r.createdAt}`} className="review-card">
                      <h2>{r.customerName || r.customername || r?.customer?.fullName || r?.customer?.name || 'Anonymous'}</h2>
                      <p>Date: {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</p>
                      <p>Overall Rating: {(r.overallRating ?? r.rating ?? '-') + (r.overallRating || r.rating ? ' / 5' : '')}</p>
                      <p>Service Rating: {r.serviceQuality ?? '-'}{typeof r.serviceQuality === 'number' ? ' / 5' : ''}</p>
                      <p>Room Rating: {r.roomQuality ?? '-'}{typeof r.roomQuality === 'number' ? ' / 5' : ''}</p>
                      <p>Feedback: {r.detailedFeedback || r.comment || '-'}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'black' }}>No reviews available.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Review Your Stay</h2>
            <p className="modal-booking-info">
              <strong>Room {selectedBooking.roomNumber}</strong> ({selectedBooking.roomType})
              <br />
              Ref: {selectedBooking.referenceNumber}
            </p>

            <div className="review-form">
              <StarRating
                label="Overall Rating"
                value={reviewForm.overallRating}
                onChange={(val) => setReviewForm({ ...reviewForm, overallRating: val })}
              />
              <StarRating
                label="Service Quality"
                value={reviewForm.serviceQuality}
                onChange={(val) => setReviewForm({ ...reviewForm, serviceQuality: val })}
              />
              <StarRating
                label="Room Quality"
                value={reviewForm.roomQuality}
                onChange={(val) => setReviewForm({ ...reviewForm, roomQuality: val })}
              />

              <div className="feedback-input">
                <label>Your Feedback (Optional)</label>
                <textarea
                  value={reviewForm.detailedFeedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, detailedFeedback: e.target.value })}
                  placeholder="Tell us about your experience..."
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowReviewModal(false)} disabled={submitting}>Cancel</button>
              <button className="submit-btn" onClick={handleSubmitReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewsRatings;
