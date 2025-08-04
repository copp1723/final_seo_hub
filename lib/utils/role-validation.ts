/**
 * Role Validation Utilities
 * 
 * Ensures consistency between the `role` enum field and `isSuperAdmin` boolean field
 * to prevent the type of role validation mismatch that was identified and fixed.
 */

import { UserRole } from '@prisma/client'

export interface UserRoleData {
  role: UserRole
  isSuperAdmin: boolean
}

/**
 * Validates that role and isSuperAdmin fields are consistent
 */
export function validateRoleConsistency(userData: UserRoleData): boolean {
  const shouldBeSuperAdmin = userData.role === 'SUPER_ADMIN'
  const isSuperAdmin = userData.isSuperAdmin === true
  
  return shouldBeSuperAdmin === isSuperAdmin
}

/**
 * Gets the correct isSuperAdmin value for a given role
 */
export function getCorrectSuperAdminFlag(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

/**
 * Creates consistent user data for database operations
 * Ensures role and isSuperAdmin fields are always in sync
 */
export function createConsistentUserData(role: UserRole, otherData: any = {}) {
  return {
    ...otherData,
    role,
    isSuperAdmin: getCorrectSuperAdminFlag(role)
  }
}

/**
 * Validates and corrects user role data before database operations
 */
export function ensureRoleConsistency(userData: Partial<UserRoleData>): Partial<UserRoleData> {
  if (userData.role && userData.isSuperAdmin === undefined) {
    // If role is set but isSuperAdmin is missing, set it correctly
    userData.isSuperAdmin = getCorrectSuperAdminFlag(userData.role)
  } else if (userData.role && userData.isSuperAdmin !== undefined) {
    // If both are set, ensure they're consistent
    const expectedSuperAdmin = getCorrectSuperAdminFlag(userData.role)
    if (userData.isSuperAdmin !== expectedSuperAdmin) {
      console.warn(`⚠️  Role validation inconsistency detected and corrected:`, {
        role: userData.role,
        providedSuperAdmin: userData.isSuperAdmin,
        correctedSuperAdmin: expectedSuperAdmin
      })
      userData.isSuperAdmin = expectedSuperAdmin
    }
  }
  
  return userData
}

/**
 * Role validation error for when inconsistencies are detected
 */
export class RoleValidationError extends Error {
  constructor(message: string, public userData: UserRoleData) {
    super(message)
    this.name = 'RoleValidationError'
  }
}

/**
 * Strict validation that throws an error for inconsistencies
 * Use this for critical security checks
 */
export function strictValidateRole(userData: UserRoleData): void {
  if (!validateRoleConsistency(userData)) {
    throw new RoleValidationError(
      `Role validation failed: role "${userData.role}" does not match isSuperAdmin ${userData.isSuperAdmin}`,
      userData
    )
  }
}

/**
 * Database operation helpers with automatic role validation
 */
export const RoleValidatedOperations = {
  /**
   * Creates user data with validated role consistency
   */
  createUserData: (role: UserRole, otherData: any = {}) => {
    return createConsistentUserData(role, otherData)
  },

  /**
   * Updates user data with validated role consistency
   */
  updateUserData: (updates: any) => {
    return ensureRoleConsistency(updates)
  },

  /**
   * Validates existing user data
   */
  validateUser: (user: UserRoleData) => {
    return validateRoleConsistency(user)
  }
}

/**
 * Constants for common role operations
 */
export const RoleConstants = {
  SUPER_ADMIN_DATA: createConsistentUserData('SUPER_ADMIN'),
  AGENCY_ADMIN_DATA: createConsistentUserData('AGENCY_ADMIN'),
  DEALERSHIP_ADMIN_DATA: createConsistentUserData('DEALERSHIP_ADMIN'),
  ADMIN_DATA: createConsistentUserData('ADMIN'),
  USER_DATA: createConsistentUserData('USER')
}