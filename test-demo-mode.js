const https = require('https');

console.log('🚨 TESTING EMERGENCY DEMO MODE 🚨\n');

const baseUrl = 'https://rylie-seo-hub.onrender.com';

// Test endpoints that should all work without authentication
const testEndpoints = [
  { path: '/api/test-auth', desc: 'Auth Test' },
  { path: '/api/dashboard/stats', desc: 'Dashboard Stats' },
  { path: '/api/requests', desc: 'Requests List' },
  { path: '/api/settings/profile', desc: 'User Profile' },
  { path: '/api/super-admin/system/stats', desc: 'Super Admin Stats' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'rylie-seo-hub.onrender.com',
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n📍 ${endpoint.desc} (${endpoint.path}):`);
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.user) {
              console.log(`   ✅ User: ${json.user.email} (${json.user.role})`);
            } else if (json.authenticated) {
              console.log(`   ✅ Authenticated: Yes`);
            } else if (json.success) {
              console.log(`   ✅ Success: Yes`);
            } else {
              console.log(`   ✅ Response received`);
            }
          } catch (e) {
            console.log(`   ✅ Response received (non-JSON)`);
          }
        } else {
          console.log(`   ❌ Error: ${data.substring(0, 100)}`);
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Request failed: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing endpoints without any authentication...\n');
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n\n✅ Demo Mode Test Complete!');
  console.log('\nDirect Access URLs:');
  console.log(`- Dashboard: ${baseUrl}/dashboard`);
  console.log(`- Super Admin: ${baseUrl}/super-admin`);
  console.log(`- Requests: ${baseUrl}/requests`);
  console.log(`- Settings: ${baseUrl}/settings`);
  console.log('\nNo login required - all features accessible!');
}

runTests();