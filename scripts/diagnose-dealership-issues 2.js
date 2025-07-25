#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://rylie_seo_hub_staging_user:BuB3CD48q9LahbJJCm1WA3ySi7JZ12Ej@dpg-d1e44afdiees73bfh6ng-a/rylie_seo_hub_staging'
    }
  }
});

async function diagnoseDealershipIssues() {
  console.log('🔍 Starting dealership diagnostics...\n');

  try {
    // Check total counts
    console.log('📊 Database Overview:');
    const [dealershipCount, agencyCount, userCount] = await Promise.all([
      prisma.dealership.count(),
      prisma.agency.count(),
      prisma.user.count()
    ]);
    
    console.log(`- Total Dealerships: ${dealershipCount}`);
    console.log(`- Total Agencies: ${agencyCount}`);
    console.log(`- Total Users: ${userCount}\n`);

    // Check dealerships with their agencies
    console.log('🏢 Dealership Details:');
    const dealerships = await prisma.dealership.findMany({
      include: {
        agency: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    dealerships.forEach(d => {
      console.log(`- ${d.name} (ID: ${d.id})`);
      console.log(`  Agency: ${d.agency?.name || 'NO AGENCY'} (ID: ${d.agencyId || 'NULL'})`);
    });
    console.log();

    // Check users and their associations
    console.log('👥 User Details:');
    const users = await prisma.user.findMany({
      include: {
        agency: true,
        dealership: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    users.forEach(u => {
      console.log(`- ${u.email} (Role: ${u.role})`);
      console.log(`  Agency: ${u.agency?.name || 'NO AGENCY'} (ID: ${u.agencyId || 'NULL'})`);
      console.log(`  Dealership: ${u.dealership?.name || 'NO DEALERSHIP'} (ID: ${u.dealershipId || 'NULL'})`);
    });
    console.log();

    // Check for users without proper agency associations
    console.log('⚠️  Potential Issues:');
    
    const usersWithoutAgency = await prisma.user.findMany({
      where: {
        agencyId: null,
        role: { not: 'SUPER_ADMIN' }
      }
    });
    
    console.log(`- Users without agency: ${usersWithoutAgency.length}`);
    if (usersWithoutAgency.length > 0) {
      usersWithoutAgency.forEach(u => {
        console.log(`  - ${u.email} (${u.role})`);
      });
    }

    const dealershipsWithoutAgency = await prisma.dealership.findMany({
      where: { agencyId: null }
    });
    
    console.log(`- Dealerships without agency: ${dealershipsWithoutAgency.length}`);
    if (dealershipsWithoutAgency.length > 0) {
      dealershipsWithoutAgency.forEach(d => {
        console.log(`  - ${d.name}`);
      });
    }

    // Check agency-dealership relationships
    console.log('\n🔗 Agency-Dealership Relationships:');
    const agencies = await prisma.agency.findMany({
      include: {
        dealerships: true,
        users: true
      }
    });
    
    agencies.forEach(a => {
      console.log(`- ${a.name}: ${a.dealerships.length} dealerships, ${a.users.length} users`);
    });

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDealershipIssues();