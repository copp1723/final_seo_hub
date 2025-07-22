import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function diagnoseDeployment() {
  console.log('🔍 DEPLOYMENT DIAGNOSTICS\n');

  // Check environment
  console.log('📋 Environment Check:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  App URL: ${process.env.NEXTAUTH_URL}`);
  console.log(`  Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NextAuth Secret: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Google OAuth: ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? '✅ Configured' : '❌ Missing'}`);
  console.log('');

  try {
    // Test database connection
    console.log('🗄️ Database Connection:');
    await prisma.$connect();
    console.log('  ✅ Connected successfully');

    // Check users
    const users = await prisma.users.findMany({
      select: {
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        onboardingCompleted: true,
      },
    });
    console.log(`\n👥 Users (${users.length} total):`);
    users.forEach(user => {
      console.log(`  - ${user.email}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Agency: ${user.agencyId || 'None'}`);
      console.log(`    Dealership: ${user.dealershipId || 'None'}`);
      console.log(`    Onboarding: ${user.onboardingCompleted ? 'Complete' : 'Incomplete'}`);
    });

    // Check agencies
    const agencies = await prisma.agencies.findMany({
      include: {
        _count: {
          select: {
            users: true,
            dealerships: true,
          },
        },
      },
    });
    console.log(`\n🏢 Agencies (${agencies.length} total):`);
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.slug})`);
      console.log(`    Users: ${agency._count.users}`);
      console.log(`    Dealerships: ${agency._count.dealerships}`);
      console.log(`    Status: ${agency.status}`);
    });

    // Check dealerships
    const dealerships = await prisma.dealerships.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
    console.log(`\n🚗 Dealerships (${dealerships.length} total):`);
    dealerships.forEach(dealership => {
      console.log(`  - ${dealership.name}`);
      console.log(`    Users: ${dealership._count.users}`);
      console.log(`    Agency: ${dealership.agencyId}`);
    });

    // Check sessions
    const sessions = await prisma.sessions.count();
    console.log(`\n🔐 Active Sessions: ${sessions}`);

    // Check recent activity
    const recentRequests = await prisma.requests.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });
    console.log(`\n📊 Recent Requests (${recentRequests.length}):`);
    recentRequests.forEach(req => {
      console.log(`  - ${req.title} (${req.status}) - ${req.createdAt.toISOString()}`);
    });

    // Check for common issues
    console.log('\n⚠️ Potential Issues:');
    
    // Check for users without agency/dealership
    const orphanedUsers = users.filter(u => !u.agencyId && !u.dealershipId && u.role !== 'SUPER_ADMIN');
    if (orphanedUsers.length > 0) {
      console.log(`  ❗ ${orphanedUsers.length} users without agency/dealership assignment`);
      orphanedUsers.forEach(u => console.log(`     - ${u.email}`));
    }

    // Check for incomplete onboarding
    const incompleteOnboarding = users.filter(u => !u.onboardingCompleted);
    if (incompleteOnboarding.length > 0) {
      console.log(`  ❗ ${incompleteOnboarding.length} users with incomplete onboarding`);
      incompleteOnboarding.forEach(u => console.log(`     - ${u.email}`));
    }

    // Test specific user login capability
    console.log('\n🔑 Login Test URLs:');
    console.log(`  Super Admin: ${process.env.NEXTAUTH_URL}/auth/signin`);
    console.log(`  Emergency Access: ${process.env.NEXTAUTH_URL}/auth/emergency-access`);

  } catch (error) {
    console.error('\n❌ Diagnostic Error:', error.message);
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation detected');
    } else if (error.code === 'P2025') {
      console.error('   Record not found');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostics
diagnoseDeployment()
  .then(() => {
    console.log('\n✅ Diagnostics complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
