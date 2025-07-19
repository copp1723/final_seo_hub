const { PrismaClient } = require('@prisma/client');

async function validateFixes() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔍 VALIDATING DEALERSHIP FIXES...\n');
    
    // Test 1: Verify dealership count and relationships
    console.log('✅ TEST 1: DEALERSHIP COUNT AND RELATIONSHIPS');
    console.log('==============================================');
    
    const totalDealerships = await prisma.dealerships.count();
    const dealershipsWithAgencies = await prisma.dealerships.count({
      where: { 
        agencyId: { 
          not: null 
        } 
      }
    });
    
    console.log(`📊 Total dealerships: ${totalDealerships}`);
    console.log(`📊 Dealerships with agencies: ${dealershipsWithAgencies}`);
    console.log(`📊 Orphaned dealerships: ${totalDealerships - dealershipsWithAgencies}`);
    
    if (totalDealerships === dealershipsWithAgencies) {
      console.log('✅ All dealerships have agency relationships');
    } else {
      console.log('❌ Some dealerships are still orphaned');
    }
    
    // Test 2: Verify user assignments
    console.log('\n✅ TEST 2: USER ASSIGNMENTS');
    console.log('============================');
    
    const totalUsers = await prisma.users.count();
    const usersWithAgencies = await prisma.users.count({
      where: { 
        agencyId: { not: null },
        role: { not: 'SUPER_ADMIN' }
      }
    });
    const superAdmins = await prisma.users.count({
      where: { role: 'SUPER_ADMIN' }
    });
    
    console.log(`📊 Total users: ${totalUsers}`);
    console.log(`📊 Super admins: ${superAdmins}`);
    console.log(`📊 Regular users with agencies: ${usersWithAgencies}`);
    
    // Test 3: Verify GA4 connections
    console.log('\n✅ TEST 3: GA4 CONNECTIONS');
    console.log('===========================');
    
    const ga4Connections = await prisma.ga4_connections.count();
    const ga4WithProperties = await prisma.ga4_connections.count({
      where: { propertyId: { not: null } }
    });
    
    console.log(`📊 Total GA4 connections: ${ga4Connections}`);
    console.log(`📊 GA4 connections with properties: ${ga4WithProperties}`);
    
    if (ga4Connections >= 2) {
      console.log('✅ GA4 connections should now show multiple options');
    } else {
      console.log('❌ Still limited GA4 connections');
    }
    
    // Test 4: Verify Search Console connections
    console.log('\n✅ TEST 4: SEARCH CONSOLE CONNECTIONS');
    console.log('=====================================');
    
    const scConnections = await prisma.search_console_connections.count();
    const scWithSites = await prisma.search_console_connections.count({
      where: { siteUrl: { not: null } }
    });
    
    console.log(`📊 Total Search Console connections: ${scConnections}`);
    console.log(`📊 Search Console connections with sites: ${scWithSites}`);
    
    if (scConnections >= 2) {
      console.log('✅ Search Console connections should now show multiple options');
    } else {
      console.log('❌ Still limited Search Console connections');
    }
    
    // Test 5: Simulate API responses
    console.log('\n✅ TEST 5: SIMULATED API RESPONSES');
    console.log('==================================');
    
    // Simulate super admin user accessing dealership selector
    const superAdminUser = await prisma.users.findFirst({
      where: { 
        OR: [
          { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
          { role: 'SUPER_ADMIN' }
        ]
      }
    });
    
    if (superAdminUser) {
      console.log(`\n🔹 Super Admin Test (${superAdminUser.email}):`);
      
      // What the dealership selector should return
      const availableDealerships = await prisma.dealerships.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      });
      
      console.log(`   - Should see ${availableDealerships.length} dealerships in dropdown`);
      console.log(`   - First few: ${availableDealerships.slice(0, 3).map(d => d.name).join(', ')}`);
    }
    
    // Simulate regular user accessing GA4/Search Console
    const regularUser = await prisma.users.findFirst({
      where: { 
        role: 'USER',
        agencyId: { not: null },
        dealershipId: { not: null }
      },
      include: {
        agencies: true,
        dealerships: true
      }
    });
    
    if (regularUser) {
      console.log(`\n🔹 Regular User Test (${regularUser.email}):`);
      console.log(`   - Agency: ${regularUser.agencies?.name}`);
      console.log(`   - Dealership: ${regularUser.dealerships?.name}`);
      
      // Check what GA4 properties they should see
      const userGA4 = await prisma.ga4_connections.findFirst({
        where: {
          users: { dealershipId: regularUser.dealershipId }
        }
      });
      
      if (userGA4) {
        console.log(`   - GA4 Property: ${userGA4.propertyName} (${userGA4.propertyId})`);
      } else {
        console.log(`   - GA4: Would show demo data`);
      }
      
      // Check what Search Console sites they should see
      const userSC = await prisma.search_console_connections.findFirst({
        where: {
          users: { dealershipId: regularUser.dealershipId }
        }
      });
      
      if (userSC) {
        console.log(`   - Search Console Site: ${userSC.siteName} (${userSC.siteUrl})`);
      } else {
        console.log(`   - Search Console: Would show demo data`);
      }
    }
    
    // Test 6: Data integrity check
    console.log('\n✅ TEST 6: DATA INTEGRITY');
    console.log('==========================');
    
    const integritySummary = {
      totalDealerships,
      dealershipsWithAgencies,
      totalUsers,
      usersWithAgencies: usersWithAgencies + superAdmins, // Include super admins
      ga4Connections,
      scConnections,
      usersWithDealerships: await prisma.users.count({
        where: { dealershipId: { not: null } }
      })
    };
    
    console.log('\n📊 Final Integrity Summary:');
    Object.entries(integritySummary).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    
    // Calculate fix success rate
    const expectedGA4Connections = Math.min(totalDealerships, 10); // Reasonable expectation
    const expectedSCConnections = Math.min(totalDealerships, 10);
    
    const successMetrics = {
      dealershipIntegrity: (dealershipsWithAgencies / totalDealerships) * 100,
      userAssignments: ((usersWithAgencies + superAdmins) / totalUsers) * 100,
      ga4Coverage: (ga4Connections / expectedGA4Connections) * 100,
      scCoverage: (scConnections / expectedSCConnections) * 100
    };
    
    console.log('\n🎯 Success Metrics:');
    Object.entries(successMetrics).forEach(([key, value]) => {
      const percentage = Math.min(value, 100).toFixed(1);
      const status = value >= 80 ? '✅' : value >= 50 ? '⚠️' : '❌';
      console.log(`   - ${key}: ${percentage}% ${status}`);
    });
    
    const overallSuccess = Object.values(successMetrics).reduce((a, b) => a + b, 0) / Object.keys(successMetrics).length;
    
    console.log(`\n🏆 Overall Fix Success: ${overallSuccess.toFixed(1)}%`);
    
    if (overallSuccess >= 80) {
      console.log('🎉 FIXES SUCCESSFUL! The issues should be resolved.');
    } else if (overallSuccess >= 50) {
      console.log('⚠️  PARTIAL SUCCESS. Some issues may remain.');
    } else {
      console.log('❌ FIXES INCOMPLETE. Additional work needed.');
    }
    
    return integritySummary;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the validation
validateFixes()
  .then(summary => {
    console.log('\n✅ Validation completed successfully!');
  })
  .catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
