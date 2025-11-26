import React from 'react';
import './ViewCustomerBillAdmin.css';

const peso = (v) => '₱' + Number(v || 0).toLocaleString('en-PH');

const toLocalDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
};

const getRoomType = (b) =>
  b.roomType || b.room_type || b.room?.type || b.roomCategory || b.roomClass || '—';

const getDates = (b) => {
  const cin = b.checkInDate || b.checkinDate || b.check_in || b.startDate || b.dateFrom;
  const cout = b.checkOutDate || b.checkoutDate || b.check_out || b.endDate || b.dateTo;
  return `${toLocalDate(cin)} - ${toLocalDate(cout)}`;
};

const getGuests = (b) => {
  const adults = Number(b.adults ?? b.numAdults ?? b.guests?.adults ?? 0);
  const children = Number(b.children ?? b.numChildren ?? b.guests?.children ?? 0);
  return `${adults} Adult${adults === 1 ? '' : 's'}, ${children} Children`;
};

const getRatePerNight = (b) => {
  const rate = b.roomRate ?? b.ratePerNight ?? b.nightlyRate ?? b.rate ?? b.amountPerNight ?? 0;
  return `${peso(rate)} per night`;
};

const getTotal = (b) => {
  if (b.totalAmount != null) return peso(b.totalAmount);
  if (b.total != null) return peso(b.total);
  if (Array.isArray(b.items)) return peso(b.items.reduce((s, i) => s + Number(i.amount || 0), 0));
  return peso(b.amount || 0);
};

const ViewCustomerBillAdmin = ({ bill, onClose }) => {
  if (!bill) return null;

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