// Shared Dealership types and utilities

export interface DealershipData {
  name: string;
  website?: string;
  ga4PropertyId?: string;
  ga4MeasurementId?: string;
  clientEmail?: string;
  clientId?: string;
  searchConsoleUrl?: string;
}

// Function to generate clientId from business name and location
export function generateClientId(businessName: string, website: string): string {
  // Extract location from website domain
  let location = '';
  try {
    const url = new URL(website);
    location = url.hostname.split('.')[0];
  } catch {
    location = businessName.replace(/\s+/g, '').toLowerCase();
  }
  // Simplify business name
  const simplifiedName = businessName
    .toLowerCase()
    .replace(/motorsports/g, 'motors')
    .replace(/powerhouse/g, '')
    .replace(/auto group/g, 'autogroup')
    .replace(/premier/g, 'premier')
    .replace(/hatchett/g, 'hatchett')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `user_${simplifiedName}_${location}_2024`;
}
