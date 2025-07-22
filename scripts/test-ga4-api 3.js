#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')
const { decrypt } = require('../lib/encryption.js')
const prisma = new PrismaClient()

async function testGA4API() {
  console.log('🧪 Testing GA4 API Endpoints')
  console.log('=' .repeat(50))
  
  try {
    // 1. Test database connection
    console.log('\n📊 1. Testing Database Connection')
    console.log('-'.repeat(30))
    
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })
    
    console.log(`✅ Found ${ga4Connections.length} GA4 connection(s)`)
    
    if (ga4Connections.length === 0) {
      console.log('❌ No GA4 connections to test')
      return
    }
    
    // 2. Test Google Analytics Admin API
    console.log('\n🔍 2. Testing Google Analytics Admin API')
    console.log('-'.repeat(30))
    
    const connection = ga4Connections[0]
    console.log(`Testing with connection: ${connection.users.email}`)
    
    if (!connection.accessToken) {
      console.log('❌ No access token found')
      return
    }
    
    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
      )
      
      // Set credentials
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })
      
      // Initialize Analytics Admin API
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
      
      console.log('✅ OAuth2 client created successfully')
      
      // List accounts
      console.log('\n📋 Listing Google Analytics accounts...')
      const accountsResponse = await analyticsAdmin.accounts.list()
      const accounts = accountsResponse.data.accounts || []
      
      console.log(`✅ Found ${accounts.length} account(s)`)
      
      for (const account of accounts) {
        console.log(`   📊 Account: ${account.displayName} (${account.name})`)
        
        try {
          // List properties for this account
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: `parent:${account.name}`
          })
          
          const properties = propertiesResponse.data.properties || []
          console.log(`   📈 Found ${properties.length} property(ies)`)
          
          for (const property of properties) {
            const propertyId = property.name?.split('/').pop()
            console.log(`      🏢 ${property.displayName} (ID: ${propertyId})`)
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to list properties for account ${account.displayName}:`, error.message)
        }
      }
      
      // 3. Test Analytics Data API
      console.log('\n📊 3. Testing Analytics Data API')
      console.log('-'.repeat(30))
      
      if (connection.propertyId) {
        try {
          const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client })
          
          console.log(`Testing data retrieval for property: ${connection.propertyId}`)
          
          const response = await analyticsData.properties.runReport({
            property: `properties/${connection.propertyId}`,
            requestBody: {
              dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
              dimensions: [{ name: 'date' }],
              limit: 10
            }
          })
          
          const report = response.data
          console.log('✅ Analytics data retrieved successfully')
          console.log(`   📊 Rows returned: ${report.rows?.length || 0}`)
          
          if (report.rows && report.rows.length > 0) {
            console.log('   📈 Sample data:')
            const firstRow = report.rows[0]
            console.log(`      Date: ${firstRow.dimensionValues[0].value}`)
            console.log(`      Sessions: ${firstRow.metricValues[0].value}`)
            console.log(`      Users: ${firstRow.metricValues[1].value}`)
            console.log(`      Page Views: ${firstRow.metricValues[2].value}`)
          }
          
        } catch (error) {
          console.log(`❌ Failed to retrieve analytics data: ${error.message}`)
        }
      } else {
        console.log('⚠️  No property ID set for connection')
      }
      
    } catch (error) {
      console.log(`❌ Google API error: ${error.message}`)
      
      if (error.message?.includes('401') || error.message?.includes('invalid_grant')) {
        console.log('🔄 Token appears to be expired - needs refresh')
      }
    }
    
    // 4. Test property listing endpoint
    console.log('\n🌐 4. Testing Property Listing Endpoint')
    console.log('-'.repeat(30))
    
    console.log('⚠️  Note: This requires an authenticated session')
    console.log('   To test manually, visit: http://localhost:3001/api/ga4/list-properties')
    console.log('   while logged into the application')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testGA4API() 