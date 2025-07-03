import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
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
    }),
  ],
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      console.log('SignIn callback triggered:', { 
        user: user.email, 
        account: account?.provider, 
        profile: profile?.email 
      })
      try {
        // Auto-assign user to agency based on email domain
        if (user.email) {
          const emailDomain = user.email.split('@')[1].toLowerCase()
          
          // Check if there's an agency with matching domain
          const agency = await prisma.agency.findUnique({
            where: { domain: emailDomain }
          })
          
          if (agency) {
            // Check if user already exists in database
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email }
            })
            
            if (!existingUser) {
              // This is a new user, they'll be created by the adapter
              // We'll update them with the agency in the session callback
              console.log(`New user ${user.email} will be assigned to agency ${agency.name} based on domain ${emailDomain}`)
            }
          }
        }
        
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
        session.user.id = user.id
        // Ensure role is correctly typed and defaults to USER if not set
        const userRole = (user as any).role as UserRole | undefined;
        session.user.role = userRole || UserRole.USER;
        session.user.agencyId = (user as any).agencyId
        session.user.onboardingCompleted = (user as any).onboardingCompleted !== undefined ? (user as any).onboardingCompleted : false
        
        // Check if user needs agency assignment based on email domain
        const needsAgencyAssignment = 
          !session.user.agencyId && 
          user.email &&
          session.user.role === UserRole.USER; // Only auto-assign regular users
        
        if (needsAgencyAssignment) {
          const emailDomain = user.email!.split('@')[1].toLowerCase()
          const agency = await prisma.agency.findUnique({
            where: { domain: emailDomain }
          })
          
          if (agency) {
            // Update user with agency assignment
            await prisma.user.update({
              where: { id: user.id },
              data: { agencyId: agency.id }
            })
            session.user.agencyId = agency.id
            console.log(`User ${user.email} auto-assigned to agency ${agency.name} based on domain ${emailDomain}`)
          }
        }
        
        // Ensure user has required fields set in database
        // Check if any of the crucial fields are null, undefined, or not the correct type
        const needsUpdate =
          (user as any).role === null || (user as any).role === undefined ||
          !Object.values(UserRole).includes((user as any).role) || // Check if role is a valid UserRole
          (user as any).onboardingCompleted === null || (user as any).onboardingCompleted === undefined ||
          (user as any).pagesUsedThisPeriod === null || (user as any).pagesUsedThisPeriod === undefined ||
          (user as any).blogsUsedThisPeriod === null || (user as any).blogsUsedThisPeriod === undefined ||
          (user as any).gbpPostsUsedThisPeriod === null || (user as any).gbpPostsUsedThisPeriod === undefined ||
          (user as any).improvementsUsedThisPeriod === null || (user as any).improvementsUsedThisPeriod === undefined;

        if (needsUpdate) {
          // Update user with default values
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: Object.values(UserRole).includes((user as any).role) ? (user as any).role : UserRole.USER,
              onboardingCompleted: (user as any).onboardingCompleted ?? false,
              pagesUsedThisPeriod: (user as any).pagesUsedThisPeriod ?? 0,
              blogsUsedThisPeriod: (user as any).blogsUsedThisPeriod ?? 0,
              gbpPostsUsedThisPeriod: (user as any).gbpPostsUsedThisPeriod ?? 0,
              improvementsUsedThisPeriod: (user as any).improvementsUsedThisPeriod ?? 0,
            }
          })
          // Re-assign role to session after update if it was invalid
          if (!Object.values(UserRole).includes(userRole!)) {
            session.user.role = UserRole.USER;
          }
        }
      }
      return session
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
    error: '/auth/error',
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