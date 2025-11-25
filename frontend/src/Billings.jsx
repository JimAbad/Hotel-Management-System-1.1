import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { FaFileInvoiceDollar, FaEye, FaReceipt, FaPrint } from 'react-icons/fa';
import './Billings.css';

function Billings() {
  const { user, token } = useContext(AuthContext);
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    return envNorm && envNorm !== originNorm ? envNorm : fallback;
  })();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomItems, setSelectedRoomItems] = useState([]);
  const [selectedRoomSummary, setSelectedRoomSummary] = useState({});
  const [showBillModal, setShowBillModal] = useState(false);
  const [billsByRoom, setBillsByRoom] = useState({});

  useEffect(() => {
    if (!user || !token) {
      fetchBillings();
      return;
    }
    fetchBillings();
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetchBillings();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
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

      // Fetch bookings to enrich room type mapping
      const bookingsRes = await axios.get(`${API_URL}/api/bookings/my-bookings`, config);
      const today = new Date();
      const roomNumberToType = {};
      (bookingsRes.data || []).forEach(b => {
        const rn = b?.roomNumber || b?.room?.roomNumber;
        const rt = b?.room?.roomType || b?.roomType;
        if (rn) roomNumberToType[rn] = rt || roomNumberToType[rn] || null;
      });

      // Fetch all billing records for the user and group by roomNumber
      const billingsRes = await axios.get(`${API_URL}/api/billings`, config);
      const list = billingsRes.data?.data || billingsRes.data || [];

      const grouped = {};
      list.forEach(b => {
        const rn = String(b.roomNumber || '').trim();
        if (!rn) return;
        // Only include items tied to an active booking
        const checkOut = b?.booking?.checkOut ? new Date(b.booking.checkOut) : null;
        const status = b?.booking?.status || '';
        const active = checkOut ? (checkOut >= today && !['cancelled','completed'].includes(String(status).toLowerCase())) : true;
        if (!active) return;

        grouped[rn] = grouped[rn] || { items: [], summary: {}, roomType: roomNumberToType[rn] || null };
        grouped[rn].items.push({
          _id: b._id,
          description: b.description,
          amount: b.amount,
          status: b.status,
          date: b.createdAt,
          bookingData: b.booking || null
        });
      });

      // Compute summaries per room
      Object.keys(grouped).forEach(rn => {
        const items = grouped[rn].items || [];
        let totalRoomCharges = 0;
        let totalExtraCharges = 0;
        let paidAmount = 0;
        items.forEach(it => {
          if (it.description && it.description.includes('Room booking charge')) {
            totalRoomCharges += Number(it.amount || 0);
          } else {
            totalExtraCharges += Number(it.amount || 0);
          }
          const st = String(it.status || '').toLowerCase();
          if (st === 'paid' || st === 'completed') paidAmount += Number(it.amount || 0);
        });
        const remainingBalance = Math.max(0, totalRoomCharges * 0.9 + totalExtraCharges - paidAmount);
        grouped[rn].summary = { totalRoomCharges, totalExtraCharges, remainingBalance, paidAmount };
      });

      setBillsByRoom(grouped);
      
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
      <div className="billing-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
       
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
                  <h3>{roomData.roomType ? `Room: ${roomData.roomType}` : `Room ${roomNumber}`}</h3>
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
                      <tr>
                        <td><strong>Partial deposit (10%)</strong></td>
                        <td colSpan="3">
                          <strong>
                            {formatCurrency(Number(roomData.summary.totalRoomCharges || 0) * 0.1)}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Remaining Balance</strong></td>
                        <td colSpan="3">
                          <strong>
                            {formatCurrency(Number(roomData.summary.remainingBalance || 0))}
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
