#!/usr/bin/env node

// Test script to verify the white-label system files exist and are properly structured
const fs = require('fs')
const path = require('path')

function testFileStructure() {
  console.log('🧪 Testing white-label system file structure...')

  const requiredFiles = [
    'lib/branding/config.ts',
    'lib/mailgun/templates.ts',
    'lib/mailgun/invitation.ts',
    'components/onboarding/dealership-onboarding-form.tsx',
    'app/onboarding/seoworks/page.tsx',
    'app/api/seoworks/complete-onboarding/route.ts',
    'app/api/seoworks/send-onboarding/route.ts'
  ]

  let allFilesExist = true

  requiredFiles.forEach(file => {
    const filepath = path.join(__dirname, '..', file)
    if (fs.existsSync(filepath)) {
      console.log(`   ✅ ${file}`)
    } else {
      console.log(`   ❌ ${file} - MISSING`)
      allFilesExist = false
    }
  })

  return allFilesExist
}

function testScriptUpdates() {
  console.log('\n📝 Testing script file updates...')

  const scriptFiles = [
    'scripts/check-seowerks-dealerships.js',
    'scripts/generate-invitation-token.js',
    'scripts/generate-invitation-token-render.js',
    'scripts/fix-account-linking.js',
    'scripts/create-seowerks-test-dealership.js'
  ]

  let allScriptsUpdated = true

  scriptFiles.forEach(file => {
    const filepath = path.join(__dirname, '..', file)
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8')
      if (content.includes('access@seowerks.ai')) {
        console.log(`   ❌ ${file} - Still contains hardcoded email`)
        allScriptsUpdated = false
      } else {
        console.log(`   ✅ ${file} - Hardcoded references removed`)
      }
    } else {
      console.log(`   ⚠️  ${file} - File not found`)
    }
  })

  return allScriptsUpdated
}

// Run tests
console.log('🚀 Starting white-label system verification...\n')

const filesExist = testFileStructure()
const scriptsUpdated = testScriptUpdates()

console.log('\n📊 SUMMARY:')
console.log(`   Files created: ${filesExist ? '✅ All required files exist' : '❌ Some files missing'}`)
console.log(`   Scripts updated: ${scriptsUpdated ? '✅ All hardcoded references removed' : '❌ Some hardcoded references remain'}`)

if (filesExist && scriptsUpdated) {
  console.log('\n🎉 White-label system setup complete!')
  console.log('\n💡 Next steps:')
  console.log('   1. Test the onboarding form at /onboarding/seoworks')
  console.log('   2. Test user invitation flow through admin panel')
  console.log('   3. Set AGENCY_ADMIN_EMAIL environment variable for scripts')
  console.log('   4. Configure domain-specific branding in lib/branding/config.ts')
} else {
  console.log('\n⚠️  Setup incomplete - please address the issues above')
}
