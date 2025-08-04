interface EnvConfig {
  name: string
  required: boolean
  description?: string
  validator?: (value: string) => boolean | string
  defaultValue?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
}

const ENV_CONFIG: EnvConfig[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validator: (value) => {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'DATABASE_URL must be a valid PostgreSQL connection string'
      }
      return true
    }
  },

  // Authentication
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'Secret key for NextAuth.js session encryption',
    validator: (value) => {
      if (value.length < 32) {
        return 'NEXTAUTH_SECRET must be at least 32 characters long'
      }
      return true
    }
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    description: 'Base URL for the application',
    validator: (value) => {
      try {
        const url = new URL(value)
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          return 'NEXTAUTH_URL must use HTTPS in production'
        }
        return true
      } catch {
        return 'NEXTAUTH_URL must be a valid URL'
      }
    }
  },

  // Google OAuth
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth client ID',
    validator: (value) => {
      if (!value.endsWith('.googleusercontent.com')) {
        return 'GOOGLE_CLIENT_ID should end with .googleusercontent.com'
      }
      return true
    }
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    description: 'Google OAuth client secret',
    validator: (value) => {
      if (value.length < 20) {
        return 'GOOGLE_CLIENT_SECRET appears to be too short'
      }
      return true
    }
  },

  // Security
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    description: 'Key for encrypting sensitive data',
    validator: (value) => {
      if (value.length !== 64) {
        return 'ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)'
      }
      if (!/^[a-fA-F0-9]+$/.test(value)) {
        return 'ENCRYPTION_KEY must be a valid hex string'
      }
      return true
    }
  },
  {
    name: 'CSRF_SECRET',
    required: true,
    description: 'Secret for CSRF token generation',
    validator: (value) => {
      if (value.length < 32) {
        return 'CSRF_SECRET must be at least 32 characters long'
      }
      return true
    }
  },
  {
    name: 'GA4_TOKEN_ENCRYPTION_KEY',
    required: true,
    description: 'Key for encrypting GA4 tokens',
    validator: (value) => {
      if (value.length !== 64) {
        return 'GA4_TOKEN_ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)'
      }
      if (!/^[a-fA-F0-9]+$/.test(value)) {
        return 'GA4_TOKEN_ENCRYPTION_KEY must be a valid hex string'
      }
      return true
    }
  },

  // Mailgun
  {
    name: 'MAILGUN_API_KEY',
    required: true,
    description: 'Mailgun API key for email services',
    validator: (value) => {
      // Modern Mailgun API keys are 32-character hex strings
      if (value.length < 32) {
        return 'MAILGUN_API_KEY should be at least 32 characters'
      }
      return true
    }
  },
  {
    name: 'MAILGUN_DOMAIN',
    required: true,
    description: 'Mailgun domain for sending emails',
    validator: (value) => {
      if (!value.includes('.')) {
        return 'MAILGUN_DOMAIN should be a valid domain name'
      }
      return true
    }
  },
  {
    name: 'MAILGUN_REGION',
    required: false,
    description: 'Mailgun region (US or EU)',
    defaultValue: 'US',
    validator: (value) => {
      if (!['US', 'EU'].includes(value)) {
        return 'MAILGUN_REGION must be either "US" or "EU"'
      }
      return true
    }
  },
  {
    name: 'MAILGUN_WEBHOOK_SIGNING_KEY',
    required: true,
    description: 'Mailgun webhook signing key for verification'
  },

  // SEOWorks Integration
  {
    name: 'SEOWORKS_WEBHOOK_SECRET',
    required: true,
    description: 'Secret for SEOWorks webhook authentication',
    validator: (value) => {
      if (value.length < 32) {
        return 'SEOWORKS_WEBHOOK_SECRET must be at least 32 characters long'
      }
      return true
    }
  },
  {
    name: 'SEOWORKS_API_KEY',
    required: true,
    description: 'API key for SEOWorks integration'
  },

  // AI Integration
  {
    name: 'OPENROUTER_API_KEY',
    required: false,
    description: 'OpenRouter API key for AI features',
    validator: (value) => {
      if (value && !value.startsWith('sk-')) {
        return 'OPENROUTER_API_KEY should start with "sk-"'
      }
      return true
    }
  },

  // Caching
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection string for caching',
    validator: (value) => {
      if (value && !value.startsWith('redis://') && !value.startsWith('rediss://')) {
        return 'REDIS_URL must be a valid Redis connection string'
      }
      return true
    }
  },

  // Application
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'Public URL for the application',
    validator: (value) => {
      try {
        const url = new URL(value)
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          return 'NEXT_PUBLIC_APP_URL must use HTTPS in production'
        }
        return true
      } catch {
        return 'NEXT_PUBLIC_APP_URL must be a valid URL'
      }
    }
  },
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    validator: (value) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return 'NODE_ENV must be development, production, or test'
      }
      return true
    }
  },

  // Performance
  {
    name: 'API_SLOW_THRESHOLD_MS',
    required: false,
    defaultValue: '1000',
    validator: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num < 100 || num > 30000) {
        return 'API_SLOW_THRESHOLD_MS must be a number between 100 and 30000'
      }
      return true
    }
  },

  // Cron Jobs
  {
    name: 'CRON_SECRET',
    required: false,
    description: 'Secret for authenticating cron job requests',
    validator: (value) => {
      if (value && value.length < 32) {
        return 'CRON_SECRET must be at least 32 characters long'
      }
      return true
    }
  },

  // Database Configuration (Optional)
  {
    name: 'DB_CONNECTION_LIMIT',
    required: false,
    defaultValue: '10',
    validator: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num < 1 || num > 100) {
        return 'DB_CONNECTION_LIMIT must be a number between 1 and 100'
      }
      return true
    }
  },
  {
    name: 'DB_POOL_TIMEOUT',
    required: false,
    defaultValue: '30',
    validator: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num < 1 || num > 300) {
        return 'DB_POOL_TIMEOUT must be a number between 1 and 300 seconds'
      }
      return true
    }
  },

  // CORS Configuration
  {
    name: 'CORS_ALLOWED_ORIGINS',
    required: false,
    description: 'Comma-separated list of allowed CORS origins'
  }
]

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    missing: []
  }

  for (const config of ENV_CONFIG) {
    const value = process.env[config.name]

    // Check if required variable is missing
    if (config.required && !value) {
      result.missing.push(config.name)
      result.errors.push(`Missing required environment variable: ${config.name}`)
      continue
    }

    // Use default value if provided and variable is missing
    if (!value && config.defaultValue) {
      process.env[config.name] = config.defaultValue
      result.warnings.push(`Using default value for ${config.name}: ${config.defaultValue}`)
      continue
    }

    // Skip validation if value is not set and not required
    if (!value) {
      continue
    }

    // Run custom validator if provided
    if (config.validator) {
      const validationResult = config.validator(value)
      if (validationResult !== true) {
        result.errors.push(`${config.name}: ${validationResult}`)
      }
    }
  }

  // Additional security checks
  if (process.env.NODE_ENV === 'production') {
    // Check for development-only values in production
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      result.errors.push('NEXTAUTH_URL cannot use localhost in production')
    }
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      result.errors.push('NEXT_PUBLIC_APP_URL cannot use localhost in production')
    }
    
    // Warn about weak secrets
    if (process.env.NEXTAUTH_SECRET === 'your-secret-key') {
      result.errors.push('NEXTAUTH_SECRET is using the default example value')
    }
    if (process.env.ENCRYPTION_KEY === 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890') {
      result.errors.push('ENCRYPTION_KEY is using the default example value')
    }
  }

  result.isValid = result.errors.length === 0

  return result
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment()
  
  console.log('\n🔧 Environment Variable Validation:')
  
  if (validation.isValid) {
    console.log('✅ All environment variables are valid')
  } else {
    console.log('❌ Environment validation failed')
  }
  
  if (validation.missing.length > 0) {
    console.log('\n❌ Missing required variables:')
    validation.missing.forEach(name => {
      const config = ENV_CONFIG.find(c => c.name === name)
      console.log(`  - ${name}${config?.description ? `: ${config.description}` : ''}`)
    })
  }
  
  if (validation.errors.length > 0) {
    console.log('\n❌ Validation errors:')
    validation.errors.forEach(error => console.log(`  - ${error}`))
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    validation.warnings.forEach(warning => console.log(`  - ${warning}`))
  }
  
  console.log(`\n📊 Environment status: ${validation.isValid ? 'VALID' : 'INVALID'}`)
  console.log(`   Required variables: ${ENV_CONFIG.filter(c => c.required).length}`)
  console.log(`   Optional variables: ${ENV_CONFIG.filter(c => !c.required).length}`)
  console.log(`   Missing variables: ${validation.missing.length}`)
  console.log(`   Validation errors: ${validation.errors.length}`)
  console.log(`   Warnings: ${validation.warnings.length}\n`)
}

// Utility function to get required environment variables with validation
export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Utility function to get optional environment variables with default
export function getOptionalEnv(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue
}

// Export the configuration for external use
export { ENV_CONFIG }