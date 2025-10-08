const axios = require('axios');

const registerAdminUsers = async () => {
  // Add a delay to ensure the server is fully initialized
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

  try {
    const usersToRegister = [
      {
        fullName: 'Employee Admin',
        username: 'employee',
        email: 'employee@example.com',
        password: 'password123',
        role: 'admin',
        jobTitle: 'Front Desk',
        contactNumber: '111-222-3333',
      },
      {
        fullName: 'Hotel Admin',
        username: 'hoteladmin',
        email: 'hoteladmin@example.com',
        password: 'password123',
        role: 'admin',
        jobTitle: 'General Manager',
        contactNumber: '444-555-6666',
      },
    ];

    for (const userData of usersToRegister) {
      try {
        // Check if user already exists by email or username
        const checkResponse = await axios.get(`http://localhost:3000/api/auth/checkuser?email=${userData.email}&username=${userData.username}`);
        if (checkResponse.data.exists) {
          console.log(`${userData.fullName} already exists. Skipping registration.`);
          continue;
        }

        await axios.post('http://localhost:3000/api/auth/register', userData);
        console.log(`${userData.fullName} registered successfully.`);
      } catch (error) {
        console.error(`Error registering ${userData.fullName}:`, error.response ? error.response.data : error.message);
      }
    }
  } catch (error) {
    console.error('Error in registerAdminUsers script:', error.message);
  }
};

registerAdminUsers();