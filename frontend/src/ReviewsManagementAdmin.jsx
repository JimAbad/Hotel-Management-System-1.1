import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ReviewsManagementAdmin = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editedComment, setEditedComment] = useState('');
  const [editedRating, setEditedRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tokenAdmin');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get('/api/reviews', config);
      setReviews(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        const token = localStorage.getItem('tokenAdmin');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        await axios.delete(`/api/reviews/${reviewId}`, config);
        fetchReviews();
      } catch (err) {
        console.error("Error deleting review:", err);
        setError(err.message);
      }
    }
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setEditedComment(review.comment);
    setEditedRating(review.rating);
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('tokenAdmin');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.put(`/api/reviews/${editingReview._id}`, { comment: editedComment, rating: editedRating }, config);
      setEditingReview(null);
      setEditedComment('');
      setEditedRating(0);
      fetchReviews();
    } catch (err) {
      console.error("Error updating review:", err);
      setError(err.message);
    }
  };

  if (loading) return <div>Loading reviews...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="reviews-management-admin">
      <h1>Reviews Management</h1>
      {editingReview && (
        <div className="edit-review-form">
          <h2>Edit Review</h2>
          <textarea
            value={editedComment}
            onChange={(e) => setEditedComment(e.target.value)}
            rows="4"
            cols="50"
          ></textarea>
          <input
            type="number"
            value={editedRating}
            onChange={(e) => setEditedRating(Number(e.target.value))}
            min="1"
            max="5"
          />
          <button onClick={handleUpdate}>Update Review</button>
          <button onClick={() => setEditingReview(null)}>Cancel</button>
        </div>
      )}
      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p>No reviews found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Room</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.user?.username || 'N/A'}</td>
                  <td>{review.room?.roomNumber || 'N/A'}</td>
                  <td>{review.rating}</td>
                  <td>{review.comment}</td>
                  <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(review)} className="edit-btn">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(review._id)} className="delete-btn">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagementAdmin;