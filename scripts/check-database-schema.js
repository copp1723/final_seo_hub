const { PrismaClient } = require('@prisma/client');

async function checkDatabaseSchema() {
  const prisma = new PrismaClient();
  
  try {
    // Check User table columns
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('User table columns:');
    console.log(JSON.stringify(userColumns, null, 2));
    
    // Check if dealershipId exists
    const hasDealershipId = userColumns.some(col => col.column_name === 'dealershipId');
    console.log(`\nDoes User table have dealershipId column? ${hasDealershipId}`);
    
    // Try a simple query
    console.log('\nTesting simple User query...');
    try {
      const userCount = await prisma.user.count();
      console.log(`User count: ${userCount}`);
    } catch (error) {
      console.error('Error querying users:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema(); 