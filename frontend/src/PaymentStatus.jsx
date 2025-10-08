import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './PaymentStatus.css'; // Import the CSS file

const PaymentStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error, booking, customerAccountId } = location.state || {};

  const handleDoneClick = () => {
    navigate('/');
  };

  return (
    <div className="payment-status-container">
      {success ? (
        <div className="payment-success">
          <div className="back-button-container">
            <button onClick={() => navigate(-1)} className="back-button">
              ← Back
            </button>
          </div>
          <div className="confirmation-header">
            <span className="check-icon">✔️</span>
            <h1>Booking Confirmed</h1>
          </div>
          <p className="check-in-message">You're all set! 
            <br></br> You can check all your bookings in My Bookings page.
          </p>
          <div className="booking-reference-section">
            <p>Booking reference</p>
            <div className="booking-reference-box">
              {booking?._id}
            </div>
          </div>
          <div className="check-in-info">
            <h2>Check-in information</h2>
            <ul>
              <li>Bring this reference number at the front desk for confirmation.</li>
              <li>Cancellation: Until 48 hours before check-in; and you will pay 10% of room's price as reservation fee.</li>
            </ul>
          </div>
          <button onClick={handleDoneClick} className="done-button">Done</button>
        </div>
      ) : (
        <div className="payment-failure">
          <h1>Payment Failed!</h1>
          <p>{error || 'There was an issue processing your payment. Please try again.'}</p>
          <Link to="/">Go to Home</Link>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;