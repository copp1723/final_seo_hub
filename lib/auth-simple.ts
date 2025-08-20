import { NextRequest } from 'next/server';

export interface SimpleUser {
  id: string;
  email: string;
  role: string;
  agencyId: string | null;
  dealershipId: string | null;  // Kept for backwards compatibility
  currentDealershipId: string | null;  // Current active dealership
  name?: string | null;
}

export interface DealershipAccess {
  dealershipId: string;
  dealershipName: string;
  accessLevel: 'READ' | 'WRITE' | 'ADMIN';
  agencyId: string;
  agencyName: string;
}

export interface EnhancedSimpleSession {
  user: SimpleUser;
  dealershipAccess: {
    current: string | null;
    available: DealershipAccess[];
  };
  expires: Date;
  sessionId?: string;
}

export interface SimpleSession {
  user: SimpleUser;
  expires: Date;
  sessionId?: string;
}

export interface SessionRevocationEvent {
  userId: string;
  sessionId?: string; // If undefined, revoke all sessions for the user
  reason: string;
  timestamp: Date;
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
  public static async generateToken(payload: any): Promise<string> {
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
    const sessionId = crypto.randomUUID(); // Generate unique session ID for revocation support
    const payload = {
      sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,  // Keep for backwards compatibility
      currentDealershipId: user.currentDealershipId,  // New multi-dealership field
      name: user.name ?? null,
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
          dealershipId: payload.dealershipId,  // Keep for backwards compatibility
          currentDealershipId: payload.currentDealershipId,  // New multi-dealership field
          name: payload.name
        },
        expires: new Date(payload.exp * 1000),
        sessionId: payload.sessionId
      };
    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  }

  static async getSessionFromRequest(request: NextRequest): Promise<SimpleSession | null> {
    try {
      let token: string | undefined;

      // Enhanced logging for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH DEBUG] Starting session extraction from request');
        console.log('[AUTH DEBUG] Request URL:', request.url);
        console.log('[AUTH DEBUG] Looking for cookie:', this.COOKIE_NAME);
      }

      // Try multiple ways to get the cookie in production
      try {
        // Method 1: Direct cookie access
        if (request.cookies && typeof request.cookies.get === 'function') {
          token = request.cookies.get(this.COOKIE_NAME)?.value;
          if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] Method 1 - Direct cookie access:', token ? 'found' : 'not found');
        }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] Method 1 failed, trying alternative cookie access:', e);
        }
      }

      // Method 2: Parse from Cookie header if direct access fails
      if (!token) {
        try {
          const cookieHeader = request.headers.get('cookie');
          if (process.env.NODE_ENV === 'development') {
            console.log('[AUTH DEBUG] Cookie header:', cookieHeader ? 'present' : 'missing');
            console.log('[AUTH DEBUG] Cookie header content:', cookieHeader);
          }
          if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              if (key && value) {
                acc[key] = decodeURIComponent(value);
              }
              return acc;
            }, {} as Record<string, string>);
            if (process.env.NODE_ENV === 'development') {
              console.log('[AUTH DEBUG] Parsed cookies:', Object.keys(cookies));
              console.log('[AUTH DEBUG] Looking for cookie:', this.COOKIE_NAME);
            }
            token = cookies[this.COOKIE_NAME];
            if (process.env.NODE_ENV === 'development') {
              if (token) {
                console.log('[AUTH DEBUG] Found token via header parsing');
              } else {
                console.log('[AUTH DEBUG] Token not found in parsed cookies');
              }
            }
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] Method 2 failed, no valid session token found', e);
        }
        }
      }

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] No token found, returning null');
        }
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH DEBUG] Token found, attempting verification');
      }
      const payload = await this.verifyToken(token);
      
      if (!payload) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] Token verification failed - invalid token');
        }
        return null;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH DEBUG] Token expired', {
            expiry: new Date(payload.exp * 1000).toISOString(),
            current: new Date(currentTime * 1000).toISOString()
          });
        }
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH DEBUG] Token verification successful', {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          expires: new Date(payload.exp * 1000).toISOString()
        });
      }
      
      return {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          agencyId: payload.agencyId,
          dealershipId: payload.dealershipId,  // Keep for backwards compatibility
          currentDealershipId: payload.currentDealershipId,  // New multi-dealership field
          name: payload.name
        },
        expires: new Date(payload.exp * 1000),
        sessionId: payload.sessionId
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

  // Multi-dealership access methods
  static async getEnhancedSession(request?: NextRequest): Promise<EnhancedSimpleSession | null> {
    try {
      const session = request 
        ? await this.getSessionFromRequest(request)
        : await this.getSession();
      
      if (!session) {
        return null;
      }

      // Fetch user's dealership access from database
      const { prisma } = await import('@/lib/prisma');
      const dealershipAccess = await prisma.user_dealership_access.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          dealerships: {
            include: {
              agencies: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { grantedAt: 'desc' }
      });

      const availableAccess: DealershipAccess[] = dealershipAccess.map(access => ({
        dealershipId: access.dealershipId,
        dealershipName: access.dealerships.name,
        accessLevel: access.accessLevel as 'READ' | 'WRITE' | 'ADMIN',
        agencyId: access.dealerships.agencyId,
        agencyName: access.dealerships.agencies.name
      }));

      return {
        user: session.user,
        dealershipAccess: {
          current: session.user.currentDealershipId,
          available: availableAccess
        },
        expires: session.expires,
        sessionId: session.sessionId
      };
    } catch (error) {
      console.error('Enhanced session retrieval error:', error);
      return null;
    }
  }

  static async switchDealership(userId: string, newDealershipId: string): Promise<boolean> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      // Verify user has access to the dealership
      const access = await prisma.user_dealership_access.findFirst({
        where: {
          userId,
          dealershipId: newDealershipId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (!access) {
        return false;
      }

      // Update user's current dealership
      await prisma.users.update({
        where: { id: userId },
        data: { currentDealershipId: newDealershipId }
      });

      return true;
    } catch (error) {
      console.error('Dealership switch error:', error);
      return false;
    }
  }

  static async getUserDealershipAccess(userId: string, dealershipId: string): Promise<'READ' | 'WRITE' | 'ADMIN' | null> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      const access = await prisma.user_dealership_access.findFirst({
        where: {
          userId,
          dealershipId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: { accessLevel: true }
      });

      return access ? (access.accessLevel as 'READ' | 'WRITE' | 'ADMIN') : null;
    } catch (error) {
      console.error('Access level check error:', error);
      return null;
    }
  }

}

