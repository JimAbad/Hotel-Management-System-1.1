import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { FaFileInvoiceDollar, FaEye, FaReceipt, FaPrint } from 'react-icons/fa';
import './Billings.css';
import ErrorBoundary from './ErrorBoundary';

function Billings() {
  const { user, token } = useContext(AuthContext);
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billsByRoom, setBillsByRoom] = useState({});
  const [mergedRoomBills, setMergedRoomBills] = useState({});
  const [selectedGroupBills, setSelectedGroupBills] = useState(null);
  const [selectedGroupRoom, setSelectedGroupRoom] = useState(null);

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
      // Hide orphaned billing entries that reference deleted bookings
      const cleanedBills = (bills || []).filter((b) => b.booking);
      setBillings(cleanedBills);
      
      // Group bills by room number
      const grouped = cleanedBills.reduce((acc, bill) => {
        const roomNum = bill.roomNumber;
        if (!acc[roomNum]) {
          acc[roomNum] = [];
        }
        acc[roomNum].push(bill);
        return acc;
      }, {});
      
      setBillsByRoom(grouped);

      // Fetch merged per-room billings (includes item/food charges if present)
      const roomNumbers = Object.keys(grouped);
      const fetches = roomNumbers.map((roomNum) =>
        axios
          .get(`${import.meta.env.VITE_API_URL}/api/billings/room/${roomNum}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => ({ roomNum, data: res.data?.data || [] }))
          .catch((err) => {
            console.warn('Merged room billing fetch failed for room', roomNum, err?.message || err);
            return { roomNum, data: [] };
          })
      );

      const results = await Promise.all(fetches);
      const mergedMap = results.reduce((acc, { roomNum, data }) => {
        acc[roomNum] = Array.isArray(data) ? data : [];
        return acc;
      }, {});
      setMergedRoomBills(mergedMap);
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

  const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return <div className="loading">Loading billing information...</div>;
  }

  if (error) {
    return <div className="error">{error.message || error}</div>;
  }

  return (
    <ErrorBoundary>
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
              <div className="room-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Room {roomNumber}</h3>
                <button
                  className="view-bill-btn"
                  style={{ backgroundColor: '#B8860B', color: 'white' }}
                  onClick={() => {
                    const displayBills = (mergedRoomBills[roomNumber] && mergedRoomBills[roomNumber].length)
                      ? mergedRoomBills[roomNumber]
                      : roomBills.map((b) => ({
                          _id: b._id,
                          roomNumber: b.roomNumber,
                          description: b.description || 'Charge',
                          amount: Number(b.amount) || 0,
                          status: b.status || 'pending',
                          date: b.createdAt,
                          type: 'room_charge'
                        }));
                    setSelectedGroupRoom(roomNumber);
                    setSelectedGroupBills(displayBills);
                    setShowBillModal(true);
                  }}
                >
                  <FaEye /> View
                </button>
              </div>
              {(() => {
                // Prefer merged API data if available, otherwise fall back to existing bills
                const displayBills = (mergedRoomBills[roomNumber] && mergedRoomBills[roomNumber].length)
                  ? mergedRoomBills[roomNumber]
                  : roomBills.map((b) => ({
                      _id: b._id,
                      roomNumber: b.roomNumber,
                      description: b.description || 'Charge',
                      amount: Number(b.amount) || 0,
                      status: b.status || 'pending',
                      date: b.createdAt,
                      type: 'room_charge'
                    }));

                const mergedByDescription = displayBills.reduce((acc, bill) => {
                  const key = bill.description || 'Misc';
                  acc[key] = (acc[key] || 0) + (Number(bill.amount) || 0);
                  return acc;
                }, {});

                const roomTotal = displayBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
                const entries = Object.entries(mergedByDescription);
                return (
                  <div style={{ padding: '12px 20px', background: '#fafafa', borderBottom: '1px solid #555' }}>
                    <div style={{ color: '#333', fontWeight: 600, marginBottom: '6px' }}>Merged Bills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {entries.map(([desc, sum]) => (
                        <span key={desc} style={{ background: '#fff', padding: '6px 10px', color: '#000' }}>
                          {desc}: ₱{formatMoney(sum)}
                        </span>
                      ))}
                      <span style={{ background: '#fff', border: '1px solid #555', borderRadius: '16px', padding: '6px 10px', color: '#000', fontWeight: 600 }}>
                        Total: ₱{formatMoney(roomTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="room-bills-table">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((mergedRoomBills[roomNumber] && mergedRoomBills[roomNumber].length)
                      ? mergedRoomBills[roomNumber]
                      : roomBills.map((b) => ({
                          _id: b._id,
                          roomNumber: b.roomNumber,
                          description: b.description || 'Charge',
                          amount: Number(b.amount) || 0,
                          status: b.status || 'pending',
                          date: b.createdAt,
                          type: 'room_charge'
                        }))
                    ).map((bill, idx) => (
                      <tr key={bill._id || `${roomNumber}-${idx}`}>
                        <td>{bill.description}</td>
                        <td>₱{formatMoney(bill.amount)}</td>
                        <td><span className={getStatusClass(bill.status || 'pending')}>{bill.status || 'pending'}</span></td>
                        <td>{formatDate(bill.date || bill.createdAt)}</td>
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
      {showBillModal && (selectedBill || selectedGroupBills) && (
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
        {/* Bill ID removed as requested */}
      </div>
      {selectedGroupBills ? (
        <>
          <div className="bill-row">
            <span>Room:</span>
            <span>{selectedGroupRoom ? `Room ${selectedGroupRoom}` : 'N/A'}</span>
          </div>
          <div className="bill-row">
            <span>Transactions: </span>
            <span>{selectedGroupBills.length} items</span>
          </div>
        </>
      ) : (
        <>
          <div className="bill-row">
            <span>Date:</span>
            <span>{formatDate(selectedBill.date || selectedBill.createdAt)}</span>
          </div>
          <div className="bill-row">
            <span>Room:</span>
            <span>
              {selectedBill.roomNumber
                ? `Room ${selectedBill.roomNumber}`
                : 'N/A'}
            </span>
          </div>
        </>
      )}

      {!selectedGroupBills && selectedBill?.booking && (
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
                      {selectedGroupBills ? (
                        selectedGroupBills.map((item, idx) => (
                          <tr key={item._id || idx}>
                            <td>{item.description}</td>
                            <td>₱{formatMoney(item.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>{selectedBill.description}</td>
                          <td>₱{formatMoney(selectedBill.amount)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>₱{formatMoney((selectedGroupBills ? selectedGroupBills : [selectedBill]).reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
           <div className="bill-status" style={{ textAlign: 'left', marginLeft: '10px' }}>
  {!selectedGroupBills && (
    <>
      <p>
        Payment Status:{' '}
        <span className={getStatusClass(selectedBill.status)}>
          {selectedBill.status}
        </span>
      </p>
      {selectedBill.paymentMethod && (
        <p>Payment Method: {selectedBill.paymentMethod}</p>
      )}
    </>
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
    </ErrorBoundary>
  );
}

export default Billings;