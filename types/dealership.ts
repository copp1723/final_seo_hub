// Dealership-related types for multi-property GA4 analytics

export interface DealershipFilterCriteria {
  hostname?: string;
  pagePath?: string;
  customDimensions?: Record<string, string>;
  // GA4 360 compatible filter structure
  dimensionFilter?: {
    andGroup?: {
      expressions: Array<{
        filter: {
          fieldName: string;
          stringFilter?: {
            value: string;
            matchType?: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'REGEXP';
          };
          numericFilter?: {
            value: number;
            operation: 'EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL';
          };
        };
      }>;
    };
  };
}

export interface DealershipAnalyticsConfig {
  trackingEnabled: boolean;
  enhancedMeasurement: boolean;
  customEvents?: string[];
  conversionEvents?: string[];
  customDimensions?: Record<string, string>;
  customMetrics?: Record<string, number>;
  // GA4 360 specific settings
  subpropertySettings?: {
    includeInRollup: boolean;
    dataRetentionMonths: number;
    attributionSettings?: {
      reportingAttributionModel: 'CROSS_CHANNEL_DATA_DRIVEN' | 'CROSS_CHANNEL_LAST_CLICK' | 'CROSS_CHANNEL_FIRST_CLICK';
      conversionEventLookbackWindow: number;
    };
  };
}

export interface DealershipMetrics {
  // Core metrics
  users: number;
  newUsers: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  pageviews: number;
  
  // E-commerce/Conversion metrics
  conversions: Record<string, number>;
  conversionRate: number;
  revenue: number;
  
  // Custom dealership metrics
  vehicleViews: number;
  testDriveRequests: number;
  leadFormSubmissions: number;
  phoneCallClicks: number;
  
  // Time period
  dateRange: {
    startDate: string;
    endDate: string;
  };
  
  // Comparison data (optional)
  previousPeriod?: {
    users: number;
    sessions: number;
    conversions: Record<string, number>;
  };
}

export interface DealershipGA4ConnectionConfig {
  // API quotas and limits
  apiQuotaLimit?: number;
  apiQuotaUsed?: number;
  
  // Data freshness settings
  dataFreshnessHours?: number;
  lastSyncTimestamp?: Date;
  
  // Custom reporting settings
  reportingDimensions?: string[];
  reportingMetrics?: string[];
  
  // GA4 360 migration readiness
  migrationReady?: boolean;
  migrationNotes?: string;
}

// Type for creating a new dealership
export interface CreateDealershipInput {
  agencyId: string;
  name: string;
  website?: string;
  domain?: string;
  location?: string;
  ga4PropertyId?: string;
  filterCriteria?: DealershipFilterCriteria;
  analyticsConfig?: DealershipAnalyticsConfig;
}

// Type for updating a dealership
export interface UpdateDealershipInput {
  name?: string;
  website?: string;
  domain?: string;
  location?: string;
  isActive?: boolean;
  ga4PropertyId?: string;
  ga4SubpropertyId?: string;
  ga4SourcePropertyId?: string;
  filterCriteria?: DealershipFilterCriteria;
  analyticsConfig?: DealershipAnalyticsConfig;
}

// Enum for GA4 connection types
export enum GA4ConnectionType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  ROLLUP = 'rollup'
}

// Type for aggregated analytics across dealerships
export interface AggregatedAnalytics {
  agencyId: string;
  dealerships: Array<{
    id: string;
    name: string;
    metrics: DealershipMetrics;
  }>;
  totals: DealershipMetrics;
  averages: {
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
  };
}