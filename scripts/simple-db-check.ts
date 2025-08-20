import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== DATABASE STATE CHECK ===');
    
    // Check users
    const users = await prisma.users.findMany({
      include: { 
        agencies: true
      }
    });
    console.log(`\n👥 USERS (${users.length}):`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Agency: ${user.agencies?.name || 'None'}`);
    });
    
    // Check agencies
    const agencies = await prisma.agencies.findMany({
      include: { dealerships: true }
    });
    console.log(`\n🏢 AGENCIES (${agencies.length}):`);
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.dealerships.length} dealerships)`);
    });
    
    // Check dealerships
    const dealerships = await prisma.dealerships.findMany({
      include: { agencies: true }
    });
    console.log(`\n🚗 DEALERSHIPS (${dealerships.length}):`);
    dealerships.forEach(d => {
      console.log(`  - ${d.name} - SEOWorks ID: ${d.clientId || 'Missing'} - Package: ${d.activePackageType || 'None'}`);
    });
    
    // Check tasks (basic count)
    const taskCount = await prisma.tasks.count();
    console.log(`\n📋 TASKS: ${taskCount}`);
    
    // Check orphaned tasks
    const orphanedTaskCount = await prisma.orphaned_tasks.count();
    console.log(`\n❌ ORPHANED TASKS: ${orphanedTaskCount}`);
    
    // Check requests
    const requestCount = await prisma.requests.count();
    console.log(`\n📝 REQUESTS: ${requestCount}`);
    
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.count();
    console.log(`\n📊 GA4 CONNECTIONS: ${ga4Connections}`);
    
    // Check Search Console connections  
    const scConnections = await prisma.search_console_connections.count();
    console.log(`\n🔍 SEARCH CONSOLE CONNECTIONS: ${scConnections}`);
    
    // Check for missing SEOWorks client IDs
    const dealershipsWithoutSeoworksId = await prisma.dealerships.count({
      where: {
        OR: [
          { clientId: null },
          { clientId: '' }
        ]
      }
    });
    console.log(`\n⚠️  DEALERSHIPS WITHOUT SEOWORKS ID: ${dealershipsWithoutSeoworksId} of ${dealerships.length}`);
    
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Database connectivity: Working`);
    console.log(`✅ Users: ${users.length} (${users.filter(u => u.role === 'SUPER_ADMIN').length} super admin)`);
    console.log(`✅ Agencies: ${agencies.length}`);
    console.log(`✅ Dealerships: ${dealerships.length}`);
    console.log(`${taskCount > 0 ? '✅' : '⚠️ '} Tasks: ${taskCount}`);
    console.log(`${orphanedTaskCount === 0 ? '✅' : '⚠️ '} Orphaned tasks: ${orphanedTaskCount}`);
    console.log(`${ga4Connections > 0 ? '✅' : '⚠️ '} GA4 connections: ${ga4Connections}`);
    console.log(`${scConnections > 0 ? '✅' : '⚠️ '} Search Console connections: ${scConnections}`);
    console.log(`${dealershipsWithoutSeoworksId === 0 ? '✅' : '❌'} SEOWorks integration: ${dealershipsWithoutSeoworksId} dealerships missing IDs`);
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();