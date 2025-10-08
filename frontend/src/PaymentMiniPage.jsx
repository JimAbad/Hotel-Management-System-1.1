import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from './AuthContext';

function PaymentMiniPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [room, setRoom] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    customerName: '',
    customerEmail: '',
    checkInDate: '',
    checkOutDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }

    const fetchRoom = async () => {
      try {
        const response = await axios.get(`/rooms/${id}`);
        setRoom(response.data);
      } catch (err) {
        setError('Failed to fetch room details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id, navigate, user]);

  const handleBookingChange = (e) => {
    setBookingDetails({ ...bookingDetails, [e.target.name]: e.target.value });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    console.log('handleBookingSubmit called');
    try {
      // First, create the booking
      console.log('Attempting to create booking...');
      const bookingResponse = await axios.post('http://localhost:3000/bookings', {
        roomId: room._id,
        ...bookingDetails,
      });

      const bookingId = bookingResponse.data._id;
      console.log('Booking created with ID:', bookingId);

      // Then, confirm the payment for the created booking
      console.log('Attempting to confirm payment...');
      const paymentResponse = await axios.post('http://localhost:3000/api/payment/confirm', {
        bookingId,
        paymentDetails: { /* You can add actual payment details here if collected */ },
      });

      navigate('/payment-status', { state: { success: true, booking: paymentResponse.data.booking } });
    } catch (err) {
      console.error('Error in handleBookingSubmit:', err);
      setError(err.response?.data?.message || 'Failed to process payment.');
      navigate('/payment-status', { state: { success: false, error: err.response?.data?.message || 'Failed to process payment.' } });
    }
  };

  if (loading) {
    return <div className="container">Loading room details...</div>;
  }

  if (error) {
    return <div className="container error-message">{error}</div>;
  }

  if (!room) {
    return <div className="container">Room not found.</div>;
  }

  return (
    <div className="container">
      <h2>Book Room: {room.type}</h2>
      <p>Price: ${room.price}</p>
      <form onSubmit={handleBookingSubmit}>
        <div className="form-group">
          <label>Your Name:</label>
          <input
            type="text"
            name="customerName"
            value={bookingDetails.customerName}
            onChange={handleBookingChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Your Email:</label>
          <input
            type="email"
            name="customerEmail"
            value={bookingDetails.customerEmail}
            onChange={handleBookingChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Check-in Date:</label>
          <input
            type="date"
            name="checkInDate"
            value={bookingDetails.checkInDate}
            onChange={handleBookingChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Check-out Date:</label>
          <input
            type="date"
            name="checkOutDate"
            value={bookingDetails.checkOutDate}
            onChange={handleBookingChange}
            required
          />
        </div>
        <button type="submit">Confirm Payment</button>
      </form>
    </div>
  );
}

export default PaymentMiniPage;