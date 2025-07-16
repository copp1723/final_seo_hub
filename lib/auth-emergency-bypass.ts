// EMERGENCY BYPASS FOR DEMO - REMOVE AFTER DEMO
import { SimpleUser, SimpleSession } from './auth-simple';

// Give the demo user agency context for full functionality
const DEMO_SUPER_ADMIN: SimpleUser = {
  id: '3e50bcc8-cd3e-4773-a790-e0570de37371', // Real Josh user ID
  email: 'josh.copp@onekeel.ai',
  role: 'SUPER_ADMIN',
  agencyId: 'agency-seowerks', // SEOWorks agency from production database
  dealershipId: 'cmd50a9ot0001pe174j9rx5dh', // Jay Hatfield Columbus for GA4/SC access
  name: 'Josh Copp (Super Admin)'
};

const DEMO_SESSION: SimpleSession = {
  user: DEMO_SUPER_ADMIN,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
};

// Always return super admin session
export async function getEmergencySession(): Promise<SimpleSession> {
  // Only log during runtime, not during build
  if (typeof window !== 'undefined' || process.env.RUNTIME) {
    console.log('🚨 EMERGENCY BYPASS ACTIVE - DEMO MODE 🚨');
    console.log('📋 Demo User:', {
      email: DEMO_SUPER_ADMIN.email,
      role: DEMO_SUPER_ADMIN.role,
      agencyId: DEMO_SUPER_ADMIN.agencyId,
      hasFullAccess: true
    });
  }
  return DEMO_SESSION;
}

export const EMERGENCY_BYPASS_ENABLED = true;