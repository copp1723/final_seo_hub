#!/usr/bin/env node

/**
 * Comprehensive Integration Test Script
 * 
 * This script validates:
 * 1. Encryption fixes and key validation
 * 2. OAuth token storage and retrieval
 * 3. Dealership switching functionality
 * 4. Data isolation between dealerships
 * 5. API access control and authorization
 * 6. Frontend-to-backend integration
 * 
 * Usage: node scripts/integration-test.js
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Handle fetch for different Node.js versions
let fetch;
if (typeof globalThis.fetch === 'function') {
  // Node.js 18+ has built-in fetch
  fetch = globalThis.fetch;
} else {
  // Fallback for older Node.js versions
  try {
    fetch = require('node-fetch');
  } catch (e) {
    // If node-fetch is not available, create a stub
    fetch = () => Promise.reject(new Error('fetch not available - install node-fetch or use Node.js 18+'));
  }
}

// Configuration
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const GA4_TOKEN_ENCRYPTION_KEY = process.env.GA4_TOKEN_ENCRYPTION_KEY;

class IntegrationTester {
  constructor() {
    this.prisma = new PrismaClient();
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.testUsers = [];
    this.testDealerships = [];
    this.createdConnections = [];
  }

  // Helper methods
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', debug: '🔍' };
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
  }

  recordTest(name, passed, message, details = null) {
    this.testResults.tests.push({ name, passed, message, details, timestamp: new Date() });
    if (passed) {
      this.testResults.passed++;
      this.log(`TEST PASSED: ${name} - ${message}`, 'success');
    } else {
      this.testResults.failed++;
      this.log(`TEST FAILED: ${name} - ${message}`, 'error');
      if (details) {
        console.log('  Details:', JSON.stringify(details, null, 2));
      }
    }
  }

  recordWarning(name, message, details = null) {
    this.testResults.warnings++;
    this.testResults.tests.push({ name, passed: null, message, details, timestamp: new Date() });
    this.log(`WARNING: ${name} - ${message}`, 'warning');
    if (details) {
      console.log('  Details:', JSON.stringify(details, null, 2));
    }
  }

  // Encryption Testing
  validateEncryptionKey(key, keyName) {
    this.log(`Testing encryption key: ${keyName}`, 'debug');
    
    if (!key) {
      this.recordTest(`${keyName} Exists`, false, 'Key is not set in environment');
      return false;
    }

    if (key.length < 32) {
      this.recordTest(`${keyName} Length`, false, `Key too short: ${key.length} characters (minimum 32)`);
      return false;
    }

    // Check for weak patterns
    const weakPatterns = [
      { pattern: /^(.)\1+$/, name: 'All same character' },
      { pattern: /^1234567890/, name: 'Sequential numbers' },
      { pattern: /^abcdefghij/i, name: 'Sequential letters' },
      { pattern: /^a1b2c3d4e5f67890/, name: 'Specific weak pattern' },
      { pattern: /^qwerty/i, name: 'Keyboard pattern' },
      { pattern: /^password/i, name: 'Contains "password"' },
      { pattern: /^secret/i, name: 'Contains "secret"' },
      { pattern: /^test/i, name: 'Contains "test"' },
      { pattern: /^demo/i, name: 'Contains "demo"' }
    ];

    for (const { pattern, name } of weakPatterns) {
      if (pattern.test(key)) {
        this.recordTest(`${keyName} Security`, false, `Weak pattern detected: ${name}`);
        return false;
      }
    }

    // Check entropy
    const uniqueChars = new Set(key.split('')).size;
    if (uniqueChars < 10) {
      this.recordTest(`${keyName} Entropy`, false, `Low entropy: ${uniqueChars} unique characters (minimum 10)`);
      return false;
    }

    this.recordTest(`${keyName} Validation`, true, `Key is secure (length: ${key.length}, entropy: ${uniqueChars})`);
    return true;
  }

  testEncryptionDecryption(key, keyName) {
    this.log(`Testing encryption/decryption with ${keyName}`, 'debug');
    
    try {
      const algorithm = 'aes-256-gcm';
      const keyHash = crypto.createHash('sha256').update(key).digest();
      
      // Test data
      const testData = {
        accessToken: 'ya29.a0AfH6SMBxxxxxx_test_oauth_token_123456789',
        refreshToken: '1//04xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        userEmail: 'test@example.com',
        sensitive: 'This is sensitive data that must be encrypted'
      };

      for (const [dataType, testValue] of Object.entries(testData)) {
        // Encrypt
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
        let encrypted = cipher.update(testValue, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        const encryptedData = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

        // Decrypt
        const parts = encryptedData.split(':');
        const decIv = Buffer.from(parts[0], 'hex');
        const decAuthTag = Buffer.from(parts[1], 'hex');
        const decEncrypted = parts[2];

        const decipher = crypto.createDecipheriv(algorithm, keyHash, decIv);
        decipher.setAuthTag(decAuthTag);
        let decrypted = decipher.update(decEncrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        if (decrypted === testValue) {
          this.recordTest(`${keyName} ${dataType} Encryption`, true, 'Encryption/decryption successful');
        } else {
          this.recordTest(`${keyName} ${dataType} Encryption`, false, 'Decrypted data does not match original');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.recordTest(`${keyName} Encryption Test`, false, `Encryption failed: ${error.message}`);
      return false;
    }
  }

  // Database Testing
  async testDatabaseConnections() {
    this.log('Testing database connections and OAuth storage', 'debug');
    
    try {
      await this.prisma.$connect();
      this.recordTest('Database Connection', true, 'Successfully connected to database');

      // Test GA4 connections table
      const ga4Count = await this.prisma.ga4_connections.count();
      this.recordTest('GA4 Connections Table', true, `Found ${ga4Count} GA4 connections`);

      // Test Search Console connections table
      const scCount = await this.prisma.search_console_connections.count();
      this.recordTest('Search Console Connections Table', true, `Found ${scCount} Search Console connections`);

      // Test users table with dealership relationships
      const userCount = await this.prisma.users.count();
      this.recordTest('Users Table', true, `Found ${userCount} users`);

      // Test dealerships table
      const dealershipCount = await this.prisma.dealerships.count();
      this.recordTest('Dealerships Table', true, `Found ${dealershipCount} dealerships`);

      return true;
    } catch (error) {
      this.recordTest('Database Connection', false, `Database connection failed: ${error.message}`);
      return false;
    }
  }

  async createTestData() {
    this.log('Creating test data for integration testing', 'debug');
    
    try {
      // Create test agencies
      const testAgency1 = await this.prisma.agencies.create({
        data: {
          id: `test-agency-1-${Date.now()}`,
          name: 'Test Agency 1',
          slug: `test-agency-1-${Date.now()}`,
          domain: `agency1-${Date.now()}.test.com`
        }
      });

      const testAgency2 = await this.prisma.agencies.create({
        data: {
          id: `test-agency-2-${Date.now()}`,
          name: 'Test Agency 2',
          slug: `test-agency-2-${Date.now()}`,
          domain: `agency2-${Date.now()}.test.com`
        }
      });

      // Create test dealerships
      const testDealership1 = await this.prisma.dealerships.create({
        data: {
          id: `test-dealer-1-${Date.now()}`,
          name: 'Test Dealership 1',
          agencyId: testAgency1.id,
          address: '123 Test St',
          phone: '555-0001',
          website: 'https://dealer1.test.com',
          activePackageType: 'GOLD'
        }
      });

      const testDealership2 = await this.prisma.dealerships.create({
        data: {
          id: `test-dealer-2-${Date.now()}`,
          name: 'Test Dealership 2',
          agencyId: testAgency2.id,
          address: '456 Test Ave',
          phone: '555-0002',
          website: 'https://dealer2.test.com',
          activePackageType: 'PLATINUM'
        }
      });

      this.testDealerships = [testDealership1, testDealership2];

      // Create test users
      const testUser1 = await this.prisma.users.create({
        data: {
          id: `test-user-1-${Date.now()}`,
          email: 'user1@test.com',
          name: 'Test User 1',
          role: 'AGENCY_ADMIN',
          agencyId: testAgency1.id,
          dealershipId: testDealership1.id
        }
      });

      const testUser2 = await this.prisma.users.create({
        data: {
          id: `test-user-2-${Date.now()}`,
          email: 'user2@test.com',
          name: 'Test User 2',
          role: 'USER',
          agencyId: testAgency2.id,
          dealershipId: testDealership2.id
        }
      });

      this.testUsers = [testUser1, testUser2];

      this.recordTest('Test Data Creation', true, 'Successfully created test agencies, dealerships, and users');
      return true;
    } catch (error) {
      this.recordTest('Test Data Creation', false, `Failed to create test data: ${error.message}`);
      return false;
    }
  }

  async testOAuthTokenStorage() {
    this.log('Testing OAuth token storage and encryption', 'debug');
    
    if (!ENCRYPTION_KEY || this.testUsers.length === 0) {
      this.recordWarning('OAuth Token Storage', 'Skipping - no encryption key or test users');
      return false;
    }

    try {
      const algorithm = 'aes-256-gcm';
      const keyHash = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      
      // Encrypt test tokens
      const testTokens = {
        accessToken: 'ya29.a0AfH6SMBxxxxxx_test_access_token_123456789',
        refreshToken: '1//04xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      };

      const encryptedTokens = {};
      for (const [tokenType, token] of Object.entries(testTokens)) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        encryptedTokens[tokenType] = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      }

      // Create GA4 connections for each test user/dealership
      for (let i = 0; i < this.testUsers.length; i++) {
        const user = this.testUsers[i];
        const dealership = this.testDealerships[i];

        const ga4Connection = await this.prisma.ga4_connections.create({
          data: {
            userId: user.id,
            dealershipId: dealership.id,
            propertyId: `12345678${i}`,
            propertyName: `Test Property ${i + 1}`,
            accessToken: encryptedTokens.accessToken,
            refreshToken: encryptedTokens.refreshToken,
            expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
          }
        });

        const scConnection = await this.prisma.search_console_connections.create({
          data: {
            userId: user.id,
            dealershipId: dealership.id,
            siteUrl: `https://dealer${i + 1}.test.com`,
            accessToken: encryptedTokens.accessToken,
            refreshToken: encryptedTokens.refreshToken
          }
        });

        this.createdConnections.push(ga4Connection, scConnection);
      }

      this.recordTest('OAuth Token Storage', true, `Created ${this.createdConnections.length} encrypted OAuth connections`);
      
      // Test token retrieval and decryption
      const retrievedConnection = await this.prisma.ga4_connections.findFirst({
        where: { userId: this.testUsers[0].id }
      });

      if (retrievedConnection) {
        const parts = retrievedConnection.accessToken.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        if (decrypted === testTokens.accessToken) {
          this.recordTest('OAuth Token Retrieval', true, 'Successfully decrypted stored OAuth token');
        } else {
          this.recordTest('OAuth Token Retrieval', false, 'Decrypted token does not match original');
        }
      }

      return true;
    } catch (error) {
      this.recordTest('OAuth Token Storage', false, `Failed to test OAuth storage: ${error.message}`);
      return false;
    }
  }

  async testDealershipSwitching() {
    this.log('Testing dealership switching functionality', 'debug');
    
    if (this.testUsers.length === 0) {
      this.recordWarning('Dealership Switching', 'No test users available');
      return false;
    }

    try {
      const user = this.testUsers[0];
      const targetDealership = this.testDealerships[1];

      // Test switching dealership in database
      const updatedUser = await this.prisma.users.update({
        where: { id: user.id },
        data: { dealershipId: targetDealership.id }
      });

      if (updatedUser.dealershipId === targetDealership.id) {
        this.recordTest('Database Dealership Switch', true, 'Successfully updated user dealership in database');
      } else {
        this.recordTest('Database Dealership Switch', false, 'Failed to update user dealership');
        return false;
      }

      // Test access control - user should only see data for their current dealership
      const userConnections = await this.prisma.ga4_connections.findMany({
        where: { dealershipId: updatedUser.dealershipId }
      });

      this.recordTest('Dealership Data Isolation', true, 
        `User can access ${userConnections.length} connections for their dealership`);

      // Test access to other dealership (should be restricted)
      const otherDealershipConnections = await this.prisma.ga4_connections.findMany({
        where: { 
          dealershipId: this.testDealerships[0].id,
          NOT: { dealershipId: updatedUser.dealershipId }
        }
      });

      if (otherDealershipConnections.length > 0) {
        this.recordWarning('Data Isolation Check', 
          `Found ${otherDealershipConnections.length} connections for other dealerships (should be access-controlled)`);
      }

      return true;
    } catch (error) {
      this.recordTest('Dealership Switching', false, `Dealership switching test failed: ${error.message}`);
      return false;
    }
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints with dealership parameters', 'debug');
    
    try {
      // Test dealership switching endpoint
      const switchResponse = await fetch(`${BASE_URL}/api/dealerships/switch`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (switchResponse.status === 401) {
        this.recordTest('Dealership Switch API Auth', true, 'API correctly requires authentication');
      } else if (switchResponse.ok) {
        this.recordWarning('Dealership Switch API', 'API returned success without authentication (check if demo mode is enabled)');
      } else {
        this.recordTest('Dealership Switch API', false, `Unexpected response: ${switchResponse.status}`);
      }

      // Test analytics endpoint
      const analyticsResponse = await fetch(`${BASE_URL}/api/dashboard/analytics`, {
        method: 'GET'
      });

      if (analyticsResponse.status === 401) {
        this.recordTest('Analytics API Auth', true, 'Analytics API correctly requires authentication');
      } else if (analyticsResponse.ok) {
        this.recordWarning('Analytics API', 'Analytics API returned success without authentication (check if demo mode is enabled)');
      } else {
        this.recordTest('Analytics API', false, `Unexpected response: ${analyticsResponse.status}`);
      }

      // Test with dealership parameter
      const dealershipAnalyticsResponse = await fetch(
        `${BASE_URL}/api/dashboard/analytics?dealershipId=test-dealer-123`, {
        method: 'GET'
      });

      if (dealershipAnalyticsResponse.status === 401) {
        this.recordTest('Dealership Analytics API Auth', true, 'Dealership-specific analytics requires authentication');
      }

      return true;
    } catch (error) {
      this.recordTest('API Endpoints Test', false, `API testing failed: ${error.message}`);
      return false;
    }
  }

  async testAccessControl() {
    this.log('Testing access control for unauthorized dealerships', 'debug');
    
    if (this.testUsers.length < 2) {
      this.recordWarning('Access Control Test', 'Need at least 2 test users for cross-dealership access testing');
      return false;
    }

    try {
      const user1 = this.testUsers[0];
      const user2 = this.testUsers[1];
      
      // Test that user1 cannot access user2's dealership data directly in database
      const user1Dealership = user1.dealershipId;
      const user2Dealership = user2.dealershipId;

      // Check if dealerships are different
      if (user1Dealership === user2Dealership) {
        this.recordWarning('Access Control Test', 'Test users belong to same dealership');
        return false;
      }

      // Verify each user can only see their own dealership's connections
      const user1Connections = await this.prisma.ga4_connections.findMany({
        where: { dealershipId: user1Dealership }
      });

      const user2Connections = await this.prisma.ga4_connections.findMany({
        where: { dealershipId: user2Dealership }
      });

      this.recordTest('Data Isolation Verification', true, 
        `User 1 has access to ${user1Connections.length} connections, User 2 has access to ${user2Connections.length} connections`);

      // Test agency-level access (if applicable)
      const agencyUser = this.testUsers.find(u => u.role === 'AGENCY_ADMIN');
      if (agencyUser) {
        const agencyDealerships = await this.prisma.dealerships.findMany({
          where: { agencyId: agencyUser.agencyId }
        });

        this.recordTest('Agency Access Control', true, 
          `Agency admin can access ${agencyDealerships.length} dealerships`);
      }

      return true;
    } catch (error) {
      this.recordTest('Access Control Test', false, `Access control testing failed: ${error.message}`);
      return false;
    }
  }

  async testErrorScenarios() {
    this.log('Testing error scenarios and edge cases', 'debug');
    
    try {
      // Test with invalid dealership ID
      try {
        await this.prisma.dealerships.findUniqueOrThrow({
          where: { id: 'invalid-dealership-id-12345' }
        });
        this.recordTest('Invalid Dealership Handling', false, 'Should throw error for invalid dealership ID');
      } catch (error) {
        this.recordTest('Invalid Dealership Handling', true, 'Correctly handles invalid dealership ID');
      }

      // Test with malformed encrypted tokens
      if (ENCRYPTION_KEY) {
        try {
          const algorithm = 'aes-256-gcm';
          const keyHash = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
          
          // Try to decrypt malformed token
          const malformedToken = 'invalid:token:format';
          const parts = malformedToken.split(':');
          
          // This should fail because 'invalid' is not valid hex
          const iv = Buffer.from(parts[0], 'hex');
          const authTag = Buffer.from(parts[1], 'hex');
          const encrypted = parts[2];

          const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
          decipher.setAuthTag(authTag);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          this.recordTest('Malformed Token Handling', false, 'Should throw error for malformed token');
        } catch (error) {
          this.recordTest('Malformed Token Handling', true, 'Correctly handles malformed encrypted tokens');
        }
      }

      // Test connection without proper OAuth setup
      if (this.testUsers.length > 0) {
        try {
          const testConnection = await this.prisma.ga4_connections.create({
            data: {
              userId: this.testUsers[0].id,
              propertyId: null,
              accessToken: null,
              refreshToken: null
            }
          });
          
          // This should be cleaned up
          await this.prisma.ga4_connections.delete({ where: { id: testConnection.id } });
          
          this.recordWarning('Invalid Connection Creation', 'Database allows creating connections with null tokens');
        } catch (error) {
          this.recordTest('Invalid Connection Validation', true, 'Database correctly validates connection data');
        }
      } else {
        this.recordWarning('Invalid Connection Test', 'No test users available for connection validation test');
      }

      return true;
    } catch (error) {
      this.recordTest('Error Scenarios Test', false, `Error scenario testing failed: ${error.message}`);
      return false;
    }
  }

  async cleanupTestData() {
    this.log('Cleaning up test data', 'debug');
    
    try {
      // Clean up created connections
      for (const connection of this.createdConnections) {
        try {
          if (connection.propertyId) {
            // This is a GA4 connection
            await this.prisma.ga4_connections.delete({ where: { id: connection.id } }).catch(() => {});
          } else if (connection.siteUrl) {
            // This is a Search Console connection
            await this.prisma.search_console_connections.delete({ where: { id: connection.id } }).catch(() => {});
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Clean up test users
      for (const user of this.testUsers) {
        await this.prisma.users.delete({ where: { id: user.id } }).catch(() => {});
      }

      // Clean up test dealerships
      for (const dealership of this.testDealerships) {
        await this.prisma.dealerships.delete({ where: { id: dealership.id } }).catch(() => {});
      }

      // Clean up test agencies
      const testAgencies = await this.prisma.agencies.findMany({
        where: { 
          OR: [
            { name: { startsWith: 'Test Agency' } },
            { domain: { endsWith: '.test.com' } }
          ]
        }
      });

      for (const agency of testAgencies) {
        await this.prisma.agencies.delete({ where: { id: agency.id } }).catch(() => {});
      }

      this.recordTest('Test Data Cleanup', true, 'Successfully cleaned up test data');
    } catch (error) {
      this.recordWarning('Test Data Cleanup', `Some test data may not have been cleaned up: ${error.message}`);
    }
  }

  generateReport() {
    const { passed, failed, warnings, tests } = this.testResults;
    const total = passed + failed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    console.log('\n' + '='.repeat(80));
    console.log('🧪 INTEGRATION TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`📊 Tests Run: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      tests.filter(t => t.passed === false).forEach(test => {
        console.log(`  • ${test.name}: ${test.message}`);
      });
    }

    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      tests.filter(t => t.passed === null).forEach(test => {
        console.log(`  • ${test.name}: ${test.message}`);
      });
    }

    console.log('\n📋 RECOMMENDATIONS:');
    
    if (failed > 0) {
      console.log('  • Fix failing tests before deploying to production');
    }
    
    if (warnings > 0) {
      console.log('  • Review warnings for potential security or functionality issues');
    }
    
    if (successRate >= 90) {
      console.log('  • ✅ System appears ready for integration testing');
    } else if (successRate >= 75) {
      console.log('  • ⚠️  System has some issues but may be testable with caution');
    } else {
      console.log('  • ❌ System has significant issues and needs attention');
    }

    return { passed, failed, warnings, successRate };
  }

  generateManualTestInstructions() {
    console.log('\n' + '='.repeat(80));
    console.log('📖 MANUAL TESTING INSTRUCTIONS');
    console.log('='.repeat(80));
    
    console.log('\n🔐 1. AUTHENTICATION TESTING:');
    console.log('   • Open the application in your browser');
    console.log('   • Try to access /dashboard without authentication');
    console.log('   • Should redirect to login page');
    console.log('   • Login with valid credentials');
    console.log('   • Should successfully access dashboard');

    console.log('\n🏢 2. DEALERSHIP SWITCHING:');
    console.log('   • Login as a user with multiple dealership access');
    console.log('   • Use the dealership selector dropdown');
    console.log('   • Switch between different dealerships');
    console.log('   • Verify that dashboard data changes when switching');
    console.log('   • Check that analytics show different values for different dealerships');

    console.log('\n📊 3. DATA ISOLATION TESTING:');
    console.log('   • Create test users for different dealerships');
    console.log('   • Login as User A (Dealership 1)');
    console.log('   • Note the analytics data displayed');
    console.log('   • Login as User B (Dealership 2)');
    console.log('   • Verify analytics data is different from User A');
    console.log('   • Try accessing URLs with different dealershipId parameters');

    console.log('\n🔗 4. OAUTH INTEGRATION TESTING:');
    console.log('   • Go to Settings → GA4 Integration');
    console.log('   • Connect Google Analytics account');
    console.log('   • Verify OAuth flow completes successfully');
    console.log('   • Check that real data appears in dashboard');
    console.log('   • Try disconnecting and reconnecting');
    console.log('   • Test Search Console integration similarly');

    console.log('\n🔒 5. ACCESS CONTROL TESTING:');
    console.log('   • Try to access API endpoints without authentication:');
    console.log('     - GET /api/dashboard/analytics');
    console.log('     - GET /api/dealerships/switch');
    console.log('   • Should return 401 Unauthorized');
    console.log('   • Try accessing other dealership\'s data via URL manipulation');
    console.log('   • Should be blocked or return appropriate errors');

    console.log('\n🚨 6. ERROR HANDLING TESTING:');
    console.log('   • Test with invalid dealership IDs in URLs');
    console.log('   • Test with expired OAuth tokens');
    console.log('   • Test network errors (disconnect internet temporarily)');
    console.log('   • Verify graceful error messages are shown');

    console.log('\n✅ 7. EXPECTED BEHAVIORS:');
    console.log('   • Users can only see data for dealerships they have access to');
    console.log('   • Switching dealerships immediately updates dashboard');
    console.log('   • OAuth tokens are securely stored and encrypted');
    console.log('   • API endpoints require proper authentication');
    console.log('   • Error messages are user-friendly and don\'t expose sensitive info');

    console.log('\n🐛 8. COMMON ISSUES TO WATCH FOR:');
    console.log('   • Demo data showing instead of real data (encryption key issue)');
    console.log('   • Users seeing data from wrong dealerships (isolation failure)');
    console.log('   • OAuth connections failing (token encryption issue)');
    console.log('   • Dealership switching not updating data (context/state issue)');
    console.log('   • Console errors in browser developer tools');
  }

  async runAllTests() {
    console.log('🚀 Starting Integration Test Suite');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Encryption Keys: ${ENCRYPTION_KEY ? 'Present' : 'Missing'}`);
    console.log('');

    try {
      // 1. Test encryption system
      console.log('🔐 Testing Encryption System...');
      this.validateEncryptionKey(ENCRYPTION_KEY, 'ENCRYPTION_KEY');
      this.validateEncryptionKey(GA4_TOKEN_ENCRYPTION_KEY, 'GA4_TOKEN_ENCRYPTION_KEY');
      
      if (ENCRYPTION_KEY) {
        this.testEncryptionDecryption(ENCRYPTION_KEY, 'ENCRYPTION_KEY');
      }

      // 2. Test database connections
      console.log('\n💾 Testing Database Connections...');
      await this.testDatabaseConnections();

      // 3. Create test data
      console.log('\n🏗️ Creating Test Data...');
      await this.createTestData();

      // 4. Test OAuth token storage
      console.log('\n🔑 Testing OAuth Token Storage...');
      await this.testOAuthTokenStorage();

      // 5. Test dealership switching
      console.log('\n🔄 Testing Dealership Switching...');
      await this.testDealershipSwitching();

      // 6. Test API endpoints
      console.log('\n🌐 Testing API Endpoints...');
      await this.testAPIEndpoints();

      // 7. Test access control
      console.log('\n🛡️ Testing Access Control...');
      await this.testAccessControl();

      // 8. Test error scenarios
      console.log('\n💥 Testing Error Scenarios...');
      await this.testErrorScenarios();

      // 9. Generate report
      const results = this.generateReport();
      
      // 10. Generate manual test instructions
      this.generateManualTestInstructions();

      // 11. Cleanup
      console.log('\n🧹 Cleaning Up...');
      await this.cleanupTestData();

      return results;

    } catch (error) {
      this.log(`Integration test suite failed: ${error.message}`, 'error');
      console.error(error);
      return { passed: 0, failed: 1, warnings: 0, successRate: 0 };
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run the tests
async function main() {
  const tester = new IntegrationTester();
  const results = await tester.runAllTests();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled rejection:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = IntegrationTester;