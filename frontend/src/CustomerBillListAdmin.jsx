import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CustomerBillList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const token = localStorage.getItem('tokenAdmin'); // Get tokenAdmin from local storage
        const response = await axios.get('/api/customer-bills', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }); // Assuming an API endpoint for all bills
        setBills(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  if (loading) {
    return <div className="loading">Loading customer bills...</div>;
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }

  return (
    <div className="customer-bill-list-container">
      <h2>All Customer Bills</h2>
      {bills.length === 0 ? (
        <p>No customer bills found.</p>
      ) : (
        <table className="customer-bill-table">
          <thead>
            <tr>
              <th>Bill ID</th>
              <th>Booking ID</th>
              <th>Customer Name</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill._id}>
                <td>{bill._id}</td>
                <td>{bill.bookingId}</td>
                <td>{bill.customerName}</td>
                <td>${bill.totalAmount?.toFixed(2) || '0.00'}</td>
                <td>{bill.status}</td>
                <td>
                  <Link to={`/admin/view-customer-bill/${bill.bookingId}`} className="view-details-link">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CustomerBillList;