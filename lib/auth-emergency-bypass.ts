// EMERGENCY BYPASS FOR DEMO - REMOVE AFTER DEMO
import { SimpleUser, SimpleSession } from './auth-simple';

// Give the demo user agency context for full functionality
const DEMO_SUPER_ADMIN: SimpleUser = {
  id: 'hardcoded-super-admin', // Using the ID that some code expects
  email: 'josh.copp@onekeel.ai',
  role: 'SUPER_ADMIN',
  agencyId: 'f1b175133856c973b7e864b4', // SEOWERKS agency from database
  dealershipId: null, // Super admins can access all dealerships
  name: 'Demo Super Admin'
};

const DEMO_SESSION: SimpleSession = {
  user: DEMO_SUPER_ADMIN,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
};

// Always return super admin session
export async function getEmergencySession(): Promise<SimpleSession> {
  console.log('🚨 EMERGENCY BYPASS ACTIVE - DEMO MODE 🚨');
  console.log('📋 Demo User:', {
    email: DEMO_SUPER_ADMIN.email,
    role: DEMO_SUPER_ADMIN.role,
    agencyId: DEMO_SUPER_ADMIN.agencyId,
    hasFullAccess: true
  });
  return DEMO_SESSION;
}

export const EMERGENCY_BYPASS_ENABLED = true;