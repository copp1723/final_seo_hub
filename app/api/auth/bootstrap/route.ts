import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Bootstrap endpoint - creates super admin with invitation token
export async function GET(request: NextRequest) {
  try {
    const email = 'josh.copp@onekeel.ai';
    
    console.log('🚀 BOOTSTRAP: Starting super admin creation...');
    
    // Step 1: Create or update the user to be SUPER_ADMIN
    const user = await prisma.users.upsert({
      where: { email },
      update: { 
        role: 'SUPER_ADMIN',
        name: 'Josh Copp'
      },
      create: {
        id: crypto.randomUUID(),
        email,
        role: 'SUPER_ADMIN',
        name: 'Josh Copp',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ User created/updated:', user.email);
    
    // Step 2: Create a new invitation token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Step 3: Delete any existing invitations for this email
    await prisma.user_invites.deleteMany({
      where: { email }
    });
    
    // Step 4: Create new invitation
    const invitation = await prisma.user_invites.create({
      data: {
        id: crypto.randomUUID(),
        email,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        invitedBy: user.id, // Self-invited
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Return HTML page with login form pre-filled
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SEO Hub Bootstrap</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f3f4f6;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #111827;
            margin-bottom: 1rem;
        }
        .info {
            background: #dbeafe;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
        }
        .token {
            font-family: monospace;
            background: #f3f4f6;
            padding: 0.5rem;
            border-radius: 4px;
            word-break: break-all;
            margin: 0.5rem 0;
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        button:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Super Admin Bootstrap</h1>
        <div class="info">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Token:</strong></p>
            <div class="token">${token}</div>
            <p><strong>Expires:</strong> ${invitation.expiresAt.toISOString()}</p>
        </div>
        <form action="/auth/simple-signin" method="GET">
            <input type="hidden" id="email" value="${email}">
            <input type="hidden" id="token" value="${token}">
            <button type="button" onclick="copyAndGo()">Copy Credentials & Go to Login</button>
        </form>
        <script>
            function copyAndGo() {
                // Copy to clipboard
                const text = 'Email: ${email}\\nToken: ${token}';
                navigator.clipboard.writeText(text).then(() => {
                    alert('Credentials copied to clipboard!\\n\\nYou will now be redirected to the login page.');
                    window.location.href = '/auth/simple-signin';
                });
            }
        </script>
    </div>
</body>
</html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Bootstrap error:', error);
    return NextResponse.json(
      { error: 'Bootstrap failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}