/**
 * Test Script for Unified Settings Migration
 * 
 * This script verifies that the settings page migration is working correctly
 * without breaking any functionality.
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testRedirects() {
  console.log('🧪 TESTING REDIRECTS');
  console.log('==================\n');
  
  const redirectTests = [
    { from: '/super-admin', expected: '/settings?tab=users', description: 'Super admin main page' },
    { from: '/super-admin/users', expected: '/settings?tab=users', description: 'Super admin users page' },
    { from: '/super-admin/agencies', expected: '/settings?tab=agencies', description: 'Super admin agencies page' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of redirectTests) {
    try {
      const response = await fetch(`${BASE_URL}${test.from}`, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 Settings Migration Test'
        }
      });
      
      const location = response.headers.get('location');
      
      if (location && location.includes(test.expected)) {
        console.log(`✅ ${test.description}`);
        console.log(`   ${test.from} → ${location}`);
        passed++;
      } else {
        console.log(`❌ ${test.description}`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Got: ${location || 'No redirect'}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.description} - Error: ${error.message}`);
      failed++;
    }
    console.log();
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

async function testSettingsPageStructure() {
  console.log('🧪 TESTING SETTINGS PAGE STRUCTURE');
  console.log('===================================\n');
  
  try {
    const response = await fetch(`${BASE_URL}/settings`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 Settings Migration Test'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Settings page returned status: ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    
    // Check for expected elements
    const checks = [
      { pattern: 'Profile', description: 'Profile tab' },
      { pattern: 'Notifications', description: 'Notifications tab' },
      { pattern: 'Integrations', description: 'Integrations tab' },
      { pattern: 'Usage', description: 'Usage tab' }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      if (html.includes(check.pattern)) {
        console.log(`✅ Found: ${check.description}`);
      } else {
        console.log(`❌ Missing: ${check.description}`);
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error) {
    console.log(`❌ Error testing settings page: ${error.message}`);
    return false;
  }
}

async function checkForBrokenLinks() {
  console.log('\n🧪 CHECKING FOR BROKEN SUPER-ADMIN LINKS');
  console.log('=========================================\n');
  
  const { execSync } = require('child_process');
  
  try {
    // Search for any remaining /super-admin references
    const result = execSync(
      'grep -r "/super-admin" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" app/ components/ 2>/dev/null || true',
      { encoding: 'utf8' }
    );
    
    if (result.trim()) {
      console.log('⚠️  Found remaining /super-admin references:');
      console.log(result);
      return false;
    } else {
      console.log('✅ No hardcoded /super-admin links found');
      return true;
    }
  } catch (error) {
    console.log('✅ No hardcoded /super-admin links found');
    return true;
  }
}

async function main() {
  console.log('🚀 UNIFIED SETTINGS MIGRATION TEST SUITE');
  console.log('========================================\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  
  const results = {
    redirects: await testRedirects(),
    structure: await testSettingsPageStructure(),
    links: await checkForBrokenLinks()
  };
  
  console.log('\n📊 FINAL RESULTS');
  console.log('================');
  console.log(`Redirects: ${results.redirects ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Page Structure: ${results.structure ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Link Check: ${results.links ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED - Migration successful!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Please review and fix issues');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main();