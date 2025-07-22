const { PrismaClient } = require('@prisma/client');

async function checkExisting() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  try {
    console.log('🔍 CHECKING EXISTING DEALERSHIPS');
    console.log('================================');
    
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
        website: true
      }
    });
    
    console.log(`Found ${dealerships.length} existing dealerships:`);
    dealerships.forEach(d => {
      console.log(`- ID: ${d.id}`);
      console.log(`  Name: ${d.name}`);
      console.log(`  Agency: ${d.agencyId}`);
      console.log(`  Website: ${d.website}`);
      console.log('');
    });
    
    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      }
    });
    
    console.log(`Found ${agencies.length} existing agencies:`);
    agencies.forEach(a => {
      console.log(`- ID: ${a.id}, Name: ${a.name}, Slug: ${a.slug}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExisting();
