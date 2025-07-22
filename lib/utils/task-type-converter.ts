/**
 * Utility functions to handle conversion between different task type formats
 * across the application to ensure consistency.
 */

import { TaskType as DatabaseTaskType } from '@prisma/client'

// Frontend and API use lowercase with underscores
export type RequestTaskType = 'page' | 'blog' | 'gbp_post' | 'improvement' | 'maintenance'

// Package utils use camelCase
export type PackageTaskType = 'pages' | 'blogs' | 'gbpPosts' | 'improvements'

/**
 * Convert frontend request type to database TaskType enum
 */
export function requestTypeToTaskType(requestType: string): DatabaseTaskType {
  const mapping: Record<string, DatabaseTaskType> = {
    'page': DatabaseTaskType.PAGE,
    'blog': DatabaseTaskType.BLOG,
    'gbp_post': DatabaseTaskType.GBP_POST,
    'improvement': DatabaseTaskType.IMPROVEMENT,
    'maintenance': DatabaseTaskType.IMPROVEMENT, // maintenance maps to improvement
  }
  
  const normalizedType = requestType.toLowerCase()
  const taskType = mapping[normalizedType]
  
  if (!taskType) {
    throw new Error(`Unknown request type: ${requestType}`)
  }
  
  return taskType
}

/**
 * Convert database TaskType enum to frontend request type
 */
export function taskTypeToRequestType(taskType: DatabaseTaskType): RequestTaskType {
  const mapping: Record<DatabaseTaskType, RequestTaskType> = {
    [DatabaseTaskType.PAGE]: 'page',
    [DatabaseTaskType.BLOG]: 'blog',
    [DatabaseTaskType.GBP_POST]: 'gbp_post',
    [DatabaseTaskType.IMPROVEMENT]: 'improvement',
  }
  
  return mapping[taskType]
}

/**
 * Convert request type to package usage type
 */
export function requestTypeToPackageType(requestType: string): PackageTaskType {
  const mapping: Record<string, PackageTaskType> = {
    'page': 'pages',
    'blog': 'blogs',
    'gbp_post': 'gbpPosts',
    'gbp-post': 'gbpPosts', // Handle both formats
    'improvement': 'improvements',
    'maintenance': 'improvements', // maintenance maps to improvements
  }
  
  const normalizedType = requestType.toLowerCase()
  const packageType = mapping[normalizedType]
  
  if (!packageType) {
    throw new Error(`Unknown request type for package tracking: ${requestType}`)
  }
  
  return packageType
}

/**
 * Validate if a string is a valid request type
 */
export function isValidRequestType(type: string): type is RequestTaskType {
  const validTypes: RequestTaskType[] = ['page', 'blog', 'gbp_post', 'improvement', 'maintenance']
  return validTypes.includes(type.toLowerCase() as RequestTaskType)
}

/**
 * Normalize task type string for consistent comparisons
 */
export function normalizeTaskType(taskType: string): string {
  return taskType.toLowerCase().replace(/-/g, '_')
}