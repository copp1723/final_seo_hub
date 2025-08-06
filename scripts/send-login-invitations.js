const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const prisma = new PrismaClient();

async function sendLoginInvitations() {
  console.log('📧 SENDING LOGIN INVITATIONS');
  console.log('============================\n');

  try {
    // Get all users who need invitations
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { invitationToken: null },
          { invitationTokenExpires: { lte: new Date() } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (users.length === 0) {
      console.log('✅ All users have active invitation tokens!');
      return;
    }

    console.log(`Found ${users.length} users who need login invitations:\n`);

    // Initialize Mailgun
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'noreply@mail.onerylie.com';
    const fromName = process.env.MAILGUN_FROM_NAME || 'SEO Hub';

    for (const user of users) {
      try {
        // Generate new invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        // Update user with new token
        await prisma.users.update({
          where: { id: user.id },
          data: {
            invitationToken: token,
            invitationTokenExpires: expiresAt,
            emailVerified: new Date() // Mark as verified since we're sending login link
          }
        });

        const loginUrl = `${baseUrl}/api/invitation?token=${token}`;

        // Send email
        const emailData = {
          from: `${fromName} <${fromEmail}>`,
          to: user.email,
          subject: 'Your SEO Hub Login Link',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to SEO Hub!</h1>
                </div>
                <div class="content">
                  <p>Hi ${user.name || 'there'},</p>
                  
                  <p>Your login link is ready! Click the button below to access your SEO Hub account:</p>
                  
                  <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Access SEO Hub</a>
                  </div>
                  
                  <p><strong>Your role:</strong> ${user.role}</p>
                  
                  <p style="color: #666; font-size: 14px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <code style="background: #f6f8fa; padding: 2px 5px; border-radius: 3px;">${loginUrl}</code>
                  </p>
                  
                  <div class="footer">
                    <p>This login link will expire in 30 days for security reasons.</p>
                    <p>If you didn't request this email, please ignore it.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `
            Welcome to SEO Hub!
            
            Hi ${user.name || 'there'},
            
            Your login link is ready! Click the link below to access your SEO Hub account:
            
            ${loginUrl}
            
            Your role: ${user.role}
            
            This login link will expire in 30 days for security reasons.
            If you didn't request this email, please ignore it.
          `
        };

        await mg.messages.create(process.env.MAILGUN_DOMAIN, emailData);
        
        console.log(`✅ Sent login invitation to ${user.email} (${user.role})`);
        console.log(`   Login URL: ${loginUrl}`);
        console.log(`   Expires: ${expiresAt.toISOString()}\n`);
      } catch (error) {
        console.error(`❌ Failed to send invitation to ${user.email}:`, error.message);
      }
    }

    console.log('✅ All invitations processed!');
  } catch (error) {
    console.error('❌ Error sending invitations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 LOGIN INVITATION SENDER');
  console.log('==========================\n');

  // Check Mailgun configuration
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error('❌ Mailgun configuration missing!');
    console.error('   Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.');
    process.exit(1);
  }

  await sendLoginInvitations();
}

main();