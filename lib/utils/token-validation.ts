/**
 * Token validation utilities to prevent test/invalid tokens from being stored
 */

import { logger } from '@/lib/logger'

export interface TokenValidationResult {
  isValid: boolean
  reason?: string
  tokenType: 'test' | 'invalid' | 'valid'
}

/**
 * Validate that OAuth tokens are real Google tokens and not test/dummy tokens
 */
export function validateOAuthToken(token: string | null | undefined, tokenName: string = 'token'): TokenValidationResult {
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      reason: `${tokenName} is missing or not a string`,
      tokenType: 'invalid'
    }
  }

  // Check for common test token patterns
  const testPatterns = [
    /^test_/i,
    /test_access_token/i,
    /test_refresh_token/i,
    /dummy/i,
    /fake/i,
    /mock/i
  ]

  for (const pattern of testPatterns) {
    if (pattern.test(token)) {
      return {
        isValid: false,
        reason: `${tokenName} appears to be a test/dummy token`,
        tokenType: 'test'
      }
    }
  }

  // Real Google OAuth tokens are typically much longer
  if (token.length < 50) {
    return {
      isValid: false,
      reason: `${tokenName} is too short to be a valid Google OAuth token`,
      tokenType: 'invalid'
    }
  }

  // Check for common Google OAuth token format (contains alphanumeric + special chars)
  if (!/^[A-Za-z0-9._/-]+$/.test(token)) {
    return {
      isValid: false,
      reason: `${tokenName} contains invalid characters for Google OAuth token`,
      tokenType: 'invalid'
    }
  }

  return {
    isValid: true,
    tokenType: 'valid'
  }
}

/**
 * Validate OAuth token pairs (access + refresh tokens)
 */
export function validateOAuthTokens(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined
): {
  accessTokenResult: TokenValidationResult
  refreshTokenResult: TokenValidationResult
  overallValid: boolean
  errors: string[]
} {
  const accessTokenResult = validateOAuthToken(accessToken, 'access_token')
  const refreshTokenResult = validateOAuthToken(refreshToken, 'refresh_token')
  
  const errors: string[] = []
  
  if (!accessTokenResult.isValid) {
    errors.push(accessTokenResult.reason || 'Access token is invalid')
  }
  
  if (!refreshTokenResult.isValid) {
    errors.push(refreshTokenResult.reason || 'Refresh token is invalid')
  }
  
  const overallValid = accessTokenResult.isValid && refreshTokenResult.isValid

  // Log validation results for monitoring
  if (!overallValid) {
    logger.warn('OAuth token validation failed', {
      accessTokenType: accessTokenResult.tokenType,
      refreshTokenType: refreshTokenResult.tokenType,
      errors
    })
  }

  return {
    accessTokenResult,
    refreshTokenResult,
    overallValid,
    errors
  }
}

/**
 * Prevent test tokens from being stored - throws error if validation fails
 */
export function enforceValidTokens(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined,
  context: string = 'OAuth connection'
): void {
  const validation = validateOAuthTokens(accessToken, refreshToken)
  
  if (!validation.overallValid) {
    const errorMsg = `${context}: Invalid tokens detected - ${validation.errors.join(', ')}`
    logger.error(errorMsg, { 
      context,
      accessTokenType: validation.accessTokenResult.tokenType,
      refreshTokenType: validation.refreshTokenResult.tokenType
    })
    throw new Error(errorMsg)
  }
}

/**
 * Check if existing tokens in database are test tokens (for cleanup)
 */
export function isTestTokenInDatabase(encryptedToken: string | null, decryptFn: (token: string) => string): boolean {
  if (!encryptedToken) return false
  
  try {
    const decrypted = decryptFn(encryptedToken)
    const validation = validateOAuthToken(decrypted)
    return validation.tokenType === 'test'
  } catch (error) {
    // If we can't decrypt, consider it invalid/corrupted
    logger.warn('Failed to decrypt token for validation', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return true // Treat as invalid, should be cleaned up
  }
}