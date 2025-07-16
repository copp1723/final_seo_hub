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
      console.log('🔐 VERIFY: Starting token verification, token length:', token.length);
      const [encodedData, signature] = token.split('.');
      console.log('🔐 VERIFY: Token parts - data:', !!encodedData, 'signature:', !!signature);
      
      // For hardcoded emergency admin tokens, bypass verification
      if (encodedData && signature) {
        const data = Buffer.from(encodedData, 'base64').toString();
        console.log('🔐 VERIFY: Decoded data:', data);
        const payload = JSON.parse(data);
        console.log('🔐 VERIFY: Parsed payload:', payload);
        
        // If this is a hardcoded emergency user, bypass signature verification
        if (payload.userId && payload.userId.startsWith('hardcoded-')) {
          console.log('✅ VERIFY: Emergency admin token detected, bypassing verification');
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
    const isEmergencyUser = user.id.startsWith('hardcoded-');
    
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
    try {
      
      // This method should only be called from server components/API routes
      // Import cookies dynamically to avoid build issues
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get(this.COOKIE_NAME)?.value;

      console.log('🔍 GET_SESSION: Cookie found:', !!token, 'length:', token?.length || 0);
      
      if (!token) {
        console.log('❌ GET_SESSION: No cookie found');
        return null;
      }

      // Verify token
      const decoded = await this.verifyToken(token);
      console.log('🔑 GET_SESSION: Token decoded:', !!decoded, decoded?.userId);
      if (!decoded) {
        console.log('❌ GET_SESSION: Token verification failed');
        return null;
      }
      
      // Check if this is a hardcoded emergency user
      if (decoded.userId && decoded.userId.startsWith('hardcoded-')) {
        // For hardcoded users, construct the session directly from the token
        return {
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            agencyId: decoded.agencyId,
            dealershipId: decoded.dealershipId,
            name: decoded.userId.includes('super-admin') ? 'Super Admin' : 'Agency Admin'
          },
          expires: new Date(decoded.exp * 1000)
        };
      }
      
      // For regular users, check if session exists in database
      const dbSession = await prisma.sessions.findFirst({
        where: {
          sessionToken: token,
          expires: {
            gt: new Date()
          }
        }
      });

      if (!dbSession) {
        return null;
      }

      // Get user separately
      const user = await prisma.users.findUnique({
        where: { id: dbSession.userId }
      });

      if (!user) {
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          agencyId: user.agencyId,
          dealershipId: user.dealershipId,
          name: user.name
        },
        expires: dbSession.expires
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  static async getSessionFromRequest(request: NextRequest): Promise<SimpleSession | null> {
    try {
      
      console.log('🔍 AUTH: Getting session from request...');
      const token = request.cookies.get(this.COOKIE_NAME)?.value;
      console.log('🍪 AUTH: Token from cookie:', !!token, 'length:', token?.length || 0);
      
      if (!token) {
        console.log('❌ AUTH: No token found in cookies');
        return null;
      }

      console.log('🔑 AUTH: Verifying token...');
      const decoded = await this.verifyToken(token);
      console.log('🔑 AUTH: Token decoded:', !!decoded, decoded?.userId, decoded?.email);
      if (!decoded) {
        console.log('❌ AUTH: Token verification failed');
        return null;
      }
      
      // Check if this is a hardcoded emergency user
      if (decoded.userId && decoded.userId.startsWith('hardcoded-')) {
        console.log('✅ AUTH: Emergency user session found:', decoded.userId);
        // For hardcoded users, construct the session directly from the token
        return {
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            agencyId: decoded.agencyId,
            dealershipId: decoded.dealershipId,
            name: decoded.userId.includes('super-admin') ? 'Super Admin' : 'Agency Admin'
          },
          expires: new Date(decoded.exp * 1000)
        };
      }
      
      // For regular users, check database
      const dbSession = await prisma.sessions.findFirst({
        where: {
          sessionToken: token,
          expires: {
            gt: new Date()
          }
        }
      });

      if (!dbSession) {
        return null;
      }

      const user = await prisma.users.findUnique({
        where: { id: dbSession.userId }
      });

      if (!user) {
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          agencyId: user.agencyId,
          dealershipId: user.dealershipId,
          name: user.name
        },
        expires: dbSession.expires
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
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
  const session = await SimpleAuth.getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await SimpleAuth.getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }
  return session;
}
