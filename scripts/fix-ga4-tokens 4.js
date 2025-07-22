const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixGA4Tokens() {
  try {
    console.log('🔧 FIXING GA4 TOKENS');
    console.log('=====================\n');

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

    // Find the GA4 connection
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: { userId: superAdmin.id }
    });

    if (!ga4Connection) {
      console.log('❌ No GA4 connection found!');
      return;
    }

    console.log(`✅ Found GA4 connection: ${ga4Connection.propertyName} (${ga4Connection.propertyId})`);

    // Check if tokens are placeholder values
    if (ga4Connection.accessToken === 'placeholder-access-token' || 
        ga4Connection.refreshToken === 'placeholder-refresh-token') {
      
      console.log('⚠️  Found placeholder tokens - removing connection');
      
      // Delete the placeholder connection
      await prisma.ga4_connections.delete({
        where: { id: ga4Connection.id }
      });
      
      console.log('✅ Removed placeholder GA4 connection');
      console.log('\n🎯 NEXT STEPS:');
      console.log('   1. Go to the settings page');
      console.log('   2. Click "Connect Google Analytics"');
      console.log('   3. Complete the OAuth flow to get real tokens');
      
    } else {
      console.log('✅ GA4 connection has real tokens');
    }

  } catch (error) {
    console.error('❌ Error fixing GA4 tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGA4Tokens(); 