const { PrismaClient } = require('@prisma/client');

async function debugDealershipData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== CHECKING DEALERSHIP DATA ===\n');
    
    // Get total dealership count
    const totalDealerships = await prisma.dealerships.count();
    console.log(`Total dealerships in database: ${totalDealerships}\n`);
    
    // Get all dealerships with agency info
    const dealerships = await prisma.dealerships.findMany({
      include: {
        agencies: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('=== ALL DEALERSHIPS ===');
    dealerships.forEach((d, index) => {
      console.log(`${index + 1}. ${d.name}`);
      console.log(`   ID: ${d.id}`);
      console.log(`   Agency: ${d.agencies?.name || 'No Agency'} (${d.agencyId})`);
      console.log(`   Website: ${d.website || 'None'}`);
      console.log(`   Package: ${d.activePackageType || 'None'}`);
      console.log(`   Client ID: ${d.clientId || 'None'}`);
      console.log('');
    });
    
    // Check users associated with dealerships
    console.log('=== USERS WITH DEALERSHIP ASSIGNMENTS ===');
    const usersWithDealerships = await prisma.users.findMany({
      where: {
        dealershipId: {
          not: null
        }
      },
      include: {
        dealerships: true,
        agencies: true
      }
    });
    
    console.log(`Users with dealership assignments: ${usersWithDealerships.length}\n`);
    
    usersWithDealerships.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Dealership: ${user.dealerships?.name || 'Unknown'}`);
      console.log(`   Agency: ${user.agencies?.name || 'Unknown'}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });
    
    // Check GA4 connections
    console.log('=== GA4 CONNECTIONS ===');
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          include: {
            dealerships: true
          }
        }
      }
    });
    
    console.log(`Total GA4 connections: ${ga4Connections.length}\n`);
    
    ga4Connections.forEach((conn, index) => {
      console.log(`${index + 1}. User: ${conn.users.email}`);
      console.log(`   Property ID: ${conn.propertyId || 'None'}`);
      console.log(`   Property Name: ${conn.propertyName || 'None'}`);
      console.log(`   Dealership: ${conn.users.dealerships?.name || 'None'}`);
      console.log('');
    });
    
    // Check Search Console connections
    console.log('=== SEARCH CONSOLE CONNECTIONS ===');
    const scConnections = await prisma.search_console_connections.findMany({
      include: {
        users: {
          include: {
            dealerships: true
          }
        }
      }
    });
    
    console.log(`Total Search Console connections: ${scConnections.length}\n`);
    
    scConnections.forEach((conn, index) => {
      console.log(`${index + 1}. User: ${conn.users.email}`);
      console.log(`   Site URL: ${conn.siteUrl || 'None'}`);
      console.log(`   Site Name: ${conn.siteName || 'None'}`);
      console.log(`   Dealership: ${conn.users.dealerships?.name || 'None'}`);
      console.log('');
    });
    
    // Check agencies and their dealership counts
    console.log('=== AGENCIES AND DEALERSHIP COUNTS ===');
    const agencies = await prisma.agencies.findMany({
      include: {
        _count: {
          select: {
            dealerships: true,
            users: true
          }
        }
      }
    });
    
    agencies.forEach((agency, index) => {
      console.log(`${index + 1}. ${agency.name}`);
      console.log(`   ID: ${agency.id}`);
      console.log(`   Slug: ${agency.slug}`);
      console.log(`   Dealerships: ${agency._count.dealerships}`);
      console.log(`   Users: ${agency._count.users}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDealershipData().catch(console.error);
