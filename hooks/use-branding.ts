'use client'

import { useSession } from 'next-auth/react'
import { BrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from '@/lib/branding/config'
import { useEffect, useState } from 'react'

export function useBranding(): BrandingConfig {
  const { data: session } = useSession()
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING)

  useEffect(() => {
    // For now, use domain-based branding
    // TODO: Implement agency-based branding when we have agency data in session
    if (typeof window !== 'undefined') {
      const domainBranding = getBrandingFromDomain(window.location.hostname)
      setBranding(domainBranding)
    }
  }, [session])

  return branding
}

// Server-side branding helper
export function getServerBranding(request?: Request): BrandingConfig {
  if (request) {
    return getBrandingFromDomain(new URL(request.url).hostname)
  }
  return DEFAULT_BRANDING
}