// Re-export the simple auth functions to maintain compatibility
import { getServerSession, requireAuth, requireRole, SimpleAuth } from './auth-simple';

export { getServerSession, requireAuth, requireRole, SimpleAuth };

// Add missing NextAuth exports for compatibility
export const auth = getServerSession;
export const signIn = () => { throw new Error('signIn not implemented - use simple auth') };
export const signOut = () => { throw new Error('signOut not implemented - use simple auth') };
export const handlers = {
  GET: () => { throw new Error('NextAuth handlers not implemented - use simple auth') },
  POST: () => { throw new Error('NextAuth handlers not implemented - use simple auth') }
};