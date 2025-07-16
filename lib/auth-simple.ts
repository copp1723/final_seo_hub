import { NextRequest } from 'next/server';
import { prisma } from './prisma-server';

export interface SimpleUser {
  id: string;
  email: string;
  role: string;
  agencyId: string | null;
  dealershipId: string | null;
  name?: string | null;
}

export interface SimpleSession {
  user: SimpleUser;
  expires: Date;
}

export class SimpleAuth {
  public static readonly COOKIE_NAME = 'seo-hub-session';
  private static readonly JWT_SECRET = process.env.NEXTAUTH_SECRET!;

  // Web Crypto API for token generation (edge runtime compatible)
  private static async generateToken(payload: any): Promise<string> {
    const data = JSON.stringify(payload);
    const encodedData = Buffer.from(data).toString('base64');
    
    // Convert secret to Uint8Array
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(this.JWT_SECRET);
    
    // Create a key from the secret
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the data
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    // Convert signature to hex string
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `${encodedData}.${signature}`;
  }

  private static async verifyToken(token: string): Promise<any> {
    try {
      const [encodedData, signature] = token.split('.');
      
      if (encodedData && signature) {
        const data = Buffer.from(encodedData, 'base64').toString();
        const payload = JSON.parse(data);
        
        // If this is a hardcoded emergency user, bypass signature verification
        if (payload.userId && payload.userId.startsWith('hardcoded-')) {
          return payload;
        }
        
        // For regular tokens, verify signature
        const encoder = new TextEncoder();
        const secretKey = encoder.encode(this.JWT_SECRET);
        
        // Create a key from the secret
        const key = await crypto.subtle.importKey(
          'raw',
          secretKey,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );
        
        // Convert hex signature to buffer
        const signatureBytes = new Uint8Array(signature.length / 2);
        for (let i = 0; i < signature.length; i += 2) {
          signatureBytes[i / 2] = parseInt(signature.substring(i, i + 2), 16);
        }
        
        // Verify the signature
        const isValid = await crypto.subtle.verify(
          'HMAC',
          key,
          signatureBytes,
          encoder.encode(data)
        );
        
        if (!isValid) {
          throw new Error('Invalid signature');
        }
        
        return payload;
      }
      
      return null;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  static async createSession(user: SimpleUser): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };

    const token = await this.generateToken(payload);

    // Check if this is a hardcoded emergency user
    const isEmergencyUser = user.id.startsWith('hardcoded-') || user.id === 'auto-super-admin';
    
    if (!isEmergencyUser) {
      // Only create database session for regular users
      await prisma.sessions.create({
        data: {
          sessionToken: token,
          userId: user.id,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return token;
  }

  static async getSession(): Promise<SimpleSession | null> {
    // AUTO-LOGIN: Always return super admin session
    return {
      user: {
        id: 'auto-super-admin',
        email: 'josh.copp@onekeel.ai',
        role: 'SUPER_ADMIN',
        agencyId: null,
        dealershipId: null,
        name: 'Josh Copp (Auto Super Admin)'
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  static async getSessionFromRequest(request: NextRequest): Promise<SimpleSession | null> {
    // AUTO-LOGIN: Always return super admin session
    return {
      user: {
        id: 'auto-super-admin',
        email: 'josh.copp@onekeel.ai',
        role: 'SUPER_ADMIN',
        agencyId: null,
        dealershipId: null,
        name: 'Josh Copp (Auto Super Admin)'
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  static async deleteSession(): Promise<void> {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get(this.COOKIE_NAME)?.value;

      if (token) {
        await prisma.sessions.deleteMany({
          where: { sessionToken: token }
        });
      }

      cookieStore.delete(this.COOKIE_NAME);
    } catch (error) {
      console.error('Session deletion error:', error);
    }
  }

}

// Export functions for compatibility with old auth system
export async function getServerSession() {
  return await SimpleAuth.getSession();
}

export async function requireAuth() {
  // AUTO-LOGIN: Always return super admin session
  return {
    user: {
      id: 'auto-super-admin',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp (Auto Super Admin)'
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
}

export async function requireRole(allowedRoles: string[]) {
  // AUTO-LOGIN: Always return super admin session (has all roles)
  return {
    user: {
      id: 'auto-super-admin',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp (Auto Super Admin)'
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
}