import { NextRequest } from 'next/server';

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

// Use NEXTAUTH_SECRET consistently for JWT operations
// Only access environment variables on server-side
const JWT_SECRET_STRING = typeof window === 'undefined'
  ? (process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production')
  : 'client-side-placeholder';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

// Only validate NEXTAUTH_SECRET on server-side in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && JWT_SECRET_STRING === 'your-secret-key-change-this-in-production') {
  console.error('NEXTAUTH_SECRET debug:', {
    exists: !!process.env.NEXTAUTH_SECRET,
    length: process.env.NEXTAUTH_SECRET?.length || 0,
    firstChars: process.env.NEXTAUTH_SECRET?.substring(0, 10) || 'undefined',
    isDefault: JWT_SECRET_STRING === 'your-secret-key-change-this-in-production'
  });
  throw new Error('FATAL: NEXTAUTH_SECRET environment variable must be set to a strong, unique value in production.');
}

export class SimpleAuth {
  public static readonly COOKIE_NAME = 'seo-hub-session';
  private static readonly JWT_SECRET = JWT_SECRET_STRING;

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

      // Always attempt to decode payload if we at least have encoded data
      let payload: any = null;
      if (encodedData) {
        try {
          const data = Buffer.from(encodedData, 'base64').toString();
          payload = JSON.parse(data);
        } catch (_) {
          // ignore JSON parse errors – will fall through to null return below
        }
      }


      if (encodedData && signature) {
        // For regular tokens, verify signature
        const encoder = new TextEncoder();
        const secretKey = encoder.encode(this.JWT_SECRET);
        const data = Buffer.from(encodedData, 'base64').toString();
        
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

    // Skip database session for edge runtime compatibility
    // Sessions will be handled in API routes instead

    return token;
  }

  static async getSession(): Promise<SimpleSession | null> {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get(this.COOKIE_NAME)?.value;
      
      if (!token) {
        return null;
      }
      
      const payload = await this.verifyToken(token);
      if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          agencyId: payload.agencyId,
          dealershipId: payload.dealershipId,
          name: payload.name
        },
        expires: new Date(payload.exp * 1000)
      };
    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  }

  static async getSessionFromRequest(request: NextRequest): Promise<SimpleSession | null> {
    try {
      let token: string | undefined;

      // Enhanced logging for debugging
      console.log('[AUTH DEBUG] Starting session extraction from request');
      console.log('[AUTH DEBUG] Request URL:', request.url);
      console.log('[AUTH DEBUG] Looking for cookie:', this.COOKIE_NAME);

      // Try multiple ways to get the cookie in production
      try {
        // Method 1: Direct cookie access
        if (request.cookies && typeof request.cookies.get === 'function') {
          token = request.cookies.get(this.COOKIE_NAME)?.value;
          console.log('[AUTH DEBUG] Method 1 - Direct cookie access:', token ? 'found' : 'not found');
        }
      } catch (e) {
        console.log('[AUTH DEBUG] Method 1 failed, trying alternative cookie access:', e);
      }

      // Method 2: Parse from Cookie header if direct access fails
      if (!token) {
        try {
          const cookieHeader = request.headers.get('cookie');
          console.log('[AUTH DEBUG] Cookie header:', cookieHeader ? 'present' : 'missing');
          console.log('[AUTH DEBUG] Cookie header content:', cookieHeader);
          if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              if (key && value) {
                acc[key] = decodeURIComponent(value);
              }
              return acc;
            }, {} as Record<string, string>);
            console.log('[AUTH DEBUG] Parsed cookies:', Object.keys(cookies));
            console.log('[AUTH DEBUG] Looking for cookie:', this.COOKIE_NAME);
            token = cookies[this.COOKIE_NAME];
            if (token) {
              console.log('[AUTH DEBUG] Found token via header parsing');
            } else {
              console.log('[AUTH DEBUG] Token not found in parsed cookies');
            }
          }
        } catch (e) {
          console.log('[AUTH DEBUG] Method 2 failed, no valid session token found', e);
        }
      }

      if (!token) {
        console.log('[AUTH DEBUG] No token found, returning null');
        return null;
      }
      
      console.log('[AUTH DEBUG] Token found, attempting verification');
      const payload = await this.verifyToken(token);
      
      if (!payload) {
        console.log('[AUTH DEBUG] Token verification failed - invalid token');
        return null;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        console.log('[AUTH DEBUG] Token expired', {
          expiry: new Date(payload.exp * 1000).toISOString(),
          current: new Date(currentTime * 1000).toISOString()
        });
        return null;
      }
      
      console.log('[AUTH DEBUG] Token verification successful', {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        expires: new Date(payload.exp * 1000).toISOString()
      });
      
      return {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          agencyId: payload.agencyId,
          dealershipId: payload.dealershipId,
          name: payload.name
        },
        expires: new Date(payload.exp * 1000)
      };
    } catch (error) {
      console.error('[AUTH DEBUG] Session retrieval error:', error);
      return null;
    }
  }

  static async deleteSession(): Promise<void> {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      
      // Just delete the cookie, skip database operations for edge runtime
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
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await SimpleAuth.getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}