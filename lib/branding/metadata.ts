import { Metadata } from 'next'
import { BrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from './config'

export function generateMetadata(branding?: BrandingConfig): Metadata {
  const config = branding || DEFAULT_BRANDING
  
  return {
    title: config.companyName,
    description: `AI-Powered SEO Request Management Platform by ${config.companyName}`,
    icons: {
      icon: config.favicon || '/favicon.ico'
    },
    openGraph: {
      title: config.companyName,
      description: `AI-Powered SEO Request Management Platform by ${config.companyName}`,
      siteName: config.companyName
    },
    twitter: {
      title: config.companyName,
      description: `AI-Powered SEO Request Management Platform by ${config.companyName}`
    }
  }
}

export function generateDynamicMetadata(request?: Request): Metadata {
  if (request) {
    const branding = getBrandingFromDomain(new URL(request.url).hostname)
    return generateMetadata(branding)
  }
  return generateMetadata()
}
