/**
 * Session-based agency selection for SUPER_ADMIN users
 * This avoids modifying the user's permanent agencyId for temporary selection
 */

import { prisma } from '@/lib/prisma'

export interface SessionAgencySelection {
  userId: string
  selectedAgencyId: string
  selectedAt: Date
}

// Store temporary agency selections in database (better than Redis for this use case)
export class SessionAgencyManager {
  
  /**
   * Set the selected agency for a user session (temporary selection)
   * For now, store in the user record but with a clear separation from permanent agencyId
   */
  static async setSelectedAgency(userId: string, agencyId: string): Promise<void> {
    if (!userId || !agencyId) {
      throw new Error('Invalid userId or agencyId provided')
    }

    // Verify the agency exists
    const agency = await prisma.agencies.findUnique({
      where: { id: agencyId }
    })

    if (!agency) {
      throw new Error('Agency not found')
    }

    await prisma.users.update({
      where: { id: userId },
      data: { 
        // Store in currentDealershipId temporarily - we'll use this field for session agency
        // This is a temporary solution until we create proper session table
        currentDealershipId: `agency:${agencyId}`,
        dealershipId: null // Clear current dealership when switching agencies
      }
    })
  }

  /**
   * Get the selected agency for a user session
   */
  static async getSelectedAgency(userId: string): Promise<string | null> {
    if (!userId) {
      return null
    }

    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { currentDealershipId: true }
      })

      // Extract agency ID from the stored format
      const storedValue = user?.currentDealershipId
      if (storedValue && storedValue.startsWith('agency:')) {
        return storedValue.replace('agency:', '')
      }

      return null
    } catch (error) {
      console.error('Error getting selected agency:', error)
      return null
    }
  }

  /**
   * Clear the selected agency for a user session
   */
  static async clearSelectedAgency(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: { currentDealershipId: null }
    })
  }

  /**
   * Get the effective agency ID for a user (permanent or session-based)
   */
  static async getEffectiveAgencyId(userId: string, userAgencyId: string | null): Promise<string | null> {
    if (!userId) {
      return null
    }

    try {
      // For non-SUPER_ADMIN users, use their permanent agency
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      if (user?.role !== 'SUPER_ADMIN') {
        return userAgencyId
      }

      // For SUPER_ADMIN users, prefer session selection over permanent assignment
      const sessionAgencyId = await this.getSelectedAgency(userId)
      return sessionAgencyId || userAgencyId
    } catch (error) {
      console.error('Error getting effective agency ID:', error)
      return userAgencyId // Fallback to permanent agency on error
    }
  }
}