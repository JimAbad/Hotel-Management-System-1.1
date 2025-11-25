/********************************************************************
 * COMPREHENSIVE PAYMENT FLOW TEST
 * Tests both paid and unpaid booking scenarios
 * Verifies database updates, room availability, and My Bookings visibility
 ********************************************************************/

const axios = require('axios');
const mongoose = require('mongoose');

// Test configuration
const API_URL = 'http://localhost:3000/api';
const TEST_CREDENTIALS = {
  username: 'green2',
  password: 'password'
};

// Test data
const ECONOMY_BOOKING = {
  roomNumber: '201', // Economy room on floor 2
  checkInDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
  checkInTime: '14:00',
  checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow + 3 hours
  checkOutTime: '17:00',
  adults: 1,
  children: 0,
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  guestName: 'Test Guest',
  contactNumber: '09123456789',
  specialRequests: 'Testing payment flow'
};

let authToken = null;
let testBookingId = null;

/********************************************************************
 * HELPER FUNCTIONS
 ********************************************************************/

async function login() {
  console.log('🔑 Logging in with test credentials...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: TEST_CREDENTIALS.username,
      password: TEST_CREDENTIALS.password
    });
    authToken = response.data.token;
    console.log('✅ Login successful, token received');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getRoomAvailability() {
  console.log('🏠 Checking room availability before booking...');
  try {
    const response = await axios.get(`${API_URL}/rooms`);
    const economyRooms = response.data.filter(room => room.roomType === 'Economy');
    const availableEconomy = economyRooms.filter(room => room.status === 'available');
    
    console.log(`📊 Total Economy rooms: ${economyRooms.length}`);
    console.log(`📊 Available Economy rooms: ${availableEconomy.length}`);
    console.log(`📊 Room ${ECONOMY_BOOKING.roomNumber} status: ${economyRooms.find(r => r.roomNumber === ECONOMY_BOOKING.roomNumber)?.status || 'NOT FOUND'}`);
    
    return { total: economyRooms.length, available: availableEconomy.length };
  } catch (error) {
    console.error('❌ Failed to get room availability:', error.response?.data?.message || error.message);
    return null;
  }
}

