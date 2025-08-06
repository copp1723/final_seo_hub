#!/usr/bin/env node

/**
 * Diagnostic script for the invitation system
 * Run with: node scripts/diagnose-invitation-system.js
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { PrismaClient } = require('@prisma/client')

async function diagnoseInvitationSystem() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 INVITATION SYSTEM DIAGNOSTIC REPORT\n')
    console.log('=' .repeat(50))
    
    // 1. Check Mailgun Configuration
    console.log('\n📧 MAILGUN CONFIGURATION:')
    const mailgunConfig = {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      region: process.env.MAILGUN_REGION || 'US',
      fromEmail: process.env.MAILGUN_FROM_EMAIL
    }
    
    console.log(`   API Key: ${mailgunConfig.apiKey ? '✅ Present' : '❌ Missing'}`)
    console.log(`   Domain: ${mailgunConfig.domain || '❌ Missing'}`)
    console.log(`   Region: ${mailgunConfig.region}`)
    console.log(`   From Email: ${mailgunConfig.fromEmail || '❌ Missing'}`)
    
    if (!mailgunConfig.apiKey || !mailgunConfig.domain) {
      console.log('   ⚠️  ISSUE: Mailgun configuration incomplete!')
    } else {
      console.log('   ✅ Mailgun configuration looks good')
    }
    
    // 2. Check Database Connection
    console.log('\n🗄️  DATABASE CONNECTION:')
    try {
      await prisma.$connect()
      console.log('   ✅ Database connection successful')
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message)
      return
    }
    
    // 3. Check Super Admin Users
    console.log('\n👑 SUPER ADMIN USERS:')
    const superAdmins = await prisma.users.findMany({
      where: {
        OR: [
          { role: 'SUPER_ADMIN' },
          { isSuperAdmin: true }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        onboardingCompleted: true
      }
    })
    
    if (superAdmins.length === 0) {
      console.log('   ❌ No super admin users found!')
      console.log('   💡 You need a super admin to send invitations')
    } else {
      console.log(`   ✅ Found ${superAdmins.length} super admin(s):`)
      superAdmins.forEach(admin => {
        console.log(`      - ${admin.name || 'No Name'} (${admin.email})`)
        console.log(`        Role: ${admin.role}, Super Admin: ${admin.isSuperAdmin}`)
        console.log(`        Onboarding: ${admin.onboardingCompleted ? 'Complete' : 'Incomplete'}`)
      })
    }
    
    // 4. Check Recent Invitations
    console.log('\n📨 RECENT INVITATIONS (Last 10):')
    const recentUsers = await prisma.users.findMany({
      where: {
        OR: [
          { invitationToken: { not: null } },
          { invitationTokenExpires: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        invitationToken: true,
        invitationTokenExpires: true,
        emailVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    if (recentUsers.length === 0) {
      console.log('   📭 No recent invitations found')
    } else {
      console.log(`   📬 Found ${recentUsers.length} recent invitation(s):`)
      recentUsers.forEach((user, index) => {
        const hasToken = !!user.invitationToken
        const isExpired = user.invitationTokenExpires && new Date(user.invitationTokenExpires) < new Date()
        const status = hasToken ? (isExpired ? 'EXPIRED' : 'PENDING') : 'ACCEPTED'
        
        console.log(`   ${index + 1}. ${user.name || 'No Name'} (${user.email})`)
        console.log(`      Status: ${status}`)
        console.log(`      Role: ${user.role}`)
        console.log(`      Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`)
        console.log(`      Created: ${user.createdAt}`)
        if (user.invitationTokenExpires) {
          console.log(`      Expires: ${user.invitationTokenExpires}`)
        }
        console.log()
      })
    }
    
    // 5. Check Environment Variables
    console.log('\n🔧 ENVIRONMENT VARIABLES:')
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'DATABASE_URL',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN'
    ]
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName]
      console.log(`   ${varName}: ${value ? '✅ Present' : '❌ Missing'}`)
    })
    
    // 6. Summary and Recommendations
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:')
    
    const issues = []
    const recommendations = []
    
    if (!mailgunConfig.apiKey || !mailgunConfig.domain) {
      issues.push('Mailgun configuration incomplete')
      recommendations.push('Add MAILGUN_API_KEY and MAILGUN_DOMAIN to your .env.local file')
    }
    
    if (superAdmins.length === 0) {
      issues.push('No super admin users found')
      recommendations.push('Create a super admin user to send invitations')
    }
    
    if (!process.env.NEXTAUTH_SECRET) {
      issues.push('NEXTAUTH_SECRET missing')
      recommendations.push('Add NEXTAUTH_SECRET to your environment variables')
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No issues found! Invitation system should be working.')
      console.log('   💡 Make sure you are logged in as a super admin when sending invitations.')
    } else {
      console.log(`   ⚠️  Found ${issues.length} issue(s):`)
      issues.forEach(issue => console.log(`      - ${issue}`))
      console.log('\n   🔧 Recommendations:')
      recommendations.forEach(rec => console.log(`      - ${rec}`))
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('🎯 To send invitations:')
    console.log('   1. Make sure you are logged in as a super admin')
    console.log('   2. Go to /super-admin/users')
    console.log('   3. Click "Invite User" button')
    console.log('   4. Fill out the form and submit')
    console.log('   5. Check the logs for any errors')
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseInvitationSystem().catch(console.error)
