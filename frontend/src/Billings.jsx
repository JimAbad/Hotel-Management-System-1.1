import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { FaFileInvoiceDollar, FaEye, FaReceipt, FaPrint } from 'react-icons/fa';
import './Billings.css';

function Billings() {
  const { user, token } = useContext(AuthContext);
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billsByRoom, setBillsByRoom] = useState({});

  useEffect(() => {
    fetchBillings();
  }, [user, token]);

  const fetchBillings = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Please log in to view your billing information.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/billings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const bills = response.data.data;
      setBillings(bills);
      
      // Group bills by room number
      const grouped = bills.reduce((acc, bill) => {
        const roomNum = bill.roomNumber;
        if (!acc[roomNum]) {
          acc[roomNum] = [];
        }
        acc[roomNum].push(bill);
        return acc;
      }, {});
      
      setBillsByRoom(grouped);
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
    return <div className="error">{error.message || error}</div>;
  }

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h2 style={{ color: '#B8860B' }}> My Billings</h2>
      </div>

      {/* Bills Grouped by Room */}
      {Object.keys(billsByRoom).length === 0 ? (
        <div className="no-billings">
          <p>You don't have any billing records yet.</p>
        </div>
      ) : (
        <div className="room-grouped-bills">
          {Object.entries(billsByRoom).map(([roomNumber, roomBills]) => (
            <div key={roomNumber} className="room-bill-group">
              <div className="room-header">
                <h3>Room {roomNumber}</h3>
              </div>
              <div className="room-bills-table">
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
                    {roomBills.map((bill) => (
                      <tr key={bill._id}>
                        <td>{bill._id.substring(0, 8)}...</td>
                        <td>{bill.roomNumber}</td>
                        <td>{bill.description}</td>
                        <td>₱{bill.amount.toFixed(2)}</td>
                        <td><span className={getStatusClass(bill.status)}>{bill.status}</span></td>
                        <td>{formatDate(bill.createdAt)}</td>
                        <td>
                          <button 
                            className="view-bill-btn" style={{ backgroundColor: '#B8860B', color: 'white' }}
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
            </div>
          ))}
        </div>
      )}
      

      {/* Bill Detail Modal */}
      {showBillModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-content bill-modal">
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  }}
>
  <button
    onClick={() => setShowBillModal(false)}
    style={{
      color: 'white',
      position: 'absolute',
      left: 0,
      background: '#B8860B',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
    }}
  >
Back
  </button>

  <h3 style={{ margin: 0 }}>
    <FaReceipt /> Bill Details
  </h3>
</div>


            <div className="modal-body">
  <div className="bill-details">
    {/* Header section */}
    <div
      className="bill-header"
      style={{ textAlign: 'center', marginBottom: '20px' }}
    >
      <h4 style={{ margin: 0 }}>Lumine Hotel</h4>
      <p style={{ margin: 0 }}></p>
      <p style={{ margin: 0 }}></p>
    </div>
<br></br>
<br></br>
<br></br>
    {/* Bill info section */}
    <div
      className="bill-info"
      style={{ textAlign: 'left', marginLeft: '10px' }}
    >
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
        <span>
          {selectedBill.roomNumber
            ? `Room ${selectedBill.roomNumber}`
            : 'N/A'}
        </span>
      </div>

      {selectedBill.booking && (
        <>
          <div className="bill-row">
            <span>Check-in:</span>
            <span>
              {selectedBill.booking.checkInDate
                ? formatDate(selectedBill.booking.checkInDate)
                : 'N/A'}
            </span>
          </div>
          <div className="bill-row">
            <span>Check-out:</span>
            <span>
              {selectedBill.booking.checkOutDate
                ? formatDate(selectedBill.booking.checkOutDate)
                : 'N/A'}
            </span>
          </div>
        </>
      )}
    </div>
  </div>
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
                
           <div className="bill-status" style={{ textAlign: 'left', marginLeft: '10px' }}>
  <p>
    Payment Status:{' '}
    <span className={getStatusClass(selectedBill.status)}>
      {selectedBill.status}
    </span>
  </p>
  {selectedBill.paymentMethod && (
    <p>Payment Method: {selectedBill.paymentMethod}</p>
  )}
</div>

<div
  className="bill-footer"
  style={{
    textAlign: 'left',
    marginLeft: '10px',
    marginTop: '20px',
    position: 'relative',
  }}
>
  <p>Thank you for choosing Lumine Hotel!</p>
  

 
   <p> {/* for inquiries, please contact us at support@luminehotel.com */}</p>
 

  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
  <button
    style={{
      backgroundColor: '#B8860B',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
    }}
    onClick={() => window.print()}
  >
    <FaPrint /> Print Bill
  </button>
</div>

</div>

              </div>
              
            </div>
        
     
      )}
    </div>
  );
}

export default Billings;