// Optional Session Revocation System
// Configurable via environment variable SESSION_REVOCATION_ENABLED
class SessionRevocation {
  private static revokedSessions: Set<string> = new Set()
  private static revokedUsers: Set<string> = new Set()
  private static revocationEvents: SessionRevocationEvent[] = []
  private static readonly MAX_REVOCATION_EVENTS = 1000 // Prevent memory buildup
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
  private static lastCleanup = Date.now()

  static isEnabled(): boolean {
    return typeof window === 'undefined' && 
           (process.env.SESSION_REVOCATION_ENABLED === 'true' || 
            process.env.NODE_ENV === 'development')
  }

  static revokeSession(sessionId: string, userId: string, reason: string): void {
    if (!this.isEnabled()) return

    this.revokedSessions.add(sessionId)
    this.addRevocationEvent({ userId, sessionId, reason, timestamp: new Date() })
    
    console.info(`[SESSION REVOCATION] Session ${sessionId} revoked for user ${userId}: ${reason}`)
  }

  static revokeAllUserSessions(userId: string, reason: string): void {
    if (!this.isEnabled()) return

    this.revokedUsers.add(userId)
    this.addRevocationEvent({ userId, reason, timestamp: new Date() })
    
    console.info(`[SESSION REVOCATION] All sessions revoked for user ${userId}: ${reason}`)
  }

  static isSessionRevoked(sessionId: string | undefined, userId: string): boolean {
    if (!this.isEnabled()) return false

    this.performPeriodicCleanup()
    
    // Check if all user sessions are revoked
    if (this.revokedUsers.has(userId)) {
      return true
    }
    
    // Check if specific session is revoked
    if (sessionId && this.revokedSessions.has(sessionId)) {
      return true
    }
    
    return false
  }

