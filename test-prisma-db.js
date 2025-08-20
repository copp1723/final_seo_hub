const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkPrismaDatabase() {
  try {
    console.log('Checking Prisma database connection...\n');
    
    const result = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
    
    console.log('Prisma connection details:');
    console.log('Database:', result[0].current_database);
    console.log('Schema:', result[0].current_schema);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrismaDatabase();