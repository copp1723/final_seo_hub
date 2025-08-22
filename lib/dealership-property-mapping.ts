/**
 * Dealership to GA4 Property ID and Search Console URL mapping
 * This maps each dealership to their specific Google Analytics property and Search Console site
 */

export interface DealershipPropertyMapping {
  dealershipId: string
  dealershipName: string
  ga4PropertyId: string | null
  searchConsoleUrl: string
  hasAccess: boolean
  notes?: string
}

export const DEALERSHIP_PROPERTY_MAPPINGS: DealershipPropertyMapping[] = [
  {
    dealershipId: 'dealer-jhc-columbus',
    dealershipName: 'Jay Hatfield Chevrolet of Columbus',
    ga4PropertyId: '323480238',
    searchConsoleUrl: 'https://www.jayhatfieldchevy.net/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhc-chanute',
    dealershipName: 'Jay hatfield Chevrolet GMC of Chanute',
    ga4PropertyId: '323404832',
    searchConsoleUrl: 'https://www.jayhatfieldchanute.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhc-pittsburg',
    dealershipName: 'Jay Hatfield Chevrolet GMC of Pittsburg',
    ga4PropertyId: '371672738',
    searchConsoleUrl: 'https://www.jayhatfieldchevroletgmc.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhc-vinita',
    dealershipName: 'Jay Hatfield Chevrolet of Vinita',
    ga4PropertyId: '320759942',
    searchConsoleUrl: 'https://www.jayhatfieldchevroletvinita.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhdjr-frontenac',
    dealershipName: 'Jay Hatfield CDJR of Frontenac',
    ga4PropertyId: '323415736',
    searchConsoleUrl: 'https://www.jayhatfieldchryslerdodgejeepram.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-sarcoxie-ford',
    dealershipName: 'Sarcoxie Ford',
    ga4PropertyId: '452793966',
    searchConsoleUrl: 'https://www.sarcoxieford.com',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhhp-wichita',
    dealershipName: 'Jay Hatfield Honda Powerhouse',
    ga4PropertyId: '336729443',
    searchConsoleUrl: 'https://www.jayhatfieldhondawichita.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhm-wichita',
    dealershipName: 'Jay Hatfield Motorsports of Wichita',
    ga4PropertyId: '317592148',
    searchConsoleUrl: 'https://www.kansasmotorsports.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhm-frontenac',
    dealershipName: 'Jay Hatfield Motorsports of Frontenac',
    ga4PropertyId: '317608467',
    searchConsoleUrl: 'https://www.jayhatfieldkawasaki.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhm-joplin',
    dealershipName: 'Jay Hatfield Motorsports of Joplin',
    ga4PropertyId: '317578343',
    searchConsoleUrl: 'https://www.jhmofjoplin.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-acura-columbus',
    dealershipName: 'Acura of Columbus',
    ga4PropertyId: '284944578',
    searchConsoleUrl: 'https://www.acuracolumbus.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-genesis-wichita',
    dealershipName: 'Genesis of Wichita',
    ga4PropertyId: '323502411',
    searchConsoleUrl: 'https://www.genesisofwichita.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhm-portal',
    dealershipName: 'Jay Hatfield Motorsports Portal',
    ga4PropertyId: '461644624',
    searchConsoleUrl: 'http://jayhatfieldmotorsports.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-jhm-ottawa',
    dealershipName: 'Jay Hatfield Motorsports Ottawa',
    ga4PropertyId: '472110523',
    searchConsoleUrl: 'https://www.jayhatfieldottawa.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-hatchett-hyundai-east',
    dealershipName: 'Hatchett Hyundai East',
    ga4PropertyId: '323448557',
    searchConsoleUrl: 'https://www.hatchetthyundaieast.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-hatchett-hyundai-west',
    dealershipName: 'Hatchett Hyundai West',
    ga4PropertyId: '323465145',
    searchConsoleUrl: 'https://www.hatchetthyundaiwest.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-premier-mitsubishi',
    dealershipName: 'Premier Mitsubishi',
    ga4PropertyId: '473660351',
    searchConsoleUrl: 'https://premiermitsubishi.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-premier-auto-tucson',
    dealershipName: 'Premier Auto Center - Tucson',
    ga4PropertyId: '470694371',
    searchConsoleUrl: 'https://scottsaysyes.com/',
    hasAccess: true
  },
  {
    dealershipId: 'dealer-world-kia',
    dealershipName: 'World Kia',
    ga4PropertyId: null,
    searchConsoleUrl: 'https://www.worldkiajoliet.com/',
    hasAccess: false,
    notes: 'No access yet'
  },
  {
    dealershipId: 'dealer-aeo-powersports',
    dealershipName: 'AEO Powersports',
    ga4PropertyId: null,
    searchConsoleUrl: 'https://aeopowersports.com/',
    hasAccess: false,
    notes: 'No access yet'
  },
  {
    dealershipId: 'dealer-columbus-auto-group',
    dealershipName: 'Columbus Auto Group',
    ga4PropertyId: null,
    searchConsoleUrl: 'https://columbusautogroup.com/',
    hasAccess: false,
    notes: 'No access (pending name change?)'
  },
  {
    dealershipId: 'dealer-winnebago-rockford',
    dealershipName: 'Winnebago of Rockford',
    ga4PropertyId: null,
    searchConsoleUrl: 'https://www.winnebagomotorhomes.com/',
    hasAccess: false,
    notes: 'Not launched'
  }
]

/**
 * Get GA4 property ID for a specific dealership
 */
export function getGA4PropertyId(dealershipId: string): string | null {
  const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)
  return mapping?.ga4PropertyId || null
}

/**
 * Check if a dealership has any mapping (GA4 or Search Console)
 */
export function hasDealershipMapping(dealershipId: string): boolean {
  const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)
  return !!mapping
}

/**
 * Get Search Console URL for a specific dealership
 */
export function getSearchConsoleUrl(dealershipId: string): string | null {
  const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)
  return mapping?.searchConsoleUrl || null
}

/**
 * Check if dealership has GA4 access
 */
export function hasGA4Access(dealershipId: string): boolean {
  const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)
  return mapping?.hasAccess && mapping?.ga4PropertyId !== null || false
}

/**
 * Get all dealerships with GA4 access
 */
export function getDealershipsWithGA4Access(): DealershipPropertyMapping[] {
  return DEALERSHIP_PROPERTY_MAPPINGS.filter(m => m.hasAccess && m.ga4PropertyId !== null)
}
