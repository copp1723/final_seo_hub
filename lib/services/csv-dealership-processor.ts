import { parse } from '@/lib/utils/csv-parser'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { dealershipCsvRowSchema, DealershipCsvRow, CSV_VALIDATION_RULES } from '@/lib/validations/dealership-csv'
import { randomUUID } from 'crypto'

export interface ProcessingResult {
  success: boolean
  totalRows: number
  successfulRows: number
  failedRows: number
  errors: Array<{ row: number; error: string; data?: Record<string, unknown> }>
  createdDealerships: Array<{ id: string; name: string }>
  processingId: string
}

export interface ProcessingLogData {
  id: string
  senderEmail: string
  agencyId: string
  fileName: string
  fileSize: number
  status: 'processing' | 'completed' | 'partial' | 'failed'
  rowsProcessed: number
  rowsSuccessful: number
  rowsFailed: number
  errorDetails?: Record<string, unknown>
  createdAt: Date
  completedAt?: Date
}

export class CsvDealershipProcessor {
  /**
   * Create a processing log entry to track the CSV processing
   */
  static async createProcessingLog(
    senderEmail: string,
    agencyId: string,
    fileName: string,
    fileSize: number
  ): Promise<string> {
    try {
      const processingId = randomUUID()
      
      // For now, we'll store this in the audit log since we don't have a dedicated table
      // In a production environment, you'd want a dedicated csv_processing_logs table
      await prisma.audit_logs.create({
        data: {
          id: randomUUID(),
          userEmail: senderEmail,
          action: 'CSV_PROCESSING_STARTED',
          entityType: 'Dealership',
          entityId: processingId,
          details: {
            processingId,
            senderEmail,
            agencyId,
            fileName,
            fileSize,
            status: 'processing'
          }
        }
      })

      return processingId
    } catch (error) {
      logger.error('Failed to create processing log', error)
      throw new Error('Failed to initialize processing log')
    }
  }

  /**
   * Update processing log with results
   */
  static async updateProcessingLog(
    processingId: string,
    result: Partial<ProcessingResult>
  ): Promise<void> {
    try {
      const user = await prisma.users.findFirst({
        where: {
          audit_logs: {
            some: {
              details: {
                path: ['processingId'],
                equals: processingId
              }
            }
          }
        }
      })

      if (user) {
        await prisma.audit_logs.create({
          data: {
            id: randomUUID(),
            userEmail: user.email,
            action: 'CSV_PROCESSING_COMPLETED',
            entityType: 'Dealership',
            entityId: processingId,
            details: {
              processingId,
              status: result.success ? 'completed' : 'failed',
              totalRows: result.totalRows,
              successfulRows: result.successfulRows,
              failedRows: result.failedRows,
              errorCount: result.errors?.length || 0,
              createdCount: result.createdDealerships?.length || 0
            }
          }
        })
      }
    } catch (error) {
      logger.error('Failed to update processing log', error, { processingId })
    }
  }

  /**
   * Process CSV content and create dealerships
   */
  static async processCsv(
    csvContent: Buffer,
    agencyId: string,
    processingId: string
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      errors: [],
      createdDealerships: [],
      processingId
    }

    try {
      logger.info('Starting CSV processing', { processingId, agencyId })

      // Parse CSV with validation
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true
      })

      result.totalRows = records.length

      // Validate row limit to prevent abuse
      if (records.length > CSV_VALIDATION_RULES.MAX_ROWS) {
        throw new Error(`CSV cannot contain more than ${CSV_VALIDATION_RULES.MAX_ROWS} dealerships`)
      }

      if (records.length === 0) {
        throw new Error('CSV file contains no data rows')
      }

      logger.info('CSV parsed successfully', { 
        processingId, 
        totalRows: result.totalRows 
      })

      // Process each row in a database transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          const rowNumber = i + 2 // Account for header row
          
          try {
            // Clean and validate row data
            const rawRow = records[i] as Record<string, string>
            const cleanedRow = {
              name: String(rawRow.name || '').trim(),
              website: String(rawRow.website || '').trim(),
              ga4PropertyId: String(rawRow.ga4PropertyId || '').trim(),
              searchConsoleUrl: String(rawRow.searchConsoleUrl || '').trim()
            }

            // Validate row data against schema
            const validatedRow = dealershipCsvRowSchema.parse(cleanedRow)
            
            // Check for duplicate dealership name within agency
            const existingDealership = await tx.dealerships.findFirst({
              where: {
                agencyId,
                name: {
                  equals: validatedRow.name,
                  mode: 'insensitive'
                }
              }
            })

            if (existingDealership) {
              result.errors.push({
                row: rowNumber,
                error: `Dealership "${validatedRow.name}" already exists in this agency`,
                data: validatedRow
              })
              result.failedRows++
              continue
            }

            // Create dealership
            const dealership = await tx.dealerships.create({
              data: {
                name: validatedRow.name,
                website: validatedRow.website || null,
                agencyId
              }
            })

            logger.info('Created dealership', { 
              processingId, 
              dealershipId: dealership.id, 
              name: dealership.name 
            })

            // Note: GA4 and Search Console connections will be created separately
            // when users actually connect their accounts through the UI
            logger.info('Dealership created - GA4/Search Console setup will be done separately', {
              processingId,
              dealershipId: dealership.id,
              hasGA4PropertyId: !!validatedRow.ga4PropertyId,
              hasSearchConsoleUrl: !!validatedRow.searchConsoleUrl
            })

            result.createdDealerships.push({
              id: dealership.id,
              name: dealership.name
            })
            result.successfulRows++

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logger.warn('Failed to process CSV row', { 
              processingId, 
              rowNumber, 
              error: errorMessage,
              data: records[i]
            })

            result.errors.push({
              row: rowNumber,
              error: errorMessage,
              data: records[i] as Record<string, unknown>
            })
            result.failedRows++
          }
        }
      })

      // Determine overall success
      result.success = result.successfulRows > 0

      logger.info('CSV processing completed', {
        processingId,
        success: result.success,
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        failedRows: result.failedRows
      })

      // Update processing log
      await this.updateProcessingLog(processingId, result)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      logger.error('CSV processing failed', error, { processingId, agencyId })
      
      result.errors.push({
        row: 0,
        error: errorMessage
      })

      // Update processing log with failure
      await this.updateProcessingLog(processingId, { ...result,
        success: false
      })

      throw error
    }
  }

  /**
   * Validate CSV headers match expected format
   */
  static validateCsvHeaders(csvContent: Buffer): { isValid: boolean; error?: string } {
    try {
      const contentStr = csvContent.toString('utf8')
      const lines = contentStr.split('\n')
      
      if (lines.length === 0) {
        return { isValid: false, error: 'Empty CSV file' }
      }

      const headerLine = lines[0].toLowerCase().trim()
      const expectedHeaders = CSV_VALIDATION_RULES.REQUIRED_HEADERS.map(h => h.toLowerCase())
      
      // Check if all required headers are present
      const missingHeaders = expectedHeaders.filter(header => 
        !headerLine.includes(header)
      )

      if (missingHeaders.length > 0) {
        return { 
          isValid: false, 
          error: `Missing required headers: ${missingHeaders.join(', ')}. Expected: ${expectedHeaders.join(', ')}` 
        }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: 'Failed to validate CSV headers' }
    }
  }
}
