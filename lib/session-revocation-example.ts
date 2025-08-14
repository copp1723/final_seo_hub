/**
 * Example Usage of Session Revocation System
 * 
 * This file demonstrates how to use the optional session revocation mechanism
 * added to the SimpleAuth system for security events.
 */

import { SimpleAuthWithRevocation } from './auth-simple'

// Example: Security Event Handlers

export class SecurityEventHandler {
  /**
   * Handle suspicious login activity
   */
  static async handleSuspiciousActivity(userId: string, sessionId?: string) {
    if (sessionId) {
      // Revoke specific session
      SimpleAuthWithRevocation.revokeSession(sessionId, userId, 'Suspicious login activity detected')
    } else {
      // Revoke all user sessions
      SimpleAuthWithRevocation.revokeAllUserSessions(userId, 'Multiple suspicious login attempts')
    }
  }

  /**
   * Handle password change - revoke all sessions except current one
   */
  static async handlePasswordChange(userId: string, currentSessionId?: string) {
    // In a production system, you'd implement logic to revoke all except current
    // For now, we revoke all sessions - user will need to log back in
    SimpleAuthWithRevocation.revokeAllUserSessions(userId, 'Password changed - security measure')
  }

  /**
   * Handle account compromise
   */
  static async handleAccountCompromise(userId: string) {
    SimpleAuthWithRevocation.revokeAllUserSessions(userId, 'Account compromise detected - immediate revocation')
  }

  /**
   * Handle role change
   */
  static async handleRoleChange(userId: string) {
    SimpleAuthWithRevocation.revokeAllUserSessions(userId, 'Role changed - re-authentication required')
  }

  /**
   * Admin function: Get user's revocation history
   */
  static getUserRevocationHistory(userId: string) {
    return SimpleAuthWithRevocation.getRevocationHistory(userId)
  }

  /**
   * Admin function: Clear revocations for user (use with caution)
   */
  static clearUserRevocations(userId: string) {
    SimpleAuthWithRevocation.clearRevocations(userId)
  }

  /**
   * Check if revocation system is enabled
   */
  static isEnabled(): boolean {
    return SimpleAuthWithRevocation.isRevocationEnabled()
  }
}

// Example API endpoint usage:
/*
// In an API route (e.g., app/api/admin/revoke-session/route.ts):

import { SimpleAuthWithRevocation } from '@/lib/auth-simple'
import { SecurityEventHandler } from '@/lib/session-revocation-example'

export async function POST(request: NextRequest) {
  const { userId, sessionId, reason } = await request.json()
  
  // Check if user has admin privileges
  const session = await SimpleAuthWithRevocation.getSessionFromRequest(request)
  if (!session || session.user.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Revoke the session
  SecurityEventHandler.handleSuspiciousActivity(userId, sessionId)
  
  return Response.json({ success: true })
}
*/

// Environment variable configuration:
/*
# Enable session revocation system (optional, default: enabled in development)
SESSION_REVOCATION_ENABLED=true

# The system automatically:
# - Cleans up old revocation events (> 24 hours)
# - Prevents memory buildup with configurable limits
# - Only operates in server-side contexts
# - Is backward compatible with existing auth system
*/