import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      agencyId?: string | null
    } & DefaultSession['user']
  }
  
  interface JWT {
    id: string
    role: UserRole
    agencyId?: string | null
  }
}