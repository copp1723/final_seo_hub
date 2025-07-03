#!/usr/bin/env node

/**
 * Test script for SEOWorks onboarding endpoint
 * Tests both Jeff's endpoint and our receiving endpoint
 */

const https = require('https');
const http = require('http');

// Configuration
const SEOWORKS_API_KEY = '7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f';
const PRODUCTION_URL = 'https://rylie-seo-hub.onrender.com';
const LOCAL_URL = 'http://localhost:3000';

// Test payload from Jeff
const testPayload = {
  "timestamp": "2024-07-03T10:30:00Z",
  "businessName": "Jay Hatfield Chevrolet of Vinita",
  "clientId": "user_jayhatfieldchevy_vinita_2024",
  "clientEmail": "manager@jayhatfieldchevyvinita.com",
  "package": "GOLD",
  "mainBrand": "Chevrolet",
  "otherBrand": "",
  "address": "1001 N 7th St",
  "city": "Vinita",
  "state": "OK",
  "zipCode": "74301",
  "contactName": "Jane Smith",
  "contactTitle": "General Manager",
  "email": "manager@jayhatfieldchevyvinita.com",
  "phone": "(918) 256-7531",
  "websiteUrl": "https://jayhatfieldchevyvinita.com",
  "billingEmail": "billing@jayhatfieldchevyvinita.com",
  "siteAccessNotes": "",
  "targetVehicleModels": "Chevrolet Silverado;Chevrolet Traverse;Chevrolet Blazer",
  "targetCities": "Vinita;Miami;Pryor",
  "targetDealers": "Competitor Chevy Vinita;City Motors Vinita;Premier Chevrolet Vinita"
};

function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testJeffEndpoint() {
  console.log('🧪 Testing Jeff\'s SEOWorks endpoint...');
  
  try {
    const response = await makeRequest(
      'https://api.seowerks.ai/rylie-onboard.cfm',
      testPayload,
      { 'x-api-key': SEOWORKS_API_KEY }
    );
    
    console.log('✅ Jeff\'s endpoint response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Jeff\'s endpoint failed:', error.message);
    return false;
  }
}

async function testOurEndpoint(useProduction = false) {
  const baseUrl = useProduction ? PRODUCTION_URL : LOCAL_URL;
  const envName = useProduction ? 'PRODUCTION' : 'LOCAL';
  
  console.log(`\n🧪 Testing our ${envName} onboarding endpoint...`);
  
  try {
    const response = await makeRequest(
      `${baseUrl}/api/seoworks/onboard`,
      testPayload,
      { 'x-api-key': SEOWORKS_API_KEY }
    );
    
    console.log(`✅ Our ${envName} endpoint response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log(`❌ Our ${envName} endpoint failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 SEOWorks Onboarding Integration Test\n');
  
  // Test Jeff's endpoint first
  const jeffWorks = await testJeffEndpoint();
  
  // Test our local endpoint
  const localWorks = await testOurEndpoint(false);
  
  // Test our production endpoint
  const prodWorks = await testOurEndpoint(true);
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Jeff's endpoint: ${jeffWorks ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Our local endpoint: ${localWorks ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Our production endpoint: ${prodWorks ? '✅ Working' : '❌ Failed'}`);
  
  if (jeffWorks && prodWorks) {
    console.log('\n🎉 Integration is ready! Jeff can start sending onboarding data.');
  } else {
    console.log('\n⚠️  Some endpoints need attention before going live.');
  }
}

// Run the tests
runTests().catch(console.error);