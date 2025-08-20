const { PrismaClient } = require('@prisma/client');

// Test with direct connection - bypass the wrapper
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testDirectPrisma() {
  try {
    console.log('Testing direct Prisma connection...\n');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Use raw query to bypass any potential ORM issues
    const rawResult = await prisma.$queryRaw`SELECT id, name, "ga4PropertyId" FROM dealerships ORDER BY id LIMIT 5`;
    
    console.log('\nRaw Prisma query results:');
    rawResult.forEach(d => {
      console.log(`  ID: ${d.id}, Name: ${d.name}, GA4: ${d.ga4PropertyId}`);
    });
    
    // Now test the regular findMany
    const findManyResult = await prisma.dealerships.findMany({
      take: 5,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        ga4PropertyId: true
      }
    });
    
    console.log('\nPrisma findMany results:');
    findManyResult.forEach(d => {
      console.log(`  ID: ${d.id}, Name: ${d.name}, GA4: ${d.ga4PropertyId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectPrisma();