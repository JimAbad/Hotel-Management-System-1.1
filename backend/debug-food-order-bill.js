/**
 * Debug script to check why food order bill for room 205 isn't showing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const User = require('./models/User');
const Booking = require('./models/bookingModel');

const MONGO_URI = process.env.MONGO_URI;

async function debugFoodOrderBill() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // 1. Find the food order bill for room 205
        console.log('🔍 Searching for bills with roomNumber 205...');
        const allRoom205Bills = await Billing.find({ roomNumber: '205' })
            .populate('user')
            .populate('booking')
            .lean();

        console.log(`\nFound ${allRoom205Bills.length} bill(s) for room 205:\n`);

        allRoom205Bills.forEach((bill, index) => {
            console.log(`Bill #${index + 1}:`);
            console.log(`  _id: ${bill._id}`);
            console.log(`  roomNumber: ${bill.roomNumber}`);
            console.log(`  description: ${bill.description || 'N/A'}`);
            console.log(`  amount: ₱${bill.amount || 'N/A'}`);
            console.log(`  billType: ${bill.billType || 'N/A'}`);
            console.log(`  user: ${bill.user ? `${bill.user.name} (${bill.user._id})` : '❌ MISSING'}`);
            console.log(`  booking: ${bill.booking ? bill.booking._id : '❌ MISSING (This is OK for food orders)'}`);
            console.log(`  orderId: ${bill.orderId || 'N/A'}`);
            console.log(`  items: ${bill.items ? bill.items.length + ' items' : 'N/A'}`);
            console.log(`  status: ${bill.status}`);
            console.log('');
        });

        // 2. Check active bookings for room 205
        console.log('\n🔍 Searching for active bookings for room 205...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeBookings = await Booking.find({
            roomNumber: '205',
            paymentStatus: { $in: ['paid', 'partial'] },
            checkOut: { $gte: today },
            status: { $nin: ['cancelled', 'completed'] }
        }).populate('user');

        console.log(`Found ${activeBookings.length} active booking(s) for room 205:\n`);

        activeBookings.forEach((booking, index) => {
            console.log(`Booking #${index + 1}:`);
            console.log(`  _id: ${booking._id}`);
            console.log(`  user: ${booking.user ? `${booking.user.name} (${booking.user._id})` : 'N/A'}`);
            console.log(`  roomNumber: ${booking.roomNumber}`);
            console.log(`  paymentStatus: ${booking.paymentStatus}`);
            console.log(`  status: ${booking.status}`);
            console.log(`  checkIn: ${booking.checkIn}`);
            console.log(`  checkOut: ${booking.checkOut}`);
            console.log('');
        });

        // 3. Identify the issue
        console.log('\n🔍 DIAGNOSIS:\n');

        const foodOrders = allRoom205Bills.filter(b => b.orderId || b.items?.length > 0);
        const roomCharges = allRoom205Bills.filter(b => !b.orderId && (!b.items || b.items.length === 0));

        console.log(`  Room charge bills: ${roomCharges.length}`);
        console.log(`  Food order bills: ${foodOrders.length}`);

        if (foodOrders.length > 0) {
            const missingUser = foodOrders.filter(b => !b.user);
            const wrongUser = foodOrders.filter(b => {
                if (!b.user || activeBookings.length === 0) return false;
                return b.user._id.toString() !== activeBookings[0].user._id.toString();
            });

            if (missingUser.length > 0) {
                console.log(`\n  ❌ ISSUE FOUND: ${missingUser.length} food order(s) missing 'user' field`);
                console.log(`     -> These bills won't show because getBillings filters by user ID`);
                console.log(`     -> Need to add user field to food order bills`);
            }

            if (wrongUser.length > 0) {
                console.log(`\n  ❌ ISSUE FOUND: ${wrongUser.length} food order(s) have wrong user ID`);
                console.log(`     -> Food order user doesn't match booking user`);
            }

            if (missingUser.length === 0 && wrongUser.length === 0) {
                console.log(`\n  ✅ All food orders have correct user field`);
                console.log(`     -> The issue might be in the frontend or API logic`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

debugFoodOrderBill();
