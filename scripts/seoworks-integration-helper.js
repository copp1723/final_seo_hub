#!/usr/bin/env node

/**
 * SEOWorks Integration Helper Script
 * 
 * This script provides utilities for testing and managing the SEOWorks integration:
 * - Test webhook connectivity
 * - Create test request-to-task mappings
 * - Send test webhook events
 * - Query existing mappings
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://rylie-seo-hub.onrender.com',
  apiKey: process.env.SEOWORKS_WEBHOOK_SECRET || '7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f',
  localUrl: 'http://localhost:3000'
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
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
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

// Test webhook connectivity
async function testConnectivity(useLocal = false) {
  console.log('🔍 Testing webhook connectivity...');
  
  const baseUrl = useLocal ? CONFIG.localUrl : CONFIG.baseUrl;
  const url = new URL('/api/seoworks/webhook', baseUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    protocol: url.protocol,
    headers: {
      'x-api-key': CONFIG.apiKey
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook endpoint is accessible');
      console.log('Response:', response.body);
    } else {
      console.log('❌ Webhook endpoint returned error:', response.statusCode);
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Failed to connect to webhook endpoint:', error.message);
  }
}

// Create a test mapping
async function createTestMapping(requestId, seoworksTaskId, taskType = 'page', useLocal = false) {
  console.log('🔗 Creating test mapping...');
  
  const baseUrl = useLocal ? CONFIG.localUrl : CONFIG.baseUrl;
  const url = new URL('/api/seoworks/mapping', baseUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.apiKey
    }
  };

  const data = {
    requestId,
    seoworksTaskId,
    taskType,
    metadata: {
      createdBy: 'integration-helper-script',
      testMapping: true
    }
  };

  try {
    const response = await makeRequest(options, data);
    
    if (response.statusCode === 200) {
      console.log('✅ Test mapping created successfully');
      console.log('Response:', response.body);
    } else {
      console.log('❌ Failed to create mapping:', response.statusCode);
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Error creating mapping:', error.message);
  }
}

// Send test webhook
async function sendTestWebhook(externalId, eventType = 'task.completed', useLocal = false) {
  console.log('📤 Sending test webhook...');
  
  const baseUrl = useLocal ? CONFIG.localUrl : CONFIG.baseUrl;
  const url = new URL('/api/seoworks/webhook', baseUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.apiKey
    }
  };

  const data = {
    eventType,
    timestamp: new Date().toISOString(),
    data: {
      externalId,
      clientId: 'user_test_client_2024',
      clientEmail: 'test@example.com',
      taskType: 'page',
      status: 'completed',
      completionDate: new Date().toISOString(),
      notes: 'Test task completion from integration helper script',
      deliverables: [
        {
          type: 'page_post',
          title: 'Test Page Title',
          url: 'https://example.com/test-page'
        }
      ]
    }
  };

  try {
    const response = await makeRequest(options, data);
    
    if (response.statusCode === 200) {
      console.log('✅ Test webhook sent successfully');
      console.log('Response:', response.body);
    } else {
      console.log('❌ Webhook failed:', response.statusCode);
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Error sending webhook:', error.message);
  }
}

// Query mapping
async function queryMapping(seoworksTaskId, useLocal = false) {
  console.log('🔍 Querying mapping...');
  
  const baseUrl = useLocal ? CONFIG.localUrl : CONFIG.baseUrl;
  const url = new URL('/api/seoworks/mapping', baseUrl);
  url.searchParams.set('seoworksTaskId', seoworksTaskId);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    protocol: url.protocol,
    headers: {
      'x-api-key': CONFIG.apiKey
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Mapping found');
      console.log('Response:', response.body);
    } else if (response.statusCode === 404) {
      console.log('ℹ️ No mapping found for SEOWorks task ID:', seoworksTaskId);
    } else {
      console.log('❌ Query failed:', response.statusCode);
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Error querying mapping:', error.message);
  }
}

// Main CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const useLocal = args.includes('--local');

  console.log('🚀 SEOWorks Integration Helper');
  console.log('Using:', useLocal ? 'Local server' : 'Production server');
  console.log('');

  switch (command) {
    case 'test-connectivity':
      await testConnectivity(useLocal);
      break;
      
    case 'create-mapping':
      const requestId = args[1];
      const seoworksTaskId = args[2];
      const taskType = args[3] || 'page';
      
      if (!requestId || !seoworksTaskId) {
        console.log('❌ Usage: create-mapping <requestId> <seoworksTaskId> [taskType]');
        process.exit(1);
      }
      
      await createTestMapping(requestId, seoworksTaskId, taskType, useLocal);
      break;
      
    case 'send-webhook':
      const externalId = args[1];
      const eventType = args[2] || 'task.completed';
      
      if (!externalId) {
        console.log('❌ Usage: send-webhook <externalId> [eventType]');
        process.exit(1);
      }
      
      await sendTestWebhook(externalId, eventType, useLocal);
      break;
      
    case 'query-mapping':
      const taskId = args[1];
      
      if (!taskId) {
        console.log('❌ Usage: query-mapping <seoworksTaskId>');
        process.exit(1);
      }
      
      await queryMapping(taskId, useLocal);
      break;
      
    case 'full-test':
      console.log('🧪 Running full integration test...');
      
      // Step 1: Test connectivity
      await testConnectivity(useLocal);
      console.log('');
      
      // Step 2: Create test mapping (using example IDs)
      const testRequestId = 'test-request-' + Date.now();
      const testSeoworksTaskId = 'task-p-' + Date.now();
      
      console.log(`Creating test mapping: ${testRequestId} -> ${testSeoworksTaskId}`);
      // Note: This will fail if the request doesn't exist, but shows the API works
      await createTestMapping(testRequestId, testSeoworksTaskId, 'page', useLocal);
      console.log('');
      
      // Step 3: Send test webhook
      await sendTestWebhook(testSeoworksTaskId, 'task.completed', useLocal);
      console.log('');
      
      console.log('✅ Full test completed');
      break;
      
    default:
      console.log('Available commands:');
      console.log('  test-connectivity                    - Test webhook endpoint connectivity');
      console.log('  create-mapping <reqId> <taskId>      - Create request-to-task mapping');
      console.log('  send-webhook <externalId>            - Send test webhook event');
      console.log('  query-mapping <taskId>               - Query existing mapping');
      console.log('  full-test                            - Run complete integration test');
      console.log('');
      console.log('Options:');
      console.log('  --local                              - Use local development server');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/seoworks-integration-helper.js test-connectivity');
      console.log('  node scripts/seoworks-integration-helper.js create-mapping clx123 task-p-456');
      console.log('  node scripts/seoworks-integration-helper.js send-webhook task-p-456');
      console.log('  node scripts/seoworks-integration-helper.js full-test --local');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testConnectivity,
  createTestMapping,
  sendTestWebhook,
  queryMapping
};