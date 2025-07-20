const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGA4Connections() {
  try {
    console.log('📈 CHECKING GA4 CONNECTIONS');
    console.log('===========================\n');

    // Check all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true
      }
    });

    console.log('👥 USERS:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Agency: ${user.agencyId}`);
      console.log(`    Dealership: ${user.dealershipId}`);
    });

    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        propertyId: true,
        propertyName: true,
        accessToken: true,
        refreshToken: true
      }
    });

    console.log('\n📈 GA4 CONNECTIONS:');
    if (ga4Connections.length === 0) {
      console.log('  ❌ No GA4 connections found!');
    } else {
      ga4Connections.forEach(conn => {
        console.log(`  - User: ${conn.userId}`);
        console.log(`    Property: ${conn.propertyName} (${conn.propertyId})`);
        console.log(`    Has Access Token: ${!!conn.accessToken}`);
        console.log(`    Has Refresh Token: ${!!conn.refreshToken}`);
      });
    }

    // Check if super admin has GA4 connection
    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
    if (superAdmin) {
      const superAdminConnection = ga4Connections.find(c => c.userId === superAdmin.id);
      
      if (!superAdminConnection) {
        console.log('\n⚠️  SUPER ADMIN HAS NO GA4 CONNECTION!');
        console.log('   This is why the GA4 API is failing.');
        console.log('   Need to connect GA4 for the super admin user.');
      } else {
        console.log('\n✅ Super admin has GA4 connection');
      }
    }

    console.log('\n🎯 GA4 CONNECTION CHECK COMPLETE!');

  } catch (error) {
    console.error('❌ Error checking GA4 connections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGA4Connections(); 