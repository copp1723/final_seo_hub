#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { generateSecureToken } from '../lib/crypto-utils'
import { sendInvitationEmail } from '../lib/mailgun/invitation'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function sendInvitationToJohn() {
  console.log('🎯 Sending refreshed invitation to JOHN@customerscout.com as SUPER_ADMIN...\n')

  try {
    const targetEmail = 'JOHN@customerscout.com'.toLowerCase()

    // First check if user exists
    let existingUser = await prisma.users.findUnique({
      where: { email: targetEmail }
    })

    // Generate new invitation token
    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 72) // 72 hours expiration

    if (existingUser) {
      console.log('✅ User found in database:', existingUser.email)
      console.log('   Name:', existingUser.name || 'Not set')
      console.log('   Current Role:', existingUser.role)
      console.log('   Agency ID:', existingUser.agencyId || 'None')
      console.log('   Dealership ID:', existingUser.dealershipId || 'None')
      console.log('   Email Verified:', existingUser.emailVerified ? 'Yes' : 'No')
      console.log('   Existing Token Expires:', existingUser.invitationTokenExpires || 'No active token')
      
      // Update existing user with new invitation token
      existingUser = await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          invitationToken: token,
          invitationTokenExpires: expiresAt,
          // Keep existing role and assignments
          updatedAt: new Date()
        }
      })
      console.log('✅ Updated existing user with new invitation token')
    } else {
      console.log('❌ User not found. Creating new SUPER_ADMIN user...')
      
      // Create new SUPER_ADMIN user
      existingUser = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: targetEmail,
          name: 'John Customer Scout',
          role: 'SUPER_ADMIN',
          invitationToken: token,
          invitationTokenExpires: expiresAt,
          onboardingCompleted: true, // Super admins don't need onboarding
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created new SUPER_ADMIN user')
    }

    // Generate the magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${token}`

    console.log('\n🔗 Magic Link Generated:')
    console.log('   URL:', magicLinkUrl)
    console.log('   Expires:', expiresAt.toISOString())
    console.log('   Token (first 10 chars):', token.substring(0, 10) + '...')

    // Send invitation email
    console.log('\n📧 Sending invitation email...')
    const invitationSent = await sendInvitationEmail({
      user: existingUser as any,
      invitedBy: 'SEO Hub Super Admin',
      loginUrl: magicLinkUrl,
      skipPreferences: true
    })

    if (invitationSent) {
      console.log('✅ Invitation email sent successfully!')
      console.log('\n📊 Summary:')
      console.log('   • User ID:', existingUser.id)
      console.log('   • Email:', existingUser.email) 
      console.log('   • Role:', existingUser.role)
      console.log('   • Status: Invitation sent and email delivered')
      console.log('   • Magic link valid until:', expiresAt.toLocaleString())
    } else {
      console.log('⚠️  User updated but invitation email failed to send')
      console.log('   • You can manually share this magic link:', magicLinkUrl)
    }

    // Also log to database audit trail
    console.log('\n📝 Logging to audit trail...')
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        action: 'INVITATION_SENT',
        entityType: 'USER',
        entityId: existingUser.id,
        userEmail: 'system@seohub.ai', // System action
        details: {
          targetEmail: existingUser.email,
          role: existingUser.role,
          invitedBy: 'SEO Hub Super Admin (Script)',
          magicLinkGenerated: true,
          emailSent: invitationSent,
          expiresAt: expiresAt.toISOString()
        },
        resource: 'invitation_system'
      }
    })
    console.log('✅ Audit log created')

  } catch (error) {
    console.error('❌ Error sending invitation:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
sendInvitationToJohn()
  .then(() => {
    console.log('\n🎉 Invitation process completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Invitation process failed:', error.message)
    process.exit(1)
  })