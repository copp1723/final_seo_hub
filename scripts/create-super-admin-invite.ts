import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createSuperAdminInvite() {
  console.log('Searching for super admin user...');
  const adminEmail = 'josh.copp@onekeel.ai';

  const adminUser = await prisma.users.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.error(`Error: Super admin user with email '${adminEmail}' not found.`);
    console.error('Please run the `npm run db:setup-admins` script first to create the user.');
    return;
  }

  console.log(`Found user: ${adminUser.name} (${adminUser.id})`);

  // Generate a secure, single-use token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry

  console.log('Deleting any old invites for this user...');
  await prisma.user_invites.deleteMany({
    where: { email: adminEmail },
  });

  console.log('Creating new invitation...');
  const invitation = await prisma.user_invites.create({
    data: {
      id: crypto.randomUUID(),
      email: adminEmail,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      agencyId: adminUser.agencyId,
      invitedBy: adminUser.id,
      token,
      expiresAt,
      status: 'pending',
      updatedAt: new Date(),
    },
  });

  console.log('\n✅ Super Admin Invitation Generated Successfully!\n');
  console.log('----------------------------------------------------');
  console.log(`Email: ${invitation.email}`);
  console.log(`Role: ${invitation.role}`);
  console.log('Status: This is a one-time use token.');
  console.log('Expires: 24 hours');
  console.log('----------------------------------------------------');
  console.log('\n🔑 Your sign-in token is:\n');
  console.log(token);
  console.log('\n----------------------------------------------------\n');
  console.log('Go to the sign-in page, enter your email, and use this token to log in.');

}

createSuperAdminInvite()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });