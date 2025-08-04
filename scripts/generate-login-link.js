const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function generateLoginLink(email) {
  try {
    console.log(`🔍 Generating login link for: ${email}`);
    
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found. Available users:');
      const users = await prisma.users.findMany({ 
        select: { email: true, role: true } 
      });
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      return;
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    const loginUrl = `${baseUrl}/api/invitation?token=${invitationToken}`;

    console.log('✅ Login link generated successfully!');
    console.log(`📧 User: ${user.email} (${user.role})`);
    console.log(`🔗 Login URL: ${loginUrl}`);
    console.log(`⏰ Expires: ${invitationTokenExpires.toLocaleString()}`);
    
    return loginUrl;
  } catch (error) {
    console.error('❌ Error generating login link:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/generate-login-link.js <email>');
  console.log('Example: node scripts/generate-login-link.js josh.copp@onekeel.ai');
  process.exit(1);
}

generateLoginLink(email); 