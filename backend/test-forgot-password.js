const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: 'employee@example.com'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Success:', res.data);
  } catch (err) {
    const data = err.response ? err.response.data : { message: err.message };
    console.log('Error:', data);
  }
}

run();