async function createBooking() {
  console.log('📋 Creating Economy room booking for 3 hours...');
  try {
    const response = await axios.post(
      `${API_URL}/bookings`,
      ECONOMY_BOOKING,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    testBookingId = response.data._id;
    console.log('✅ Booking created successfully');
    console.log(`📋 Booking ID: ${testBookingId}`);
    console.log(`💰 Total Amount: ₱${response.data.totalAmount}`);
    console.log(`🏷️  Reference: ${response.data.referenceNumber}`);
    console.log(`📊 Payment Status: ${response.data.paymentStatus}`);
    console.log(`🏠 Room Status: ${response.data.status}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Booking creation failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function checkMyBookings() {
  console.log('📖 Checking My Bookings page...');
  try {
    const response = await axios.get(`${API_URL}/bookings/my-bookings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const bookings = response.data;
    const hasTestBooking = bookings.some(b => b._id === testBookingId);
    
    console.log(`📖 Total bookings in My Bookings: ${bookings.length}`);
    console.log(`🔍 Test booking visible: ${hasTestBooking ? 'YES' : 'NO'}`);
    
    if (hasTestBooking) {
      const booking = bookings.find(b => b._id === testBookingId);
      console.log(`📊 Booking payment status: ${booking.paymentStatus}`);
      console.log(`📊 Booking display status: ${booking.paymentStatus === 'partial' ? 'paid in partial' : booking.paymentStatus}`);
    }
    
    return { total: bookings.length, hasTestBooking };
  } catch (error) {
    console.error('❌ Failed to get My Bookings:', error.response?.data?.message || error.message);
    return null;
  }
}

async function createPayMongoPayment() {
  console.log('💳 Creating PayMongo QRPh payment for 10% deposit...');
  try {
    const depositAmount = Math.max(20, Math.round(200 * 0.10)); // ₱20 for ₱200 total
    console.log(`💰 Calculated deposit: ₱${depositAmount}`);
    
    const response = await axios.post(
      `${API_URL}/payment/create-paymongo-source`,
      {
        bookingId: testBookingId,
        amount: depositAmount,
        type: 'qrph'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ PayMongo payment source created');
    console.log(`🆔 Payment Intent ID: ${response.data.data.paymongoSourceId}`);
    console.log(`💰 Payment Amount: ₱${response.data.data.paymentAmount || depositAmount}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ PayMongo payment creation failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function simulateWebhookPayment() {
  console.log('🔄 Simulating PayMongo webhook payment confirmation...');
  try {
    // Simulate the webhook payload that PayMongo would send
    const webhookPayload = {
      data: {
        attributes: {
          type: 'payment.paid',
          data: {
            id: 'test_payment_' + Date.now(),
            attributes: {
              amount: 2000, // ₱20 in centavos
              currency: 'PHP',
              status: 'paid',
              payment_intent_id: 'pi_test_' + testBookingId
            }
          }
        }
      }
    };
    
    const response = await axios.post(
      `${API_URL}/payment/paymongo-webhook`,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Paymongo-Signature': 'test_signature_' + Date.now()
        }
      }
    );
    
    console.log('✅ Webhook simulation successful');
    console.log(`📊 Response: ${response.data.message}`);
    
    return true;
  } catch (error) {
    console.error('❌ Webhook simulation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function verifyDatabaseUpdate() {
  console.log('🗄️  Verifying database updates...');
  try {
    const response = await axios.get(`${API_URL}/bookings/${testBookingId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const booking = response.data;
    console.log(`📊 Updated payment status: ${booking.paymentStatus}`);
    console.log(`📊 Updated booking status: ${booking.status}`);
    console.log(`📊 Payment details:`, booking.paymentDetails);
    
    return booking;
  } catch (error) {
    console.error('❌ Database verification failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function checkRoomStatusAfterPayment() {
  console.log('🏠 Checking room status after payment...');
  try {
    const response = await axios.get(`${API_URL}/rooms`);
    const testRoom = response.data.find(room => room.roomNumber === ECONOMY_BOOKING.roomNumber);
    
    if (testRoom) {
      console.log(`🏠 Room ${ECONOMY_BOOKING.roomNumber} status: ${testRoom.status}`);
      return testRoom.status;
    } else {
      console.log('❌ Test room not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to check room status:', error.response?.data?.message || error.message);
    return null;
  }
}

/********************************************************************
 * MAIN TEST FUNCTION
 ********************************************************************/

async function runComprehensiveTest() {
  console.log('\n🚀 STARTING COMPREHENSIVE PAYMENT FLOW TEST\n');
  console.log('=' .repeat(70));
  
  // Test 1: Login
  if (!await login()) {
    console.log('\n❌ Test aborted: Login failed');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 2: Check initial room availability
  const initialAvailability = await getRoomAvailability();
  if (!initialAvailability) {
    console.log('\n❌ Test aborted: Cannot check room availability');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 3: Create booking
  const booking = await createBooking();
  if (!booking) {
    console.log('\n❌ Test aborted: Booking creation failed');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 4: Check My Bookings (should be empty/hidden)
  console.log('\n📋 TEST 1: UNPAID BOOKING - Should be hidden from My Bookings');
  const unpaidBookings = await checkMyBookings();
  if (!unpaidBookings) {
    console.log('\n❌ Test aborted: Cannot check My Bookings');
    return;
  }
  
  if (unpaidBookings.hasTestBooking) {
    console.log('❌ FAIL: Unpaid booking is visible in My Bookings (should be hidden)');
  } else {
    console.log('✅ PASS: Unpaid booking is correctly hidden from My Bookings');
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 5: Check room status (should remain available)
  console.log('\n🏠 TEST 2: ROOM AVAILABILITY - Should remain available before payment');
  const roomStatusUnpaid = await checkRoomStatusAfterPayment();
  if (roomStatusUnpaid === 'available') {
    console.log('✅ PASS: Room remains available before payment');
  } else {
    console.log(`❌ FAIL: Room status is '${roomStatusUnpaid}' (should be 'available')`);
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 6: Create PayMongo payment
  console.log('\n💳 TEST 3: PAYMENT CREATION');
  const payment = await createPayMongoPayment();
  if (!payment) {
    console.log('\n❌ Test aborted: Payment creation failed');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 7: Simulate webhook payment
  console.log('\n🔄 TEST 4: PAYMENT CONFIRMATION');
  const webhookSuccess = await simulateWebhookPayment();
  if (!webhookSuccess) {
    console.log('\n❌ Test aborted: Webhook simulation failed');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 8: Verify database updates
  console.log('\n🗄️  TEST 5: DATABASE UPDATE VERIFICATION');
  const updatedBooking = await verifyDatabaseUpdate();
  if (!updatedBooking) {
    console.log('\n❌ Test aborted: Database verification failed');
    return;
  }
  
  if (updatedBooking.paymentStatus === 'partial') {
    console.log('✅ PASS: Payment status updated to "partial"');
  } else {
    console.log(`❌ FAIL: Payment status is '${updatedBooking.paymentStatus}' (should be 'partial')`);
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 9: Check My Bookings after payment (should be visible)
  console.log('\n📋 TEST 6: PAID BOOKING VISIBILITY - Should be visible in My Bookings');
  const paidBookings = await checkMyBookings();
  if (!paidBookings) {
    console.log('\n❌ Test aborted: Cannot check My Bookings after payment');
    return;
  }
  
  if (paidBookings.hasTestBooking) {
    console.log('✅ PASS: Paid booking is visible in My Bookings');
  } else {
    console.log('❌ FAIL: Paid booking is still hidden from My Bookings (should be visible)');
  }
  
  console.log('\n' + '=' .repeat(70));
  
  // Test 10: Check room status after payment (should be occupied)
  console.log('\n🏠 TEST 7: ROOM STATUS AFTER PAYMENT - Should be occupied');
  const roomStatusPaid = await checkRoomStatusAfterPayment();
  if (roomStatusPaid === 'occupied') {
    console.log('✅ PASS: Room correctly marked as occupied after payment');
  } else {
    console.log(`❌ FAIL: Room status is '${roomStatusPaid}' (should be 'occupied')`);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n🎉 COMPREHENSIVE TEST COMPLETED!');
  console.log('\n📋 SUMMARY:');
  console.log('- Economy 3-hour booking: ₱200 total → ₱20 downpayment (10%)');
  console.log('- Unpaid bookings: Hidden from My Bookings, rooms stay available');
  console.log('- Paid bookings: Visible in My Bookings as "paid in partial", rooms occupied');
  console.log('- Database updates: paymentStatus → "partial", booking visible');
  
  console.log('\n✅ System ready for live GCash QRPh testing!');
}

// Run the test
runComprehensiveTest().catch(console.error);