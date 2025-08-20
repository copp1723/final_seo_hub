#!/usr/bin/env node

/**
 * Test script to verify Mailgun configuration and email sending
 * Run with: node scripts/test-mailgun.js
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const Mailgun = require('mailgun.js')
const FormData = require('form-data')

async function testMailgun() {
  console.log('🧪 Testing Mailgun Configuration...\n')
  
  // Check environment variables
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const region = process.env.MAILGUN_REGION || 'US'
  
  console.log('📋 Configuration Check:')
  console.log(`   API Key: ${apiKey ? '✅ Present' : '❌ Missing'}`)
  console.log(`   Domain: ${domain || '❌ Missing'}`)
  console.log(`   Region: ${region}`)
  console.log()
  
  if (!apiKey || !domain) {
    console.error('❌ Mailgun configuration is incomplete!')
    console.error('   Please check your .env.local file for MAILGUN_API_KEY and MAILGUN_DOMAIN')
    process.exit(1)
  }
  
  try {
    // Initialize Mailgun client
    const mailgun = new Mailgun(FormData)
    const mg = mailgun.client({
      username: 'api',
      key: apiKey,
      url: region === 'EU' ? 'https://api.eu.mailgun.net' : undefined
    })
    
    console.log('🔌 Mailgun client initialized successfully')
    
    // Test email data
    const testEmail = {
      from: `SEO Hub Test <noreply@${domain}>`,
      to: ['josh.copp@onekeel.ai'], // Replace with your email for testing
      subject: 'Mailgun Test - Invitation System',
      html: `
        <h2>🎉 Mailgun Test Successful!</h2>
        <p>This is a test email to verify that the Mailgun configuration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Domain:</strong> ${domain}</p>
        <p><strong>Region:</strong> ${region}</p>
        <hr>
        <p><em>This email was sent as part of testing the invitation system.</em></p>
      `,
      text: `Mailgun Test Successful! This email was sent at ${new Date().toISOString()} from domain ${domain} in region ${region}.`,
      'o:tag': ['test', 'invitation-system']
    }
    
    console.log('📧 Sending test email...')
    console.log(`   To: ${testEmail.to.join(', ')}`)
    console.log(`   From: ${testEmail.from}`)
    console.log(`   Subject: ${testEmail.subject}`)
    console.log()
    
    // Send the test email
    const result = await mg.messages.create(domain, testEmail)
    
    console.log('✅ Test email sent successfully!')
    console.log(`   Message ID: ${result.id}`)
    console.log(`   Status: ${result.message}`)
    console.log()
    console.log('🎯 Next Steps:')
    console.log('   1. Check your email inbox for the test message')
    console.log('   2. If received, Mailgun is working correctly')
    console.log('   3. If not received, check spam folder or Mailgun logs')
    console.log()
    console.log('📊 Mailgun Dashboard: https://app.mailgun.com/app/logs')
    
  } catch (error) {
    console.error('❌ Mailgun test failed!')
    console.error('   Error:', error.message)
    
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`)
    }
    
    if (error.details) {
      console.error('   Details:', error.details)
    }
    
    console.log()
    console.log('🔍 Troubleshooting:')
    console.log('   1. Verify API key is correct and active')
    console.log('   2. Check domain is verified in Mailgun dashboard')
    console.log('   3. Ensure domain DNS records are properly configured')
    console.log('   4. Check Mailgun account status and billing')
    
    process.exit(1)
  }
}

// Run the test
testMailgun().catch(console.error)
