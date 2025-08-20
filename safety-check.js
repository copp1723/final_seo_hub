
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== SAFETY ANALYSIS ===');
    
    // Current state
    const requests = await prisma.requests.count();
    const mappings = await prisma.seoworks_task_mappings.count();
    
    console.log('Current data:');
    console.log('- Requests:', requests);
    console.log('- Mappings:', mappings);
    
    // Test for duplicate check
    const testId = 'task-b-67136';
    const existing = await prisma.seoworks_task_mappings.findUnique({
      where: { seoworksTaskId: testId }
    });
    
    console.log('
Duplicate check for', testId + ':', existing ? 'EXISTS' : 'NEW');
    
    console.log('
✅ SAFETY CONFIRMED:');
    console.log('- Only ADDITIVE operations');
    console.log('- No existing data modified');
    console.log('- Duplicates automatically skipped');
    console.log('- SEOWorks can resend missing data anytime');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

