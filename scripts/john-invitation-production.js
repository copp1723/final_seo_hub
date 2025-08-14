#!/usr/bin/env node

// Production invitation script for JOHN@customerscout.com
// Generates everything needed for SUPER_ADMIN access

const crypto = require('crypto')

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

async function generateProductionInvitationForJohn() {
  console.log('🎯 PRODUCTION INVITATION for JOHN@customerscout.com as SUPER_ADMIN\n')

  // Generate secure invitation token
  const token = generateSecureToken()
  const userId = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 72) // 72 hours expiration

  // Use production URL - update this to match your actual production domain
  const productionUrl = 'https://rylie-seo-hub.onrender.com' // Update if different
  const magicLinkUrl = `${productionUrl}/api/invitation?token=${token}`

  console.log('✅ INVITATION DETAILS:')
  console.log('   Target Email: john@customerscout.com')
  console.log('   Role: SUPER_ADMIN')
  console.log('   User ID:', userId)
  console.log('   Token:', token)
  console.log('   Expires:', expiresAt.toISOString())
  console.log('   Production Link:', magicLinkUrl)

  console.log('\n🔐 SECURITY DETAILS:')
  console.log('   • 256-bit secure random token')
  console.log('   • 72-hour expiration')
  console.log('   • One-time use (consumed on first access)')
  console.log('   • HTTPS-only in production')

  console.log('\n📊 DATABASE SETUP:')
  console.log('Execute this SQL in your production database:')
  console.log('```sql')
  console.log(`INSERT INTO users (id, email, name, role, "invitationToken", "invitationTokenExpires", "onboardingCompleted", "createdAt", "updatedAt")
VALUES (
  '${userId}',
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
  role = 'SUPER_ADMIN',
  "onboardingCompleted" = true,
  "updatedAt" = NOW();`)
  console.log('```')

  console.log('\n📧 EMAIL TEMPLATE:')
  console.log('Send this email to john@customerscout.com:')
  console.log('\n---EMAIL START---')
  console.log('Subject: SEO Hub Super Admin Access - Action Required')
  console.log('')
  console.log('Hi John,')
  console.log('')
  console.log('You have been granted Super Administrator access to the SEO Hub platform.')
  console.log('')
  console.log('🔗 **Access Link (expires in 72 hours):**')
  console.log(magicLinkUrl)
  console.log('')
  console.log('🔐 **Your Role:** Super Administrator')
  console.log('📅 **Link Expires:** ' + expiresAt.toLocaleString())
  console.log('')
  console.log('**What you can do as Super Admin:**')
  console.log('• Manage all users and agencies')
  console.log('• Create and manage dealerships')
  console.log('• Access system-wide settings')
  console.log('• View comprehensive analytics and reports')
  console.log('• Manage integrations and API settings')
  console.log('')
  console.log('**Next Steps:**')
  console.log('1. Click the access link above')
  console.log('2. You\'ll be automatically signed in')
  console.log('3. You\'ll be redirected to the admin dashboard')
  console.log('')
  console.log('**Security Notes:**')
  console.log('• This link can only be used once')
  console.log('• It will expire in 72 hours')
  console.log('• Your session will last 30 days')
  console.log('')
  console.log('If you have any questions or need assistance, please contact the platform administrator.')
  console.log('')
  console.log('Best regards,')
  console.log('SEO Hub Administration Team')
  console.log('---EMAIL END---')

  console.log('\n🚀 ALTERNATIVE METHODS:')
  console.log('If email fails, you can also:')
  console.log('1. Share the magic link directly via secure messaging')
  console.log('2. Provide the token for manual entry: ' + token)
  console.log('3. Set up the user account through the admin interface')

  console.log('\n🔍 VERIFICATION STEPS:')
  console.log('After John uses the link, verify:')
  console.log('1. User appears in the Users list with SUPER_ADMIN role')
  console.log('2. invitationToken is cleared from database')
  console.log('3. emailVerified is set to current timestamp')
  console.log('4. User can access /settings?tab=users')

  console.log('\n⏰ SCHEDULE:')
  console.log('• Token generated at:', new Date().toLocaleString())
  console.log('• Valid until:', expiresAt.toLocaleString())
  console.log('• Timezone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone)

  return {
    email: 'john@customerscout.com',
    role: 'SUPER_ADMIN',
    userId,
    token,
    expiresAt,
    magicLinkUrl,
    productionUrl
  }
}

// Run the script
generateProductionInvitationForJohn()
  .then((result) => {
    console.log('\n🎉 PRODUCTION INVITATION GENERATED SUCCESSFULLY!')
    console.log('\n📋 QUICK SUMMARY:')
    console.log(`  Email: ${result.email}`)
    console.log(`  Role: ${result.role}`)
    console.log(`  Magic Link: ${result.magicLinkUrl}`)
    console.log(`  Valid Until: ${result.expiresAt.toLocaleString()}`)
    console.log('\n👆 Execute the SQL above and send the email to complete the process.')
  })
  .catch((error) => {
    console.error('❌ Error generating invitation:', error)
  })