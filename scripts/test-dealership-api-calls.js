const { default: fetch } = require('node-fetch')

const BASE_URL = 'http://localhost:3001'

// Mock session for testing
const mockSession = {
  user: {
    id: '4eea201b-661e-4fba-a982-f28161b90444',
    email: 'access@seowerks.ai',
    name: 'access',
    role: 'AGENCY_ADMIN'
  }
}

async function testDealershipAPICalls() {
  console.log('🔍 Testing Dealership API Calls...\n')
  
  try {
    // Test 1: Get available dealerships
    console.log('1. Testing GET /api/dealerships/switch')
    const dealershipsResponse = await fetch(`${BASE_URL}/api/dealerships/switch`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (dealershipsResponse.ok) {
      const dealershipsData = await dealershipsResponse.json()
      console.log('✅ Dealerships API response:')
      console.log(`   Current: ${dealershipsData.currentDealership?.name || 'None'}`)
      console.log(`   Available: ${dealershipsData.availableDealerships?.length || 0} dealerships`)
      
      if (dealershipsData.availableDealerships?.length > 0) {
        console.log('   First few dealerships:')
        dealershipsData.availableDealerships.slice(0, 3).forEach(d => {
          console.log(`     - ${d.name} (${d.id})`)
        })
      }
    } else {
      console.log(`❌ Dealerships API failed: ${dealershipsResponse.status}`)
      const errorText = await dealershipsResponse.text()
      console.log(`   Error: ${errorText}`)
    }
    
    // Test 2: Switch to a specific dealership
    console.log('\n2. Testing POST /api/dealerships/switch')
    const targetDealershipId = 'dealer-jhc-columbus' // Jay Hatfield Chevrolet of Columbus
    
    const switchResponse = await fetch(`${BASE_URL}/api/dealerships/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dealershipId: targetDealershipId
      })
    })
    
    if (switchResponse.ok) {
      const switchData = await switchResponse.json()
      console.log('✅ Dealership switch response:')
      console.log(`   Success: ${switchData.success}`)
      console.log(`   New dealership: ${switchData.dealership?.name || 'None'}`)
    } else {
      console.log(`❌ Dealership switch failed: ${switchResponse.status}`)
      const errorText = await switchResponse.text()
      console.log(`   Error: ${errorText}`)
    }
    
    // Test 3: Get dashboard analytics for the switched dealership
    console.log('\n3. Testing GET /api/dashboard/analytics with dealership filter')
    
    const analyticsResponse = await fetch(`${BASE_URL}/api/dashboard/analytics?dateRange=30days&dealershipId=${targetDealershipId}&clearCache=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json()
      console.log('✅ Analytics API response:')
      console.log(`   Has GA4 data: ${!!analyticsData.data?.ga4Data}`)
      console.log(`   Has Search Console data: ${!!analyticsData.data?.searchConsoleData}`)
      console.log(`   Dealership ID in metadata: ${analyticsData.data?.metadata?.dealershipId || 'None'}`)
      
      if (analyticsData.data?.ga4Data) {
        console.log(`   GA4 Sessions: ${analyticsData.data.ga4Data.sessions || 0}`)
        console.log(`   GA4 Users: ${analyticsData.data.ga4Data.users || 0}`)
      }
      
      if (analyticsData.data?.searchConsoleData) {
        console.log(`   SC Clicks: ${analyticsData.data.searchConsoleData.clicks || 0}`)
        console.log(`   SC Impressions: ${analyticsData.data.searchConsoleData.impressions || 0}`)
      }
      
      if (analyticsData.data?.errors) {
        console.log('   Errors:')
        if (analyticsData.data.errors.ga4Error) {
          console.log(`     GA4: ${analyticsData.data.errors.ga4Error}`)
        }
        if (analyticsData.data.errors.searchConsoleError) {
          console.log(`     Search Console: ${analyticsData.data.errors.searchConsoleError}`)
        }
      }
    } else {
      console.log(`❌ Analytics API failed: ${analyticsResponse.status}`)
      const errorText = await analyticsResponse.text()
      console.log(`   Error: ${errorText}`)
    }
    
    // Test 4: Get tasks for the dealership
    console.log('\n4. Testing GET /api/tasks with dealership filter')
    
    const tasksResponse = await fetch(`${BASE_URL}/api/tasks?dealershipId=${targetDealershipId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json()
      console.log('✅ Tasks API response:')
      console.log(`   Tasks count: ${tasksData.tasks?.length || 0}`)
      
      if (tasksData.tasks?.length > 0) {
        console.log('   First few tasks:')
        tasksData.tasks.slice(0, 3).forEach(task => {
          console.log(`     - ${task.title} (${task.status})`)
        })
      }
    } else {
      console.log(`❌ Tasks API failed: ${tasksResponse.status}`)
      const errorText = await tasksResponse.text()
      console.log(`   Error: ${errorText}`)
    }
    
    // Test 5: Switch back to original dealership
    console.log('\n5. Testing switch back to Acura of Columbus')
    const originalDealershipId = 'dealer-acura-columbus'
    
    const switchBackResponse = await fetch(`${BASE_URL}/api/dealerships/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dealershipId: originalDealershipId
      })
    })
    
    if (switchBackResponse.ok) {
      const switchBackData = await switchBackResponse.json()
      console.log('✅ Switch back response:')
      console.log(`   Success: ${switchBackData.success}`)
      console.log(`   Back to: ${switchBackData.dealership?.name || 'None'}`)
      
      // Test analytics for original dealership
      const originalAnalyticsResponse = await fetch(`${BASE_URL}/api/dashboard/analytics?dateRange=30days&dealershipId=${originalDealershipId}&clearCache=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (originalAnalyticsResponse.ok) {
        const originalAnalyticsData = await originalAnalyticsResponse.json()
        console.log('✅ Original dealership analytics:')
        console.log(`   Has GA4 data: ${!!originalAnalyticsData.data?.ga4Data}`)
        console.log(`   Has Search Console data: ${!!originalAnalyticsData.data?.searchConsoleData}`)
        console.log(`   Dealership ID: ${originalAnalyticsData.data?.metadata?.dealershipId || 'None'}`)
      }
    } else {
      console.log(`❌ Switch back failed: ${switchBackResponse.status}`)
    }
    
    console.log('\n✅ Dealership API calls test completed!')
    
  } catch (error) {
    console.error('❌ Error testing dealership API calls:', error)
  }
}

testDealershipAPICalls()
