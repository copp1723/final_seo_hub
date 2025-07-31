const { getDemoGA4Analytics, getDemoSearchConsoleData } = require('../lib/demo-data')
const { features } = require('../lib/features')

console.log('🧪 Testing Demo Dealership Filtering...\n')

// Test demo mode flag
console.log('1. Demo Mode Status:')
console.log(`   Demo Mode Enabled: ${features.demoMode}`)
console.log(`   Environment DEMO_MODE: ${process.env.DEMO_MODE}`)
console.log(`   Environment NEXT_PUBLIC_DEMO_MODE: ${process.env.NEXT_PUBLIC_DEMO_MODE}`)

// Test date range
const endDate = new Date().toISOString().split('T')[0]
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

console.log(`\n2. Date Range:`)
console.log(`   Start: ${startDate}`)
console.log(`   End: ${endDate}`)

// Test different dealerships
const testDealerships = [
  'dealer-acura-columbus',
  'dealer-jhc-columbus', 
  'dealer-jhm-portal',
  'unknown-dealership'
]

console.log('\n3. Testing GA4 Demo Data for Different Dealerships:')

testDealerships.forEach(dealershipId => {
  try {
    const ga4Data = getDemoGA4Analytics(startDate, endDate, dealershipId)
    
    console.log(`\n   📊 ${dealershipId}:`)
    console.log(`      Dealership Name: ${ga4Data.metadata.propertyName}`)
    console.log(`      Total Sessions: ${ga4Data.totals.sessions}`)
    console.log(`      Total Users: ${ga4Data.totals.users}`)
    console.log(`      Property ID: ${ga4Data.metadata.propertyId}`)
    console.log(`      Days of data: ${ga4Data.overview.dates.length}`)
    
    // Check if data varies by dealership
    const avgDailySessions = ga4Data.totals.sessions / ga4Data.overview.dates.length
    console.log(`      Avg Daily Sessions: ${Math.round(avgDailySessions)}`)
    
  } catch (error) {
    console.log(`   ❌ Error for ${dealershipId}: ${error.message}`)
  }
})

console.log('\n4. Testing Search Console Demo Data for Different Dealerships:')

testDealerships.forEach(dealershipId => {
  try {
    const scData = getDemoSearchConsoleData(startDate, endDate, dealershipId)
    
    console.log(`\n   🔍 ${dealershipId}:`)
    console.log(`      Site URL: ${scData.metadata.siteUrl}`)
    console.log(`      Total Clicks: ${scData.totals.clicks}`)
    console.log(`      Total Impressions: ${scData.totals.impressions}`)
    console.log(`      Avg CTR: ${(scData.totals.ctr * 100).toFixed(2)}%`)
    console.log(`      Avg Position: ${scData.totals.position.toFixed(1)}`)
    console.log(`      Days of data: ${scData.overview.dates.length}`)
    
    // Check top query
    if (scData.topQueries && scData.topQueries.length > 0) {
      console.log(`      Top Query: "${scData.topQueries[0].query}" (${scData.topQueries[0].clicks} clicks)`)
    }
    
  } catch (error) {
    console.log(`   ❌ Error for ${dealershipId}: ${error.message}`)
  }
})

console.log('\n5. Comparing Package Types:')

const packageComparison = [
  { id: 'dealer-acura-columbus', expectedPackage: 'SILVER' },
  { id: 'dealer-jhm-portal', expectedPackage: 'PLATINUM' }
]

packageComparison.forEach(({ id, expectedPackage }) => {
  const ga4Data = getDemoGA4Analytics(startDate, endDate, id)
  const scData = getDemoSearchConsoleData(startDate, endDate, id)
  
  const avgDailySessions = ga4Data.totals.sessions / ga4Data.overview.dates.length
  const avgDailyClicks = scData.totals.clicks / scData.overview.dates.length
  
  console.log(`\n   📈 ${id} (${expectedPackage}):`)
  console.log(`      Avg Daily Sessions: ${Math.round(avgDailySessions)}`)
  console.log(`      Avg Daily Clicks: ${Math.round(avgDailyClicks)}`)
  console.log(`      Avg Position: ${scData.totals.position.toFixed(1)}`)
})

console.log('\n✅ Demo dealership filtering test completed!')
console.log('\n💡 Expected Results:')
console.log('   - SILVER packages should have lower traffic/clicks')
console.log('   - PLATINUM packages should have higher traffic/clicks and better positions')
console.log('   - Each dealership should have unique property IDs and site URLs')
console.log('   - Data should be consistent for the same dealership across calls')
