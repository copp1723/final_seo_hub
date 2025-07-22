const { PrismaClient } = require('@prisma/client');

async function checkDealerships() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DEALERSHIP USAGE COUNTERS ===');
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        activePackageType: true,
        pagesUsedThisPeriod: true,
        blogsUsedThisPeriod: true,
        gbpPostsUsedThisPeriod: true,
        improvementsUsedThisPeriod: true,
        currentBillingPeriodStart: true,
        currentBillingPeriodEnd: true,
      },
      take: 5
    });

    dealerships.forEach(d => {
      console.log(`\nDealership: ${d.name}`);
      console.log(`  Package: ${d.activePackageType}`);
      console.log(`  Pages Used: ${d.pagesUsedThisPeriod}`);
      console.log(`  Blogs Used: ${d.blogsUsedThisPeriod}`);
      console.log(`  GBP Used: ${d.gbpPostsUsedThisPeriod}`);
      console.log(`  Improvements Used: ${d.improvementsUsedThisPeriod}`);
      console.log(`  Billing Period: ${d.currentBillingPeriodStart} - ${d.currentBillingPeriodEnd}`);
    });

    console.log('\n=== REQUEST COUNTS BY DEALERSHIP ===');
    const requestCounts = await prisma.requests.groupBy({
      by: ['dealershipId'],
      _count: {
        id: true
      }
    });

    for (const count of requestCounts) {
      const dealership = await prisma.dealerships.findUnique({
        where: { id: count.dealershipId },
        select: { name: true }
      });
      console.log(`Dealership ${dealership?.name}: ${count._count.id} requests`);
    }

    console.log('\n=== TOTAL COUNTS ===');
    const totalDealerships = await prisma.dealerships.count();
    const totalRequests = await prisma.requests.count();
    console.log(`Total Dealerships: ${totalDealerships}`);
    console.log(`Total Requests: ${totalRequests}`);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDealerships();