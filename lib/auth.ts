import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
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

// Debug logging for production
console.log('[AUTH DEBUG] Creating NextAuth with Prisma client:', !!authPrisma)
console.log('[AUTH DEBUG] Prisma client has findUnique:', !!authPrisma?.users?.findUnique)

// Test connection immediately
authPrisma.$connect().then(() => {
  console.log('[AUTH DEBUG] Prisma client connected successfully')
}).catch((error) => {
  console.error('[AUTH DEBUG] Prisma client connection failed:', error)
})

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      console.log('SignIn callback triggered:', {
        user: user.email,
        account: account?.provider,
        profile: profile?.email
      })
      try {
        // Only allow users who have been invited (exist in our database)
        if (!user.email) {
          console.log('SignIn denied: No email provided')
          return false
        }

        // Check if user exists in our database (has been invited)
        const existingUser = await authPrisma.users.findUnique({
          where: { email: user.email }
        })

        if (!existingUser) {
          console.log('SignIn denied: users not invited', { email: user.email })
          return false
        }

        console.log('SignIn allowed: users found in database', {
          email: user.email,
          userId: existingUser.id,
          role: existingUser.role
        })
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        return false
      }
    },
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
