const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
const USER_USERNAME = process.env.USER_USERNAME || 'green2';
const USER_PASSWORD = process.env.USER_PASSWORD || 'password';

let adminToken = null;
let userToken = null;
let bookingId = null;

async function login(username, password) {
  const res = await axios.post(`${API_URL}/auth/login`, { username, password });
  return res.data.token;
}

async function createBooking() {
  const now = Date.now();
  const checkIn = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const checkOut = new Date(now - 1 * 60 * 60 * 1000).toISOString();
  const payload = {
    roomNumber: '201',
    checkIn,
    checkOut,
    adults: 1,
    children: 0,
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    guestName: 'Test Guest',
    contactNumber: '09123456789',
    specialRequests: 'Ended booking test'
  };
  const res = await axios.post(`${API_URL}/bookings`, payload, { headers: { Authorization: `Bearer ${userToken}` } });
  return res.data;
}

async function markPaid(id) {
  await axios.put(`${API_URL}/bookings/${id}/payment-status`, { paymentStatus: 'paid' }, { headers: { Authorization: `Bearer ${adminToken}` } });
}

async function assignRoom(id, rn) {
  await axios.put(`${API_URL}/bookings/${id}`, { roomNumber: rn }, { headers: { Authorization: `Bearer ${adminToken}` } });
}

async function getMyBookings() {
  const res = await axios.get(`${API_URL}/bookings/my-bookings`, { headers: { Authorization: `Bearer ${userToken}` } });
  return res.data;
}

async function userCancel(id) {
  const res = await axios.post(`${API_URL}/bookings/user-cancel/${id}`, { cancellationReasons: ['Change of travel plans'] }, { headers: { Authorization: `Bearer ${userToken}` } });
  return res.data;
}

async function adminDelete(id) {
  await axios.delete(`${API_URL}/bookings/${id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
}

async function run() {
  adminToken = await login(ADMIN_USERNAME, ADMIN_PASSWORD);
  userToken = await login(USER_USERNAME, USER_PASSWORD);

  const booking = await createBooking();
  bookingId = booking._id;
  if (booking.roomNumber !== null) throw new Error('roomNumber should be null on creation');

  await markPaid(bookingId);

  await assignRoom(bookingId, '201');
  const afterAssign = await axios.get(`${API_URL}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  if (!afterAssign.data.roomNumber) throw new Error('roomNumber should be set by admin');

  const list1 = await getMyBookings();
  const found1 = list1.find(b => b._id === bookingId);
  if (!found1) throw new Error('Paid booking should be visible in My Bookings');

  await userCancel(bookingId);
  const afterCancel = await axios.get(`${API_URL}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  if (afterCancel.data.status !== 'cancelled') throw new Error('User cancel should mark booking as cancelled, not delete');

  const list2 = await getMyBookings();
  const stillThere = list2.some(b => b._id === bookingId);
  if (!stillThere) throw new Error('Cancelled booking should remain visible until admin deletes');

  await adminDelete(bookingId);
  let removed = false;
  try {
    await axios.get(`${API_URL}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  } catch {
    removed = true;
  }
  if (!removed) throw new Error('Admin delete should remove booking');

  const list3 = await getMyBookings();
  const gone = !list3.some(b => b._id === bookingId);
  if (!gone) throw new Error('Deleted booking should disappear from My Bookings');

  console.log('All admin/user booking control tests passed');
}

run().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
