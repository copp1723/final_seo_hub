#!/usr/bin/env node

// Quick invitation script for JOHN@customerscout.com
// This script will create the invitation token and provide the magic link

const crypto = require('crypto')

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

async function generateInvitationForJohn() {
  console.log('🎯 Generating invitation for JOHN@customerscout.com as SUPER_ADMIN...\n')

  // Generate secure invitation token
  const token = generateSecureToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 72) // 72 hours expiration

  // Generate the magic link URL - use the production URL or localhost
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLinkUrl = `${baseUrl}/api/invitation?token=${token}`

  console.log('✅ Invitation Details Generated:')
  console.log('   Target Email: john@customerscout.com')
  console.log('   Role: SUPER_ADMIN')
  console.log('   Token:', token)
  console.log('   Expires:', expiresAt.toISOString())
  console.log('   Magic Link:', magicLinkUrl)

  console.log('\n📋 Next Steps:')
  console.log('1. Manually add this user to the database with the following SQL:')
  console.log(`
INSERT INTO users (id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted", "createdAt", "updatedAt")
VALUES (
  '${crypto.randomUUID()}',
  'john@customerscout.com',
  'John Customer Scout',
  'SUPER_ADMIN',
  '${token}',
  '${expiresAt.toISOString()}',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "invitationToken" = '${token}',
  "invitationTokenExpires" = '${expiresAt.toISOString()}',
  "updatedAt" = NOW();`)

  console.log('\n2. Or share this magic link directly with John:')
  console.log(`   ${magicLinkUrl}`)
  
  console.log('\n3. The link will be valid until:')
  console.log(`   ${expiresAt.toLocaleString()}`)

  console.log('\n✉️  Email them with this message:')
  console.log(`
Subject: Your SEO Hub Super Admin Access

Hi John,

You have been granted Super Admin access to the SEO Hub platform.

Click the link below to complete your account setup:
${magicLinkUrl}

This link will expire on ${expiresAt.toLocaleString()}.

If you have any questions, please contact the platform administrator.

Best regards,
SEO Hub Team`)

  return {
    email: 'john@customerscout.com',
    role: 'SUPER_ADMIN',
    token,
    expiresAt,
    magicLinkUrl
  }
}

// Run the script
generateInvitationForJohn()
  .then((result) => {
    console.log('\n🎉 Invitation details generated successfully!')
    console.log('\nInvitation Summary:')
    console.log(`  Email: ${result.email}`)
    console.log(`  Role: ${result.role}`)
    console.log(`  Magic Link: ${result.magicLinkUrl}`)
    console.log(`  Valid Until: ${result.expiresAt.toLocaleString()}`)
  })
  .catch((error) => {
    console.error('❌ Error generating invitation:', error)
  })