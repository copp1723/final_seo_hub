// Quick test of demo functions using ES modules
import { getDemoGA4Analytics, getDemoSearchConsoleData } from '../lib/demo-data.js'

console.log('🧪 Testing Demo Functions...\n')

const startDate = '2024-07-01'
const endDate = '2024-07-31'

const testDealerships = [
  'dealer-acura-columbus',
  'dealer-genesis-wichita',
  'dealer-jhm-portal'
]

console.log('Testing GA4 Demo Data:')
testDealerships.forEach(dealershipId => {
  try {
    const data = getDemoGA4Analytics(startDate, endDate, dealershipId)
    console.log(`\n${dealershipId}:`)
    console.log(`  Sessions: ${data.totals.sessions}`)
    console.log(`  Users: ${data.totals.users}`)
    console.log(`  Property ID: ${data.metadata.propertyId}`)
  } catch (error) {
    console.log(`  Error: ${error.message}`)
  }
})

console.log('\nTesting Search Console Demo Data:')
testDealerships.forEach(dealershipId => {
  try {
    const data = getDemoSearchConsoleData(startDate, endDate, dealershipId)
    console.log(`\n${dealershipId}:`)
    console.log(`  Clicks: ${data.totals.clicks}`)
    console.log(`  Impressions: ${data.totals.impressions}`)
    console.log(`  Position: ${data.totals.position.toFixed(1)}`)
    console.log(`  Site URL: ${data.metadata.siteUrl}`)
  } catch (error) {
    console.log(`  Error: ${error.message}`)
  }
})
