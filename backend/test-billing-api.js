const axios = require('axios');

async function testBillingAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTY1MWQyYmE2MjRkY2MyYjJjZGRmNiIsImlhdCI6MTc1OTkyNDkxMX0.UMw9eFlQvluFdJKnNynC3ysIVdtHWGli2uFJbAC2Z28';
  
  try {
    console.log('Testing billing API with token...');
    console.log('Token:', token);
    console.log('Authorization header:', `Bearer ${token}`);
    
    const response = await axios.get('http://localhost:3000/api/billings/room/101', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Success! Billing data:', response.data);
  } catch (error) {
    console.error('Error response:', error.response ? error.response.data : error.message);
    console.error('Error status:', error.response ? error.response.status : 'No status');
  }
}

testBillingAPI();