#!/usr/bin/env node

/**
 * Test script to verify webhook filtering works correctly
 * This ensures invitation emails don't trigger the CSV processing webhook
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const fetch = require('node-fetch').default

async function testWebhookFiltering() {
  console.log('🧪 Testing Mailgun Webhook Filtering\n')
  
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${baseUrl}/api/mailgun/dealership-csv`
  
  console.log(`Testing webhook at: ${webhookUrl}\n`)
  
  // Test 1: Invitation email webhook (should be ignored)
  console.log('1️⃣ Testing invitation email webhook (should be ignored)...')
  
  const invitationFormData = new FormData()
  invitationFormData.append('event', 'delivered')
  invitationFormData.append('sender', 'noreply@mail.onerylie.com')
  invitationFormData.append('recipient', 'test@example.com')
  invitationFormData.append('subject', 'Welcome to SEO Hub - You\'ve been invited!')
  invitationFormData.append('attachment-count', '0')
  
  try {
    const response1 = await fetch(webhookUrl, {
      method: 'POST',
      body: invitationFormData
    })
    
    const result1 = await response1.json()
    
    if (response1.ok && result1.message.includes('not for dealership CSV processing')) {
      console.log('   ✅ Invitation email correctly ignored')
      console.log(`   📝 Response: ${result1.message}`)
    } else {
      console.log('   ❌ Invitation email was not properly filtered')
      console.log(`   📝 Response: ${JSON.stringify(result1)}`)
    }
  } catch (error) {
    console.log('   ❌ Error testing invitation webhook:', error.message)
  }
  
  console.log()
  
  // Test 2: Welcome email webhook (should be ignored)
  console.log('2️⃣ Testing welcome email webhook (should be ignored)...')
  
  const welcomeFormData = new FormData()
  welcomeFormData.append('event', 'delivered')
  welcomeFormData.append('sender', 'noreply@mail.onerylie.com')
  welcomeFormData.append('recipient', 'test@example.com')
  welcomeFormData.append('subject', 'Welcome to your new account!')
  welcomeFormData.append('attachment-count', '0')
  
  try {
    const response2 = await fetch(webhookUrl, {
      method: 'POST',
      body: welcomeFormData
    })
    
    const result2 = await response2.json()
    
    if (response2.ok && result2.message.includes('Ignoring outbound invitation email')) {
      console.log('   ✅ Welcome email correctly ignored')
      console.log(`   📝 Response: ${result2.message}`)
    } else {
      console.log('   ❌ Welcome email was not properly filtered')
      console.log(`   📝 Response: ${JSON.stringify(result2)}`)
    }
  } catch (error) {
    console.log('   ❌ Error testing welcome webhook:', error.message)
  }
  
  console.log()
  
  // Test 3: GET endpoint (should work)
  console.log('3️⃣ Testing GET endpoint (health check)...')
  
  try {
    const response3 = await fetch(webhookUrl, {
      method: 'GET'
    })
    
    const result3 = await response3.json()
    
    if (response3.ok && result3.message.includes('active')) {
      console.log('   ✅ GET endpoint working correctly')
      console.log(`   📝 Response: ${result3.message}`)
    } else {
      console.log('   ❌ GET endpoint not working properly')
      console.log(`   📝 Response: ${JSON.stringify(result3)}`)
    }
  } catch (error) {
    console.log('   ❌ Error testing GET endpoint:', error.message)
  }
  
  console.log()
  console.log('🎯 Summary:')
  console.log('   The webhook should now properly filter out invitation emails')
  console.log('   and only process actual dealership CSV emails.')
  console.log('   This should prevent the "undefined" errors when sending invitations.')
}

testWebhookFiltering().catch(console.error)
