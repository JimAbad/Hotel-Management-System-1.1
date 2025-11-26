import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaEye, FaCheck } from 'react-icons/fa';
import { useAuthAdmin } from './AuthContextAdmin';
import './ViewCustomerBillAdmin.css';

const ViewCustomerBillAdmin = () => {
  const { token } = useAuthAdmin();
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();
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
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const { data } = await axios.get(`${API_URL}/api/customer-bills`, config);
        setBills(data);
      } catch (error) {
        console.error('Failed to load bills', error);
        setError('Failed to load bills');
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [API_URL, token]);

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
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.put(`${API_URL}/api/customer-bills/${id}/mark-paid`, {}, config);
      alert('Payment status updated to Paid!');
      setBills((prev) =>
        prev.map((bill) =>
          bill._id === id ? { ...bill, paymentStatus: 'Paid' } : bill
        )
      );
    } catch (err) {
      console.error('Error marking bill as paid', err);
      alert('Failed to update payment status.');
    }
  };

  const peso = v => '₱' + Number(v || 0).toLocaleString('en-PH');

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
                <td>
                  <p><strong>Total:</strong> {peso(bill.total || bill.totalAmount)}</p>
                  <p><strong>Room Rate:</strong> ₱{Number(bill.roomRate || 0).toLocaleString()}</p>
                  <p><strong>Extras:</strong> ₱{Number(bill.extrasTotal || 0).toLocaleString()}</p>
                </td>
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
