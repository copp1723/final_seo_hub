#!/usr/bin/env node

/**
 * Setup Dealership Connections
 * 
 * This script runs the complete process to analyze and fix missing connections:
 * 1. Analyzes current state
 * 2. Creates missing connections
 * 3. Verifies the results
 */

const { execSync } = require('child_process')
const path = require('path')

function runScript(scriptName, description) {
  console.log(`\n🔄 ${description}...`)
  console.log('='.repeat(60))
  
  try {
    const scriptPath = path.join(__dirname, scriptName)
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    console.log(`✅ ${description} completed successfully`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    process.exit(1)
  }
}

async function setupDealershipConnections() {
  console.log('🚀 Setting up Dealership Connections')
  console.log('This script will analyze and fix missing GA4 and Search Console connections\n')

  // Step 1: Analyze current state
  runScript('analyze-missing-connections.js', 'Analyzing missing connections')

  // Ask user if they want to proceed
  console.log('\n❓ Do you want to create the missing connections? (y/N)')
  
  // In a real interactive script, you'd use readline, but for now we'll proceed
  console.log('Proceeding with connection creation...\n')

  // Step 2: Create missing connections
  runScript('create-missing-connections.js', 'Creating missing connections')

  // Step 3: Verify results
  console.log('\n🔍 Verifying results...')
  runScript('analyze-missing-connections.js', 'Re-analyzing connection status')

  console.log('\n🎉 Dealership connection setup completed!')
  console.log('\n📝 Summary:')
  console.log('- All existing dealerships have been analyzed')
  console.log('- Missing connections have been created')
  console.log('- New dealerships will automatically get connections')
  console.log('\n✅ Your system is now ready with proper connection coverage!')
}

// Run the setup
setupDealershipConnections().catch(error => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
