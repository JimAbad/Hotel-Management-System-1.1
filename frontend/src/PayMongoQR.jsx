import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from './AuthContext';
import './PayMongoQR.css';
import qrph from '/images/qrph.jpg';
// Using public asset for robust path resolution across dev servers

function PayMongoQR() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  // Helper to format pesos with commas
  const formatPrice = (amount) => {
    if (typeof amount !== 'number') return amount;
    return amount.toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    });
  };

  // Poll PayMongo payment details to know when paid
  const fetchPaymentDetails = async (isInterval = false) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/payment/paymongo-details/${bookingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data?.data || {};
      setPaymentData(data);
      // If paid, stop polling
      if (data.paymentStatus === 'paid' || data.paymentStatus === 'partial') {
        setPollCount(-1); // stop further polling
      }
    } catch (err) {
      if (!isInterval) {
        setError(err?.response?.data?.message || err.message || 'Failed to fetch payment details');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create PayMongo source if none exists
  const createPayMongoSource = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/create-paymongo-source`, {
        bookingId,
        amount: paymentData?.totalAmount,
        type: 'qrph',
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data?.data;
      // Merge new source info into paymentData
      setPaymentData((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to create PayMongo source:', err?.response?.data || err.message);
      setError(err?.response?.data?.message || err.message || 'Failed to create PayMongo source');
    }
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, [bookingId]);

  // Set up polling every 10 seconds if not yet paid
  useEffect(() => {
    if (pollCount === -1) return; // stop polling
    const interval = setInterval(() => {
      setPollCount((c) => c + 1);
      fetchPaymentDetails(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [pollCount]);

  // Trigger source creation when initial details loaded
  useEffect(() => {
    if (!loading && paymentData && !paymentData.paymongoSourceId && paymentData.paymentStatus === 'pending') {
      createPayMongoSource();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paymentData]);

  if (loading) {
    return <div className="paymongo-qr-container"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="paymongo-qr-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="paymongo-qr-container">
        <p>No payment information found.</p>
      </div>
    );
  }

  const { paymongoSourceId, paymentStatus, paymentAmount, totalAmount } = paymentData;
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'partial';


  return (
    <div className="paymongo-qr-container">
      <h1>PayMongo Payment</h1>
      {isPaid ? (
        <div className="payment-success">
          <h2>Payment Successful!</h2>
          <p>Your payment of {formatPrice(paymentAmount || totalAmount)} has been received.</p>
          <button onClick={() => navigate('/my-bookings')}>Go to My Bookings</button>
        </div>
      ) : (
        <div className="payment-pending">
          <p>Please complete your payment by scanning the QR code below using your preferred e-wallet app.</p>
          <img src={qrph} alt="PayMongo QR Code" className="qr-code-img" />
          <p>Payment Status: {paymentStatus}</p>
          <button onClick={() => fetchPaymentDetails()}>Refresh Status</button>
        </div>
      )}
    </div>
  );
}

export default PayMongoQR;