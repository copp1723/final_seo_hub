import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== DATABASE STATE CHECK ===');
    
    // Check users
    const users = await prisma.users.findMany({
      include: { 
        agencies: true, 
        user_dealership_access_user_dealership_access_userIdTousers: { 
          include: { dealerships: true } 
        }
      }
    });
    console.log(`\n👥 USERS (${users.length}):`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Agency: ${user.agencies?.name || 'None'}`);
      if (user.user_dealership_access_user_dealership_access_userIdTousers.length > 0) {
        user.user_dealership_access_user_dealership_access_userIdTousers.forEach(access => {
          console.log(`    Dealership Access: ${access.dealerships.name} (${access.role})`);
        });
      }
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
      console.log(`  - ${d.name} (${d.seoworksClientId || 'No SEOWorks ID'}) - Agency: ${d.agencies?.name || 'None'} - Package: ${d.packageType || 'None'}`);
    });
    
    // Check tasks
    const taskCount = await prisma.tasks.count();
    console.log(`\n📋 TASKS: ${taskCount}`);
    
    // Check recent tasks
    const recentTasks = await prisma.tasks.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { dealerships: true }
    });
    console.log(`\n📋 RECENT TASKS (${recentTasks.length}):`);
    recentTasks.forEach(task => {
      console.log(`  - ${task.type} for ${task.dealerships?.name || 'Unknown'} (${task.status}) - ${task.createdAt.toISOString()}`);
    });
    
    // Check orphaned tasks
    const orphanedTaskCount = await prisma.orphanedTasks.count();
    console.log(`\n❌ ORPHANED TASKS: ${orphanedTaskCount}`);
    
    // Check requests
    const requestCount = await prisma.requests.count();
    console.log(`\n📝 REQUESTS: ${requestCount}`);
    
    // Check GA4 connections
    const ga4Connections = await prisma.gA4Connections.count();
    console.log(`\n📊 GA4 CONNECTIONS: ${ga4Connections}`);
    
    // Check Search Console connections  
    const scConnections = await prisma.searchConsoleConnections.count();
    console.log(`\n🔍 SEARCH CONSOLE CONNECTIONS: ${scConnections}`);
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();