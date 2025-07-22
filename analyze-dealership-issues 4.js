const { PrismaClient } = require('@prisma/client');

async function analyzeDealershipIssues() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔍 ANALYZING DEALERSHIP DATA ISSUES...\n');
    
    // Issue 1: Check total dealerships vs what users can see
    console.log('📊 ISSUE 1: DEALERSHIP DROPDOWN VISIBILITY');
    console.log('==========================================');
    
    const totalDealerships = await prisma.dealerships.count();
    console.log(`✅ Total dealerships in database: ${totalDealerships}`);
    
    // Get all agencies and their dealership counts
    const agencies = await prisma.agencies.findMany({
      include: {
        dealerships: {
          select: { id: true, name: true }
        },
        users: {
          select: { id: true, email: true, role: true, dealershipId: true }
        }
      }
    });
    
    console.log(`\n📋 Agencies and their dealership distributions:`);
    agencies.forEach(agency => {
      console.log(`\n🏢 ${agency.name} (${agency.slug})`);
      console.log(`   - Dealerships: ${agency.dealerships.length}`);
      console.log(`   - Users: ${agency.users.length}`);
      
      if (agency.dealerships.length > 0) {
        console.log(`   - Dealership list:`);
        agency.dealerships.forEach((d, i) => {
          console.log(`     ${i + 1}. ${d.name} (${d.id})`);
        });
      }
    });
    
    // Check which users can see which dealerships
    console.log(`\n🔍 User access analysis:`);
    const allUsers = await prisma.users.findMany({
      include: {
        agencies: true,
        dealerships: true
      }
    });
    
    allUsers.forEach(user => {
      if (user.agencies) {
        const agencyDealerships = agencies.find(a => a.id === user.agencyId)?.dealerships || [];
        console.log(`\n👤 ${user.email} (${user.role})`);
        console.log(`   - Agency: ${user.agencies.name}`);
        console.log(`   - Current dealership: ${user.dealerships?.name || 'None'}`);
        console.log(`   - Should see ${agencyDealerships.length} dealerships`);
      }
    });
    
    // Issue 2: Check GA4/Search Console connections
    console.log(`\n\n📊 ISSUE 2: GA4/SEARCH CONSOLE DATA ACCURACY`);
    console.log('============================================');
    
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          include: {
            dealerships: true,
            agencies: true
          }
        }
      }
    });
    
    console.log(`\n📈 GA4 Connections (${ga4Connections.length} total):`);
    ga4Connections.forEach((conn, i) => {
      console.log(`\n${i + 1}. User: ${conn.users.email}`);
      console.log(`   - Dealership: ${conn.users.dealerships?.name || 'None'}`);
      console.log(`   - Agency: ${conn.users.agencies?.name || 'None'}`);
      console.log(`   - Property ID: ${conn.propertyId || 'Not set'}`);
      console.log(`   - Property Name: ${conn.propertyName || 'Not set'}`);
    });
    
    const scConnections = await prisma.search_console_connections.findMany({
      include: {
        users: {
          include: {
            dealerships: true,
            agencies: true
          }
        }
      }
    });
    
    console.log(`\n🔍 Search Console Connections (${scConnections.length} total):`);
    scConnections.forEach((conn, i) => {
      console.log(`\n${i + 1}. User: ${conn.users.email}`);
      console.log(`   - Dealership: ${conn.users.dealerships?.name || 'None'}`);
      console.log(`   - Agency: ${conn.users.agencies?.name || 'None'}`);
      console.log(`   - Site URL: ${conn.siteUrl || 'Not set'}`);
      console.log(`   - Site Name: ${conn.siteName || 'Not set'}`);
    });
    
    // Issue 3: Check for orphaned data
    console.log(`\n\n🔍 ISSUE 3: DATA INTEGRITY CHECKS`);
    console.log('=================================');
    
    // Check for dealerships without agencies
    const orphanedDealerships = await prisma.dealerships.findMany({
      where: {
        agencyId: null
      }
    });
    
    if (orphanedDealerships.length > 0) {
      console.log(`\n⚠️  Orphaned dealerships (no agency): ${orphanedDealerships.length}`);
      orphanedDealerships.forEach(d => {
        console.log(`   - ${d.name} (${d.id})`);
      });
    } else {
      console.log(`\n✅ No orphaned dealerships found`);
    }
    
    // Check for users without agencies
    const usersWithoutAgencies = await prisma.users.findMany({
      where: {
        agencyId: null,
        role: { not: 'SUPER_ADMIN' }
      }
    });
    
    if (usersWithoutAgencies.length > 0) {
      console.log(`\n⚠️  Users without agencies: ${usersWithoutAgencies.length}`);
      usersWithoutAgencies.forEach(u => {
        console.log(`   - ${u.email} (${u.role})`);
      });
    } else {
      console.log(`\n✅ All non-super-admin users have agencies`);
    }
    
    // Check for GA4/SC connections pointing to wrong dealerships
    console.log(`\n\n🔍 ISSUE 4: CONNECTION-DEALERSHIP MISMATCH CHECK`);
    console.log('===============================================');
    
    // Check if GA4/SC connections are properly linked to dealerships
    const connectionsWithMismatch = [];
    
    for (const conn of ga4Connections) {
      if (conn.dealershipId && conn.users.dealershipId !== conn.dealershipId) {
        connectionsWithMismatch.push({
          type: 'GA4',
          user: conn.users.email,
          connectionDealership: conn.dealershipId,
          userDealership: conn.users.dealershipId
        });
      }
    }
    
    for (const conn of scConnections) {
      if (conn.dealershipId && conn.users.dealershipId !== conn.dealershipId) {
        connectionsWithMismatch.push({
          type: 'Search Console',
          user: conn.users.email,
          connectionDealership: conn.dealershipId,
          userDealership: conn.users.dealershipId
        });
      }
    }
    
    if (connectionsWithMismatch.length > 0) {
      console.log(`\n⚠️  Connection-dealership mismatches found: ${connectionsWithMismatch.length}`);
      connectionsWithMismatch.forEach(m => {
        console.log(`   - ${m.type}: ${m.user}`);
        console.log(`     Connection dealership: ${m.connectionDealership}`);
        console.log(`     User dealership: ${m.userDealership}`);
      });
    } else {
      console.log(`\n✅ No connection-dealership mismatches found`);
    }
    
    // Summary and recommendations
    console.log(`\n\n📝 SUMMARY AND RECOMMENDATIONS`);
    console.log('==============================');
    
    console.log(`\n📊 Data Overview:`);
    console.log(`   - Total dealerships: ${totalDealerships}`);
    console.log(`   - Total agencies: ${agencies.length}`);
    console.log(`   - Total users: ${allUsers.length}`);
    console.log(`   - GA4 connections: ${ga4Connections.length}`);
    console.log(`   - Search Console connections: ${scConnections.length}`);
    
    console.log(`\n🎯 Likely Issues:`);
    
    // Check if specific user is super admin
    const superAdminUser = allUsers.find(u => u.id === '3e50bcc8-cd3e-4773-a790-e0570de37371');
    if (superAdminUser) {
      console.log(`   1. Super admin user found: ${superAdminUser.email}`);
      console.log(`      - This user should see all ${totalDealerships} dealerships`);
    }
    
    // Check agency distribution
    const dealershipDistribution = agencies.map(a => a.dealerships.length);
    const maxDealershipsPerAgency = Math.max(...dealershipDistribution);
    const agencyWithMostDealerships = agencies.find(a => a.dealerships.length === maxDealershipsPerAgency);
    
    console.log(`   2. Largest agency: ${agencyWithMostDealerships?.name} with ${maxDealershipsPerAgency} dealerships`);
    
    if (ga4Connections.length < 3) {
      console.log(`   3. ⚠️  Limited GA4 connections (${ga4Connections.length}) - this explains why only 2 show up`);
    }
    
    if (scConnections.length < 3) {
      console.log(`   4. ⚠️  Limited Search Console connections (${scConnections.length})`);
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeDealershipIssues().catch(console.error);
