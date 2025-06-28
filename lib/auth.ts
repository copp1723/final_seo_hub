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
    jwt: async ({ token, user, trigger }) => {
      // On initial sign in, fetch user details once
      if (user || trigger === 'signIn') {
        const dbUser = await prisma.user.findUnique({
          where: { id: user?.id || token.sub },
          select: {
            id: true,
            role: true,
            agencyId: true,
            email: true,
            name: true,
            image: true,
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.agencyId = dbUser.agencyId
          token.email = dbUser.email
          token.name = dbUser.name
          token.image = dbUser.image
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      // Use token data instead of database lookup
      if (session?.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.agencyId = token.agencyId as string | null
        session.user.email = token.email as string
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})