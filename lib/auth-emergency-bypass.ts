// EMERGENCY BYPASS FOR DEMO - REMOVE AFTER DEMO
import { SimpleUser, SimpleSession } from './auth-simple';

const DEMO_SUPER_ADMIN: SimpleUser = {
  id: 'demo-super-admin',
  email: 'josh.copp@onekeel.ai',
  role: 'SUPER_ADMIN',
  agencyId: null,
  dealershipId: null,
  name: 'Demo Super Admin'
};

const DEMO_SESSION: SimpleSession = {
  user: DEMO_SUPER_ADMIN,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
};

// Always return super admin session
export async function getEmergencySession(): Promise<SimpleSession> {
  console.log('🚨 EMERGENCY BYPASS ACTIVE - DEMO MODE 🚨');
  return DEMO_SESSION;
}

export const EMERGENCY_BYPASS_ENABLED = true;