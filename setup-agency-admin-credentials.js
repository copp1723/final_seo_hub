import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Generate a secure random password
function generateSecurePassword() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password (simple version - in production use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function setupAgencyAdminCredentials() {
  try {
    console.log('🔐 Setting up credentials for Agency Admin...\n');

    // Generate a secure password
    const password = generateSecurePassword();
    const hashedPassword = hashPassword(password);

    // Find the agency admin user
    const user = await prisma.users.findUnique({
      where: { email: 'access@seowerks.ai' },
      include: {
        agencies: true,
        dealerships: true,
      },
    });

    if (!user) {
      throw new Error('Agency admin user not found');
    }

    console.log('👤 User found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Agency: ${user.agencies?.name || 'None'}`);
    console.log(`  Dealership: ${user.dealerships?.name || 'None'}`);

    // Update user with password
    await prisma.users.update({
      where: { email: 'access@seowerks.ai' },
      data: {
        password: hashedPassword,
      },
    });

    console.log('\n✅ Credentials created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: access@seowerks.ai`);
    console.log(`Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('    The password cannot be recovered once this window is closed.');
    
    // Also create an emergency token for this user
    const emergencyToken = crypto.randomBytes(16).toString('hex');
    
    console.log('\n🚨 Emergency Access Token (as backup):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Token: ${emergencyToken}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Save emergency token
    await prisma.users.update({
      where: { email: 'access@seowerks.ai' },
      data: {
        emergencyToken: emergencyToken,
      },
    });

    console.log('\n🔑 Access Methods:');
    console.log('1. Password Login: https://rylie-seo-hub.onrender.com/auth/signin');
    console.log('2. Emergency Access: https://rylie-seo-hub.onrender.com/auth/emergency-access');
    console.log('3. Google OAuth: Sign in with Google (if configured for this email)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupAgencyAdminCredentials()
  .then(() => {
    console.log('\n✅ Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
