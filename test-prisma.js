const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testPrismaQueries() {
  try {
    console.log('Testing Prisma dealership queries...\n');
    
    // Test 1: Count total dealerships
    const count = await prisma.dealerships.count();
    console.log(`Total dealerships count: ${count}`);
    
    // Test 2: Get first few dealerships
    const dealerships = await prisma.dealerships.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        ga4PropertyId: true
      }
    });
    
    console.log('\nFirst 5 dealerships from Prisma:');
    dealerships.forEach(d => {
      console.log(`  ID: ${d.id}, Name: ${d.name}, GA4: ${d.ga4PropertyId}`);
    });
    
    // Test 3: Get first dealership
    const first = await prisma.dealerships.findFirst({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true
      }
    });
    
    console.log('\nFirst dealership:');
    console.log(`  ID: ${first?.id}, Name: ${first?.name}, GA4: ${first?.ga4PropertyId}`);
    
    // Test 4: Check specific ID that should exist
    const specific = await prisma.dealerships.findUnique({
      where: { id: 'deal1' },
      select: {
        id: true,
        name: true,
        ga4PropertyId: true
      }
    });
    
    console.log('\nSpecific dealership (deal1):');
    if (specific) {
      console.log(`  ID: ${specific.id}, Name: ${specific.name}, GA4: ${specific.ga4PropertyId}`);
    } else {
      console.log('  Not found!');
    }
    
  } catch (error) {
    console.error('Error testing Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaQueries();