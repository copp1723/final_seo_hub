import { NextResponse } from 'next/server'

// GET endpoint to view the onboarding JSON format
export async function GET() {
  const samplePayload = {
    timestamp: "2024-03-15T10:30:00Z",
    businessName: "Example Dealership",
    package: "GOLD",
    mainBrand: "Toyota",
    otherBrand: "Lexus",
    address: "123 Main Street",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    contactName: "John Smith",
    contactTitle: "General Manager",
    email: "john.smith@example.com",
    phone: "(512) 555-0123",
    websiteUrl: "https://www.exampledealership.com",
    billingEmail: "billing@exampledealership.com",
    siteAccessNotes: "WordPress admin access will be provided via email",
    targetVehicleModels: "Toyota Camry;Toyota RAV4;Toyota Highlander;Lexus RX350",
    targetCities: "Austin;Round Rock;Cedar Park;Georgetown;Pflugerville",
    targetDealers: "Competitor Auto Group;City Motors;Premier Toyota of Downtown"
  }
  
  return NextResponse.json({
    description: "This is the exact JSON format that will be sent to your webhook endpoint",
    notes: {
      authentication: "Include 'x-api-key' header with your provided API key",
      semicolonDelimited: "targetVehicleModels, targetCities, and targetDealers are semicolon-delimited strings",
      minimumItems: "Each semicolon-delimited field will have at least 3 items",
      optionalFields: "otherBrand and siteAccessNotes may be empty strings"
    },
    examplePayload: samplePayload,
    expectedResponse: {
      success: {
        success: true,
        message: "Onboarding received",
        referenceId: "optional-reference-id"
      },
      error: {
        success: false,
        error: "Error message"
      }
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}