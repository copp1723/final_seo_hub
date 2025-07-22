import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { UserRole } from '@prisma/client'

// Simplified cookie configuration
const isProduction = process.env.NODE_ENV === 'production'
const nextAuthUrl = process.env.NEXTAUTH_URL || ''
const useSecureCookies = nextAuthUrl.startsWith('https://')

// Create dedicated Prisma client for NextAuth to avoid module loading issues
const globalForAuth = globalThis as unknown as {
  authPrisma: PrismaClient | undefined
}

const authPrisma = globalForAuth.authPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') globalForAuth.authPrisma = authPrisma

// Simplified auth setup for invitation-only system

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(authPrisma),
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Only debug in development
  session: {
    strategy: 'database', // Explicitly use database sessions with PrismaAdapter
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    // Google OAuth removed - using invitation-only system
  ],
  callbacks: {
    // No signIn callback needed - invitation system handles authentication
    session: async ({ session, user }) => {
      // With database strategy, the user object is already populated from DB
      // Just map the fields to the session
      if (session.user && user) {
        session.user.id = user.id;
        // Ensure role is correctly typed and defaults to USER if not set
        const userRole = (user as any).role as UserRole | undefined;
        (session.user as any).role = userRole || UserRole.USER;
        (session.user as any).agencyId = (user as any).agencyId;
        (session.user as any).dealershipId = (user as any).dealershipId;
        
        // Ensure user has required fields set in database
        // Check if any of the crucial fields are null, undefined, or not the correct type
        const needsUpdate =
          (user as any).role === null || (user as any).role === undefined ||
          !Object.values(UserRole).includes((user as any).role); // Check if role is a valid UserRole

        if (needsUpdate) {
          try {
            // Update user with default values
            await authPrisma.users.update({
              where: { id: user.id },
              data: {
                role: Object.values(UserRole).includes((user as any).role) ? (user as any).role : UserRole.USER
              }
            });
            // Re-assign role to session after update if it was invalid
            if (!Object.values(UserRole).includes(userRole!)) {
              (session.user as any).role = UserRole.USER;
            }
          } catch (updateError) {
            console.error('Session callback database update failed:', updateError);
            // Continue with session creation even if update fails
            (session.user as any).role = userRole || UserRole.USER;
          }
        }
      }
      return session;
    },
    redirect: async ({ url, baseUrl }) => {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    }
  }
})
