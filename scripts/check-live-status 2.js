const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLiveStatus() {
  try {
    console.log('🔍 Checking live database status...\n');

    // Check agencies
    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            users: true,
            dealerships: true
          }
        }
      }
    });

    console.log('📊 AGENCIES:');
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.slug})`);
      console.log(`    Users: ${agency._count.users}, Dealerships: ${agency._count.dealerships}`);
    });

    // Check users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true
      }
    });

    console.log('\n👥 USERS:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
      console.log(`    Agency: ${user.agencyId}, Dealership: ${user.dealershipId}`);
    });

    // Check dealerships
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        website: true,
        agencyId: true
      }
    });

    console.log('\n🏢 DEALERSHIPS:');
    dealerships.forEach(dealer => {
      console.log(`  - ${dealer.name} (${dealer.website})`);
      console.log(`    Agency: ${dealer.agencyId}`);
    });

    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        propertyId: true,
        propertyName: true
      }
    });

    console.log('\n📈 GA4 CONNECTIONS:');
    ga4Connections.forEach(conn => {
      console.log(`  - User: ${conn.userId}`);
      console.log(`    Property: ${conn.propertyName} (${conn.propertyId})`);
    });

    // Check if consolidation is needed
    if (agencies.length > 1) {
      console.log('\n⚠️  CONSOLIDATION NEEDED: Multiple agencies found!');
      console.log('   Run: node scripts/fix-agency-structure-safe.js');
    } else {
      console.log('\n✅ Agency structure looks good!');
    }

  } catch (error) {
    console.error('❌ Error checking status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLiveStatus(); 