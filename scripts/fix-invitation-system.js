const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function diagnoseInvitationSystem() {
  console.log('🔍 DIAGNOSING INVITATION SYSTEM');
  console.log('=====================================\n');

  try {
    // 1. Check all users and their verification status
    console.log('📊 USER VERIFICATION STATUS:');
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        invitationToken: true,
        invitationTokenExpires: true,
        createdAt: true,
        agencyId: true,
        dealershipId: true
      }
    });

    const unverifiedUsers = users.filter(u => !u.emailVerified);
    const verifiedUsers = users.filter(u => u.emailVerified);
    const usersWithActiveTokens = users.filter(u => u.invitationToken && u.invitationTokenExpires && new Date(u.invitationTokenExpires) > new Date());
    const usersWithExpiredTokens = users.filter(u => u.invitationToken && u.invitationTokenExpires && new Date(u.invitationTokenExpires) <= new Date());

    console.log(`Total users: ${users.length}`);
    console.log(`✅ Verified users: ${verifiedUsers.length}`);
    console.log(`❌ Unverified users: ${unverifiedUsers.length}`);
    console.log(`🔑 Users with active invitation tokens: ${usersWithActiveTokens.length}`);
    console.log(`⏰ Users with expired invitation tokens: ${usersWithExpiredTokens.length}\n`);

    // 2. List unverified users
    if (unverifiedUsers.length > 0) {
      console.log('❌ UNVERIFIED USERS:');
      console.log('-------------------');
      unverifiedUsers.forEach(user => {
        console.log(`• ${user.email} (${user.role})`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name || 'Not set'}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log(`  Has Token: ${!!user.invitationToken}`);
        if (user.invitationToken) {
          console.log(`  Token Expires: ${user.invitationTokenExpires}`);
          console.log(`  Token Valid: ${new Date(user.invitationTokenExpires) > new Date()}`);
        }
        console.log();
      });
    }

    // 3. Check Mailgun configuration
    console.log('\n📧 MAILGUN CONFIGURATION:');
    console.log('------------------------');
    const mailgunEnvVars = {
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? '✅ Set' : '❌ Missing',
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '❌ Missing',
      MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL || '❌ Missing',
      MAILGUN_FROM_NAME: process.env.MAILGUN_FROM_NAME || '❌ Missing'
    };
    
    Object.entries(mailgunEnvVars).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // 4. Check application URL configuration
    console.log('\n🔗 APPLICATION URL CONFIGURATION:');
    console.log('----------------------------------');
    const urlConfig = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '❌ Missing',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ Missing'
    };
    
    Object.entries(urlConfig).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    return { unverifiedUsers, verifiedUsers, usersWithActiveTokens, usersWithExpiredTokens };
  } catch (error) {
    console.error('❌ Error diagnosing invitation system:', error);
    throw error;
  }
}

async function fixUnverifiedUsers() {
  console.log('\n🔧 FIXING UNVERIFIED USERS');
  console.log('==========================\n');

  const { unverifiedUsers } = await diagnoseInvitationSystem();

  if (unverifiedUsers.length === 0) {
    console.log('✅ No unverified users to fix!');
    return;
  }

  console.log('Would you like to:');
  console.log('1. Generate new invitation tokens for unverified users');
  console.log('2. Mark all unverified users as verified (bypass invitation)');
  console.log('3. Generate invitation links for specific users');
  console.log('4. Exit\n');

  // For automated fix, we'll generate new invitation tokens
  console.log('🔄 Generating new invitation tokens for unverified users...\n');

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://rylie-seo-hub.onrender.com';

  for (const user of unverifiedUsers) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      await prisma.users.update({
        where: { id: user.id },
        data: {
          invitationToken: token,
          invitationTokenExpires: expiresAt
        }
      });

      const invitationUrl = `${baseUrl}/api/invitation?token=${token}`;
      
      console.log(`✅ Generated invitation for ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Invitation URL: ${invitationUrl}`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);
      console.log();
    } catch (error) {
      console.error(`❌ Failed to generate invitation for ${user.email}:`, error.message);
    }
  }
}

async function markAllAsVerified() {
  console.log('\n⚡ MARKING ALL USERS AS VERIFIED');
  console.log('=================================\n');
  
  const result = await prisma.users.updateMany({
    where: {
      emailVerified: null
    },
    data: {
      emailVerified: new Date()
    }
  });

  console.log(`✅ Marked ${result.count} users as verified`);
}

async function testMailgunConnection() {
  console.log('\n📧 TESTING MAILGUN CONNECTION');
  console.log('==============================\n');

  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;

  if (!mailgunApiKey || !mailgunDomain) {
    console.error('❌ Mailgun configuration missing!');
    return false;
  }

  try {
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);
    
    const mg = mailgun.client({
      username: 'api',
      key: mailgunApiKey
    });

    // Get domain info to test connection
    const domain = await mg.domains.get(mailgunDomain);
    console.log('✅ Mailgun connection successful!');
    console.log(`   Domain: ${domain.name}`);
    console.log(`   State: ${domain.state}`);
    return true;
  } catch (error) {
    console.error('❌ Mailgun connection failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 INVITATION SYSTEM DIAGNOSTIC & FIX TOOL');
    console.log('==========================================\n');

    // First, diagnose the current state
    await diagnoseInvitationSystem();

    // Test Mailgun connection
    const mailgunWorking = await testMailgunConnection();

    if (!mailgunWorking) {
      console.log('\n⚠️  WARNING: Mailgun is not properly configured!');
      console.log('   Invitation emails will not be sent.');
      console.log('   Please configure Mailgun environment variables.\n');
    }

    // Provide options for fixing
    console.log('\n📋 AVAILABLE FIXES:');
    console.log('-------------------');
    console.log('Run one of these commands:\n');
    console.log('1. Generate new invitations:');
    console.log('   node scripts/fix-invitation-system.js --generate-tokens\n');
    console.log('2. Mark all users as verified (bypass invitation):');
    console.log('   node scripts/fix-invitation-system.js --mark-verified\n');
    console.log('3. Full diagnosis only:');
    console.log('   node scripts/fix-invitation-system.js\n');

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--generate-tokens')) {
      await fixUnverifiedUsers();
    } else if (args.includes('--mark-verified')) {
      await markAllAsVerified();
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();