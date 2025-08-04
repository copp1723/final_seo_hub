/**
 * Application-wide constants
 */

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000
} as const

// Rate limiting constants
export const RATE_LIMITS = {
  AI: {
    WINDOW: TIME_CONSTANTS.ONE_MINUTE,
    MAX_REQUESTS: 5
  },
  API: {
    WINDOW: TIME_CONSTANTS.FIFTEEN_MINUTES,
    MAX_REQUESTS: 100
  },
  WEBHOOK: {
    WINDOW: TIME_CONSTANTS.ONE_MINUTE,
    MAX_REQUESTS: 30
  },
  AUTH: {
    WINDOW: TIME_CONSTANTS.FIFTEEN_MINUTES,
    MAX_REQUESTS: 10
  }
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

// Character limits
export const CHAR_LIMITS = {
  TITLE: 200,
  DESCRIPTION: 1000,
  SHORT_TEXT: 100,
  MEDIUM_TEXT: 500,
  LONG_TEXT: 2000,
  URL: 2048,
  EMAIL: 254
} as const

// Cache TTL
export const CACHE_TTL = {
  ANALYTICS: TIME_CONSTANTS.FIVE_MINUTES,
  USER_DATA: TIME_CONSTANTS.FIFTEEN_MINUTES,
  STATIC_DATA: TIME_CONSTANTS.ONE_HOUR
} as const

// Email types
export const EMAIL_TYPES = {
  ALL: 'all',
  REQUEST_CREATED: 'requestCreated',
  STATUS_CHANGED: 'statusChanged',
  TASK_COMPLETED: 'taskCompleted',
  WEEKLY_SUMMARY: 'weeklySummary',
  MARKETING: 'marketingEmails'
} as const

// Default values
export const DEFAULTS = {
  PAGINATION: {
    PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  TIMEZONE: 'America/New_York',
  LANGUAGE: 'en'
} as const
