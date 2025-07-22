import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixSuperAdminOnboarding() {
  try {
    console.log('🔧 Fixing Super Admin onboarding status...\n');

    // Update josh.copp@onekeel.ai onboarding status
    const updatedUser = await prisma.users.update({
      where: { email: 'josh.copp@onekeel.ai' },
      data: { onboardingCompleted: true },
      select: {
        email: true,
        role: true,
        onboardingCompleted: true,
      },
    });

    console.log('✅ Updated user:');
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Role: ${updatedUser.role}`);
    console.log(`  Onboarding: ${updatedUser.onboardingCompleted ? 'Complete' : 'Incomplete'}`);

    // Verify all super admins have completed onboarding
    const allSuperAdmins = await prisma.users.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        email: true,
        onboardingCompleted: true,
      },
    });

    console.log('\n📊 All Super Admins:');
    allSuperAdmins.forEach(admin => {
      console.log(`  - ${admin.email}: ${admin.onboardingCompleted ? '✅ Complete' : '❌ Incomplete'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdminOnboarding()
  .then(() => {
    console.log('\n✅ Onboarding fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
