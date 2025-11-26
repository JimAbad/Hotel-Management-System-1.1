// QRPh Partial Payment Test Instructions
// This script generates the test URLs and instructions for manual testing

const FRONTEND_URL = 'https://imperturbable-precondylar-sherika.ngrok-free.dev';
const API_BASE = 'http://localhost:3000/api';

console.log('🧪 QRPh Partial Payment Test Setup');
console.log('=====================================\n');

console.log('📱 Frontend URL:', FRONTEND_URL);
console.log('🔗 Backend API:', API_BASE);

console.log('\n🎯 Test Steps:');
console.log('1️⃣ Open the frontend URL on your phone:');
console.log(`   ${FRONTEND_URL}`);

console.log('\n2️⃣ Navigate to Rooms and book any available room');
console.log('   - Fill in guest details');
console.log('   - Select dates (check-in tomorrow, check-out day after)');
console.log('   - Complete the booking form');

console.log('\n3️⃣ When redirected to payment, choose QRPh option');
console.log('   - This will show you a QR code');

console.log('\n4️⃣ Scan the QR code with your GCash/PayMaya app');
console.log('   - Make a PARTIAL payment (example: if total is ₱1000, pay only ₱500)');
console.log('   - Complete the payment');

console.log('\n5️⃣ After payment, check My Bookings page:');
console.log(`   ${FRONTEND_URL}/my-bookings`);

console.log('\n✅ Expected Results:');
console.log('   - Booking should appear in My Bookings');
console.log('   - Payment status should show "partial"');
console.log('   - Amount paid should be less than total amount');

console.log('\n🔍 What to Verify:');
console.log('   - Booking only appears AFTER payment (not before)');
console.log('   - Payment status is "partial" when amount < total');
console.log('   - Unpaid bookings don\'t appear in My Bookings');

console.log('\n📋 Test URLs for Quick Access:');
console.log(`   Frontend: ${FRONTEND_URL}`);
console.log(`   My Bookings: ${FRONTEND_URL}/my-bookings`);

console.log('\n✅ Setup complete! Ready for manual QRPh testing.');