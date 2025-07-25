import { Prisma } from '@prisma/client'
import { logger } from './logger'

export enum PrismaErrorCode {
  UniqueConstraintViolation = 'P2002',
  ForeignKeyConstraintViolation = 'P2003',
  RecordNotFound = 'P2025',
  RelatedRecordNotFound = 'P2015',
  QueryParameterLimitExceeded = 'P2008',
  RawQueryFailed = 'P2010',
  NullConstraintViolation = 'P2011',
  MissingRequiredValue = 'P2012',
  InvalidFieldValue = 'P2023',
  TooManyConnections = 'P2024',
  TimedOut = 'P2026',
  DatabaseAlreadyExists = 'P2009',
  AuthenticationFailed = 'P1000',
  CouldNotConnectToDatabase = 'P1001',
  ConnectionTimedOut = 'P1002',
  DatabaseDoesNotExist = 'P1003',
  OperationTimedOut = 'P1008',
  TooManyRequests = 'P1009'
}

export interface PrismaErrorInfo {
  code: string
  message: string
  userMessage: string
  statusCode: number
  shouldRetry: boolean
}

export function handlePrismaError(error: unknown): PrismaErrorInfo {
  // Default error info
  const defaultError: PrismaErrorInfo = {
    code: 'UNKNOWN',
    message: 'An unexpected database error occurred',
    userMessage: 'Something went wrong. Please try again later.',
    statusCode: 500,
    shouldRetry: false
  }

  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      logger.error('Database initialization error', error)
      return {
        code: 'DB_INIT_ERROR',
        message: error.message,
        userMessage: 'Database connection failed. Please try again later.',
        statusCode: 503,
        shouldRetry: true
      }
    }
    
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      logger.error('Database panic error', error)
      return {
        code: 'DB_PANIC',
        message: error.message,
        userMessage: 'A critical database error occurred. Please contact support.',
        statusCode: 500,
        shouldRetry: false
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error('Database validation error', error)
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        userMessage: 'Invalid data provided. Please check your input.',
        statusCode: 400,
        shouldRetry: false
      }
    }

    return defaultError
  }

  // Handle specific Prisma error codes
  switch (error.code) {
    case PrismaErrorCode.UniqueConstraintViolation:
      const field = error.meta?.target as string[] | undefined
      return {
        code: error.code,
        message: error.message,
        userMessage: field ? `This ${field.join(', ')} already exists.` : 'This record already exists.',
        statusCode: 409,
        shouldRetry: false
      }

    case PrismaErrorCode.ForeignKeyConstraintViolation:
      return {
        code: error.code,
        message: error.message,
        userMessage: 'Related record not found. Please check your references.',
        statusCode: 400,
        shouldRetry: false
      }

    case PrismaErrorCode.RecordNotFound:
      return {
        code: error.code,
        message: error.message,
        userMessage: 'Record not found.',
        statusCode: 404,
        shouldRetry: false
      }

    case PrismaErrorCode.NullConstraintViolation:
      const nullField = error.meta?.field_name as string | undefined
      return {
        code: error.code,
        message: error.message,
        userMessage: nullField ? `${nullField} is required.` : 'Required field is missing.',
        statusCode: 400,
        shouldRetry: false
      }

    case PrismaErrorCode.TooManyConnections:
    case PrismaErrorCode.CouldNotConnectToDatabase:
    case PrismaErrorCode.ConnectionTimedOut:
      return {
        code: error.code,
        message: error.message,
        userMessage: 'Database connection issue. Please try again.',
        statusCode: 503,
        shouldRetry: true
      }

    case PrismaErrorCode.TimedOut:
    case PrismaErrorCode.OperationTimedOut:
      return {
        code: error.code,
        message: error.message,
        userMessage: 'Request timed out. Please try again.',
        statusCode: 504,
        shouldRetry: true
      }

    case PrismaErrorCode.AuthenticationFailed:
      return {
        code: error.code,
        message: error.message,
        userMessage: 'Database authentication failed.',
        statusCode: 500,
        shouldRetry: false
      }

    default:
      logger.error('Unhandled Prisma error', { code: error.code, meta: error.meta })
      return defaultError
  }
}

// Utility function to retry database operations with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorInfo = handlePrismaError(error)
      
      if (!errorInfo.shouldRetry || attempt === maxRetries - 1) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, attempt)
      logger.warn(`Database operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        errorCode: errorInfo.code
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Transaction wrapper with proper error handling
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(operation, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    })
  } catch (error) {
    const errorInfo = handlePrismaError(error)
    logger.error('Transaction failed', { 
      error: errorInfo.message,
      code: errorInfo.code 
    })
    throw error
  }
}

// Add this import to your prisma client file
import { prisma } from './prisma'