import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaEye, FaCheck } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ViewCustomerBillAdmin.css';

const ViewCustomerBillAdmin = () => {
  const { tokenAdmin } = useAuthAdmin();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState(null);

  // Fetch all customer bills
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('tokenAdmin');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const { data } = await axios.get('/api/customer-bills', config);
        setBills(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  // Filter + Search
  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(search.toLowerCase()) ||
      bill.specialId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus ? bill.paymentStatus === filterStatus : true;
    return matchesSearch && matchesFilter;
  });

  // Handle mark as paid
  const handleMarkAsPaid = async (id) => {
    try {
      const token = localStorage.getItem('tokenAdmin');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.put(`/api/customer-bills/${id}/mark-paid`, {}, config);
      alert('Payment status updated to Paid!');
      setBills((prev) =>
        prev.map((bill) =>
          bill._id === id ? { ...bill, paymentStatus: 'Paid' } : bill
        )
      );
    } catch (err) {
      alert('Failed to update payment status.');
    }
  };

  if (loading) return <div className="view-customer-bill-container">Loading bills...</div>;
  if (error) return <div className="view-customer-bill-container">Error: {error}</div>;

  return (
    <div className="view-customer-bill-container">
      <h1>Customer Bills</h1>

      {/* Search & Filter */}
      <div className="controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or booking ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
        </select>
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

      {/* Table */}
      <table className="bill-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Room</th>
            <th>Total (₱)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBills.length > 0 ? (
            filteredBills.map((bill) => (
              <tr key={bill._id}>
                <td>{bill.specialId}</td>
                <td>{bill.customerName}</td>
                <td>{bill.customerEmail}</td>
                <td>{bill.room}</td>
                <td>{bill.totalAmount?.toFixed(2)}</td>
                <td>
                  <span
                    className={`status-badge ${
                      bill.paymentStatus === 'Paid' ? 'paid' : 'partial'
                    }`}
                  >
                    {bill.paymentStatus}
                  </span>
                </td>
                <td className="action-buttons">
                  <button
                    className="view-btn"
                    onClick={() => (window.location.href = `/admin/viewbill/${bill._id}`)}
                  >
                    <FaEye /> View Bill
                  </button>
                  {bill.paymentStatus !== 'Paid' && (
                    <button
                      className="paid-btn"
                      onClick={() => handleMarkAsPaid(bill._id)}
                    >
                      <FaCheck /> Mark as Paid
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>
                No bills found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default ViewCustomerBillAdmin;
