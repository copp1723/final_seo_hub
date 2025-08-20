const { PrismaClient } = require('@prisma/client');

// Extract base URL without pooling parameters
const baseUrl = process.env.DATABASE_URL.split('?')[0];
console.log('Base URL (no pooling):', baseUrl.substring(0, 50) + '...');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: baseUrl  // Use base URL without pooling parameters
    }
  }
});

async function testRawConnection() {
  try {
    console.log('Testing raw connection without pooling parameters...\n');
    
    const rawResult = await prisma.$queryRaw`SELECT id, name, "ga4PropertyId" FROM dealerships ORDER BY id LIMIT 5`;
    
    console.log('Raw query results:');
    rawResult.forEach(d => {
      console.log(`  ID: ${d.id}, Name: ${d.name}, GA4: ${d.ga4PropertyId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRawConnection();