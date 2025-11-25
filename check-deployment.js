const axios = require('axios');

const BACKEND_URL = 'https://hotel-management-system-1-1-backend.onrender.com';
const FRONTEND_URL = 'https://hotel-management-system-1-1.onrender.com';

async function checkDeployment() {
  console.log('🔍 Checking Deployment Status...\n');
  
  try {
    // Check backend health
    console.log('1️⃣ Checking Backend Health...');
    const backendHealth = await axios.get(`${BACKEND_URL}/healthz`);
    if (backendHealth.status === 200) {
      console.log('✅ Backend is LIVE and healthy');
    }
  } catch (error) {
    console.log('❌ Backend not ready yet');
    console.log('   This is normal during initial deployment');
  }
  
  try {
    // Check frontend
    console.log('\n2️⃣ Checking Frontend...');
    const frontend = await axios.get(FRONTEND_URL);
    if (frontend.status === 200) {
      console.log('✅ Frontend is LIVE');
    }
  } catch (error) {
    console.log('❌ Frontend not ready yet');
    console.log('   This is normal during initial deployment');
  }
  
  console.log('\n📋 Deployment Summary:');
  console.log(`   Backend: ${BACKEND_URL}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  console.log(`   My Bookings: ${FRONTEND_URL}/my-bookings`);
  
  console.log('\n⏱️  Deployment typically takes 2-5 minutes');
  console.log('🔄 Run this script again in a few minutes to check status');
}

checkDeployment().catch(console.error);