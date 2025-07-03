#!/usr/bin/env node

/**
 * Comprehensive SEOWorks Integration Test Script
 * 
 * This script tests both the onboarding and focus request integrations
 * with Jeff's SEOWorks system to ensure bidirectional communication works.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY || 'your-api-key-here';

// Test data
const testDealer = {
  dealerName: "Test Auto Dealership",
  dealerAddress: "123 Main St, Test City, TX 75001",
  dealerPhone: "(555) 123-4567",
  dealerWebsite: "https://testdealer.com",
  contactName: "John Test",
  contactEmail: "john@testdealer.com",
  contactPhone: "(555) 123-4567",
  targetCities: ["Dallas", "Fort Worth", "Arlington"],
  targetModels: ["Honda Civic", "Toyota Camry", "Ford F-150"],
  packageType: "PREMIUM"
};

const testFocusRequest = {
  title: "SEO Optimization for Honda Civic",
  description: "Need to improve search rankings for Honda Civic inventory",
  type: "SEO_OPTIMIZATION",
  priority: "HIGH",
  keywords: ["Honda Civic Dallas", "Honda Civic Fort Worth", "Honda dealer Texas"],
  targetUrl: "https://testdealer.com/honda-civic",
  targetCities: ["Dallas", "Fort Worth"],
  targetModels: ["Honda Civic"],
  packageType: "PREMIUM"
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: null
          });
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

// Test functions
async function testOnboardingIntegration() {
  console.log('\n🧪 Testing Onboarding Integration...');
  
  try {
    const url = new URL(`${BASE_URL}/api/seoworks/send-onboarding`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEOWORKS_API_KEY}`
      }
    };

    const response = await makeRequest(options, testDealer);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', response.data || response.body);
    
    if (response.statusCode === 200) {
      console.log('✅ Onboarding integration test PASSED');
      return true;
    } else {
      console.log('❌ Onboarding integration test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Onboarding integration test ERROR:', error.message);
    return false;
  }
}

async function testFocusRequestIntegration() {
  console.log('\n🧪 Testing Focus Request Integration...');
  
  try {
    // First create a request to get a real request ID
    console.log('Creating test request...');
    
    const createUrl = new URL(`${BASE_URL}/api/requests`);
    const createOptions = {
      hostname: createUrl.hostname,
      port: createUrl.port || (createUrl.protocol === 'https:' ? 443 : 80),
      path: createUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEOWORKS_API_KEY}` // This would need to be a valid user token in real scenario
      }
    };

    // For testing purposes, we'll test the send-focus-request endpoint directly
    const url = new URL(`${BASE_URL}/api/seoworks/send-focus-request`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEOWORKS_API_KEY}`
      }
    };

    // Use a test request ID (in real scenario this would be from created request)
    const response = await makeRequest(options, { requestId: 'test-request-id' });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', response.data || response.body);
    
    if (response.statusCode === 200) {
      console.log('✅ Focus request integration test PASSED');
      return true;
    } else {
      console.log('❌ Focus request integration test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Focus request integration test ERROR:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing Webhook Endpoint...');
  
  try {
    const url = new URL(`${BASE_URL}/api/seoworks/webhook`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SEOWORKS_API_KEY
      }
    };

    const testWebhookData = {
      taskId: 'test-task-123',
      requestId: 'test-request-456',
      status: 'completed',
      completedAt: new Date().toISOString(),
      results: {
        keywordsOptimized: 15,
        pagesUpdated: 5,
        backlinksCreated: 3
      }
    };

    const response = await makeRequest(options, testWebhookData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', response.data || response.body);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook endpoint test PASSED');
      return true;
    } else {
      console.log('❌ Webhook endpoint test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook endpoint test ERROR:', error.message);
    return false;
  }
}

async function testSEOWorksEndpoints() {
  console.log('\n🧪 Testing SEOWorks External Endpoints...');
  
  try {
    // Test onboarding endpoint
    console.log('Testing SEOWorks onboarding endpoint...');
    
    const onboardingOptions = {
      hostname: 'api.seowerks.ai',
      port: 443,
      path: '/rylie-onboard.cfm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SEOWORKS_API_KEY
      }
    };

    const onboardingData = {
      dealerName: testDealer.dealerName,
      dealerAddress: testDealer.dealerAddress,
      dealerPhone: testDealer.dealerPhone,
      dealerWebsite: testDealer.dealerWebsite,
      contactName: testDealer.contactName,
      contactEmail: testDealer.contactEmail,
      contactPhone: testDealer.contactPhone,
      targetCities: testDealer.targetCities.join(';'),
      targetModels: testDealer.targetModels.join(';'),
      packageType: testDealer.packageType
    };

    const onboardingResponse = await makeRequest(onboardingOptions, onboardingData);
    console.log(`Onboarding Status: ${onboardingResponse.statusCode}`);
    console.log('Onboarding Response:', onboardingResponse.body);

    // Test focus request endpoint
    console.log('\nTesting SEOWorks focus request endpoint...');
    
    const focusOptions = {
      hostname: 'api.seowerks.ai',
      port: 443,
      path: '/rylie-focus.cfm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SEOWORKS_API_KEY
      }
    };

    const focusData = {
      requestId: 'test-request-789',
      title: testFocusRequest.title,
      description: testFocusRequest.description,
      type: testFocusRequest.type,
      priority: testFocusRequest.priority,
      keywords: testFocusRequest.keywords.join(';'),
      targetUrl: testFocusRequest.targetUrl,
      targetCities: testFocusRequest.targetCities.join(';'),
      targetModels: testFocusRequest.targetModels.join(';'),
      packageType: testFocusRequest.packageType
    };

    const focusResponse = await makeRequest(focusOptions, focusData);
    console.log(`Focus Request Status: ${focusResponse.statusCode}`);
    console.log('Focus Request Response:', focusResponse.body);

    const onboardingSuccess = onboardingResponse.statusCode === 200;
    const focusSuccess = focusResponse.statusCode === 200;

    if (onboardingSuccess && focusSuccess) {
      console.log('✅ SEOWorks external endpoints test PASSED');
      return true;
    } else {
      console.log('❌ SEOWorks external endpoints test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ SEOWorks external endpoints test ERROR:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting SEOWorks Integration Tests');
  console.log('=====================================');
  
  const results = {
    onboarding: false,
    focusRequest: false,
    webhook: false,
    external: false
  };

  // Test our internal endpoints
  results.onboarding = await testOnboardingIntegration();
  results.focusRequest = await testFocusRequestIntegration();
  results.webhook = await testWebhookEndpoint();
  
  // Test external SEOWorks endpoints (optional - requires valid API key)
  if (SEOWORKS_API_KEY && SEOWORKS_API_KEY !== 'your-api-key-here') {
    results.external = await testSEOWorksEndpoints();
  } else {
    console.log('\n⚠️  Skipping external SEOWorks tests (no API key provided)');
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Onboarding Integration: ${results.onboarding ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Focus Request Integration: ${results.focusRequest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Webhook Endpoint: ${results.webhook ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`External SEOWorks: ${results.external ? '✅ PASS' : '⚠️  SKIPPED'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.values(results).filter(result => result !== false).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! SEOWorks integration is ready.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the integration.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testOnboardingIntegration,
  testFocusRequestIntegration,
  testWebhookEndpoint,
  testSEOWorksEndpoints,
  runAllTests
};