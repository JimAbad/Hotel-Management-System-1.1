import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './ReviewsRatings.css';

function ReviewsRatings() {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [publicReviews, setPublicReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoomType, setFilterRoomType] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterStar, setFilterStar] = useState(0);
  const [activeTab, setActiveTab] = useState('toReview');
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/,'');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/,'') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (user && user.token) {
          const resp = await axios.get(`${API_URL}/api/reviews/myreviews`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setReviews(Array.isArray(resp.data) ? resp.data : resp.data?.data || []);
          setActiveTab('toReview');
          setPublicReviews([]);
        } else {
          const resp = await axios.get(`${API_URL}/api/reviews/public`);
          const list = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
          setPublicReviews(list);
          setReviews([]);
          setActiveTab('reviews');
        }
      } catch (err) {
        const status = err?.response?.status;
        if (!user || !user?.token) {
          setPublicReviews([]);
          setReviews([]);
          setActiveTab('reviews');
          setError(null);
        } else {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="reviews-ratings-container">Loading reviews...</div>;
  }

  if (error) {
    return <div className="reviews-ratings-container">Error: {error.message}</div>;
  }

  const filteredReviews = (reviews || []).filter((review) => {
    const matchesRoomType = filterRoomType ? String(review?.room?.name || '').toLowerCase().includes(filterRoomType.toLowerCase()) : true;
    const matchesReference = searchReference ? String(review?.booking?.reference || '').toLowerCase().includes(searchReference.toLowerCase()) : true;
    const matchesStar = filterStar ? Number(review?.overallRating || 0) >= filterStar : true;
    const matchesTab = activeTab === 'toReview' ? !review.isReviewed : review.isReviewed;
    return matchesRoomType && matchesReference && matchesStar && matchesTab;
  });

  const filteredPublic = (publicReviews || []).filter((r) => {
    const overall = Number(r?.overallRating ?? r?.rating ?? 0);
    const name = String(r?.customerName || r?.customername || r?.customer?.fullName || r?.customer?.name || '').toLowerCase();
    const matchesStar = filterStar ? overall >= filterStar : true;
    const matchesCustomer = searchCustomer ? name.includes(searchCustomer.toLowerCase()) : true;
    return matchesStar && matchesCustomer;
  });

  const totalReviewsCount = (reviews || []).length;
  const toReviewCount = (reviews || []).filter((review) => !review.isReviewed).length;
  const totalPublicCount = (publicReviews || []).length;

  const handleSkipReview = (reviewId) => {
    // In a real application, you would update the backend to mark the review as skipped
    console.log(`Skipping review with ID: ${reviewId}`);
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review._id === reviewId ? { ...review, isReviewed: true } : review
      )
    );
  };

  const handleSubmitReview = (reviewId) => {
    // In a real application, this would navigate to a review submission form or open a modal
    console.log(`Submitting review for ID: ${reviewId}`);
    // For now, let's simulate submission by marking it as reviewed
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review._id === reviewId ? { ...review, isReviewed: true } : review
      )
    );
  };

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
                    {Array.from(new Set(reviews.map((r) => r?.room?.name).filter(Boolean))).map((roomType) => (
                      <option key={roomType} value={roomType}>{roomType}</option>
                    ))}
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
                  <div key={star} className="star-option" onClick={() => setFilterStar(star)}>
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
                <p>Total Reviews: <span>{totalReviewsCount}</span></p>
                <p>To Review: <span>{toReviewCount}</span></p>
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
                <button className={activeTab === 'toReview' ? 'active' : ''} onClick={() => setActiveTab('toReview')}>To Review</button>
                <button className={activeTab === 'reviewed' ? 'active' : ''} onClick={() => setActiveTab('reviewed')}>Reviewed</button>
              </div>
              <div className="reviews-list">
                {filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <div key={review._id} className="review-card">
                      <p>Room Type: {review?.room?.name || '-'}</p>
                      <p>REF: {review?.booking?.reference || '-'}</p>
                      <p>Booking Status: {review?.booking?.status || '-'}</p>
                      <div className="review-actions">
                        <button className="submit-review-btn" onClick={() => handleSubmitReview(review._id)}>Submit a Review</button>
                        <button className="skip-btn" onClick={() => handleSkipReview(review._id)}>Skip for now</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'black' }}>No reviews to display for the current filters.</p>
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
                      <p>Service Rating: {r.serviceQuality ?? '-' }{typeof r.serviceQuality === 'number' ? ' / 5' : ''}</p>
                      <p>Room Rating: {r.roomQuality ?? '-' }{typeof r.roomQuality === 'number' ? ' / 5' : ''}</p>
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
    </div>
  );
}

export default ReviewsRatings;
