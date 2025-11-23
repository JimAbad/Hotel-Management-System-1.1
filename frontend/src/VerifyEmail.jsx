import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';

function VerifyEmail() {
  const location = useLocation();
  const [status, setStatus] = useState({ loading: true, success: null, message: '' });
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1backend.onrender.com';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    async function verify() {
      if (!token) {
        setStatus({ loading: false, success: false, message: 'Missing token' });
        return;
      }
      try {
        const url = `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
        const res = await axios.get(url);
        setStatus({ loading: false, success: true, message: res.data?.msg || 'Email verified successfully' });
      } catch (err) {
        const msg = err.response?.data?.msg || 'Verification failed';
        setStatus({ loading: false, success: false, message: msg });
      }
    }

    verify();
  }, [location.search]);

  return (
    <div style={{ paddingTop: '8rem', minHeight: 'calc(100vh - 6rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: '2rem', borderRadius: '8px', maxWidth: '520px', textAlign: 'center' }}>
        {status.loading && <p>Verifying your email...</p>}
        {!status.loading && status.success && (
          <>
            <h2 style={{ marginBottom: '1rem' }}>Email Verified</h2>
            <p style={{ marginBottom: '1.5rem' }}>{status.message}</p>
            <Link to="/login" style={{ display: 'inline-block', padding: '10px 16px', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>Go to Login</Link>
          </>
        )}
        {!status.loading && status.success === false && (
          <>
            <h2 style={{ marginBottom: '1rem' }}>Verification Failed</h2>
            <p style={{ marginBottom: '1.5rem' }}>{status.message}</p>
            <Link to="/login" style={{ display: 'inline-block', padding: '10px 16px', background: '#ef4444', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;