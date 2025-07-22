/**
 * Safe data access utilities to prevent null/undefined errors
 */

/**
 * Safely get a nested property value from an object
 * @param obj - The object to access
 * @param path - The property path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if property doesn't exist
 * @returns The property value or default value
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue: T | null = null
): T | null {
  if (!obj || typeof obj !== 'object') return defaultValue
  
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') return defaultValue
    result = result[key]
  }
  
  return result ?? defaultValue
}

/**
 * Check if a value is null or undefined
 * @param value - Value to check
 * @returns true if null or undefined
 */
export function isNullish(value: any): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns true if empty
 */
export function isEmpty(value: any): boolean {
  if (isNullish(value)) return true
  if (value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && Object.keys(value).length === 0) return true
  return false
}

/**
 * Ensure a value is an array
 * @param value - Value to check
 * @returns Array containing the value or empty array
 */
export function ensureArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (isNullish(value)) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Ensure a value is a string
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns String value
 */
export function ensureString(value: any, defaultValue: string = ''): string {
  if (isNullish(value)) return defaultValue
  if (typeof value === 'string') return value
  return String(value)
}

/**
 * Ensure a value is a number
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Number value
 */
export function ensureNumber(value: any, defaultValue: number = 0): number {
  if (isNullish(value)) return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Ensure a value is a boolean
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Boolean value
 */
export function ensureBoolean(value: any, defaultValue: boolean = false): boolean {
  if (isNullish(value)) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1' || value === 1) return true
  if (value === 'false' || value === '0' || value === 0) return false
  return defaultValue
}

/**
 * Parse JSON safely
 * @param jsonString - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeParseJSON<T = any>(jsonString: string | null | undefined, defaultValue: T | null = null): T | null {
  if (!jsonString) return defaultValue
  
  try {
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

/**
 * Stringify JSON safely
 * @param obj - Object to stringify
 * @param defaultValue - Default value if stringify fails
 * @returns JSON string or default value
 */
export function safeStringifyJSON(obj: any, defaultValue: string = '{}'): string {
  if (isNullish(obj)) return defaultValue
  
  try {
    return JSON.stringify(obj)
  } catch {
    return defaultValue
  }
}

/**
 * Remove null/undefined properties from an object
 * @param obj - Object to clean
 * @returns Object without null/undefined properties
 */
export function removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (!isNullish(value)) {
      result[key as keyof T] = value
    }
  }
  
  return result
}

/**
 * Provide default values for null/undefined properties
 * @param obj - Object to provide defaults for
 * @param defaults - Default values
 * @returns Object with defaults applied
 */
export function withDefaults<T extends Record<string, any>>(
  obj: Partial<T> | null | undefined,
  defaults: T
): T {
  if (!obj) return { ...defaults }
  
  const result = { ...defaults }
  
  for (const [key, value] of Object.entries(obj)) {
    if (!isNullish(value)) {
      result[key as keyof T] = value
    }
  }
  
  return result
}

/**
 * Type guard to check if value is defined
 * @param value - Value to check
 * @returns true if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard to check if value is a valid string
 * @param value - Value to check
 * @returns true if value is a non-empty string
 */
export function isValidString(value: any): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Type guard to check if value is a valid number
 * @param value - Value to check
 * @returns true if value is a finite number
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && isFinite(value)
}

/**
 * Type guard to check if value is a valid array
 * @param value - Value to check
 * @returns true if value is a non-empty array
 */
export function isValidArray<T = any>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Type guard to check if value is a valid object
 * @param value - Value to check
 * @returns true if value is a non-null object
 */
export function isValidObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}