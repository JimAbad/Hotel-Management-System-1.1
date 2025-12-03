/**
 * Fix script to add user field to food order bills
 * Food orders have roomNumber but missing user field
 * This script finds the booking for that room and adds the user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const Booking = require('./models/bookingModel');

const MONGO_URI = process.env.MONGO_URI;

async function fixFoodOrderUserField() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all food order bills without user field
        const foodOrdersWithoutUser = await Billing.find({
            user: { $exists: false }
        }).lean();

        console.log(`Found ${foodOrdersWithoutUser.length} bill(s) without user field\n`);

        if (foodOrdersWithoutUser.length === 0) {
            console.log('✅ All bills have user field. No fix needed.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let fixed = 0;
        let failed = 0;

        for (const bill of foodOrdersWithoutUser) {
            console.log(`\nProcessing bill ${bill._id}:`);
            console.log(`  Room Number: ${bill.roomNumber}`);
            console.log(`  Amount: ₱${bill.amount}`);
            console.log(`  Description: ${bill.description || 'N/A'}`);

            if (!bill.roomNumber) {
                console.log(`  ❌ Skipped: No room number`);
                failed++;
                continue;
            }

            // Find active booking for this room
            const booking = await Booking.findOne({
                roomNumber: bill.roomNumber,
                paymentStatus: { $in: ['paid', 'partial'] },
                checkOut: { $gte: today },
                status: { $nin: ['cancelled', 'completed'] }
            }).sort({ checkIn: -1 }); // Most recent booking

            if (!booking) {
                console.log(`  ❌ No active booking found for room ${bill.roomNumber}`);
                failed++;
                continue;
            }

            // Update the bill with user field
            await Billing.updateOne(
                { _id: bill._id },
                { $set: { user: booking.user } }
            );

            console.log(`  ✅ Added user ${booking.user} to bill`);
            fixed++;
        }

        console.log(`\n\n📊 SUMMARY:`);
        console.log(`  Total bills processed: ${foodOrdersWithoutUser.length}`);
        console.log(`  Successfully fixed: ${fixed}`);
        console.log(`  Failed: ${failed}`);

        if (fixed > 0) {
            console.log(`\n✅ Food order bills should now appear in the billing page!`);
            console.log(`🎯 Refresh the Billings page to see the merged bills.`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

fixFoodOrderUserField();
