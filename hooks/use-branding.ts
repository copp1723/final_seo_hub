'use client'

import { BrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from '@/lib/branding/config'
import { useEffect, useState } from 'react'

export function useBranding(): BrandingConfig {
  // Start with default branding to prevent hydration mismatch
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run after component is mounted to prevent hydration issues
    if (!mounted) return

    try {
      const domainBranding = getBrandingFromDomain(window.location.hostname)
      setBranding(domainBranding)
    } catch (error) {
      // Fallback to default branding if there's any error
      console.warn('Error getting domain branding:', error)
      setBranding(DEFAULT_BRANDING)
    }
  }, [mounted])

  return branding
}

// Server-side branding helper
export function getServerBranding(request?: Request): BrandingConfig {
  if (request) {
    return getBrandingFromDomain(new URL(request.url).hostname)
  }
  return DEFAULT_BRANDING
}
