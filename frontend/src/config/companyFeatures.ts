/**
 * Configuration and feature detection for company-specific modules.
 * Ensures that only specified companies have access to unique modules such as Lending.
 */

export const LENDING_ENABLED_COMPANY_NAMES = [
  'JK Property and Ventures',
  'FilCap Prime Holdings Corp.',
] as const

/**
 * Checks whether the given company is authorized to have the Lending module/tab.
 * Normalizes company names to handle common variants (e.g., "JK Property Ventures Corp.",
 * "Filcam Prime Holdings Corp.", etc.).
 */
export function isLendingEnabledCompany(companyName?: string | null): boolean {
  if (!companyName) return false
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  // Explicitly match JK Property & FilCap/Filcam variants
  const isJKProperty =
    normalized.includes('jkproperty') ||
    normalized.includes('jkpropertyandventures') ||
    normalized.includes('jkpropertyventures')
  
  const isFilCap =
    normalized.includes('filcap') ||
    normalized.includes('filcam')

  return isJKProperty || isFilCap
}