  private static addRevocationEvent(event: SessionRevocationEvent): void {
    this.revocationEvents.push(event)
    
    // Prevent memory buildup by removing old events
    if (this.revocationEvents.length > this.MAX_REVOCATION_EVENTS) {
      this.revocationEvents = this.revocationEvents.slice(-this.MAX_REVOCATION_EVENTS / 2)
    }
  }

  private static performPeriodicCleanup(): void {
    const now = Date.now()
    
    // Only perform cleanup once per hour to avoid performance impact
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) {
      return
    }
    
    try {
      // Clean up events older than 24 hours
      const cutoffTime = new Date(now - 24 * 60 * 60 * 1000)
      this.revocationEvents = this.revocationEvents.filter(event => event.timestamp > cutoffTime)
      
      this.lastCleanup = now
      
      if (this.revocationEvents.length > 0) {
        console.info(`[SESSION REVOCATION] Cleanup completed. Active revocation events: ${this.revocationEvents.length}`)
      }
    } catch (error) {
      console.error('[SESSION REVOCATION] Error during cleanup:', error)
    }
  }

  // Admin function to get revocation history (for debugging)
  static getRevocationHistory(userId?: string): SessionRevocationEvent[] {
    if (!this.isEnabled()) return []
    
    if (userId) {
      return this.revocationEvents.filter(event => event.userId === userId)
    }
    
    return [...this.revocationEvents]
  }

  // Admin function to clear revocations (use with caution)
  static clearRevocations(userId?: string): void {
    if (!this.isEnabled()) return

    if (userId) {
      this.revokedUsers.delete(userId)
      this.revocationEvents = this.revocationEvents.filter(event => event.userId !== userId)
      
      // Remove specific sessions for the user (harder without direct mapping)
      console.info(`[SESSION REVOCATION] Cleared revocations for user ${userId}`)
    } else {
      this.revokedSessions.clear()
      this.revokedUsers.clear()
      this.revocationEvents = []
      
      console.info('[SESSION REVOCATION] All revocations cleared')
    }
  }
}

// Enhanced SimpleAuth with optional session revocation
export class SimpleAuthWithRevocation extends SimpleAuth {
  static async createSession(user: SimpleUser): Promise<string> {
    const sessionId = crypto.randomUUID(); // Generate unique session ID
    const payload = {
      sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      dealershipId: user.dealershipId,
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };

    const token = await this.generateToken(payload);
    return token;
  }

  static async getSessionFromRequest(request: NextRequest): Promise<SimpleSession | null> {
    const session = await super.getSessionFromRequest(request)
    
    if (!session) return null
    
    // Check if session is revoked (only if revocation is enabled)
    if (SessionRevocation.isSessionRevoked(session.sessionId, session.user.id)) {
      console.info(`[AUTH] Session access denied - revoked session for user ${session.user.id}`)
      return null
    }
    
    return session
  }

  static async getSession(): Promise<SimpleSession | null> {
    const session = await super.getSession()
    
    if (!session) return null
    
    // Check if session is revoked (only if revocation is enabled)
    if (SessionRevocation.isSessionRevoked(session.sessionId, session.user.id)) {
      console.info(`[AUTH] Session access denied - revoked session for user ${session.user.id}`)
      return null
    }
    
    return session
  }

  // Session revocation methods
  static revokeSession(sessionId: string, userId: string, reason: string): void {
    SessionRevocation.revokeSession(sessionId, userId, reason)
  }

  static revokeAllUserSessions(userId: string, reason: string): void {
    SessionRevocation.revokeAllUserSessions(userId, reason)
  }

  static getRevocationHistory(userId?: string): SessionRevocationEvent[] {
    return SessionRevocation.getRevocationHistory(userId)
  }

  static clearRevocations(userId?: string): void {
    SessionRevocation.clearRevocations(userId)
  }

  static isRevocationEnabled(): boolean {
    return SessionRevocation.isEnabled()
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