const { PrismaClient } = require('@prisma/client');

async function validateJayHatfieldSetup() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔍 VALIDATING JAY HATFIELD SETUP...\n');
    
    // Check if reversal script was run
    console.log('✅ TEST 1: CHECKING FOR CLEAN SLATE');
    console.log('==================================');
    
    const systemUsers = await prisma.users.count({
      where: {
        OR: [
          { email: { contains: 'system-' } },
          { name: { contains: 'System User' } }
        ]
      }
    });
    
    const placeholderConnections = await prisma.ga4_connections.count({
      where: { accessToken: 'placeholder-encrypted-token' }
    });
    
    console.log(`System users remaining: ${systemUsers} (should be 0)`);
    console.log(`Placeholder connections: ${placeholderConnections} (should be 0)`);
    
    if (systemUsers === 0 && placeholderConnections === 0) {
      console.log('✅ Clean slate confirmed - previous fixes removed');
    } else {
      console.log('⚠️  Previous fixes still present - run reversal script first');
    }
    
    // Check Jay Hatfield agency
    console.log('\n✅ TEST 2: JAY HATFIELD AGENCY');
    console.log('==============================');
    
    const jayHatfieldAgency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { slug: 'jay-hatfield' },
          { name: { contains: 'Jay Hatfield' } }
        ]
      }
    });
    
    if (jayHatfieldAgency) {
      console.log(`✅ Jay Hatfield agency found: ${jayHatfieldAgency.name}`);
      console.log(`   - ID: ${jayHatfieldAgency.id}`);
      console.log(`   - Slug: ${jayHatfieldAgency.slug}`);
    } else {
      console.log('❌ Jay Hatfield agency not found - script needs to run');
    }
    
    // Check dealerships
    console.log('\n✅ TEST 3: DEALERSHIP COUNT AND DATA');
    console.log('===================================');
    
    const totalDealerships = await prisma.dealerships.count();
    const jayHatfieldDealerships = jayHatfieldAgency ? await prisma.dealerships.count({
      where: { agencyId: jayHatfieldAgency.id }
    }) : 0;
    
    console.log(`Total dealerships: ${totalDealerships}`);
    console.log(`Jay Hatfield dealerships: ${jayHatfieldDealerships} (should be 22)`);
    
    if (jayHatfieldDealerships === 22) {
      console.log('✅ Correct number of Jay Hatfield dealerships');
    } else {
      console.log('⚠️  Incorrect dealership count - script needs to run');
    }
    
    // Sample some dealership names
    if (jayHatfieldAgency) {
      const sampleDealerships = await prisma.dealerships.findMany({
        where: { agencyId: jayHatfieldAgency.id },
        take: 5,
        orderBy: { name: 'asc' }
      });
      
      console.log('\nSample dealership names:');
      sampleDealerships.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.name}`);
      });
    }
    
    // Check GA4 connections
    console.log('\n✅ TEST 4: GA4 CONNECTIONS');
    console.log('==========================');
    
    const ga4Connections = await prisma.ga4_connections.count();
    const realGA4Connections = await prisma.ga4_connections.count({
      where: {
        accessToken: { not: 'placeholder-encrypted-token' }
      }
    });
    
    console.log(`Total GA4 connections: ${ga4Connections}`);
    console.log(`Real GA4 connections: ${realGA4Connections} (should be 1)`);
    
    if (realGA4Connections === 1) {
      const mainGA4 = await prisma.ga4_connections.findFirst({
        where: {
          accessToken: { not: 'placeholder-encrypted-token' }
        }
      });
      
      console.log('✅ Main GA4 connection found');
      console.log(`   - Property ID: ${mainGA4?.propertyId}`);
      console.log(`   - Property Name: ${mainGA4?.propertyName}`);
    } else if (realGA4Connections === 0) {
      console.log('⚠️  No real GA4 connections - script needs to run');
    } else {
      console.log('⚠️  Multiple GA4 connections - check setup');
    }
    
    // Check Search Console connections
    console.log('\n✅ TEST 5: SEARCH CONSOLE CONNECTIONS');
    console.log('====================================');
    
    const scConnections = await prisma.search_console_connections.count();
    const realSCConnections = await prisma.search_console_connections.count({
      where: {
        accessToken: { not: 'placeholder-encrypted-token' }
      }
    });
    
    console.log(`Total Search Console connections: ${scConnections}`);
    console.log(`Real Search Console connections: ${realSCConnections} (should be 1)`);
    
    if (realSCConnections === 1) {
      const mainSC = await prisma.search_console_connections.findFirst({
        where: {
          accessToken: { not: 'placeholder-encrypted-token' }
        }
      });
      
      console.log('✅ Main Search Console connection found');
      console.log(`   - Site URL: ${mainSC?.siteUrl}`);
      console.log(`   - Site Name: ${mainSC?.siteName}`);
    } else if (realSCConnections === 0) {
      console.log('⚠️  No real Search Console connections - script needs to run');
    } else {
      console.log('⚠️  Multiple Search Console connections - check setup');
    }
    
    // Check user assignments
    console.log('\n✅ TEST 6: USER ASSIGNMENTS');
    console.log('============================');
    
    const mainUser = await prisma.users.findFirst({
      where: {
        OR: [
          { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
          { role: 'SUPER_ADMIN' },
          { email: { contains: 'josh.copp' } }
        ]
      }
    });
    
    if (mainUser) {
      console.log(`Main user found: ${mainUser.email}`);
      console.log(`   - Role: ${mainUser.role}`);
      console.log(`   - Agency ID: ${mainUser.agencyId}`);
      console.log(`   - Dealership ID: ${mainUser.dealershipId}`);
      
      if (mainUser.agencyId === jayHatfieldAgency?.id) {
        console.log('✅ Main user assigned to Jay Hatfield agency');
      } else {
        console.log('⚠️  Main user not assigned to Jay Hatfield agency');
      }
    } else {
      console.log('❌ Main user not found');
    }
    
    // Simulate API responses
    console.log('\n✅ TEST 7: SIMULATED API RESPONSES');
    console.log('==================================');
    
    // Simulate dealership selector for super admin
    const allDealerships = await prisma.dealerships.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    
    console.log(`\nDealership Selector API would return:`);
    console.log(`   - ${allDealerships.length} total dealerships`);
    console.log(`   - First few: ${allDealerships.slice(0, 3).map(d => d.name).join(', ')}`);
    
    // Expected GA4 properties
    const expectedGA4Properties = [
      "323480238", "323404832", "371672738", "320759942", "323415736",
      "452793966", "336729443", "317592148", "317608467", "317578343",
      "284944578", "323502411", "461644624", "472110523", "323448557",
      "323465145", "473660351", "470694371"
    ];
    
    console.log(`\nGA4 List Properties API would return:`);
    console.log(`   - ${expectedGA4Properties.length} properties with access`);
    console.log(`   - 4 properties pending access`);
    console.log(`   - Total: 22 properties`);
    
    // Expected Search Console sites
    console.log(`\nSearch Console List Sites API would return:`);
    console.log(`   - 22 total dealership websites`);
    console.log(`   - All Jay Hatfield affiliated sites`);
    
    // Overall status
    console.log('\n📊 OVERALL SETUP STATUS');
    console.log('=======================');
    
    const isSetupComplete = 
      systemUsers === 0 &&
      placeholderConnections === 0 &&
      jayHatfieldAgency &&
      jayHatfieldDealerships === 22 &&
      realGA4Connections === 1 &&
      realSCConnections === 1 &&
      mainUser?.agencyId === jayHatfieldAgency?.id;
    
    if (isSetupComplete) {
      console.log('🎉 JAY HATFIELD SETUP IS COMPLETE AND CORRECT!');
      console.log('');
      console.log('✅ Expected Results:');
      console.log('   - Dealership dropdown will show all 22 Jay Hatfield dealerships');
      console.log('   - GA4 will show 18 properties + 4 pending (total 22)');
      console.log('   - Search Console will show all 22 dealership websites');
      console.log('   - All data properly connected under Jay Hatfield Auto Group');
    } else {
      console.log('⚠️  SETUP INCOMPLETE - Run the reversal script:');
      console.log('   node reverse-and-fix-dealerships.js');
      console.log('');
      console.log('❌ Issues to fix:');
      if (systemUsers > 0) console.log('   - Remove system users');
      if (placeholderConnections > 0) console.log('   - Remove placeholder connections');
      if (!jayHatfieldAgency) console.log('   - Create Jay Hatfield agency');
      if (jayHatfieldDealerships !== 22) console.log('   - Create 22 dealerships');
      if (realGA4Connections !== 1) console.log('   - Set up main GA4 connection');
      if (realSCConnections !== 1) console.log('   - Set up main Search Console connection');
      if (mainUser?.agencyId !== jayHatfieldAgency?.id) console.log('   - Assign main user to Jay Hatfield agency');
    }
    
    return {
      isComplete: isSetupComplete,
      dealerships: jayHatfieldDealerships,
      ga4Connections: realGA4Connections,
      scConnections: realSCConnections
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the validation
validateJayHatfieldSetup()
  .then(result => {
    console.log('\n✅ Validation completed!');
    if (result.isComplete) {
      console.log('🚀 Ready to test the application!');
    } else {
      console.log('🔧 Run the setup script first.');
    }
  })
  .catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
