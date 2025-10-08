import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import './ReviewsRatings.css';

function ReviewsRatings() {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoomType, setFilterRoomType] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [filterStar, setFilterStar] = useState(0);
  const [activeTab, setActiveTab] = useState('toReview'); // 'toReview' or 'reviewed'

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user || !user.token) {
        setLoading(false);
        setError({ message: 'Please log in to view reviews.' });
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reviews/myreviews`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setReviews(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  if (loading) {
    return <div className="reviews-ratings-container">Loading reviews...</div>;
  }

  if (error) {
    return <div className="reviews-ratings-container">Error: {error.message}</div>;
  }

  // Filter reviews based on state
  const filteredReviews = reviews.filter(review => {
    const matchesRoomType = filterRoomType ? review.room.name.toLowerCase().includes(filterRoomType.toLowerCase()) : true;
    const matchesReference = searchReference ? review.booking.reference.toLowerCase().includes(searchReference.toLowerCase()) : true;
    const matchesStar = filterStar ? review.overallRating >= filterStar : true;
    const matchesTab = activeTab === 'toReview' ? !review.isReviewed : review.isReviewed; // Assuming 'isReviewed' field

    return matchesRoomType && matchesReference && matchesStar && matchesTab;
  });

  const totalReviewsCount = reviews.length;
  const toReviewCount = reviews.filter(review => !review.isReviewed).length; // Assuming 'isReviewed' field

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
      <h1>My Reviews</h1>
      <div className="my-reviews-content">
        <div className="filters-summary-section">
          <div className="filters-card">
            <h2>Filters</h2>
            <div className="filter-group">
              <label htmlFor="roomTypeFilter">Filter by Room Type</label>
              <select
                id="roomTypeFilter"
                value={filterRoomType}
                onChange={(e) => setFilterRoomType(e.target.value)}
              >
                <option value="">All Room Types</option>
                {/* Populate with unique room types from reviews */}
                {Array.from(new Set(reviews.map(review => review.room.name))).map(roomType => (
                  <option key={roomType} value={roomType}>{roomType}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="searchReference">Search by Reference</label>
              <input
                type="text"
                id="searchReference"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                placeholder="Search by Reference"
              />
            </div>
            <div className="filter-group">
              <label>Filter by Star</label>
              <div className="star-filter-options">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="star-option" onClick={() => setFilterStar(star)}>
                    {'⭐'.repeat(star)} {star} star
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="summary-card">
            <h2>Summary</h2>
            <p>Total Reviews: <span>{totalReviewsCount}</span></p>
            <p>To Review: <span>{toReviewCount}</span></p>
          </div>
        </div>

        <div className="reviews-display-section">
          <div className="tabs">
            <button
              className={activeTab === 'toReview' ? 'active' : ''}
              onClick={() => setActiveTab('toReview')}
            >
              To Review
            </button>
            <button
              className={activeTab === 'reviewed' ? 'active' : ''}
              onClick={() => setActiveTab('reviewed')}
            >
              Reviewed
            </button>
          </div>
          <div className="reviews-list">
            {filteredReviews.length > 0 ? (
              filteredReviews.map(review => (
                <div key={review._id} className="review-card">
                  <p>Room Type: {review.room.name}</p>
                  <p>REF: {review.booking.reference}</p>
                  <p>Booking Status: {review.booking.status}</p>
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
        </div>
      </div>
    </div>
  );
}

export default ReviewsRatings;