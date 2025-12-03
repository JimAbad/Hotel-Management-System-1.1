import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuthAdmin } from "./AuthContextAdmin";
import "./CustomerBillListAdmin.css";

const CustomerBillList = () => {
  const { token } = useAuthAdmin();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [activeBill, setActiveBill] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const API_BASE = (() => {
    const fallback = 'https://hotel-management-system-1-1-backend.onrender.com';
    const env = import.meta.env.VITE_API_URL;
    const envNorm = String(env || '').replace(/\/+$/, '');
    const originNorm = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
    const base = envNorm && envNorm !== originNorm ? envNorm : fallback;
    return base.replace(/\/+$/, '');
  })();
  // Common endpoints used across this repo
  const BILL_ENDPOINTS = useMemo(
    () => ["/api/customer-bills", "/api/billing", "/api/billings"],
    []
  );

  // ADD small helpers up top (below imports)
  const get = (obj, path) =>
    path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  const pickFirst = (obj, keys) => {
    for (const k of keys) {
      const v = k.includes('.') ? get(obj, k) : obj?.[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  };
  const pickCheckout = (b) =>
    b?.checkOutDate ||
    b?.checkoutDate ||
    b?.bookingId?.checkOutDate ||
    b?.bookingId?.checkoutDate ||
    b?.booking?.checkOutDate ||
    b?.booking?.checkoutDate ||
    null;

  const getRoomDisplay = (b) => {
    const rn = (b.roomNumber ?? b.raw?.roomNumber ?? b.raw?.booking?.roomNumber);
    if (rn !== undefined && rn !== null && rn !== '' && rn !== 0) return rn;
    return 'To be assigned';
  };

  // Normalize into a unified bill shape for rendering
  const normalizeBill = (x) => {
    if (!x) return null;

    const id = pickFirst(x, ['_id', 'id']);
    const bookingObj = pickFirst(x, ['booking']) || {};
    const bookingId =
      pickFirst(x, ['bookingId', 'booking']) && typeof x.booking === 'string'
        ? x.booking
        : pickFirst(bookingObj, ['_id', 'id']);

    const referenceNumber =
      pickFirst(x, ['referenceNumber', 'reference']) ||
      pickFirst(bookingObj, ['referenceNumber', 'bookingReference', 'reference', 'refNo']) ||
      (id ? `REF: ${String(id).slice(-8)}` : bookingId ? `REF: ${String(bookingId).slice(-8)}` : '-');

    const customerName =
      pickFirst(x, ['customerName', 'name', 'guestName']) ||
      pickFirst(bookingObj, ['customerName', 'guestName', 'name', 'customer.name', 'user.name']) ||
      '-';

    const totalAmount =
      Number(
        pickFirst(x, ['totalAmount', 'amount', 'total', 'billingAmount']) ??
        pickFirst(bookingObj, ['totalAmount', 'totalPrice', 'grandTotal', 'amount', 'billingTotal']) ??
        0
      ) || 0;

    const checkOutDate =
      // Prefer explicit fields on the bill first
      pickFirst(x, ['checkOutDate', 'checkoutDate', 'checkOut']) ||
      // Then fall back to populated booking fields
      pickFirst(bookingObj, [
        'checkOutDate',
        'checkoutDate',
        'checkOut',
        'departureDate',
        'endDate',
        'toDate',
        'dates.checkOut',
      ]);

    const paymentStatus =
      pickFirst(x, ['paymentStatus', 'status', 'billingStatus']) ||
      pickFirst(bookingObj, ['paymentStatus', 'status']) ||
      'Unpaid';

    return {
      _id: id,
      bookingId,
      referenceNumber,
      customerName,
      totalAmount,
      paymentStatus,
      checkOutDate,
      raw: x,
    };
  };

  // Fallback: map bookings into bill-like rows when there are no bills
  const normalizeFromBooking = (b) => {
    if (!b) return null;
    const id = pickFirst(b, ['_id', 'id']);
    const referenceNumber =
      pickFirst(b, ['referenceNumber', 'bookingReference', 'reference', 'refNo']) ||
      (id ? `REF: ${String(id).slice(-8)}` : '-');

    const customerName =
      pickFirst(b, ['guestName', 'customerName', 'name', 'customer.name', 'user.name']) || '-';

    const totalAmount =
      Number(pickFirst(b, ['totalAmount', 'totalPrice', 'grandTotal', 'amount'])) || 0;

    const checkOutDate =
      pickFirst(b, ['checkOutDate', 'checkoutDate', 'checkOut', 'departureDate', 'endDate', 'toDate']);

    const paymentStatus =
      pickFirst(b, ['paymentStatus']) ||
      (String(pickFirst(b, ['bookingStatus', 'status']) || '').toLowerCase().includes('completed')
        ? 'Paid'
        : 'Unpaid');

    return {
      _id: id,
      bookingId: id,
      referenceNumber,
      customerName,
      totalAmount,
      paymentStatus,
      checkOutDate,
      raw: b,
    };
  };

  // Try multiple GET paths until one works (404-tolerant)
  const tryGet = async (urls, config) => {
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await axios.get(url, config);
        return res.data;
      } catch (e) {
        lastErr = e;
        if (e?.response?.status !== 404) throw e;
      }
    }
    throw lastErr || new Error("Not found");
  };

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error("Missing admin token");

        // 1) Try to load actual bills
        let billList = null;
        try {
          const billData = await tryGet(
            BILL_ENDPOINTS.map((p) => `${API_BASE}${p}`),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const arr =
            (Array.isArray(billData) && billData) ||
            billData?.data?.bills ||
            billData?.data ||
            billData?.bills ||
            billData?.results ||
            [];
          if (Array.isArray(arr) && arr.length > 0) {
            billList = arr.map(normalizeBill).filter(Boolean);
          }
        } catch (err) {
          // If 404s, we’ll just fallback to bookings below
          if (err?.response?.status && err.response.status !== 404) throw err;
        }

        // 2) If no bills, fallback to bookings → render as “bills”
        if (!billList || billList.length === 0) {
          const bookingUrls = [
            `${API_BASE}/api/bookings?status=all`,
            `${API_BASE}/api/bookings`,
          ];
          const bookingData = await tryGet(bookingUrls, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const arr =
            (Array.isArray(bookingData) && bookingData) ||
            bookingData?.data?.bookings ||
            bookingData?.bookings ||
            bookingData?.data ||
            [];
          const mapped = (arr || []).map(normalizeFromBooking).filter(Boolean);
          billList = mapped;
        }

        // Initial set
        setBills(billList || []);

        // Enrich missing fields (customerName/checkOutDate) by fetching booking details
        try {
          const needDetails = (billList || []).filter(
            (b) => (!b.customerName || b.customerName === '-') || !b.checkOutDate
          );
          const uniqueBookingIds = Array.from(
            new Set(needDetails.map((b) => b.bookingId).filter(Boolean))
          );
          if (uniqueBookingIds.length > 0) {
            const results = await Promise.all(
              uniqueBookingIds.map(async (id) => {
                try {
                  const res = await axios.get(`${API_BASE}/api/bookings/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  return { id, data: res.data };
                } catch {
                  return { id, data: null };
                }
              })
            );
            const byId = Object.fromEntries(
              results.map((r) => [r.id, r.data || {}])
            );
            setBills((prev) =>
              prev.map((b) => {
                const d = b.bookingId && byId[b.bookingId];
                if (!d) return b;
                const name = d.customerName || d.guestName || b.customerName;
                const co = d.checkOut || d.checkOutDate || b.checkOutDate;
                return {
                  ...b,
                  customerName: name || b.customerName,
                  checkOutDate: co || b.checkOutDate,
                };
              })
            );
          }
        } catch (joinErr) {
          // Non-fatal enrichment failure — keep base list
          console.warn('Bill enrichment skipped:', joinErr?.message || joinErr);
        }
      } catch (err) {
        setBills([]);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [API_BASE, BILL_ENDPOINTS, token]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Filter individual bills
    const matchingBills = bills.filter((b) => {
      const status = (b.paymentStatus || "").toLowerCase();
      const name = (b.customerName || "").toLowerCase();
      const ref = (b.referenceNumber || "").toLowerCase();
      const passesStatus = statusFilter === "all" ? true : status === statusFilter;
      const passesSearch = !q || name.includes(q) || ref.includes(q);
      // Exclude bills whose linked booking's check-out date has passed OR is missing
      const coRaw = b.checkOutDate || (b.raw?.booking?.checkOut) || (b.raw?.booking?.checkOutDate);
      const co = coRaw ? new Date(coRaw) : null;
      const hasValidCheckout = co && !isNaN(co);
      const isActive = hasValidCheckout && co >= today;
      return passesStatus && passesSearch && isActive;
    });

    // 2. Group by Reference Number to merge bills
    const groups = {};
    matchingBills.forEach(bill => {
      const key = bill.referenceNumber || bill.bookingId || bill._id;

      if (!groups[key]) {
        groups[key] = {
          ...bill,
          totalRoomCharges: 0,
          totalExtraCharges: 0,
          totalAmount: 0
        };
      }

      // Calculate charges based on description from raw data
      const desc = bill.raw?.description || "";
      const amt = bill.totalAmount || 0;

      if (desc.includes('Room booking charge')) {
        groups[key].totalRoomCharges += amt;
      } else {
        groups[key].totalExtraCharges += amt;
      }

      // Merge status
      const currentStatus = (groups[key].paymentStatus || "").toLowerCase();
      const newStatus = (bill.paymentStatus || "").toLowerCase();
      if (newStatus !== 'paid' && newStatus !== 'completed') {
        groups[key].paymentStatus = bill.paymentStatus;
      }
    });

    // Final calculation: Deduct 10% partial payment from room charges
    Object.values(groups).forEach(group => {
      group.totalAmount = (group.totalRoomCharges * 0.9) + group.totalExtraCharges;
    });

    const result = Object.values(groups);

    // 3. Sort by most recent check-out first
    return result.slice().sort((a, b) => {
      const aRaw = a.checkOutDate || (a.raw?.booking?.checkOut) || (a.raw?.booking?.checkOutDate);
      const bRaw = b.checkOutDate || (b.raw?.booking?.checkOut) || (b.raw?.booking?.checkOutDate);
      const aDate = aRaw ? new Date(aRaw) : null;
      const bDate = bRaw ? new Date(bRaw) : null;
      const aTs = aDate && !isNaN(aDate) ? aDate.getTime() : -Infinity;
      const bTs = bDate && !isNaN(bDate) ? bDate.getTime() : -Infinity;
      return bTs - aTs;
    });
  }, [bills, search, statusFilter]);

  const prettyAmt = (n) => `₱${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const prettyDate = (d) => {
    if (!d) return "-";
    const iso = new Date(d);
    return isNaN(iso) ? String(d) : iso.toISOString().slice(0, 10);
  };

  const badgeClass = (s) => {
    const v = (s || "").toLowerCase();
    if (v.includes("partial")) return "partial";
    if (v.includes("paid")) return "paid";
    return "unpaid";
  };

  // View Bill (modal) — fetch detailed breakdown
  const openBillModal = async (bill) => {
    setActiveBill(bill);
    setShowBillModal(true);
    setBillDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const bookingId = bill.bookingId || bill.raw?.bookingId || bill.raw?.booking?._id || bill._id;

      // Try to fetch detailed breakdown first
      try {
        const response = await axios.get(
          `${API_BASE}/api/customer-bills/booking/${bookingId}/breakdown`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.success && response.data?.data) {
          setBillDetails(response.data.data);
          return;
        }
      } catch (breakdownError) {
        console.warn('Breakdown endpoint failed, falling back to basic bill data:', breakdownError);
      }

      // Fallback to original logic if breakdown fails
      const id = bill._id;
      const urls = [
        id && `${API_BASE}/api/customer-bills/${id}`,
        bookingId && `${API_BASE}/api/customer-bills/booking/${bookingId}`,
        id && `${API_BASE}/api/billing/${id}`,
        bookingId && `${API_BASE}/api/bookings/${bookingId}`,
      ].filter(Boolean);

      const data = await tryGet(urls, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const detail =
        data?.data ||
        data?.bill ||
        data?.billing ||
        data?.booking ||
        (Array.isArray(data) ? data[0] : data) ||
        bill.raw;

      setBillDetails(detail || bill.raw);
    } catch (e) {
      setDetailsError(e);
    } finally {
      setDetailsLoading(false);
    }
  };
  const markAsPaid = async (bill) => {
    if (!bill) return;
    if (!window.confirm("Mark this bill as paid?")) return;
    try {
      const id = bill._id;
      const urls = [
        `${API_BASE}/api/customer-bills/${id}/mark-paid`,
        `${API_BASE}/api/customer-bills/${id}`,
        `${API_BASE}/api/billing/${id}/mark-paid`,
      ];

      let success = false;
      for (const url of urls) {
        try {
          await axios.put(
            url,
            url.endsWith("/mark-paid") ? {} : { status: "Paid", paymentStatus: "Paid" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          success = true;
          break;
        } catch (e) {
          if (e?.response?.status !== 404) throw e;
        }
      }
      if (!success) throw new Error("No matching endpoint to mark as paid.");

      // Optimistic update
      setBills((prev) =>
        prev.map((b) => (b._id === bill._id ? { ...b, paymentStatus: "Paid" } : b))
      );
    } catch (e) {
      alert(`Failed to mark as paid: ${e.message}`);
    }
  };

  return (
    <div className="customer-bill-list-container">
      <div className="billing-card">
        <div className="billing-header">
          <h2>Billing List</h2>
          <div className="bill-toolbar">
            <div className="search">
              <input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter">
              <label>Filter by Booking Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="partially paid">Partially paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <div className="loading">Loading customer bills...</div>}
        {error && (
          <div className="error-banner">
            Error: {error?.response?.status === 404 ? "Endpoint not found." : error.message}
          </div>
        )}

        {!loading && !error && (
          <table className="customer-bill-table">
            <thead>
              <tr>
                <th>Reference Number</th>
                <th>Customer Name</th>
                <th>Total Bill Amount</th>
                <th>Payment Status</th>
                <th>Check-Out Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="empty" colSpan="6">
                    No customer bills found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const badge = badgeClass(b.paymentStatus);
                  return (
                    <tr key={b._id}>
                      <td>{b.referenceNumber}</td>
                      <td>{b.customerName || "-"}</td>
                      {/* Always show merged, grouped bill total: */}
                      <td>{prettyAmt(b.totalAmount)}</td>
                      <td>
                        <span className={`status-badge ${badge}`}>{b.paymentStatus}</span>
                      </td>
                      <td>{prettyDate(pickCheckout(b))}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => openBillModal(b)}
                        >
                          View Bill
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={badge === "paid"}
                          onClick={() => markAsPaid(b)}
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* View Bill Modal */}
      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bills for Room {getRoomDisplay(activeBill)}</h3>
              <button onClick={() => setShowBillModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {detailsLoading && <div className="loading">Loading bill…</div>}
              {detailsError && (
                <div className="error-banner">
                  {detailsError?.response?.status === 404
                    ? "Bill not found."
                    : detailsError.message}
                </div>
              )}
              {!detailsLoading && !detailsError && (
                <>
                  <div className="booking-details" style={{ color: '#1f2937' }}>
                    <p><strong>Reference Number:</strong> {billDetails?.referenceNumber || activeBill?.referenceNumber}</p>
                    <p><strong>Customer Name:</strong> {billDetails?.customerName || billDetails?.name || activeBill?.customerName || "-"}</p>
                    <p><strong>Payment Status:</strong> {billDetails?.paymentStatus || billDetails?.status || activeBill?.paymentStatus || "-"}</p>
                    {billDetails?.checkIn && <p><strong>Check-In:</strong> {prettyDate(billDetails.checkIn)}</p>}
                    {billDetails?.checkOut && <p><strong>Check-Out:</strong> {prettyDate(billDetails.checkOut)}</p>}
                  </div>

                  {/* Detailed Breakdown */}
                  {billDetails?.breakdown && (
                    <div className="bill-breakdown" style={{ marginTop: '20px', color: '#1f2937' }}>
                      <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Bill Breakdown</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Description</th>
                            <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Room Charges */}
                          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px' }}>
                              <strong>Room Charges</strong>
                              <br />
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {billDetails.breakdown.roomCharges.description}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px' }}>
                              {prettyAmt(billDetails.breakdown.roomCharges.subtotal)}
                            </td>
                          </tr>

                          {/* Food Charges */}
                          {billDetails.breakdown.foodCharges.items.length > 0 ? (
                            <>
                              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td colSpan="2" style={{ padding: '8px' }}>
                                  <strong>Food Charges</strong>
                                </td>
                              </tr>
                              {billDetails.breakdown.foodCharges.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '8px 8px 8px 24px', fontSize: '13px' }}>
                                    {item.description}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '8px', fontSize: '13px' }}>
                                    {prettyAmt(item.amount)}
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px 8px 8px 24px' }}>
                                  <em>Food Subtotal</em>
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px' }}>
                                  {prettyAmt(billDetails.breakdown.foodCharges.subtotal)}
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px' }}>
                                <strong>Food Charges</strong>
                                <br />
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>No food orders</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px' }}>
                                {prettyAmt(0)}
                              </td>
                            </tr>
                          )}

                          {/* Extension Charges */}
                          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px' }}>
                              <strong>Extension Charges</strong>
                              <br />
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {billDetails.breakdown.extensionCharges.description}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px' }}>
                              {prettyAmt(billDetails.breakdown.extensionCharges.subtotal)}
                            </td>
                          </tr>

                          {/* Total */}
                          <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <td style={{ padding: '12px 8px', fontWeight: '700', fontSize: '15px' }}>
                              Total Bill Amount
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: '700', fontSize: '15px' }}>
                              {prettyAmt(billDetails.breakdown.totalAmount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Fallback for non-breakdown data */}
                  {!billDetails?.breakdown && (
                    <div style={{ marginTop: '12px', color: '#1f2937' }}>
                      <p><strong>Total Bill Amount:</strong> {prettyAmt(billDetails?.totalAmount ?? activeBill?.totalAmount)}</p>
                    </div>
                  )}

                  <div className="form-actions">


                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBillList;
