import { Agency } from '@prisma/client'

export interface BrandingConfig {
  companyName: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  domain?: string
  emailFromName: string
  supportEmail: string
  websiteUrl?: string
  favicon?: string
  customCss?: string
}

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'SEO Hub',
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  emailFromName: 'SEO Hub',
  supportEmail: 'support@seohub.com'
}

export const AGENCY_BRANDINGS: Record<string, BrandingConfig> = {
  'rylie': {
    companyName: 'Rylie SEO Hub',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    emailFromName: 'Rylie SEO',
    supportEmail: 'support@rylieseo.com',
    domain: 'rylie-seo-hub.onrender.com'
  },
  'sally': {
    companyName: 'Sally SEO Solutions',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    emailFromName: 'Sally SEO',
    supportEmail: 'support@sallyseo.com'
  },
  'default': DEFAULT_BRANDING
}

export function getBrandingForAgency(agency?: Agency | null): BrandingConfig {
  if (!agency) {
    return DEFAULT_BRANDING
  }

  // Check if agency has custom branding in settings
  if (agency.settings && typeof agency.settings === 'object') {
    const settings = agency.settings as any
    if (settings.branding) {
      return { ...DEFAULT_BRANDING, ...settings.branding }
    }
  }

  // Fallback to predefined agency brandings
  const agencyKey = agency.name.toLowerCase().replace(/\s+/g, '')
  return AGENCY_BRANDINGS[agencyKey] || DEFAULT_BRANDING
}

export function getBrandingFromDomain(domain: string): BrandingConfig {
  // Find agency by domain
  for (const [key, branding] of Object.entries(AGENCY_BRANDINGS)) {
    if (branding.domain === domain) {
      return branding
    }
  }
  return DEFAULT_BRANDING
}

export function getBrandingFromRequest(request: Request): BrandingConfig {
  const url = new URL(request.url)
  return getBrandingFromDomain(url.hostname)
}

export async function getBrandingForCurrentRequest(): Promise<BrandingConfig> {
  // In a server component, we can access headers to get the hostname
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const host = headersList.get('host')
    
    if (host) {
      return getBrandingFromDomain(host)
    }
  } catch (error) {
    // If we can't get headers (e.g., in client component), return default
  }
  
  return DEFAULT_BRANDING
}