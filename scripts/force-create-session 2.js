// FORCE CREATE A SESSION - This will get you in NOW
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function forceCreateSession() {
  try {
    const email = 'josh.copp@onekeel.ai';
    
    console.log('🚀 FORCE CREATING SESSION...\n');
    
    // Step 1: Create or update user to be SUPER_ADMIN
    const user = await prisma.users.upsert({
      where: { email },
      update: { role: 'SUPER_ADMIN' },
      create: {
        id: crypto.randomUUID(),
        email,
        role: 'SUPER_ADMIN',
        name: 'Josh Copp',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ User created/updated:', user.email, user.role);
    
    // Step 2: Create a session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Step 3: Create session in database
    await prisma.sessions.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
    
    console.log('\n🎯 SESSION CREATED SUCCESSFULLY!\n');
    console.log('📧 Email:', email);
    console.log('🔑 Session Token:', sessionToken);
    console.log('\n⚡ MANUAL STEPS TO LOGIN:');
    console.log('1. Open browser developer tools (F12)');
    console.log('2. Go to Application/Storage → Cookies');
    console.log('3. Create a new cookie:');
    console.log('   Name: seo-hub-session');
    console.log('   Value:', sessionToken);
    console.log('   Domain: rylie-seo-hub.onrender.com');
    console.log('   Path: /');
    console.log('4. Navigate to https://rylie-seo-hub.onrender.com/dashboard');
    console.log('\nYou should be logged in as SUPER_ADMIN! 🚀');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceCreateSession();