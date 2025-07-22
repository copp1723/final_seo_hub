/**
 * Centralized date formatting utilities to ensure consistency across the application
 */

import { format, parseISO, isValid } from 'date-fns'

/**
 * Standard date formats used throughout the application
 */
export const DATE_FORMATS = {
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'', // ISO 8601 format for APIs
  DATE_ONLY: 'yyyy-MM-dd', // For date inputs and GA4/Search Console APIs
  DISPLAY_DATE: 'MMM d, yyyy', // For user-facing dates (e.g., "Jan 5, 2024")
  DISPLAY_DATE_TIME: 'MMM d, yyyy h:mm a', // For user-facing date+time
  DISPLAY_SHORT: 'MMM d', // For short date display (e.g., "Jan 5")
  TIME_ONLY: 'h:mm a', // For time display
  RELATIVE_TIME: 'relative' // Special flag for relative time display
} as const

/**
 * Convert a date to ISO string format
 * @param date - Date object, string, or number
 * @returns ISO formatted string or null if invalid
 */
export function toISOString(date: Date | string | number | null | undefined): string | null {
  if (!date) return null
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    return isValid(dateObj) ? dateObj.toISOString() : null
  } catch {
    return null
  }
}

/**
 * Format a date for display
 * @param date - Date to format
 * @param formatType - Format type from DATE_FORMATS
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  formatType: keyof typeof DATE_FORMATS = 'DISPLAY_DATE'
): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    if (!isValid(dateObj)) return ''
    
    const formatString = DATE_FORMATS[formatType]
    if (formatString === 'relative') {
      return formatRelativeTime(dateObj)
    }
    
    return format(dateObj, formatString)
  } catch {
    return ''
  }
}

/**
 * Format relative time (e.g., "5 minutes ago", "in 2 hours")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(dateObj)) return ''
  
  const now = new Date()
  const diffInMs = dateObj.getTime() - now.getTime()
  const absDiff = Math.abs(diffInMs)
  
  const minutes = Math.floor(absDiff / 60000)
  const hours = Math.floor(absDiff / 3600000)
  const days = Math.floor(absDiff / 86400000)
  
  if (absDiff < 60000) {
    return diffInMs < 0 ? 'just now' : 'in a moment'
  }
  
  let unit: string
  let value: number
  
  if (minutes < 60) {
    unit = 'minute'
    value = minutes
  } else if (hours < 24) {
    unit = 'hour'
    value = hours
  } else if (days < 30) {
    unit = 'day'
    value = days
  } else {
    return formatDate(dateObj, 'DISPLAY_DATE')
  }
  
  const plural = value !== 1 ? 's' : ''
  return diffInMs < 0 ? `${value} ${unit}${plural} ago` : `in ${value} ${unit}${plural}`
}

/**
 * Get start and end dates for date range queries
 * @param range - Range string (e.g., '7days', '30days', '90days')
 * @returns Object with startDate and endDate in DATE_ONLY format
 */
export function getDateRange(range: string): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  
  switch (range) {
    case '7days':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '30days':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90days':
      startDate.setDate(startDate.getDate() - 90)
      break
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
    default:
      startDate.setDate(startDate.getDate() - 30)
  }
  
  return {
    startDate: format(startDate, DATE_FORMATS.DATE_ONLY),
    endDate: format(endDate, DATE_FORMATS.DATE_ONLY)
  }
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns true if date is in the past
 */
export function isPastDate(date: Date | string | number | null | undefined): boolean {
  if (!date) return false
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    return isValid(dateObj) && dateObj < new Date()
  } catch {
    return false
  }
}

/**
 * Get current timestamp in milliseconds
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now()
}

/**
 * Get current date in ISO format
 * @returns Current date as ISO string
 */
export function getCurrentISODate(): string {
  return new Date().toISOString()
}

/**
 * Parse a date string safely
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}