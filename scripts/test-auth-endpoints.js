#!/usr/bin/env node

/**
 * Test Authentication Endpoints
 * 
 * Verifies that Google OAuth callback endpoints are properly configured
 * and can handle the authentication flow after database recovery.
 */

const https = require('https')
const http = require('http')

class AuthEndpointTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  log(message) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`)
  }

  async testEndpoint(path, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`
      const client = url.startsWith('https') ? https : http
      
      const req = client.get(url, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            url: url
          })
        })
      })
      
      req.on('error', reject)
      req.setTimeout(5000, () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
    })
  }

  async testDatabaseConnection() {
    try {
      this.log('Testing database connection...')
      
      const response = await this.testEndpoint('/api/admin/agencies')
      
      if (response.status === 401) {
        this.log('✅ Database connection working (401 = auth required)')
        return true
      } else if (response.status === 200) {
        this.log('✅ Database connection working (200 = success)')
        return true
      } else if (response.status === 500) {
        this.log('❌ Database connection failed (500 = server error)')
        return false
      } else {
        this.log(`⚠️  Unexpected response: ${response.status}`)
        return false
      }
    } catch (error) {
      this.log(`❌ Database test failed: ${error.message}`)
      return false
    }
  }

  async testAuthCallbacks() {
    const endpoints = [
      '/api/ga4/auth/callback',
      '/api/search-console/callback'
    ]
    
    for (const endpoint of endpoints) {
      try {
        this.log(`Testing ${endpoint}...`)
        
        // Test without parameters (should redirect with error)
        const response = await this.testEndpoint(endpoint)
        
        if (response.status === 302 || response.status === 307) {
          const location = response.headers.location || ''
          if (location.includes('error=Missing')) {
            this.log(`✅ ${endpoint} properly handles missing parameters`)
          } else {
            this.log(`⚠️  ${endpoint} redirects but unclear error handling`)
          }
        } else if (response.status === 400) {
          this.log(`✅ ${endpoint} properly rejects invalid requests`)
        } else {
          this.log(`⚠️  ${endpoint} unexpected response: ${response.status}`)
        }
        
      } catch (error) {
        this.log(`❌ ${endpoint} test failed: ${error.message}`)
      }
    }
  }

  async testTableStructure() {
    try {
      this.log('Testing critical table structure...')
      
      const { execSync } = require('child_process')
      
      // Test that critical tables exist
      const tables = [
        'users', 'agencies', 'dealerships',
        'ga4_connections', 'search_console_connections',
        'analytics_cache'
      ]
      
      for (const table of tables) {
        try {
          execSync(`psql $DATABASE_URL -c "SELECT 1 FROM ${table} LIMIT 1;" > /dev/null 2>&1`)
          this.log(`✅ Table ${table} exists and accessible`)
        } catch (error) {
          this.log(`❌ Table ${table} missing or inaccessible`)
        }
      }
      
      // Test that email field exists in connection tables
      try {
        execSync(`psql $DATABASE_URL -c "SELECT email FROM ga4_connections LIMIT 1;" > /dev/null 2>&1`)
        this.log(`✅ ga4_connections.email field exists`)
      } catch (error) {
        this.log(`❌ ga4_connections.email field missing`)
      }
      
      try {
        execSync(`psql $DATABASE_URL -c "SELECT email FROM search_console_connections LIMIT 1;" > /dev/null 2>&1`)
        this.log(`✅ search_console_connections.email field exists`)
      } catch (error) {
        this.log(`❌ search_console_connections.email field missing`)
      }
      
    } catch (error) {
      this.log(`❌ Table structure test failed: ${error.message}`)
    }
  }

  async runAllTests() {
    this.log('=== STARTING AUTH ENDPOINT TESTS ===')
    
    // Test 1: Database connectivity
    const dbWorking = await this.testDatabaseConnection()
    
    // Test 2: Table structure
    await this.testTableStructure()
    
    // Test 3: Auth callback endpoints
    await this.testAuthCallbacks()
    
    this.log('=== AUTH ENDPOINT TESTS COMPLETED ===')
    
    return {
      databaseWorking: dbWorking,
      timestamp: new Date().toISOString()
    }
  }
}

// CLI usage
if (require.main === module) {
  const tester = new AuthEndpointTester()
  
  tester.runAllTests()
    .then(result => {
      if (!result.databaseWorking) {
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Test failed:', error.message)
      process.exit(1)
    })
}

module.exports = AuthEndpointTester