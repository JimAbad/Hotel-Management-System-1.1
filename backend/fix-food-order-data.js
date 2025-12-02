/**
 * Debug and fix food order bill data
 * Check what fields are missing and populate them
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');

const MONGO_URI = process.env.MONGO_URI;

async function fixFoodOrderData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find food order bills for room 205
        const foodOrders = await Billing.find({
            roomNumber: '205',
            $or: [
                { orderId: { $exists: true } },
                { items: { $exists: true, $ne: [] } },
                { billType: 'food_order' }
            ]
        }).lean();

        console.log(`Found ${foodOrders.length} food order bill(s) for room 205:\n`);

        for (const bill of foodOrders) {
            console.log(`Bill ID: ${bill._id}`);
            console.log(`  roomNumber: ${bill.roomNumber}`);
            console.log(`  user: ${bill.user || '❌ MISSING'}`);
            console.log(`  description: "${bill.description || '❌ MISSING'}"`);
            console.log(`  amount: ${bill.amount || '❌ MISSING/ZERO'}`);
            console.log(`  billType: ${bill.billType || 'N/A'}`);
            console.log(`  orderId: ${bill.orderId || 'N/A'}`);
            console.log(`  items: ${bill.items ? bill.items.length + ' items' : '❌ MISSING'}`);

            if (bill.items && bill.items.length > 0) {
                console.log(`  Items details:`);
                bill.items.forEach((item, idx) => {
                    console.log(`    ${idx + 1}. ${item.name} - ₱${item.price} x ${item.quantity}`);
                });
            }
            console.log('');

            // Fix missing fields
            const updates = {};
            let needsUpdate = false;

            // Calculate amount from items if missing
            if (!bill.amount || bill.amount === 0) {
                if (bill.items && bill.items.length > 0) {
                    const totalAmount = bill.items.reduce((sum, item) => {
                        return sum + (item.price * item.quantity);
                    }, 0);
                    updates.amount = totalAmount;
                    needsUpdate = true;
                    console.log(`  ✅ Will set amount to ₱${totalAmount}`);
                }
            }

            // Add description from items if missing
            if (!bill.description || bill.description === '') {
                if (bill.items && bill.items.length > 0) {
                    const itemNames = bill.items.map(item => item.name).join(', ');
                    updates.description = `Food Order - ${itemNames}`;
                    needsUpdate = true;
                    console.log(`  ✅ Will set description to "${updates.description}"`);
                }
            }

            // Set billType if missing
            if (!bill.billType) {
                updates.billType = 'food_order';
                needsUpdate = true;
                console.log(`  ✅ Will set billType to 'food_order'`);
            }

            // Apply updates
            if (needsUpdate) {
                await Billing.updateOne({ _id: bill._id }, { $set: updates });
                console.log(`  ✅ Bill updated successfully\n`);
            } else {
                console.log(`  ℹ️  No updates needed\n`);
            }
        }

        console.log('✅ All food order bills have been fixed!');
        console.log('🎯 Refresh the billing page to see the correct amounts and descriptions');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

fixFoodOrderData();
