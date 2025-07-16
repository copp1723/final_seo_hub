// Test emergency access functionality
const testEmergencyAccess = async () => {
  console.log('🧪 Testing Emergency Access System\n');

  // Test configuration
  const TEST_TOKEN = 'test-emergency-token-12345';
  const TEST_EMAIL = 'emergency@seohub.com';
  const API_URL = 'http://localhost:3000';

  // Set test environment variable
  process.env.EMERGENCY_ADMIN_TOKEN = TEST_TOKEN;
  process.env.EMERGENCY_ADMIN_EMAIL = TEST_EMAIL;

  console.log('📋 Test Configuration:');
  console.log(`  Token: ${TEST_TOKEN}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log(`  URL: ${API_URL}\n`);

  try {
    // Test 1: Emergency login
    console.log('Test 1: Emergency Login');
    const loginResponse = await fetch(`${API_URL}/api/auth/simple-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        token: TEST_TOKEN
      })
    });

    const loginData = await loginResponse.json();
    console.log('  Status:', loginResponse.status);
    console.log('  Success:', loginData.success || false);
    console.log('  User Role:', loginData.user?.role || 'N/A');
    console.log('  ✅ Emergency login test:', loginResponse.ok ? 'PASSED' : 'FAILED');
    console.log('');

    // Test 2: Create invitation via emergency API
    console.log('Test 2: Create Invitation via Emergency API');
    const inviteResponse = await fetch(`${API_URL}/api/auth/emergency-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        email: 'test.user@example.com',
        role: 'SUPER_ADMIN'
      })
    });

    const inviteData = await inviteResponse.json();
    console.log('  Status:', inviteResponse.status);
    console.log('  Success:', inviteData.success || false);
    console.log('  Token Generated:', !!inviteData.invitation?.token);
    console.log('  ✅ Emergency invite test:', inviteResponse.ok ? 'PASSED' : 'FAILED');
    console.log('');

    // Test 3: Invalid token
    console.log('Test 3: Invalid Token (Security Check)');
    const invalidResponse = await fetch(`${API_URL}/api/auth/simple-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        token: 'invalid-token'
      })
    });

    const invalidData = await invalidResponse.json();
    console.log('  Status:', invalidResponse.status);
    console.log('  Error:', invalidData.error || 'N/A');
    console.log('  ✅ Security test:', !invalidResponse.ok ? 'PASSED' : 'FAILED');
    console.log('');

    console.log('🎉 All tests completed!');
    console.log('\nNext steps:');
    console.log('1. Set EMERGENCY_ADMIN_TOKEN in your Render environment');
    console.log('2. Optionally set EMERGENCY_ADMIN_EMAIL (defaults to emergency@seohub.com)');
    console.log('3. Use the emergency credentials to log in immediately');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure your development server is running on port 3000');
  }
};

// Run the test
testEmergencyAccess();