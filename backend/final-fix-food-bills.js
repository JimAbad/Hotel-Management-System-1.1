/**
 * Final comprehensive check and fix for food order bills
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const Booking = require('./models/bookingModel');

const MONGO_URI = process.env.MONGO_URI;

async function finalFixFoodOrderBills() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find ALL bills for room 205
        console.log('🔍 Checking ALL bills for room 205...\n');
        const allBills = await Billing.find({ roomNumber: '205' })
            .populate('user')
            .populate('booking')
            .lean();

        console.log(`Found ${allBills.length} bill(s) for room 205:\n`);

        for (const bill of allBills) {
            console.log(`Bill ID: ${bill._id}`);
            console.log(`  roomNumber: ${bill.roomNumber}`);
            console.log(`  user: ${bill.user ? `✅ ${bill.user.name} (${bill.user._id})` : '❌ MISSING'}`);
            console.log(`  description: ${bill.description || '❌ MISSING'}`);
            console.log(`  amount: ${bill.amount || '❌ ZERO/MISSING'}`);
            console.log(`  billType: ${bill.billType || 'N/A'}`);
            console.log(`  booking: ${bill.booking ? `✅ ${bill.booking._id}` : 'No (food order)'}`);
            console.log(`  orderId: ${bill.orderId || 'N/A'}`);
            console.log(`  items: ${bill.items ? bill.items.length : 0} items`);
            console.log(`  createdAt: ${bill.createdAt}`);
            console.log('');

            // Check what needs fixing
            const updates = {};
            let needsUpdate = false;

            // Fix user field
            if (!bill.user) {
                const booking = await Booking.findOne({
                    roomNumber: '205',
                    paymentStatus: { $in: ['paid', 'partial'] }
                }).sort({ checkIn: -1 });

                if (booking) {
                    updates.user = booking.user;
                    needsUpdate = true;
                    console.log(`  🔧 Will add user: ${booking.user}`);
                }
            }

            // Fix amount
            if (!bill.amount || bill.amount === 0) {
                if (bill.items && bill.items.length > 0) {
                    const total = bill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    updates.amount = total;
                    needsUpdate = true;
                    console.log(`  🔧 Will set amount to: ₱${total}`);
                }
            }

            // Fix description
            if (!bill.description || bill.description === '') {
                if (bill.items && bill.items.length > 0) {
                    const itemNames = bill.items.map(i => i.name).join(', ');
                    updates.description = `Food Order - ${itemNames}`;
                    needsUpdate = true;
                    console.log(`  🔧 Will set description to: "${updates.description}"`);
                }
            }

            // Fix billType
            if (!bill.billType && (bill.orderId || (bill.items && bill.items.length > 0))) {
                updates.billType = 'food_order';
                needsUpdate = true;
                console.log(`  🔧 Will set billType to: food_order`);
            }

            if (needsUpdate) {
                await Billing.updateOne({ _id: bill._id }, { $set: updates });
                console.log(`  ✅ Bill updated!\n`);
            } else {
                console.log(`  ✅ Bill is complete, no updates needed\n`);
            }
        }

        // Final verification
        console.log('\n📊 FINAL VERIFICATION:\n');
        const finalBills = await Billing.find({ roomNumber: '205' })
            .populate('user')
            .lean();

        console.log(`Total bills for room 205: ${finalBills.length}\n`);
        finalBills.forEach((bill, idx) => {
            console.log(`${idx + 1}. ${bill.description} - ₱${bill.amount}`);
            console.log(`   User: ${bill.user ? bill.user.name : 'MISSING'}`);
            console.log(`   Type: ${bill.billType || 'room_charge'}`);
            console.log('');
        });

        console.log('✅ ALL FIXES COMPLETE!');
        console.log('🎯 Hard refresh the admin billing page (Ctrl+Shift+R)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

finalFixFoodOrderBills();
