/**
 * Feature Flag System
 * Allows safe rollout of new features without breaking existing functionality
 */

// Feature flag configuration
export const features = {
  // AI Enhancements
  enhancedPrompts: process.env.NEXT_PUBLIC_FEATURE_ENHANCED_PROMPTS === 'true',
  semanticChatCache: process.env.NEXT_PUBLIC_FEATURE_SEMANTIC_CACHE === 'true',
  multiAgentSupport: process.env.NEXT_PUBLIC_FEATURE_MULTI_AGENT === 'true',
  
  // Performance
  multiLayerCache: process.env.NEXT_PUBLIC_FEATURE_MULTI_LAYER_CACHE === 'true',
  ga4CacheEnabled: process.env.NEXT_PUBLIC_FEATURE_GA4_CACHE === 'true',
  
  // Communication
  smsSupport: process.env.NEXT_PUBLIC_FEATURE_SMS_SUPPORT === 'true',
  channelAbstraction: process.env.NEXT_PUBLIC_FEATURE_CHANNEL_ABSTRACTION === 'true',
  
  // Database
  jsonbMetadata: process.env.NEXT_PUBLIC_FEATURE_JSONB_METADATA === 'true',
  
  // UI/UX
  chatV2: process.env.NEXT_PUBLIC_FEATURE_CHAT_V2 === 'true',
  advancedAnalytics: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS === 'true',
  performanceTrends: process.env.NEXT_PUBLIC_FEATURE_PERFORMANCE_TRENDS === 'true' || process.env.NODE_ENV === 'development',


} as const;

// User-specific feature flags (can override global flags)
export async function getUserFeatures(userId: string): Promise<typeof features> {
  // This could check a database for user-specific flags
  // For now, just return global flags
  return features;
}

// A/B testing helper
export function isInTestGroup(userId: string, feature: keyof typeof features, percentage = 50): boolean {
  if (!features[feature]) return false;
  
  // Simple hash-based assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < percentage;
}

// Feature flag React hook
export function useFeature(feature: keyof typeof features): boolean {
  // In a real implementation, this might check user context
  return features[feature];
}

// Server-side feature check
export function checkFeature(feature: keyof typeof features): boolean {
  return features[feature];
}

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging';
export const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';

// Log feature flag status on startup
if (isDevelopment) {
  console.log('🚩 Feature Flags:', features);
}
