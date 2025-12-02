/**
 * Add user field to ALL bills for room 205
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const Booking = require('./models/bookingModel');

async function addUserToRoom205Bills() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected\n');

        // Find the booking for room 205
        const booking = await Booking.findOne({
            roomNumber: '205',
            paymentStatus: { $in: ['paid', 'partial'] }
        }).sort({ checkIn: -1 });

        if (!booking) {
            console.log('❌ No booking found for room 205');
            return;
        }

        console.log(`✅ Found booking for room 205, user: ${booking.user}\n`);

        // Update ALL bills for room 205 to have this user
        const result = await Billing.updateMany(
            { roomNumber: '205', user: { $exists: false } },
            { $set: { user: booking.user } }
        );

        console.log(`✅ Updated ${result.modifiedCount} bill(s)\n`);

        // Verify
        const bills = await Billing.find({ roomNumber: '205' });
        console.log(`Total bills for room 205: ${bills.length}\n`);

        bills.forEach((bill, idx) => {
            console.log(`${idx + 1}. ${bill.description}`);
            console.log(`   Amount: ₱${bill.amount}`);
            console.log(`   User: ${bill.user ? '✅ Present' : '❌ MISSING'}`);
            console.log(`   Type: ${bill.billType || 'room_charge'}`);
            console.log('');
        });

        console.log('✅ Done! Hard refresh the admin page.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

addUserToRoom205Bills();
