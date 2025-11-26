const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_URL = 'https://imperturbable-precondylar-sherika.ngrok-free.dev';

async function setupQRPhTest() {
  console.log('🧪 Setting up QRPh Test Environment...\n');
  console.log('📱 Frontend URL:', FRONTEND_URL);
  console.log('🔗 Backend API:', API_BASE);
  
  try {
    // Get available rooms without authentication
    console.log('\n1️⃣ Getting available rooms...');
    const roomsRes = await axios.get(`${API_BASE}/rooms`);
    const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data.rooms || [];
    const availableRooms = rooms.filter(room => room.status === 'available');
    
    if (availableRooms.length === 0) {
      console.log('❌ No available rooms found');
      return;
    }
    
    const selectedRoom = availableRooms[0];
    console.log(`✅ Found available room: ${selectedRoom.roomNumber} (₱${selectedRoom.price}/night)`);

    // Create a test booking (public endpoint)
    console.log('\n2️⃣ Creating test booking...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 3);

    const bookingData = {
      customerName: 'QRPh Test User',
      customerEmail: 'testqrph@example.com',
      contactNumber: '09123456789',
      roomNumber: selectedRoom.roomNumber,
      checkIn: tomorrow.toISOString(),
      checkOut: checkout.toISOString(),
      adults: 2,
      children: 0,
      guestName: 'Test Guest',
      numberOfGuests: 2,
      specialRequests: 'Testing QRPh partial payment flow'
    };

    const bookingRes = await axios.post(`${API_BASE}/bookings`, bookingData);
    
    const booking = bookingRes.data;
    console.log(`✅ Test booking created: ${booking.referenceNumber}`);
    console.log(`   Total Amount: ₱${booking.totalAmount}`);
    console.log(`   Initial Status: ${booking.paymentStatus}`);

    // Generate test URLs
    const qrUrl = `${FRONTEND_URL}/paymongo-qr/${booking._id}`;
    const myBookingsUrl = `${FRONTEND_URL}/my-bookings`;
    
    console.log(`\n🎯 Test URLs Generated:`);
    console.log(`📱 QRPh Payment URL: ${qrUrl}`);
    console.log(`📱 My Bookings URL: ${myBookingsUrl}`);

    console.log('\n✅ Setup complete! Ready for manual testing.');
    console.log('\n🔍 Test Instructions:');
    console.log('1. Open QRPh Payment URL on your phone');
    console.log('2. Scan the QR code and make a PARTIAL payment (₱100-₱500)');
    console.log('3. Check My Bookings URL to see if booking appears');
    console.log('4. The booking should show "partial" payment status');
    console.log('5. Only paid/partial bookings should appear in My Bookings');

    // Return test data for further use
    return {
      bookingId: booking._id,
      bookingReference: booking.referenceNumber,
      totalAmount: booking.totalAmount,
      qrUrl,
      myBookingsUrl
    };

  } catch (error) {
    console.error('\n❌ Setup Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the setup
setupQRPhTest().then(testData => {
  if (testData) {
    console.log('\n📝 Test Data Summary:');
    console.log(`   Booking ID: ${testData.bookingId}`);
    console.log(`   Reference: ${testData.bookingReference}`);
    console.log(`   Total: ₱${testData.totalAmount}`);
    console.log(`   QR URL: ${testData.qrUrl}`);
    console.log(`   My Bookings: ${testData.myBookingsUrl}`);
  }
}).catch(console.error);