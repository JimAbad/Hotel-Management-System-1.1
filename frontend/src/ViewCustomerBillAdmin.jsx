import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const ViewCustomerBill = () => {
  const { bookingId } = useParams();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('tokenAdmin');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const { data } = await axios.get(`/api/customer-bills/${bookingId}`, config);
        setBillData(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBill();
    }
  }, [bookingId]);

  if (loading) return <div className="view-customer-bill-container">Loading bill...</div>;
  if (error) return <div className="view-customer-bill-container">Error: {error}</div>;
  if (!billData) return <div className="view-customer-bill-container">No bill data available.</div>;

  return (
    <div className="view-customer-bill-container">
      <div className="bill-details">
        <h1>Customer Bill</h1>
        <div className="bill-info">
          <p><strong>Booking ID:</strong> {billData.specialId}</p>
          <p><strong>Customer Name:</strong> {billData.customerName}</p>
          <p><strong>Customer Email:</strong> {billData.customerEmail}</p>
          <p><strong>Room Number:</strong> {billData.room}</p>
          <p><strong>Check-in Date:</strong> {new Date(billData.checkInDate).toLocaleDateString()}</p>
          <p><strong>Check-out Date:</strong> {new Date(billData.checkOutDate).toLocaleDateString()}</p>
        </div>

        <h2>Bill Items</h2>
        <table className="bill-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {billData.data && billData.data.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td>₱{item.amount?.toFixed(2) || '0.00'}</td>
              </tr>
            ))}
            <tr>
              <td><strong>Total Room Charges:</strong></td>
              <td>₱{billData.totalRoomCharges?.toFixed(2) || '0.00'}</td>
            </tr>
            <tr>
              <td><strong>Total Extra Charges:</strong></td>
              <td>₱{billData.totalExtraCharges?.toFixed(2) || '0.00'}</td>
            </tr>
            <tr>
              <td><strong>Paid Amount:</strong></td>
              <td>₱{billData.paidAmount?.toFixed(2) || '0.00'}</td>
            </tr>
            <tr>
              <td><strong>Remaining Balance:</strong></td>
              <td>₱{billData.remainingBalance?.toFixed(2) || '0.00'}</td>
            </tr>
          </tbody>
        </table>

        <p><strong>Payment Status:</strong> {billData.paymentStatus}</p>
      </div>
    </div>
  );
};

export default ViewCustomerBill;