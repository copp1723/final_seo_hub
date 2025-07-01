import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, account, trigger }) => {
      try {
        // On initial sign in or when user data is present
        if (user || trigger === 'signIn') {
          // For new users, we need to find by email instead of ID initially
          const userEmail = user?.email || token.email
          
          if (userEmail) {
            const dbUser = await prisma.user.findUnique({
              where: { email: userEmail },
              select: {
                id: true,
                role: true,
                agencyId: true,
                email: true,
                name: true,
                image: true,
                onboardingCompleted: true,
              },
            })

            if (dbUser) {
              token.id = dbUser.id
              token.role = dbUser.role
              token.agencyId = dbUser.agencyId
              token.email = dbUser.email
              token.name = dbUser.name
              token.image = dbUser.image
              token.onboardingCompleted = dbUser.onboardingCompleted
            } else {
              // For brand new users, set defaults
              token.email = userEmail
              token.name = user?.name || token.name
              token.image = user?.image || token.image
              token.role = 'USER' as UserRole
              token.agencyId = null
              token.onboardingCompleted = false
            }
          }
        }
        return token
      } catch (error) {
        console.error('JWT callback error:', error)
        // Return token with minimal data to prevent authentication failure
        return {
          ...token,
          email: token.email || user?.email,
          name: token.name || user?.name,
          role: 'USER' as UserRole,
          onboardingCompleted: false
        }
      }
    },
    session: async ({ session, token }) => {
      try {
        // Use token data for session
        if (session?.user && token) {
          session.user.id = token.id as string
          session.user.role = (token.role as UserRole) || 'USER'
          session.user.agencyId = token.agencyId as string | null
          session.user.email = token.email as string
          session.user.name = token.name as string | null
          session.user.image = token.image as string | null
          session.user.onboardingCompleted = (token.onboardingCompleted as boolean) || false
        }
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    },
    signIn: async ({ user, account, profile }) => {
      try {
        // Always allow sign in - the adapter will handle user creation
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        return true // Allow sign in even if there are issues
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
})