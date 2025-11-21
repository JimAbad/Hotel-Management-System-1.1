const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:5173';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function testPartialPaymentFlow() {
  console.log('🧪 Starting partial payment test...\n');
  
  try {
    // Step 1: Login and get token
    console.log('1️⃣ Logging in test user...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log('✅ Login successful, token acquired\n');

    // Step 2: Get available room
    console.log('2️⃣ Fetching available rooms...');
    const roomsRes = await axios.get(`${API_BASE}/rooms`);
    const availableRoom = roomsRes.data.find(room => room.status === 'available');
    if (!availableRoom) {
      throw new Error('No available rooms found');
    }
    console.log(`✅ Found available room: ${availableRoom.roomNumber} (ID: ${availableRoom._id})\n`);

    // Step 3: Create booking
    console.log('3️⃣ Creating new booking...');
    const bookingData = {
      customerName: 'Test User',
      customerEmail: testUser.email,
      contactNumber: '09123456789',
      roomNumber: availableRoom.roomNumber,
      checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      checkOut: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 2 days later
      adults: 2,
      children: 0,
      guestName: 'Test Guest',
      numberOfGuests: 2,
      specialRequests: 'Test booking for partial payment'
    };

    const bookingRes = await axios.post(`${API_BASE}/bookings`, bookingData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const booking = bookingRes.data;
    console.log(`✅ Booking created: ${booking.referenceNumber}`);
    console.log(`   Total Amount: ₱${booking.totalAmount}`);
    console.log(`   Initial Payment Status: ${booking.paymentStatus}\n`);

    // Step 4: Create PayMongo source
    console.log('4️⃣ Creating PayMongo QR source...');
    const sourceRes = await axios.post(`${API_BASE}/payment/create-paymongo-source`, {
      bookingId: booking._id,
      type: 'qrph',
      amount: Math.round(booking.totalAmount * 100) // Convert to centavos
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sourceData = sourceRes.data;
    console.log(`✅ PayMongo source created: ${sourceData.sourceId}\n`);

    // Step 5: Simulate partial payment webhook (50% of total)
    console.log('5️⃣ Simulating partial payment webhook...');
    const partialAmount = Math.round(booking.totalAmount * 50); // 50% payment
    const webhookPayload = {
      data: {
        id: 'evt_test_' + Date.now(),
        type: 'event',
        attributes: {
          type: 'payment.paid',
          data: {
            id: 'pay_test_' + Date.now(),
            type: 'payment',
            attributes: {
              amount: partialAmount,
              currency: 'PHP',
              status: 'paid',
              metadata: {
                bookingId: booking._id
              }
            }
          }
        }
      }
    };

    // Generate webhook signature
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify(webhookPayload);
    const signature = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET || 'test-secret')
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    const webhookRes = await axios.post(`${API_BASE}/webhooks/paymongo`, webhookPayload, {
      headers: {
        'paymongo-signature': signatureHeader,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Webhook sent successfully: ${webhookRes.data.message}`);
    console.log(`   Partial Amount: ₱${partialAmount / 100}`);
    console.log(`   Expected Status: partial (since ${partialAmount / 100} < ${booking.totalAmount})\n`);

    // Step 6: Verify booking status
    console.log('6️⃣ Verifying booking status after webhook...');
    const updatedBookingRes = await axios.get(`${API_BASE}/bookings/${booking._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedBooking = updatedBookingRes.data;
    console.log(`✅ Booking status verified:`);
    console.log(`   Payment Status: ${updatedBooking.paymentStatus}`);
    console.log(`   Payment Amount: ₱${updatedBooking.paymentAmount}`);
    console.log(`   Total Amount: ₱${updatedBooking.totalAmount}`);

    // Verify partial status
    if (updatedBooking.paymentStatus === 'partial') {
      console.log('✅ SUCCESS: Payment status correctly set to "partial"\n');
    } else {
      throw new Error(`Expected payment status "partial", got "${updatedBooking.paymentStatus}"`);
    }

    // Step 7: Check My Bookings endpoint
    console.log('7️⃣ Checking My Bookings endpoint...');
    const myBookingsRes = await axios.get(`${API_BASE}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const myBookings = myBookingsRes.data;
    const foundBooking = myBookings.find(b => b._id === booking._id);
    
    if (foundBooking) {
      console.log('✅ SUCCESS: Booking appears in My Bookings with partial payment\n');
      console.log(`   Booking Reference: ${foundBooking.referenceNumber}`);
      console.log(`   Payment Status: ${foundBooking.paymentStatus}`);
    } else {
      throw new Error('Booking not found in My Bookings - partial payments should be visible');
    }

    // Step 8: Test frontend URLs
    console.log('8️⃣ Testing frontend URLs...');
    console.log(`   PayMongo QR Page: ${FRONTEND_BASE}/paymongo-qr/${booking._id}`);
    console.log(`   My Bookings Page: ${FRONTEND_BASE}/my-bookings`);
    
    console.log('\n🎉 ALL TESTS PASSED! Partial payment flow is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   - Booking created: ${booking.referenceNumber}`);
    console.log(`   - Partial payment processed: ₱${partialAmount / 100} of ₱${booking.totalAmount}`);
    console.log(`   - Payment status: ${updatedBooking.paymentStatus}`);
    console.log(`   - Booking visible in My Bookings: YES`);
    console.log(`   - Frontend ready: ${FRONTEND_BASE}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testPartialPaymentFlow().catch(console.error);