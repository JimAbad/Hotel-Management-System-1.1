const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_URL = 'https://imperturbable-precondylar-sherika.ngrok-free.dev';

// Test with existing user from the logs
const testUser = {
  email: 'redbercasio08@gmail.com',
  password: 'password123' // You'll need to provide the correct password
};

async function testQRPhFlow() {
  console.log('🧪 Testing QRPh Partial Payment Flow...\n');
  console.log('📱 Frontend URL:', FRONTEND_URL);
  console.log('🔗 Backend API:', API_BASE);
  
  try {
    // Step 1: Login
    console.log('\n1️⃣ Logging in user...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginRes.data.token;
    console.log('✅ Login successful');

    // Step 2: Get available rooms
    console.log('\n2️⃣ Getting available rooms...');
    const roomsRes = await axios.get(`${API_BASE}/rooms`);
    const availableRooms = roomsRes.data.filter(room => room.status === 'available');
    
    if (availableRooms.length === 0) {
      console.log('❌ No available rooms found');
      return;
    }
    
    const selectedRoom = availableRooms[0];
    console.log(`✅ Found available room: ${selectedRoom.roomNumber} (₱${selectedRoom.price}/night)`);

    // Step 3: Create booking
    console.log('\n3️⃣ Creating booking...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 3);

    const bookingData = {
      customerName: 'Test User',
      customerEmail: testUser.email,
      contactNumber: '09123456789',
      roomNumber: selectedRoom.roomNumber,
      checkIn: tomorrow.toISOString(),
      checkOut: checkout.toISOString(),
      adults: 2,
      children: 0,
      guestName: 'Test Guest',
      numberOfGuests: 2,
      specialRequests: 'Testing QRPh partial payment'
    };

    const bookingRes = await axios.post(`${API_BASE}/bookings`, bookingData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const booking = bookingRes.data;
    console.log(`✅ Booking created: ${booking.referenceNumber}`);
    console.log(`   Total Amount: ₱${booking.totalAmount}`);
    console.log(`   Initial Status: ${booking.paymentStatus}`);

    // Step 4: Generate QRPh URL
    const qrUrl = `${FRONTEND_URL}/paymongo-qr/${booking._id}`;
    console.log(`\n4️⃣ QRPh Payment URL: ${qrUrl}`);
    console.log('📱 Open this URL on your phone to test QRPh payment');

    // Step 5: Show My Bookings URL
    const myBookingsUrl = `${FRONTEND_URL}/my-bookings`;
    console.log(`\n5️⃣ My Bookings URL: ${myBookingsUrl}`);
    console.log('📱 Check here after making partial payment to see if booking appears');

    console.log('\n🎯 Test Instructions:');
    console.log('1. Open the QRPh Payment URL on your phone');
    console.log('2. Scan the QR code and make a PARTIAL payment (less than total)');
    console.log('3. Check My Bookings to see if booking appears with "partial" status');
    console.log('4. The booking should only appear after payment, not before');

    console.log('\n✅ Setup complete! Ready for manual testing.');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testQRPhFlow().catch(console.error);