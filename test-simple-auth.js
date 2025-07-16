#!/usr/bin/env node

/**
 * Simple test script to verify the new authentication system
 * Run with: node test-simple-auth.js
 */

const https = require('https');

// Test URLs
const BASE_URL = 'https://rylie-seo-hub.onrender.com';
// const BASE_URL = 'http://localhost:3000'; // For local testing

// Test users from the database
const testUsers = [
  {
    email: 'josh.copp@onekeel.ai',
    role: 'SUPER_ADMIN'
  },
  {
    email: 'access@seowerks.ai',
    role: 'AGENCY_ADMIN'
  }
];

// Simple HTTP request helper
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (new URL(url).protocol === 'https:' ? 443 : 80),
      path: new URL(url).pathname + new URL(url).search,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSimpleAuth() {
  console.log('🔍 Testing Simple Authentication System');
  console.log('=====================================\n');

  try {
    // Test 1: Check if simple session endpoint is accessible
    console.log('1. Testing simple session endpoint...');
    const sessionCheck = await makeRequest(`${BASE_URL}/api/auth/simple-session`);
    console.log(`   Status: ${sessionCheck.status}`);
    console.log(`   Response: ${JSON.stringify(sessionCheck.data)}\n`);

    // Test 2: Check if simple signin page is accessible
    console.log('2. Testing simple signin page...');
    const signinPage = await makeRequest(`${BASE_URL}/auth/simple-signin`);
    console.log(`   Status: ${signinPage.status}`);
    console.log(`   Response type: ${typeof signinPage.data}\n`);

    // Test 3: Test with invalid credentials
    console.log('3. Testing invalid credentials...');
    const invalidAuth = await makeRequest(`${BASE_URL}/api/auth/simple-signin`, 'POST', {
      email: 'invalid@example.com',
      token: 'invalid-token'
    });
    console.log(`   Status: ${invalidAuth.status}`);
    console.log(`   Response: ${JSON.stringify(invalidAuth.data)}\n`);

    // Test 4: Check existing database sessions
    console.log('4. Checking existing sessions...');
    const debugSession = await makeRequest(`${BASE_URL}/api/debug/session-check`);
    console.log(`   Status: ${debugSession.status}`);
    if (debugSession.data.databaseSessions) {
      console.log(`   Found ${debugSession.data.databaseSessions.length} sessions in database`);
      debugSession.data.databaseSessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.user.email} (${session.user.role})`);
      });
    }
    console.log();

    console.log('✅ Simple authentication system test completed!');
    console.log('\nNext steps:');
    console.log('- Test with valid invitation tokens');
    console.log('- Update middleware to use simple auth');
    console.log('- Test protected routes with new system');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleAuth();