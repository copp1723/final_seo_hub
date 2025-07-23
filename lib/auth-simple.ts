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

// JWT Secret handling - deferred to avoid build-time issues
let JWT_SECRET_STRING: string | null = null;

const getJwtSecret = () => {
  // Return cached value if already initialized
  if (JWT_SECRET_STRING) return JWT_SECRET_STRING;
  
  // Get secret from environment
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  
  // In production, use the secret or a generated fallback
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      // Generate a consistent secret based on deployment
      // This is not ideal but prevents crashes
      JWT_SECRET_STRING = 'prod-fallback-' + (process.env.RENDER_SERVICE_NAME || 'default');
      console.warn('WARNING: Using fallback JWT secret. Set NEXTAUTH_SECRET for security.');
    } else {
      JWT_SECRET_STRING = secret;
    }
  } else {
    // In development, use secret or default
    JWT_SECRET_STRING = secret || 'demo-secret-key-not-for-production-use';
  }
  
  return JWT_SECRET_STRING;
};

export class SimpleAuth {
  public static readonly COOKIE_NAME = 'seo-hub-session';
  
  // Lazy getter for JWT secret
  private static get JWT_SECRET() {
    return getJwtSecret();
  }

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
      const token = request.cookies.get(this.COOKIE_NAME)?.value;
      
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