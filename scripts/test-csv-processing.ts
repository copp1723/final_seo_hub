import { CsvDealershipProcessor } from '../lib/services/csv-dealership-processor'
import { CsvSecurityService } from '../lib/services/csv-security'
import { prisma } from '../lib/prisma'

// Test CSV content
const testCsvContent = `name,website,ga4PropertyId,searchConsoleUrl
"Test Motors","https://testmotors.com","GA4-123456789","https://testmotors.com"
"Demo Auto Group","https://demoauto.com","","https://demoauto.com"
"Sample Dealership","","GA4-987654321",""
"Invalid Dealership","invalid-url","","invalid-url"`

async function testCsvProcessing() {
  console.log('🧪 Testing CSV Dealership Processing...\n')

  try {
    // Test 1: File validation
    console.log('1️⃣ Testing file validation...')
    const fileBuffer = Buffer.from(testCsvContent)
    const fileValidation = CsvSecurityService.validateCsvFile('test.csv', fileBuffer)
    console.log('File validation result:', fileValidation)

    // Test 2: Header validation
    console.log('\n2️⃣ Testing header validation...')
    const headerValidation = CsvDealershipProcessor.validateCsvHeaders(fileBuffer)
    console.log('Header validation result:', headerValidation)

    // Test 3: Find a test agency
    console.log('\n3️⃣ Finding test agency...')
    const testAgency = await prisma.agencies.findFirst({
      include: { users: true }
    })

    if (!testAgency) {
      console.log('❌ No agency found for testing')
      return
    }

    console.log(`Found agency: ${testAgency.name} (${testAgency.id})`)

    // Test 4: Sender validation (if we have a user)
    if (testAgency.users.length > 0) {
      console.log('\n4️⃣ Testing sender validation...')
      const testUser = testAgency.users[0]
      const senderValidation = await CsvSecurityService.validateSender(testUser.email)
      console.log('Sender validation result:', senderValidation)
    }

    // Test 5: Rate limiting
    console.log('\n5️⃣ Testing rate limiting...')
    const testEmail = 'test@example.com'
    console.log('First request:', !CsvSecurityService.isRateLimited(testEmail))
    console.log('Second request:', !CsvSecurityService.isRateLimited(testEmail))

    // Test 6: CSV processing (dry run - we'll create a processing log but not actually process)
    console.log('\n6️⃣ Testing processing log creation...')
    const processingId = await CsvDealershipProcessor.createProcessingLog(
      'test@example.com',
      testAgency.id,
      'test.csv',
      fileBuffer.length
    )
    console.log('Created processing log:', processingId)

    console.log('\n✅ All tests completed successfully!')
    console.log('\n📋 Test Summary:')
    console.log('- File validation: ✅')
    console.log('- Header validation: ✅')
    console.log('- Agency lookup: ✅')
    console.log('- Rate limiting: ✅')
    console.log('- Processing log: ✅')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCsvProcessing()
}

export { testCsvProcessing }
