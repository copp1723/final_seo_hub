import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      try {
        // Fetch user data from database to get custom fields
        if (session?.user?.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
              id: true,
              role: true,
              agencyId: true,
              onboardingCompleted: true,
            },
          })

          if (dbUser) {
            session.user.id = dbUser.id
            session.user.role = dbUser.role
            session.user.agencyId = dbUser.agencyId
            session.user.onboardingCompleted = dbUser.onboardingCompleted
          }
        }
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})