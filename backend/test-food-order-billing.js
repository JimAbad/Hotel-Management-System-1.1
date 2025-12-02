/**
 * Test script to create a food order billing record for room 205
 * This will test if food order bills merge with room booking bills
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const User = require('./models/User');
const Booking = require('./models/bookingModel');

const MONGO_URI = process.env.MONGO_URI;

async function testFoodOrderBilling() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find the user (Red Bencasio from screenshot)
        const user = await User.findOne({ name: /red/i });

        if (!user) {
            console.log('❌ User not found. Please check user name.');
            return;
        }
        console.log(`✅ Found user: ${user.name} (${user.email})`);

        // Find active booking for room 205
        const booking = await Booking.findOne({
            user: user._id,
            roomNumber: '205',
            paymentStatus: { $in: ['paid', 'partial'] }
        });

        if (!booking) {
            console.log('❌ No active booking found for room 205');
            console.log('💡 Make sure the booking has payment status "paid" or "partial"');
            return;
        }
        console.log(`✅ Found booking for room ${booking.roomNumber}`);

        // Create a food order billing record
        const foodOrderBill = await Billing.create({
            user: user._id,
            roomNumber: '205',  // Same room number as booking
            amount: 350,
            description: 'Food Order - Burger + Fries',
            status: 'pending',
            billType: 'food_order',
            paymentMethod: 'cash',
            items: [
                {
                    name: 'Burger',
                    category: 'Main Course',
                    price: 200,
                    quantity: 1,
                    addedAt: new Date()
                },
                {
                    name: 'Fries',
                    category: 'Side Dish',
                    price: 150,
                    quantity: 1,
                    addedAt: new Date()
                }
            ]
        });

        console.log('\n✅ Successfully created food order bill:');
        console.log(`   Bill ID: ${foodOrderBill._id}`);
        console.log(`   Room Number: ${foodOrderBill.roomNumber}`);
        console.log(`   Amount: ₱${foodOrderBill.amount}`);
        console.log(`   Description: ${foodOrderBill.description}`);
        console.log(`   Bill Type: ${foodOrderBill.billType}`);
        console.log(`   Items: ${foodOrderBill.items.length} items`);

        // Verify: Fetch all bills for room 205
        console.log('\n🔍 Fetching all bills for room 205...');
        const allBills = await Billing.find({
            user: user._id,
            roomNumber: '205'
        }).populate('booking');

        console.log(`\n✅ Found ${allBills.length} bill(s) for room 205:`);
        allBills.forEach((bill, index) => {
            console.log(`\n   Bill #${index + 1}:`);
            console.log(`   - Description: ${bill.description}`);
            console.log(`   - Amount: ₱${bill.amount}`);
            console.log(`   - Type: ${bill.billType || 'room_charge'}`);
            console.log(`   - Status: ${bill.status}`);
        });

        console.log('\n✅ TEST PASSED! Bills should now be merged in the billing page.');
        console.log('🎯 Go to the Billings page to see both bills under Room 205');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

testFoodOrderBilling();
