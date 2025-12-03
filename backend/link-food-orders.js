/**
 * Script to link food order bills to their active bookings
 * This is required because the Admin Frontend filters out bills without a valid checkout date.
 * By linking the booking, the bill will inherit the checkout date and appear in the list.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const Booking = require('./models/bookingModel');

const MONGO_URI = process.env.MONGO_URI;

async function linkFoodOrdersToBookings() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find bills for room 205 (and others) that don't have a booking reference
        // but have a roomNumber
        const billsToFix = await Billing.find({
            booking: { $exists: false },
            roomNumber: { $exists: true, $ne: null }
        });

        console.log(`Found ${billsToFix.length} bills without booking reference.\n`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let fixed = 0;
        let skipped = 0;

        for (const bill of billsToFix) {
            console.log(`Processing bill ${bill._id} (Room ${bill.roomNumber}, Amount: ${bill.amount})`);

            // Find the active booking for this room
            // We look for a booking that includes the bill's creation date, or just the current active one
            // Since we want it to show up NOW, we look for the active booking.
            const booking = await Booking.findOne({
                roomNumber: bill.roomNumber,
                paymentStatus: { $in: ['paid', 'partial'] },
                checkOut: { $gte: today },
                status: { $nin: ['cancelled', 'completed'] }
            }).sort({ checkIn: -1 });

            if (booking) {
                console.log(`  ✅ Found active booking: ${booking._id} (CheckOut: ${booking.checkOut})`);

                await Billing.updateOne(
                    { _id: bill._id },
                    { $set: { booking: booking._id } }
                );
                console.log(`  🔗 Linked bill to booking successfully.`);
                fixed++;
            } else {
                console.log(`  ⚠️ No active booking found for room ${bill.roomNumber}. Skipping.`);
                skipped++;
            }
            console.log('');
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`  Fixed: ${fixed}`);
        console.log(`  Skipped: ${skipped}`);

        if (fixed > 0) {
            console.log(`\n✅ Food orders should now appear in the Admin Bill List!`);
            console.log(`🎯 Hard refresh the admin page.`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

linkFoodOrdersToBookings();
