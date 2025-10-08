import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileInvoiceDollar, FaEye, FaReceipt } from 'react-icons/fa';
import './Billing.css';

const Billing = () => {
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/billings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setBillings(response.data.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch billing data. Please try again later.');
      setLoading(false);
      console.error('Error fetching billings:', err);
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'partial':
        return 'status-partial';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading billing information...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h2><FaFileInvoiceDollar /> My Billings</h2>
        <p>View and manage your billing information</p>
      </div>

      {billings.length === 0 ? (
        <div className="no-billings">
          <p>You don't have any billing records yet.</p>
        </div>
      ) : (
        <div className="billing-list">
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Room</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {billings.map((bill) => (
                <tr key={bill._id}>
                  <td>{bill._id.substring(0, 8)}...</td>
                  <td>{bill.room ? `Room ${bill.room.roomNumber}` : 'N/A'}</td>
                  <td>{bill.description}</td>
                  <td>₱{bill.amount.toFixed(2)}</td>
                  <td><span className={getStatusClass(bill.status)}>{bill.status}</span></td>
                  <td>{formatDate(bill.createdAt)}</td>
                  <td>
                    <button 
                      className="view-bill-btn" 
                      onClick={() => handleViewBill(bill)}
                    >
                      <FaEye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Detail Modal */}
      {showBillModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-content bill-modal">
            <div className="modal-header">
              <h3><FaReceipt /> Bill Details</h3>
              <button onClick={() => setShowBillModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="bill-details">
                <div className="bill-header">
                  <h4>Lumine Hotel</h4>
                  <p>123 Beach Road, Boracay Island</p>
                  <p>Philippines</p>
                </div>
                
                <div className="bill-info">
                  <div className="bill-row">
                    <span>Bill ID:</span>
                    <span>{selectedBill._id}</span>
                  </div>
                  <div className="bill-row">
                    <span>Date:</span>
                    <span>{formatDate(selectedBill.createdAt)}</span>
                  </div>
                  <div className="bill-row">
                    <span>Room:</span>
                    <span>{selectedBill.room ? `Room ${selectedBill.room.roomNumber} (${selectedBill.room.roomType})` : 'N/A'}</span>
                  </div>
                  {selectedBill.booking && (
                    <>
                      <div className="bill-row">
                        <span>Check-in:</span>
                        <span>{selectedBill.booking.checkInDate ? formatDate(selectedBill.booking.checkInDate) : 'N/A'}</span>
                      </div>
                      <div className="bill-row">
                        <span>Check-out:</span>
                        <span>{selectedBill.booking.checkOutDate ? formatDate(selectedBill.booking.checkOutDate) : 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="bill-items">
                  <h5>Bill Items</h5>
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedBill.description}</td>
                        <td>₱{selectedBill.amount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>₱{selectedBill.amount.toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="bill-status">
                  <p>Payment Status: <span className={getStatusClass(selectedBill.status)}>{selectedBill.status}</span></p>
                  {selectedBill.paymentMethod && (
                    <p>Payment Method: {selectedBill.paymentMethod}</p>
                  )}
                </div>
                
                <div className="bill-footer">
                  <p>Thank you for choosing Lumine Hotel!</p>
                  <p>For inquiries, please contact us at support@luminehotel.com</p>
                </div>
              </div>
              
              <div className="bill-actions">
                <button className="print-bill-btn" onClick={() => window.print()}>
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;