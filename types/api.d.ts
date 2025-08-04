/**
 * API Response Type Definitions
 * 
 * This file contains all the TypeScript interfaces and types for API requests and responses
 * to ensure data consistency across the application.
 */

import { 
  UserRole, 
  RequestStatus, 
  RequestPriority, 
  PackageType,
  TaskType,
  TaskStatus 
} from '@prisma/client'

// Base response types
export interface ApiSuccessResponse<T = any> {
  data?: T
  message?: string
  success: true
}

export interface ApiErrorResponse {
  error: string
  code?: string
  details?: any
  success: false
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// User and Auth types
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: UserRole
  agencyId?: string | null
  dealershipId?: string | null
  onboardingCompleted?: boolean
}

export interface AuthSession {
  user: SessionUser
  expires: string
}

// Dealership types
export interface DealershipUser {
  id: string
  name: string | null
  email: string
  role: string
  preferences: UserPreferences | null
}

export interface DealershipData {
  id: string
  name: string
  website?: string | null
  address?: string | null
  phone?: string | null
  activePackageType?: PackageType | null
  currentBillingPeriodStart?: string | null
  currentBillingPeriodEnd?: string | null
  pagesUsedThisPeriod: number
  blogsUsedThisPeriod: number
  gbpPostsUsedThisPeriod: number
  improvementsUsedThisPeriod: number
  userCount: number
  createdAt: string
  users: DealershipUser[]
}

export interface UserPreferences {
  id?: string
  userId?: string
  emailNotifications: boolean
  requestCreated: boolean
  statusChanged: boolean
  taskCompleted: boolean
  weeklySummary: boolean
  marketingEmails: boolean
  timezone?: string | null
  language?: string | null
  createdAt?: string
  updatedAt?: string
}

// Request types
export interface RequestData {
  id: string
  userId: string
  agencyId?: string | null
  dealershipId?: string | null
  title: string
  description: string
  type: string
  priority: RequestPriority
  status: RequestStatus
  packageType?: PackageType | null
  pagesCompleted: number
  blogsCompleted: number
  gbpPostsCompleted: number
  improvementsCompleted: number
  keywords?: any
  targetUrl?: string | null
  targetCities?: any
  targetModels?: any
  completedTasks?: any
  contentUrl?: string | null
  pageTitle?: string | null
  seoworksTaskId?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

// Analytics types
export interface GA4Data {
  sessions: number
  users: number
  pageviews: number
}

export interface SearchConsoleData {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface CombinedMetrics {
  totalSessions: number
  totalUsers: number
  totalClicks: number
  totalImpressions: number
  avgCTR: number
  avgPosition: number
}

export interface AnalyticsErrors {
  ga4Error: string | null
  searchConsoleError: string | null
}

export interface AnalyticsMetadata {
  dateRange: {
    startDate: string
    endDate: string
  }
  fetchedAt: string
  hasGA4Connection: boolean
  hasSearchConsoleConnection: boolean
}

export interface DashboardAnalyticsData {
  ga4Data: GA4Data | null
  searchConsoleData: SearchConsoleData | null
  combinedMetrics: CombinedMetrics
  errors: AnalyticsErrors
  metadata: AnalyticsMetadata
}

// Dashboard types
export interface PackageProgress {
  packageType: string | null
  pages: { completed: number; total: number; used: number; limit: number; percentage: number }
  blogs: { completed: number; total: number; used: number; limit: number; percentage: number }
  gbpPosts: { completed: number; total: number; used: number; limit: number; percentage: number }
  improvements: { completed: number; total: number; used: number; limit: number; percentage: number }
  totalTasks: { completed: number; total: number }
}

export interface Activity {
  id: string
  description: string
  time: string
  type?: string
  metadata?: any
}

export interface DashboardData {
  activeRequests: number
  totalRequests: number
  tasksCompletedThisMonth: number
  tasksSubtitle: string
  gaConnected: boolean
  searchConsoleConnected: boolean
  packageProgress: PackageProgress | null
  latestRequest: RequestData | null
  dealershipId: string | null
  recentActivity?: Activity[]
}

// Task types
export interface TaskData {
  id: string
  userId: string
  dealershipId?: string | null
  agencyId?: string | null
  type: TaskType
  status: TaskStatus
  title: string
  description?: string | null
  priority: RequestPriority
  targetUrl?: string | null
  keywords?: any
  requestId?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  dueDate?: string | null
}

// Agency types
export interface AgencyData {
  id: string
  name: string
  slug: string
  domain?: string | null
  primaryColor: string
  secondaryColor: string
  logo?: string | null
  plan: string
  status: string
  maxUsers: number
  maxConversations: number
  createdAt: string
  updatedAt: string
  ga4PropertyId?: string | null
  ga4PropertyName?: string | null
}

// Integration types
export interface GA4Connection {
  id: string
  userId: string
  dealershipId?: string | null
  propertyId?: string | null
  propertyName?: string | null
  createdAt: string
  updatedAt: string
  expiresAt?: string | null
}

export interface SearchConsoleConnection {
  id: string
  userId: string
  dealershipId?: string | null
  siteUrl?: string | null
  siteName?: string | null
  createdAt: string
  updatedAt: string
  expiresAt?: string | null
}

// SEOWorks webhook types
export interface SEOWorksWebhookPayload {
  eventType: 'task.created' | 'task.updated' | 'task.completed' | 'task.cancelled'
  timestamp: string
  data: {
    externalId: string
    taskType: string
    status: string
    clientId?: string
    clientEmail?: string
    agencyName?: string
    assignedTo?: string
    dueDate?: string
    completionDate?: string
    notes?: string
    deliverables?: Array<{
      type: string
      title: string
      url: string
      publishedDate?: string
    }>
  }
}

// Onboarding types
export interface DealershipOnboardingData {
  id: string
  agencyId: string
  businessName: string
  package: string
  mainBrand: string
  otherBrand?: string | null
  address: string
  city: string
  state: string
  zipCode: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  websiteUrl: string
  billingEmail: string
  siteAccessNotes?: string | null
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
  submittedBy: string
  status: string
  seoworksResponse?: any
  submittedAt?: string | null
  createdAt: string
  updatedAt: string
}

// System types
export interface SystemSettings {
  id: string
  maintenanceMode: boolean
  newUserRegistration: boolean
  emailNotifications: boolean
  auditLogging: boolean
  maxUsersPerAgency: number
  maxRequestsPerUser: number
  maxFileUploadSize: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpFromEmail: string
  maintenanceMessage: string
  welcomeMessage: string
  rateLimitPerMinute: number
  sessionTimeoutMinutes: number
  createdAt: string
  updatedAt: string
}

// Audit log types
export interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  userEmail: string
  userId?: string | null
  details?: any
  resource?: string | null
  createdAt: string
}