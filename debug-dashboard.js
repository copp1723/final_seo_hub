const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== DASHBOARD DEBUG ===');
    
    // Check first dealership and its structure - fix the relationships
    const dealership = await prisma.dealerships.findFirst({
      include: {
        users_dealerships: true, // Correct relationship name
        agencies: true,
        monthly_usage: true
      }
    });
    
    console.log('Sample dealership:', {
      id: dealership?.id,
      name: dealership?.name,
      activePackageType: dealership?.activePackageType,
      pagesUsedThisPeriod: dealership?.pagesUsedThisPeriod,
      blogsUsedThisPeriod: dealership?.blogsUsedThisPeriod,
      gbpPostsUsedThisPeriod: dealership?.gbpPostsUsedThisPeriod,
      improvementsUsedThisPeriod: dealership?.improvementsUsedThisPeriod,
      currentBillingPeriodStart: dealership?.currentBillingPeriodStart,
      currentBillingPeriodEnd: dealership?.currentBillingPeriodEnd,
      userCount: dealership?.users_dealerships?.length,
      agencyId: dealership?.agencyId
    });
    
    // Check GA4 connections for this dealership
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: { dealershipId: dealership?.id }
    });
    console.log('GA4 connections for dealership:', ga4Connections.length);
    
    // Check search console connections
    const scConnections = await prisma.search_console_connections.findMany({
      where: { dealershipId: dealership?.id }
    });
    console.log('Search Console connections for dealership:', scConnections.length);
    
    // Check super admin user
    const superAdmin = await prisma.users.findUnique({
      where: { id: 'hardcoded-super-admin' },
      include: {
        agencies: {
          include: {
            dealerships: true
          }
        },
        dealerships: true
      }
    });
    
    console.log('Super admin user:', {
      id: superAdmin?.id,
      role: superAdmin?.role,
      hasAgency: !!superAdmin?.agencies,
      agencyDealerships: superAdmin?.agencies?.dealerships?.length,
      directDealership: superAdmin?.dealerships?.id
    });
    
    // Check for any requests
    const requestCount = await prisma.requests.count();
    console.log('Total requests in DB:', requestCount);
    
    // Try the exact same query that dashboard stats uses - but get users differently
    const dealershipUsers = await prisma.users.findMany({
      where: { dealershipId: dealership?.id },
      select: { id: true }
    });
    
    const userIds = dealershipUsers.map(u => u.id);
    console.log('Users for first dealership:', userIds);
    
    if (userIds.length > 0) {
      try {
        const statusCounts = await prisma.requests.groupBy({
          by: ['status'],
          where: { 
            userId: { in: userIds }
          },
          _count: true
        });
        console.log('Status counts query successful:', statusCounts);
      } catch (error) {
        console.error('Status counts query failed:', error);
      }
    } else {
      console.log('No users found for this dealership - trying requests by dealershipId');
      try {
        const requestsByDealership = await prisma.requests.findMany({
          where: { dealershipId: dealership?.id },
          select: { id: true, status: true }
        });
        console.log('Requests by dealershipId:', requestsByDealership.length);
      } catch (error) {
        console.error('Requests by dealershipId failed:', error);
      }
    }
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData(); 