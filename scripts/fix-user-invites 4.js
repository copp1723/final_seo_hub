const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserInvites() {
  try {
    console.log('🔧 FIXING USER INVITES FOREIGN KEY CONSTRAINT');
    console.log('==============================================\n');

    // First, let's see what's in user_invites
    const allInvites = await prisma.user_invites.findMany({
      include: {
        agencies: true
      }
    });

    console.log('📧 CURRENT USER INVITES:');
    allInvites.forEach(invite => {
      console.log(`  - ID: ${invite.id}`);
      console.log(`    Email: ${invite.email}`);
      console.log(`    InvitedBy: ${invite.invitedBy}`);
      console.log(`    Agency: ${invite.agencies?.name || 'NOT FOUND'}`);
    });

    // Find the SEO Werks agency
    const seowerksAgency = await prisma.agencies.findFirst({
      where: { name: { contains: 'SEOWERKS', mode: 'insensitive' } }
    });

    if (!seowerksAgency) {
      console.log('❌ SEO Werks agency not found!');
      return;
    }

    console.log(`\n✅ Found SEO Werks agency: ${seowerksAgency.name} (${seowerksAgency.id})`);

    // Find all user invites that reference non-existent agencies
    const invalidInvites = await prisma.user_invites.findMany({
      where: {
        invitedBy: {
          not: seowerksAgency.id
        }
      }
    });

    console.log(`\n🔍 Found ${invalidInvites.length} invites with invalid agency references`);

    if (invalidInvites.length > 0) {
      // Delete the invalid invites instead of updating them
      await prisma.user_invites.deleteMany({
        where: {
          invitedBy: {
            not: seowerksAgency.id
          }
        }
      });

      console.log(`✅ Deleted ${invalidInvites.length} invalid user invites`);
    }

    // Now try to delete the old agency
    const oldAgencies = await prisma.agencies.findMany({
      where: {
        name: {
          not: { contains: 'SEOWERKS' }
        }
      }
    });

    console.log(`\n🗑️  Attempting to delete ${oldAgencies.length} old agencies...`);

    for (const agency of oldAgencies) {
      try {
        await prisma.agencies.delete({
          where: { id: agency.id }
        });
        console.log(`✅ Deleted agency: ${agency.name}`);
      } catch (error) {
        console.log(`❌ Could not delete ${agency.name}: ${error.message}`);
      }
    }

    console.log('\n🎯 USER INVITES FIX COMPLETE!');

  } catch (error) {
    console.error('❌ Error fixing user invites:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserInvites(); 