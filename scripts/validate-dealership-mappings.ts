#!/usr/bin/env tsx

/**
 * Dealership Property Mapping Validation Script
 * 
 * Run this script whenever adding new dealerships to ensure:
 * 1. No duplicate property IDs (unless intentional)
 * 2. All property IDs are valid format
 * 3. All required fields are present
 * 4. No conflicts with existing mappings
 * 
 * Usage: npx tsx scripts/validate-dealership-mappings.ts
 */

import { DEALERSHIP_PROPERTY_MAPPINGS, DealershipPropertyMapping } from '@/lib/dealership-property-mapping'
import { logger } from '@/lib/logger'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalMappings: number
    withGA4Access: number
    withoutGA4Access: number
    uniqueProperties: number
  }
}

function validateDealershipMappings(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  console.log('🔍 Validating dealership property mappings...\n')
  
  // Basic validation
  DEALERSHIP_PROPERTY_MAPPINGS.forEach((mapping, index) => {
    const prefix = `Mapping ${index + 1} (${mapping.dealershipId}):`
    
    // Required fields
    if (!mapping.dealershipId) {
      errors.push(`${prefix} Missing dealershipId`)
    }
    if (!mapping.dealershipName) {
      errors.push(`${prefix} Missing dealershipName`)
    }
    if (!mapping.searchConsoleUrl) {
      errors.push(`${prefix} Missing searchConsoleUrl`)
    }
    
    // GA4 property validation
    if (mapping.hasAccess) {
      if (!mapping.ga4PropertyId) {
        errors.push(`${prefix} Has access but missing ga4PropertyId`)
      } else if (!/^\d+$/.test(mapping.ga4PropertyId)) {
        errors.push(`${prefix} Invalid ga4PropertyId format: ${mapping.ga4PropertyId}`)
      }
    } else {
      if (mapping.ga4PropertyId) {
        warnings.push(`${prefix} Has ga4PropertyId but hasAccess is false`)
      }
    }
    
    // URL validation
    try {
      new URL(mapping.searchConsoleUrl)
    } catch {
      errors.push(`${prefix} Invalid searchConsoleUrl: ${mapping.searchConsoleUrl}`)
    }
    
    // ID format validation
    if (mapping.dealershipId && !mapping.dealershipId.startsWith('dealer-')) {
      warnings.push(`${prefix} dealershipId should start with 'dealer-'`)
    }
  })
  
  // Duplicate detection
  const propertyIds = DEALERSHIP_PROPERTY_MAPPINGS
    .filter(m => m.ga4PropertyId && m.hasAccess)
    .map(m => m.ga4PropertyId!)
  
  const dealershipIds = DEALERSHIP_PROPERTY_MAPPINGS.map(m => m.dealershipId)
  
  // Check for duplicate property IDs
  const propertyIdCounts = new Map<string, string[]>()
  DEALERSHIP_PROPERTY_MAPPINGS.forEach(mapping => {
    if (mapping.ga4PropertyId && mapping.hasAccess) {
      if (!propertyIdCounts.has(mapping.ga4PropertyId)) {
        propertyIdCounts.set(mapping.ga4PropertyId, [])
      }
      propertyIdCounts.get(mapping.ga4PropertyId)!.push(mapping.dealershipId)
    }
  })
  
  propertyIdCounts.forEach((dealerships, propertyId) => {
    if (dealerships.length > 1) {
      warnings.push(`Property ID ${propertyId} is used by multiple dealerships: ${dealerships.join(', ')}`)
    }
  })
  
  // Check for duplicate dealership IDs
  const dealershipIdCounts = new Map<string, number>()
  dealershipIds.forEach(id => {
    dealershipIdCounts.set(id, (dealershipIdCounts.get(id) || 0) + 1)
  })
  
  dealershipIdCounts.forEach((count, id) => {
    if (count > 1) {
      errors.push(`Duplicate dealershipId: ${id}`)
    }
  })
  
  // Statistics
  const stats = {
    totalMappings: DEALERSHIP_PROPERTY_MAPPINGS.length,
    withGA4Access: DEALERSHIP_PROPERTY_MAPPINGS.filter(m => m.hasAccess && m.ga4PropertyId).length,
    withoutGA4Access: DEALERSHIP_PROPERTY_MAPPINGS.filter(m => !m.hasAccess || !m.ga4PropertyId).length,
    uniqueProperties: new Set(propertyIds).size
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats
  }
}

function printResults(result: ValidationResult) {
  console.log('📊 Validation Results:')
  console.log('='.repeat(50))
  
  // Statistics
  console.log(`Total mappings: ${result.stats.totalMappings}`)
  console.log(`With GA4 access: ${result.stats.withGA4Access}`)
  console.log(`Without GA4 access: ${result.stats.withoutGA4Access}`)
  console.log(`Unique GA4 properties: ${result.stats.uniqueProperties}`)
  console.log('')
  
  // Errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:')
    result.errors.forEach(error => console.log(`  • ${error}`))
    console.log('')
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:')
    result.warnings.forEach(warning => console.log(`  • ${warning}`))
    console.log('')
  }
  
  // Overall result
  if (result.isValid) {
    console.log('✅ All validations passed!')
  } else {
    console.log('❌ Validation failed! Please fix the errors above.')
    process.exit(1)
  }
}

// Generate a template for new dealership
function generateTemplate() {
  const template: DealershipPropertyMapping = {
    dealershipId: 'dealer-new-dealership',
    dealershipName: 'New Dealership Name',
    ga4PropertyId: '123456789', // Replace with actual property ID
    searchConsoleUrl: 'https://www.newdealership.com/',
    hasAccess: true,
    notes: 'Add any relevant notes here'
  }
  
  console.log('\n📝 Template for new dealership mapping:')
  console.log('='.repeat(50))
  console.log(JSON.stringify(template, null, 2))
}

// Main execution
if (require.main === module) {
  const result = validateDealershipMappings()
  printResults(result)
  
  if (process.argv.includes('--template')) {
    generateTemplate()
  }
  
  // Log to system logger as well
  if (result.isValid) {
    logger.info('Dealership mapping validation passed', result.stats)
  } else {
    logger.error('Dealership mapping validation failed', {
      errors: result.errors,
      warnings: result.warnings,
      stats: result.stats
    })
  }
}

export { validateDealershipMappings }
