import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: string
      agencyId?: string | null
    } & DefaultSession['user']
  }
}