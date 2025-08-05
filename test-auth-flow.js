#!/usr/bin/env node

/**
 * Test script to verify the authentication flow works correctly
 * This tests the middleware and authentication endpoints
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'https://rylie-seo-hub.onrender.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'SEO-Hub-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          redirectLocation: res.headers.location
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow');
  console.log('================================');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Root route should redirect to sign-in
    console.log('1. Testing root route (/) - should redirect to sign-in');
    const rootResponse = await makeRequest(BASE_URL + '/');
    console.log(`   Status: ${rootResponse.statusCode}`);
    console.log(`   Redirect: ${rootResponse.redirectLocation || 'None'}`);
    
    if (rootResponse.statusCode === 307 || rootResponse.statusCode === 302) {
      if (rootResponse.redirectLocation && rootResponse.redirectLocation.includes('/auth/simple-signin')) {
        console.log('   ✅ Root route correctly redirects to sign-in\n');
      } else {
        console.log('   ❌ Root route redirects but not to sign-in page\n');
      }
    } else {
      console.log('   ❌ Root route should redirect but returned different status\n');
    }

    // Test 2: Dashboard route should redirect to sign-in (protected route)
    console.log('2. Testing dashboard route (/dashboard) - should redirect to sign-in');
    const dashboardResponse = await makeRequest(BASE_URL + '/dashboard');
    console.log(`   Status: ${dashboardResponse.statusCode}`);
    console.log(`   Redirect: ${dashboardResponse.redirectLocation || 'None'}`);
    
    if (dashboardResponse.statusCode === 307 || dashboardResponse.statusCode === 302) {
      if (dashboardResponse.redirectLocation && dashboardResponse.redirectLocation.includes('/auth/simple-signin')) {
        console.log('   ✅ Dashboard correctly redirects to sign-in\n');
      } else {
        console.log('   ❌ Dashboard redirects but not to sign-in page\n');
      }
    } else {
      console.log('   ❌ Dashboard should redirect but returned different status\n');
    }

    // Test 3: Sign-in page should be accessible
    console.log('3. Testing sign-in page (/auth/simple-signin) - should be accessible');
    const signinResponse = await makeRequest(BASE_URL + '/auth/simple-signin');
    console.log(`   Status: ${signinResponse.statusCode}`);
    
    if (signinResponse.statusCode === 200) {
      console.log('   ✅ Sign-in page is accessible\n');
    } else {
      console.log('   ❌ Sign-in page is not accessible\n');
    }

    // Test 4: Session API should return 401 (unauthenticated)
    console.log('4. Testing session API (/api/auth/simple-session) - should return 401');
    const sessionResponse = await makeRequest(BASE_URL + '/api/auth/simple-session');
    console.log(`   Status: ${sessionResponse.statusCode}`);
    
    if (sessionResponse.statusCode === 401) {
      console.log('   ✅ Session API correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('   ❌ Session API should return 401 but returned different status\n');
    }

    // Test 5: Health check should work
    console.log('5. Testing health check (/api/health) - should return 200');
    const healthResponse = await makeRequest(BASE_URL + '/api/health');
    console.log(`   Status: ${healthResponse.statusCode}`);
    
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ Health check is working');
      try {
        const healthData = JSON.parse(healthResponse.body);
        console.log('   Environment variables status:');
        if (healthData.environment && healthData.environment.variables) {
          Object.entries(healthData.environment.variables).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
          });
        }
      } catch (e) {
        console.log('   Could not parse health check response');
      }
    } else {
      console.log('   ❌ Health check failed');
    }

    console.log('\n🎉 Authentication flow test completed!');
    console.log('\nIf all tests pass, your authentication should be working correctly.');
    console.log('You should now be able to access the sign-in page and authenticate.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testAuthFlow();
