const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const TEST_USER = {
  username: 'red1',
  password: 'password'
};

async function debugBookingDisplay() {
  console.log('🔍 Debugging booking display issue...\n');
  
  try {
    // Login
    console.log('🔑 Logging in test user...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('👤 User:', loginResponse.data.user?.username || loginResponse.data.user?.email);
    console.log('');
    
    // Get my bookings
    console.log('📋 Fetching user bookings...');
    const bookingsResponse = await axios.get(`${API_BASE}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Found bookings:', bookingsResponse.data.length);
    bookingsResponse.data.forEach(booking => {
      console.log(`
🆔 Booking ID: ${booking._id}
📖 Reference: ${booking.referenceNumber}
🏨 Room: ${booking.roomNumber}
💰 Amount: ₱${booking.totalAmount}
📊 Status: ${booking.status}
💳 Payment Status: ${booking.paymentStatus}
📅 Check-in: ${booking.checkIn}
📅 Check-out: ${booking.checkOut}
`);
    });
    
    // Always check all bookings to see the full picture
    console.log('\n🔍 Checking all bookings as admin...');
    
    // Try to get all bookings to see what's in the system
    const allBookingsResponse = await axios.get(`${API_BASE}/bookings?includePendingPayment=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 All bookings in system:', allBookingsResponse.data.length);
    allBookingsResponse.data.forEach(booking => {
      console.log(`\n🆔 Booking ID: ${booking._id}\n👤 Customer: ${booking.customerName} (${booking.customerEmail})\n📖 Reference: ${booking.referenceNumber}\n🏨 Room: ${booking.roomNumber}\n💰 Amount: ₱${booking.totalAmount}\n📊 Status: ${booking.status}\n💳 Payment Status: ${booking.paymentStatus}\n`);
    });
    
    if (bookingsResponse.data.length === 0) {
      console.log('❌ No bookings found for this user in my-bookings');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('📋 Error details:', error.response.data);
    }
  }
}

debugBookingDisplay();