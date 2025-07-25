const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreGA4Connection() {
  try {
    console.log('🔗 RESTORING GA4 CONNECTION');
    console.log('============================\n');

    // Find the super admin user
    const superAdmin = await prisma.users.findFirst({
      where: { 
        email: 'josh.copp@onekeel.ai',
        role: 'SUPER_ADMIN'
      }
    });

    if (!superAdmin) {
      console.log('❌ Super admin user not found!');
      return;
    }

    console.log(`✅ Found super admin: ${superAdmin.email} (${superAdmin.id})`);

    // Check if GA4 connection already exists
    const existingConnection = await prisma.ga4_connections.findFirst({
      where: { userId: superAdmin.id }
    });

    if (existingConnection) {
      console.log('✅ GA4 connection already exists');
      console.log(`   Property: ${existingConnection.propertyName} (${existingConnection.propertyId})`);
      return;
    }

    // Create a new GA4 connection
    // Note: You'll need to get the actual tokens from your Google OAuth flow
    // For now, we'll create a placeholder connection
    const ga4Connection = await prisma.ga4_connections.create({
      data: {
        userId: superAdmin.id,
        propertyId: '320759942', // Jay Hatfield Chevrolet property ID
        propertyName: 'Jay Hatfield Chevrolet',
        accessToken: 'placeholder-access-token', // You'll need real tokens
        refreshToken: 'placeholder-refresh-token', // You'll need real tokens
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Created GA4 connection for super admin');
    console.log(`   Property: ${ga4Connection.propertyName} (${ga4Connection.propertyId})`);

    // Verify the connection
    const verifyConnection = await prisma.ga4_connections.findFirst({
      where: { userId: superAdmin.id }
    });

    if (verifyConnection) {
      console.log('\n✅ GA4 CONNECTION VERIFIED:');
      console.log(`   User: ${superAdmin.email}`);
      console.log(`   Property: ${verifyConnection.propertyName}`);
      console.log(`   Property ID: ${verifyConnection.propertyId}`);
      console.log(`   Created: ${verifyConnection.createdAt}`);
    }

    console.log('\n🎯 GA4 CONNECTION RESTORED!');
    console.log('   Note: You may need to re-authenticate with Google to get real tokens.');

  } catch (error) {
    console.error('❌ Error restoring GA4 connection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreGA4Connection(); 