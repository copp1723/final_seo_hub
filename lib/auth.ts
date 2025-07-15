import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

// Determine if we should use secure cookies based on NEXTAUTH_URL
const isProduction = process.env.NODE_ENV === 'production'
const nextAuthUrl = process.env.NEXTAUTH_URL || ''
const isSecureContext = nextAuthUrl.startsWith('https://')
const useSecureCookies = isProduction && isSecureContext
const cookiePrefix = useSecureCookies ? '__Secure-' : ''

// Log configuration for debugging
if (isProduction) {
  console.log('Auth Configuration:', {
    isProduction,
    nextAuthUrl,
    isSecureContext,
    useSecureCookies,
    cookiePrefix
  })
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
        const existingUser = await prisma.users.findUnique({
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
          // Update user with default values
          await prisma.users.update({
            where: { id: user.id },
            data: {
              role: Object.values(UserRole).includes((user as any).role) ? (user as any).role : UserRole.USER
            }
          });
          // Re-assign role to session after update if it was invalid
          if (!Object.values(UserRole).includes(userRole!)) {
            (session.user as any).role = UserRole.USER;
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
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies // Only secure in production
      }
    }
  }
})
