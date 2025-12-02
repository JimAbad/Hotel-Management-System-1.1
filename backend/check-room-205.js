/**
 * Simple check - what bills exist for room 205
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');

const MONGO_URI = process.env.MONGO_URI;

async function checkRoom205Bills() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected\n');

        const bills = await Billing.find({ roomNumber: '205' });

        console.log(`Found ${bills.length} bills for room 205:\n`);

        for (const bill of bills) {
            console.log(`Bill: ${bill._id}`);
            console.log(`  user: ${bill.user || 'MISSING'}`);
            console.log(`  amount: ${bill.amount}`);
            console.log(`  description: ${bill.description}`);
            console.log(`  billType: ${bill.billType}`);
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkRoom205Bills();
