// Script to fix existing bookings that have rooms assigned but status is still 'pending'
const mongoose = require('mongoose');
const Booking = require('./models/bookingModel');
require('dotenv').config();

async function fixPendingBookingsWithRooms() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find all bookings that have a room assigned but status is 'pending'
        const bookingsToFix = await Booking.find({
            $and: [
                { status: 'pending' },
                { roomNumber: { $exists: true, $ne: null, $ne: '' } }
            ]
        });

        console.log(`Found ${bookingsToFix.length} bookings to fix`);

        // Update each booking to 'occupied'
        let updated = 0;
        for (const booking of bookingsToFix) {
            booking.status = 'occupied';
            await booking.save();
            updated++;
            console.log(`Updated booking ${booking.referenceNumber} (${booking._id}) to 'occupied'`);
        }

        console.log(`\nSuccessfully updated ${updated} bookings from 'pending' to 'occupied'`);

        // Disconnect
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing bookings:', error);
        process.exit(1);
    }
}

fixPendingBookingsWithRooms();
