/**
 * Script to fix the orderId unique index issue in billings collection
 * Drops the old unique index and creates a sparse index instead
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-management';

async function fixBillingIndex() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('billings');

        // Get existing indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);

        // Find and drop the orderId_1 index if it exists
        const orderIdIndex = indexes.find(idx => idx.name === 'orderId_1');
        if (orderIdIndex) {
            console.log('Dropping orderId_1 index...');
            await collection.dropIndex('orderId_1');
            console.log('Index dropped successfully');
        } else {
            console.log('orderId_1 index not found');
        }

        // Create a new sparse index (only enforces uniqueness when orderId is not null)
        console.log('Creating new sparse unique index on orderId...');
        await collection.createIndex(
            { orderId: 1 },
            { unique: true, sparse: true }
        );
        console.log('New sparse index created successfully');

        console.log('Done! The duplicate key error should be fixed now.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing billing index:', error);
        process.exit(1);
    }
}

fixBillingIndex();
