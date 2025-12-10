const fs = require('fs');
const path = require('path');

// Fix MyBookings.jsx
const myBookingsPath = path.join(__dirname, 'frontend', 'src', 'MyBookings.jsx');
let myBookingsContent = fs.readFileSync(myBookingsPath, 'utf8');

// Find and replace the specific section with the visual indicator
const myBookingsOld = myBookingsContent;
myBookingsContent = myBookingsContent.replace(
    /<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' \}\}>\s*<h1>My Bookings<\/h1>\s*<div style=\{\{[^}]*\}\}>\s*Last updated:[^<]*<\/div>\s*<\/div>/s,
    `<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h1>My Bookings</h1>
      </div>`
);

if (myBookingsOld !== myBookingsContent) {
    fs.writeFileSync(myBookingsPath, myBookingsContent);
    console.log('✅ Fixed MyBookings.jsx');
} else {
    console.log('⚠️  MyBookings.jsx pattern not found, trying line-by-line replace...');
    // Fallback: remove lines containing lastRefresh
    const lines = myBookingsContent.split('\n');
    const filtered = lines.filter(line => !line.includes('lastRefresh'));
    myBookingsContent = filtered.join('\n');
    fs.writeFileSync(myBookingsPath, myBookingsContent);
    console.log('✅ Removed lastRefresh lines from MyBookings.jsx');
}

// Fix Billings.jsx
const billingsPath = path.join(__dirname, 'frontend', 'src', 'Billings.jsx');
let billingsContent = fs.readFileSync(billingsPath, 'utf8');

const billingsOld = billingsContent;
billingsContent = billingsContent.replace(
    /<div className="billing-header" style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' \}\}>\s*<h1>Billings<\/h1>\s*<div style=\{\{[^}]*\}\}>\s*Last updated:[^<]*<\/div>\s*<\/div>/s,
    `<div className="billing-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>

      </div>`
);

if (billingsOld !== billingsContent) {
    fs.writeFileSync(billingsPath, billingsContent);
    console.log('✅ Fixed Billings.jsx');
} else {
    console.log('⚠️  Billings.jsx pattern not found, trying line-by-line replace...');
    // Fallback: remove lines containing lastRefresh
    const lines = billingsContent.split('\n');
    const filtered = lines.filter(line => !line.includes('lastRefresh'));
    billingsContent = filtered.join('\n');
    fs.writeFileSync(billingsPath, billingsContent);
    console.log('✅ Removed lastRefresh lines from Billings.jsx');
}

console.log('\n✅ All fixes applied!');
