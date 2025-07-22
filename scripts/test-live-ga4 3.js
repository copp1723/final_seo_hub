#!/usr/bin/env node

const https = require('https');

// Replace with your actual Render domain
const RENDER_DOMAIN = 'your-app-name.onrender.com'; // Update this

async function testLiveGA4() {
  console.log('🌐 Testing GA4 Integration on Live Environment');
  console.log('=' .repeat(60));
  
  const endpoints = [
    '/api/ga4/list-properties',
    '/api/health',
    '/api/search-console/list-sites'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing: ${endpoint}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await makeRequest(`${RENDER_DOMAIN}${endpoint}`);
      console.log(`✅ Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('   ℹ️  Authentication required (expected for GA4 endpoints)');
      } else if (response.status === 200) {
        console.log('   ✅ Endpoint accessible');
        if (response.data) {
          console.log(`   📊 Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        }
      } else {
        console.log(`   ⚠️  Unexpected status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n📋 Manual Testing Instructions:');
  console.log('1. Visit your live application');
  console.log('2. Log into the application');
  console.log('3. Navigate to reporting/analytics page');
  console.log('4. Check GA4 property dropdown');
  console.log('5. Verify data collection for connected property');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.split('/')[0],
      path: '/' + url.split('/').slice(1).join('/'),
      method: 'GET',
      headers: {
        'User-Agent': 'GA4-Test-Script/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Instructions for use
console.log('⚠️  IMPORTANT: Update the RENDER_DOMAIN variable with your actual domain');
console.log('   Example: const RENDER_DOMAIN = "my-seo-app.onrender.com";\n');

// Uncomment the line below after updating the domain
// testLiveGA4(); 