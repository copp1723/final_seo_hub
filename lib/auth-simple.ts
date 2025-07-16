import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

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
  private static readonly COOKIE_NAME = 'seo-hub-session';
  private static readonly JWT_SECRET = process.env.NEXTAUTH_SECRET!;

  // Simple crypto for token generation
  private static generateToken(payload: any): string {
    const crypto = require('crypto');
    const data = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.JWT_SECRET)
      .update(data)
      .digest('hex');
    
    const encodedData = Buffer.from(data).toString('base64');
    return `${encodedData}.${signature}`;
  }

  private static verifyToken(token: string): any {
    try {
      const crypto = require('crypto');
      const [encodedData, signature] = token.split('.');
      const data = Buffer.from(encodedData, 'base64').toString();
      
      const expectedSignature = crypto
        .createHmac('sha256', this.JWT_SECRET)
        .update(data)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }
      
      return JSON.parse(data);
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

    const token = this.generateToken(payload);

    // Create database session
    await prisma.sessions.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }

  static async getSession(): Promise<SimpleSession | null> {
    try {
      // This method should only be called from server components/API routes
      // Import cookies dynamically to avoid build issues
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get(this.COOKIE_NAME)?.value;

      if (!token) {
        return null;
      }

      // Verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }
      
      // Check if session exists in database
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
      const token = request.cookies.get(this.COOKIE_NAME)?.value;
      
      if (!token) {
        return null;
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }
      
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

  static async setSessionCookie(token: string): Promise<void> {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
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
