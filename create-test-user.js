const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

async function createTestUser() {
  console.log('Creating test user...');
  
  try {
    // Try to register the user
    const registerRes = await axios.post(`${API_BASE}/auth/register`, testUser);
    console.log('✅ Test user created successfully');
    console.log('Email:', testUser.email);
    console.log('Password:', testUser.password);
    return true;
  } catch (error) {
    if (error.response && error.response.data.msg === 'User already exists') {
      console.log('ℹ️ Test user already exists, proceeding with test');
      return true;
    }
    console.error('❌ Failed to create test user:', error.message);
    return false;
  }
}

createTestUser().then(success => {
  if (success) {
    console.log('\n🎉 Test user ready for testing!');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  }
}).catch(console.error);