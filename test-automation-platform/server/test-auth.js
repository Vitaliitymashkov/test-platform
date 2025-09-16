const axios = require('axios');

async function testAuth() {
  try {
    // Test if server is running
    console.log('Testing server connection...');
    const healthCheck = await axios.get('http://localhost:3001/api/auth/github');
    console.log('✓ Server is running');
    console.log('GitHub OAuth URL:', healthCheck.data.url);
    
    // Test with a mock token
    console.log('\nTesting auth middleware...');
    try {
      await axios.get('http://localhost:3001/api/interactive-test/sessions', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Auth middleware is working (rejects invalid token)');
      } else {
        console.log('✗ Unexpected error:', error.response?.status);
      }
    }
    
    console.log('\nTo test GitHub OAuth:');
    console.log('1. Visit the GitHub OAuth URL above');
    console.log('2. Authorize the application');
    console.log('3. Check the callback handling');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAuth();