const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSuperAdmin() {
  try {
    console.log('👑 FIXING SUPER ADMIN USER');
    console.log('==========================\n');

    // Find the SEO Werks agency
    const seowerksAgency = await prisma.agencies.findFirst({
      where: { name: { contains: 'SEOWERKS' } }
    });

    if (!seowerksAgency) {
      console.log('❌ SEO Werks agency not found!');
      return;
    }

    console.log(`✅ Found SEO Werks agency: ${seowerksAgency.name} (${seowerksAgency.id})`);

    // Check if super admin exists
    const superAdmin = await prisma.users.findFirst({
      where: { 
        email: 'josh.copp@onekeel.ai',
        role: 'SUPER_ADMIN'
      }
    });

    if (superAdmin) {
      console.log('✅ Super admin user exists');
      
      // Update super admin to point to SEO Werks agency
      if (superAdmin.agencyId !== seowerksAgency.id) {
        await prisma.users.update({
          where: { id: superAdmin.id },
          data: { 
            agencyId: seowerksAgency.id,
            dealershipId: 'dealer-001' // Set to first dealership
          }
        });
        console.log('✅ Updated super admin agency and dealership');
      } else {
        console.log('✅ Super admin already has correct agency');
      }
    } else {
      console.log('❌ Super admin user not found, creating...');
      
      // Create super admin user
      await prisma.users.create({
        data: {
          id: '3e50bcc8-cd3e-4773-a790-e0570de37371',
          email: 'josh.copp@onekeel.ai',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          agencyId: seowerksAgency.id,
          dealershipId: 'dealer-001',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created super admin user');
    }

    // Verify final structure
    const finalUsers = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true
      }
    });

    console.log('\n👥 FINAL USER STRUCTURE:');
    finalUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
      console.log(`    Agency: ${user.agencyId}, Dealership: ${user.dealershipId}`);
    });

    console.log('\n🎯 SUPER ADMIN FIX COMPLETE!');

  } catch (error) {
    console.error('❌ Error fixing super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdmin(); 