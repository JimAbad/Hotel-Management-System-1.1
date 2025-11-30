const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const ADMIN_USER = {
  username: 'employee',
  password: 'password123'
};

async function debugSpecificBooking() {
  console.log('🔍 Debugging specific booking visibility...\n');
  
  try {
    // Login as admin
    console.log('🔑 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, ADMIN_USER);
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');
    
    // Get the specific booking by ID
    console.log('🔍 Fetching specific booking ID: 692c0cbc98b2a9be6fd98103');
    try {
      const bookingResponse = await axios.get(`${API_BASE}/bookings/692c0cbc98b2a9be6fd98103`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const booking = bookingResponse.data;
      console.log('📋 Specific booking details:');
      console.log(`🆔 Booking ID: ${booking._id}`);
      console.log(`👤 Customer: ${booking.customerName} (${booking.customerEmail})`);
      console.log(`📖 Reference: ${booking.referenceNumber}`);
      console.log(`🏨 Room: ${booking.roomNumber || 'Not assigned'}`);
      console.log(`💰 Amount: ₱${booking.totalAmount}`);
      console.log(`📊 Status: ${booking.status}`);
      console.log(`💳 Payment Status: ${booking.paymentStatus}`);
      console.log(`📅 Check-in: ${booking.checkIn}`);
      console.log(`📅 Check-out: ${booking.checkOut}`);
      
      // Check if this booking should match our query criteria
      console.log('\n🔍 Query Criteria Check:');
      console.log(`Status is 'draft': ${booking.status === 'draft'}`);
      console.log(`Payment status is 'partial': ${booking.paymentStatus === 'partial'}`);
      console.log(`Should show in admin view: ${booking.status === 'draft' && booking.paymentStatus === 'partial'}`);
      
    } catch (error) {
      console.log('❌ Could not fetch specific booking:', error.response?.data?.message || error.message);
    }
    
    // Also test a direct query to see what's happening
    console.log('\n🔍 Testing direct query logic...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

debugSpecificBooking();