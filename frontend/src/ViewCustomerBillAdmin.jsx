import React from 'react';
import './ViewCustomerBillAdmin.css';

const ViewCustomerBillAdmin = () => {
  const { token } = useAuthAdmin();
  const API_URL = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
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

  if (loading) return <div className="view-customer-bill-container">Loading bills...</div>;
  if (error) return <div className="view-customer-bill-container">Error: {error}</div>;

  return (
    <div className="view-bill-modal-backdrop">
      <div className="view-bill-modal">
        <h3>View Bill</h3>

        <div className="vb-row">
          <span className="vb-label">Room:</span>
          <span className="vb-value">{getRoomType(bill)}</span>
        </div>

        <div className="vb-row">
          <span className="vb-label">Dates:</span>
          <span className="vb-value">{getDates(bill)}</span>
        </div>

        <div className="vb-row">
          <span className="vb-label">Guests:</span>
          <span className="vb-value">{getGuests(bill)}</span>
        </div>

        <div className="vb-row">
          <span className="vb-label">Rate:</span>
          <span className="vb-value">{getRatePerNight(bill)}</span>
        </div>

        <div className="vb-row">
          <span className="vb-label">Total:</span>
          <span className="vb-value vb-total">{getTotal(bill)}</span>
        </div>

        <div className="vb-actions">
          <button type="button" className="vb-done" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default ViewCustomerBillAdmin;