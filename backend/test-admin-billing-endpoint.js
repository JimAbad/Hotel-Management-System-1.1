/**
 * Test admin billing endpoint to see what bills are returned
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');

const MONGO_URI = process.env.MONGO_URI;

async function testAdminBillingEndpoint() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Simulate what getAllCustomerBills does
        console.log('🔍 Simulating admin billing endpoint query...\n');

        const docs = await Billing.find({})
            .populate({
                path: 'booking',
                select: 'referenceNumber customerName checkOut roomNumber status paymentStatus'
            })
            .populate({
                path: 'user',
                select: 'name email'
            })
            .lean();

        console.log(`Found ${docs.length} total bills in database\n`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Apply the same filter as getAllCustomerBills
        const activeBills = docs.filter((d) => {
            // Include bills without bookings (food orders, service charges)
            if (!d.booking) {
                const hasRoom = d.roomNumber != null;
                console.log(`Bill ${d._id}: No booking, roomNumber=${d.roomNumber}, included=${hasRoom}`);
                return hasRoom;
            }

            const co = d.booking.checkOut ? new Date(d.booking.checkOut) : null;
            // Exclude if missing or past check-out
            if (!co || isNaN(co)) {
                console.log(`Bill ${d._id}: Invalid checkout, excluded`);
                return false;
            }
            // Exclude unpaid pending bookings
            if (d.booking.status === 'pending' && d.booking.paymentStatus === 'pending') {
                console.log(`Bill ${d._id}: Unpaid pending booking, excluded`);
                return false;
            }

            const isActive = co >= today;
            console.log(`Bill ${d._id}: Booking, checkout=${co.toISOString().split('T')[0]}, active=${isActive}`);
            return isActive;
        });

        console.log(`\n✅ Active bills after filtering: ${activeBills.length}\n`);

        activeBills.forEach((bill, idx) => {
            console.log(`Bill #${idx + 1}:`);
            console.log(`  _id: ${bill._id}`);
            console.log(`  roomNumber: ${bill.roomNumber}`);
            console.log(`  user: ${bill.user ? bill.user.name : 'N/A'}`);
            console.log(`  description: ${bill.description}`);
            console.log(`  amount: ₱${bill.amount}`);
            console.log(`  booking: ${bill.booking ? 'Yes' : 'No (food order)'}`);
            console.log('');
        });

        console.log('✅ This is what the admin endpoint should return');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

testAdminBillingEndpoint();
