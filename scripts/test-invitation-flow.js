const crypto = require('crypto');

async function testInvitationFlow() {
  console.log('🧪 TESTING INVITATION FLOW');
  console.log('==========================\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
  const testEmail = `test-${Date.now()}@example.com`;

  console.log('1️⃣ Testing user creation via Super Admin API...');
  console.log(`   Test email: ${testEmail}\n`);

  try {
    // Step 1: Create a new user via the API
    const createResponse = await fetch(`${baseUrl}/api/super-admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add authentication here
      },
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        role: 'USER',
        agencyId: null,
        dealershipId: null
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Failed to create user:', error);
      return;
    }

    const result = await createResponse.json();
    console.log('✅ User created successfully');
    console.log(`   User ID: ${result.user?.id}`);
    console.log(`   Invitation sent: ${result.invitationSent}\n`);

    // Step 2: Check if invitation email was sent
    if (result.invitationSent) {
      console.log('2️⃣ Invitation email sent successfully!');
      console.log('   Check the inbox for:', testEmail);
    } else {
      console.log('⚠️  Invitation email failed to send');
      console.log('   User was created but needs manual invitation');
    }

    // Step 3: Verify user status
    console.log('\n3️⃣ Checking user verification status...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.users.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        invitationToken: true,
        invitationTokenExpires: true
      }
    });

    if (user) {
      console.log('   Email verified:', user.emailVerified ? '✅ Yes' : '❌ No');
      console.log('   Has invitation token:', user.invitationToken ? '✅ Yes' : '❌ No');
      if (user.invitationToken) {
        console.log('   Token expires:', user.invitationTokenExpires);
        console.log('   Login URL:', `${baseUrl}/api/invitation?token=${user.invitationToken}`);
      }
    }

    await prisma.$disconnect();
    
    console.log('\n✅ Invitation flow test completed!');
  } catch (error) {
    console.error('❌ Error testing invitation flow:', error);
  }
}

// Run test
testInvitationFlow();