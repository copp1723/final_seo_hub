export interface BrandingConfig {
  companyName: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  supportEmail: string
  websiteUrl: string
  domain?: string
}

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'SEO Hub',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  supportEmail: 'support@seohub.com',
  websiteUrl: 'https://seohub.com',
}

// Domain-specific branding configurations
const DOMAIN_BRANDING: Record<string, BrandingConfig> = {
  'localhost': DEFAULT_BRANDING,
  'seohub.com': DEFAULT_BRANDING,
  'rylie-seo-hub.onrender.com': DEFAULT_BRANDING,
  
  // Add more domain-specific branding here as needed
  // 'client1.com': {
  //   companyName: 'Client 1 SEO',
  //   primaryColor: '#ff6b35',
  //   secondaryColor: '#d63031',
  //   supportEmail: 'support@client1.com',
  //   websiteUrl: 'https://client1.com',
  //   domain: 'client1.com'
  // }
}

export function getBrandingFromDomain(hostname: string): BrandingConfig {
  // Remove port if present
  const domain = hostname.split(':')[0]
  
  // Check for exact domain match
  if (DOMAIN_BRANDING[domain]) {
    return DOMAIN_BRANDING[domain]
  }
  
  // Check for subdomain matches (e.g., app.client1.com -> client1.com)
  const parts = domain.split('.')
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join('.')
    if (DOMAIN_BRANDING[rootDomain]) {
      return DOMAIN_BRANDING[rootDomain]
    }
  }
  
  // Default fallback
  return DEFAULT_BRANDING
}

// Server-side helper to get branding from request
export function getBrandingFromRequest(request: Request): BrandingConfig {
  try {
    const url = new URL(request.url)
    return getBrandingFromDomain(url.hostname)
  } catch {
    return DEFAULT_BRANDING
  }
}

// Helper to get branding colors as CSS variables
export function getBrandingCSSVars(branding: BrandingConfig): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
  }
}
