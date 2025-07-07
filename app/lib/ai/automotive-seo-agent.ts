/**
 * Sophisticated Automotive SEO Chat Agent
 * Combines deep SEO expertise with automotive industry knowledge
 */

import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'

// Automotive dealership-specific knowledge
export const AUTOMOTIVE_KNOWLEDGE = {
  inventoryManagement: {
    newVehicles: {
      considerations: [
        "MSRP vs. dealer pricing strategies",
        "Factory incentives and rebates",
        "Model year transitions",
        "Allocation and availability",
        "Popular trim levels by region"
      ],
      seoFactors: [
        "Model-specific landing pages",
        "Trim comparison content",
        "Local inventory feeds",
        "Structured data for vehicle listings",
        "Dynamic pricing schema"
      ]
    },
    usedVehicles: {
      considerations: [
        "Market-based pricing",
        "Vehicle history reports",
        "Certification programs",
        "Trade-in values",
        "Reconditioning standards"
      ],
      seoFactors: [
        "VIN-specific pages",
        "Condition-based content",
        "Local market comparisons",
        "Historical pricing data",
        "Customer review integration"
      ]
    }
  },
  
  localMarketFactors: {
    competition: [
      "Competing dealership analysis",
      "Market share opportunities",
      "Geographic service areas",
      "Brand differentiation strategies"
    ],
    demographics: [
      "Income levels and financing preferences",
      "Popular vehicle types by area",
      "Commute patterns affecting vehicle choice",
      "Seasonal buying trends"
    ]
  },
  
  customerJourney: {
    research: {
      duration: "60-90 days average",
      touchpoints: [
        "Initial model research",
        "Feature comparisons",
        "Pricing research",
        "Dealership reviews",
        "Inventory availability"
      ],
      seoOpportunities: [
        "Comparison pages",
        "FAQ content",
        "Video walkarounds",
        "Virtual showroom tours",
        "Chat engagement"
      ]
    },
    purchase: {
      factors: [
        "Financing options",
        "Trade-in value",
        "Incentives and rebates",
        "Warranty coverage",
        "Service department quality"
      ]
    }
  },
  
  performanceMetrics: {
    seo: [
      "Vehicle Detail Page (VDP) views",
      "Search Results Page (SRP) engagement",
      "Time on site by traffic source",
      "Lead form submissions",
      "Phone calls from organic",
      "Direction requests"
    ],
    business: [
      "Cost per lead by channel",
      "Lead to appointment ratio",
      "Appointment to sale conversion",
      "Average gross profit per unit",
      "Customer lifetime value"
    ]
  }
}

// Enhanced system prompt combining SEO and automotive expertise
export const AUTOMOTIVE_SEO_EXPERT_PROMPT = `You are an elite automotive SEO consultant with deep expertise in both search engine optimization and automotive retail. Your knowledge spans:

## Core Expertise Areas:

### 1. Automotive SEO Strategy
- Local SEO for multi-location dealerships
- Inventory-based dynamic content optimization
- Mobile-first automotive search behavior
- Voice search optimization for "near me" queries
- Google Business Profile optimization for automotive
- Schema markup for vehicle listings and dealership info

### 2. Automotive Industry Knowledge
${JSON.stringify(AUTOMOTIVE_KNOWLEDGE, null, 2)}

### 3. SEO Package Expertise
${JSON.stringify(SEO_KNOWLEDGE_BASE.packages, null, 2)}

### 4. Content Strategy
- Model and trim-specific landing pages
- Local market comparison content
- Service department SEO
- Parts and accessories optimization
- Finance and lease calculator pages
- Customer testimonial integration

### 5. Technical Implementation
- Inventory feed optimization
- Dynamic URL structures for VDPs/SRPs
- Site speed for image-heavy automotive sites
- Mobile usability for on-the-lot shoppers
- AMP implementation for inventory pages
- Core Web Vitals specific to automotive

### 6. Analytics & Reporting
- VDP/SRP performance tracking
- Multi-touch attribution modeling
- Call tracking integration
- Lead source analysis
- Organic market share tracking
- Competitor visibility monitoring

## Response Guidelines:

1. **Be Specific**: Always provide actionable, automotive-specific advice
2. **Use Data**: Reference performance metrics and industry benchmarks
3. **Local Focus**: Emphasize local SEO strategies for dealerships
4. **ROI-Oriented**: Connect SEO efforts to dealership business metrics
5. **Competitive Context**: Consider local market competition
6. **Compliance Aware**: Mention OEM compliance where relevant

## Advanced Capabilities:

### Market Analysis
- Identify high-value local keywords
- Analyze competitor content gaps
- Recommend inventory-based content opportunities
- Suggest seasonal campaign strategies

### Technical Recommendations
- Structured data implementation specifics
- Page speed optimization priorities
- Mobile experience enhancements
- Local landing page structures

### Content Planning
- Monthly content calendars aligned with inventory
- Blog topics based on search trends
- GBP post strategies for events/inventory
- FAQ development from customer queries

When answering questions:
- Draw from both SEO expertise and automotive industry knowledge
- Provide examples specific to car dealerships
- Suggest KPIs that matter to automotive retail
- Consider the full customer journey from search to sale
- Reference package capabilities when discussing implementation

Remember: You're not just an SEO expert, but an automotive retail strategist who uses SEO as a tool to drive showroom traffic and vehicle sales.`

