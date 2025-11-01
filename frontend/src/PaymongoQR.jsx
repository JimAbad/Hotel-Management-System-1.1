import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const PaymongoQR = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [imageUrl, setImageUrl] = useState('/src/img/qrph.jpg');
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('processing');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [pollId, setPollId] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const config = {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };

    const initiate = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/paymongo/qrph`, { bookingId }, config);
        const url = resp.data?.imageUrl;
        const exp = resp.data?.expiresAt;
        if (url) setImageUrl(url);
        if (exp) setExpiresAt(exp);
      } catch (err) {
        console.warn('Failed to initiate PayMongo QRPh, using fallback:', err?.response?.data || err?.message);
        setError('Failed to load dynamic QR, using static fallback.');
      } finally {
        setLoading(false);
      }
    };

    const startPoll = () => {
      const id = setInterval(async () => {
        try {
          const details = await axios.get(`${import.meta.env.VITE_API_URL}/api/payment/paymongo-details/${bookingId}`, config);
          const latestBooking = details.data?.booking;
          const paymentStatus = latestBooking?.paymentStatus;
          setStatus(paymentStatus || 'processing');

          if (paymentStatus === 'paid' || paymentStatus === 'partial') {
            clearInterval(id);
            setPollId(null);
            setResultMessage(paymentStatus === 'partial' ? 'Downpayment received (10%). Booking confirmed.' : 'Booking Successful! Your payment has been confirmed.');
            setShowResultModal(true);
          } else if (paymentStatus === 'failed') {
            clearInterval(id);
            setPollId(null);
            setResultMessage('Payment Failed. Please try again or use another method.');
            setShowResultModal(true);
          } else if (paymentStatus === 'expired') {
            clearInterval(id);
            setPollId(null);
            setResultMessage('QR expired. Please generate a new QR to retry.');
            setShowResultModal(true);
          }
        } catch (pollErr) {
          console.error('Error polling PayMongo payment status:', pollErr);
        }
      }, 3000);
      setPollId(id);
    };

    initiate().then(startPoll);

    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [bookingId, token, user]);

  const closeModal = () => {
    setShowResultModal(false);
    if (status === 'paid') {
      navigate('/my-bookings');
    } else {
      navigate('/rooms');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div style={{ padding: '20px', paddingTop: '6rem' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleBack} style={{ padding: '8px 12px' }}>← Back</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '520px', width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '24px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333', textAlign: 'center' }}>Scan to Pay (QR Ph)</h2>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading QR...</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <img src={imageUrl} alt="QR Ph" style={{ maxWidth: '320px', borderRadius: '8px' }} />
              </div>
              <p style={{ textAlign: 'center', color: '#333' }}>{expiresAt ? `Expires at: ${new Date(expiresAt).toLocaleString()}` : 'QR expires in ~30 minutes.'}</p>
              {error && <p style={{ textAlign: 'center', color: '#b00' }}>{error}</p>}
              <p style={{ textAlign: 'center', color: '#555' }}>Open your banking app and scan the QR to pay. This page will update automatically when payment completes, fails, or expires.</p>
            </>
          )}
        </div>
      </div>

      {showResultModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>{status === 'paid' || status === 'partial' ? 'Booking Confirmed' : status === 'expired' ? 'QR Expired' : 'Payment Failed'}</h3>
            <p>{resultMessage}</p>
            <div style={{ marginTop: '16px' }}>
              <button onClick={closeModal} style={{ padding: '10px 16px' }}>{status === 'paid' || status === 'partial' ? 'View My Bookings' : 'Back to Rooms'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymongoQR;