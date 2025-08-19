import type { NextRequest } from 'next/server'

// Prefer NEXTAUTH_URL for any externally-visible redirects/links.
export function getBaseUrl(request?: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL
  if (envUrl && envUrl.length > 0) return envUrl
  if (request) {
    const u = new URL(request.url)
    return `${u.protocol}//${u.host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