// Context enhancement for user queries
export const enhanceAutomotiveContext = (
  userQuery: string,
  dealershipInfo?: {
    brand?: string
    location?: string
    inventorySize?: number
    currentPackage?: string
  },
  conversationHistory?: any[]
) => {
  let enhancedContext = AUTOMOTIVE_SEO_EXPERT_PROMPT

  // Add dealership-specific context
  if (dealershipInfo) {
    enhancedContext += `\n\n## Current Dealership Context:\n`
    if (dealershipInfo.brand) {
      enhancedContext += `- Brand: ${dealershipInfo.brand}\n`
    }
    if (dealershipInfo.location) {
      enhancedContext += `- Location: ${dealershipInfo.location}\n`
    }
    if (dealershipInfo.inventorySize) {
      enhancedContext += `- Inventory Size: ${dealershipInfo.inventorySize} vehicles\n`
    }
    if (dealershipInfo.currentPackage) {
      enhancedContext += `- Current SEO Package: ${dealershipInfo.currentPackage}\n`
    }
  }

  // Add conversation continuity
  if (conversationHistory && conversationHistory.length > 0) {
    enhancedContext += `\n\n## Recent Conversation Context:\n`
    conversationHistory.slice(-3).forEach(msg => {
      enhancedContext += `${msg.role}: ${msg.content.substring(0, 200)}...\n`
    })
  }

  // Add query-specific enhancements
  const queryLower = userQuery.toLowerCase()
  
  if (queryLower.includes('inventory') || queryLower.includes('vdp') || queryLower.includes('srp')) {
    enhancedContext += `\n\n## Focus Area: Inventory SEO
- Emphasize dynamic content strategies
- Discuss structured data for vehicles
- Cover URL structure best practices
- Mention inventory feed optimization`
  }
  
  if (queryLower.includes('local') || queryLower.includes('near me')) {
    enhancedContext += `\n\n## Focus Area: Local SEO
- Prioritize Google Business Profile optimization
- Discuss local landing page strategies
- Cover "near me" search optimization
- Mention local review management`
  }
  
  if (queryLower.includes('competition') || queryLower.includes('competitor')) {
    enhancedContext += `\n\n## Focus Area: Competitive Analysis
- Discuss market share opportunities
- Cover competitor content gap analysis
- Mention differentiation strategies
- Include local SERP domination tactics`
  }

  return enhancedContext
}

// Intelligent response enhancement
export const enhanceResponse = (
  baseResponse: string,
  userQuery: string,
  includeMetrics: boolean = true
) => {
  let enhanced = baseResponse

  // Add relevant KPIs if discussing strategy
  if (includeMetrics && (userQuery.includes('strategy') || userQuery.includes('improve'))) {
    enhanced += `\n\n**Key Metrics to Track:**\n`
    enhanced += `- Organic VDP views (target: 20%+ MoM growth)\n`
    enhanced += `- Local pack visibility (target: Top 3 for brand terms)\n`
    enhanced += `- Organic lead conversion rate (target: 2-3%)\n`
    enhanced += `- Cost per organic lead (benchmark: $15-30)`
  }

  // Add implementation timeline if discussing new initiatives
  if (userQuery.includes('how long') || userQuery.includes('timeline')) {
    enhanced += `\n\n**Expected Timeline:**\n`
    enhanced += `- Week 1-2: Technical implementation\n`
    enhanced += `- Week 3-4: Content creation and optimization\n`
    enhanced += `- Month 2-3: Initial ranking improvements\n`
    enhanced += `- Month 4-6: Significant traffic growth\n`
    enhanced += `- Month 6+: Sustained lead generation`
  }

  return enhanced
}

// Advanced analytics insights
export const generateAnalyticsInsights = (metrics: any) => {
  const insights = []

  if (metrics.organicTraffic) {
    const trend = metrics.organicTraffic.trend
    if (trend < 0) {
      insights.push(`Organic traffic is down ${Math.abs(trend)}%. Check for: seasonal patterns, increased PPC cannibalization, or technical issues.`)
    } else {
      insights.push(`Organic traffic is up ${trend}%. Capitalize on this momentum with more content in high-performing categories.`)
    }
  }

  if (metrics.vdpViews) {
    insights.push(`VDP engagement at ${metrics.vdpViews.rate}%. Consider adding more detailed specs, 360° views, and video content to increase time on page.`)
  }

  if (metrics.localVisibility) {
    if (metrics.localVisibility.packRanking > 3) {
      insights.push(`Currently ranking #${metrics.localVisibility.packRanking} in local pack. Focus on GBP optimization, reviews, and local citations to break into top 3.`)
    }
  }

  return insights
}