import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { FaFileInvoiceDollar, FaEye, FaReceipt, FaPrint } from 'react-icons/fa';
import './Billings.css';

function Billings() {
  const { user, token } = useContext(AuthContext);
  const API_URL = import.meta.env.VITE_API_URL || 'https://hotel-management-system-1-1backend.onrender.com';
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomItems, setSelectedRoomItems] = useState([]);
  const [selectedRoomSummary, setSelectedRoomSummary] = useState({});
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
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // 1) Get current user's bookings
      const bookingsRes = await axios.get(`${API_URL}/api/bookings/my-bookings`, config);
      const today = new Date();

      // 2) Keep only active bookings and group by roomNumber
      const activeRoomNumbers = Array.from(
        new Set(
          (bookingsRes.data || [])
            .filter(b => {
              const checkOut = new Date(b.checkOut);
              const status = String(b.status || '').toLowerCase();
              return checkOut >= today && status !== 'cancelled' && status !== 'completed';
            })
            .map(b => String(b.roomNumber))
        )
      );

      // 3) If no active rooms, clear and exit
      if (activeRoomNumbers.length === 0) {
        setBillsByRoom({});
        setBillings([]);
        setLoading(false);
        return;
      }

      // 4) Fetch merged billings per active room using backend API (normalized below)
      const roomResults = await Promise.all(
        activeRoomNumbers.map(async (roomNumber) => {
          try {
            const res = await axios.get(`${API_URL}/api/billings/room/${roomNumber}`, config);
            const payload = res.data?.data;
            const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
            const summary = Array.isArray(payload) ? {} : (payload || {});
            return { roomNumber, items, summary };
          } catch (e) {
            console.error('Failed to fetch merged billings for room', roomNumber, e);
            return { roomNumber, items: [], summary: {} };
          }
        })
      );

      // 5) Build billsByRoom map
      const grouped = {};
      roomResults.forEach(({ roomNumber, items, summary }) => {
        grouped[roomNumber] = { items, summary };
      });

      setBillsByRoom(grouped);
      setBillings(roomResults.flatMap(r => r.items));
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch billing data. Please try again later.');
      setLoading(false);
      console.error('Error fetching billings:', err);
    }
  };

  const handleViewRoom = (roomNumber) => {
    const roomData = billsByRoom[roomNumber] || { items: [], summary: {} };
    setSelectedRoom(roomNumber);
    setSelectedRoomItems(roomData.items || []);
    setSelectedRoomSummary(roomData.summary || {});
    setShowBillModal(true);
  };

  const getStatusClass = (status) => {
    const normalized = String(status || 'pending').toLowerCase();
    switch (normalized) {
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

  // Add currency formatter to show thousands with commas
  const formatCurrency = (value) => {
    const num = Number(value ?? 0);
    return '₱' + num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
      
      </div>

      {/* Bills Grouped by Room */}
      {Object.keys(billsByRoom).length === 0 ? (
        <div className="no-billings">
          <p>You don't have any active billing records.</p>
        </div>
      ) : (
        <div className="room-grouped-bills">
          {Object.entries(billsByRoom).map(([roomNumber, roomData]) => (
            (roomData.items?.length || 0) === 0 ? null : (
              <div key={roomNumber} className="room-bill-group">
                <div className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Room {roomNumber}</h3>
                  <button 
                    className="view-bill-btn" style={{ backgroundColor: '#B8860B', color: 'white' }}
                    onClick={() => handleViewRoom(roomNumber)}
                  >
                    <FaEye /> View
                  </button>
                </div>
                <div className="room-bills-summary" style={{ padding: '8px 0' }}>
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
                      {roomData.items.map((item, idx) => (
                        <tr key={item._id || idx}>
                          <td>{item.description || '—'}</td>
                          <td>{formatCurrency(item.amount ?? item.price ?? item.totalPrice ?? 0)}</td>
                          <td><span className={getStatusClass(item.status)}>{item.status || 'pending'}</span></td>
                          <td>{formatDate(item.date || item.createdAt || roomData.summary.deliveredAt || roomData.summary.checkedOutAt || new Date())}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
                        <td colSpan="3">
                          <strong>
                            {formatCurrency(
                              typeof roomData.summary.totalPrice === 'number'
                                ? roomData.summary.totalPrice
                                : roomData.items.reduce((sum, it) => sum + Number(it.amount ?? it.price ?? it.totalPrice ?? 0), 0)
                            )}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      

      {/* Bill Detail Modal */}
      {showBillModal && selectedRoom && (
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
    <FaReceipt /> Room {selectedRoom} Bills
  </h3>
</div>


            <div className="modal-body">
  <div className="bill-details">
    {/* Header section */}
    <div
      className="bill-header"
      style={{ textAlign: 'center', marginBottom: '20px' }}
    >
     
      <p style={{ margin: 0 }}></p>
      <p style={{ margin: 0 }}></p>
    </div>
    {/* Bill info section */}
    <div
      className="bill-info"
      style={{ textAlign: 'left', marginLeft: '10px' }}
    >
      <div className="bill-row">
        
      </div>

      {selectedRoomSummary.checkedOutAt && (
        <div className="bill-row">
          <span>Checked-out:</span>
          <span>{formatDate(selectedRoomSummary.checkedOutAt)}</span>
        </div>
      )}
      {selectedRoomSummary.deliveredAt && (
        <div className="bill-row">
          <span>Delivered:</span>
          <span>{formatDate(selectedRoomSummary.deliveredAt)}</span>
        </div>
      )}
      {selectedRoomSummary.checkIn && (
        <div className="bill-row">
          <span>Check-in:</span>
          <span>{formatDate(selectedRoomSummary.checkIn)}</span>
        </div>
      )}
      {selectedRoomSummary.checkOut && (
        <div className="bill-row">
          <span>Check-out:</span>
          <span>{formatDate(selectedRoomSummary.checkOut)}</span>
        </div>
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
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRoomItems.map((item, idx) => (
                        <tr key={item._id || idx}>
                          <td>{item.description || '—'}</td>
                          <td>{formatCurrency(item.amount ?? item.price ?? item.totalPrice ?? 0)}</td>
                          <td><span className={getStatusClass(item.status)}>{item.status || 'pending'}</span></td>
                          <td>{formatDate(item.date || item.createdAt || selectedRoomSummary.deliveredAt || selectedRoomSummary.checkedOutAt || new Date())}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
                        <td colSpan="3">
                          <strong>
                            {formatCurrency(
                              typeof selectedRoomSummary.totalPrice === 'number'
                                ? selectedRoomSummary.totalPrice
                                : selectedRoomItems.reduce((sum, it) => sum + Number(it.amount ?? it.price ?? it.totalPrice ?? 0), 0)
                            )}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
           {/* Aggregated view: item statuses are shown in the table; no single payment status */}

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