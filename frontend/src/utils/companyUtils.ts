/**
 * Company normalization and alias matching utilities for MCT Centralized Financial Management System
 */

export const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  'mct kitchen': ['mycity.kitchen', 'mycity kitchen', 'kitchen'],
  'kitchen': ['mycity.kitchen', 'mycity kitchen', 'kitchen'],
  'mct hotel': ['mctolentino', 'hotel', 'hospitality'],
  'hotel': ['mctolentino', 'hotel', 'hospitality'],
  'speedbox': ['speedfire construction', 'speedfire'],
  'speedfire': ['speedfire construction', 'speedfire', 'speedbox'],
  'jk printing': ['jk global printing', 'jk global headways', 'printing'],
  'jk property': ['jk property and ventures', 'property ventures'],
  'jk property and ventures': ['jk property and ventures corporation', 'property ventures'],
  'golden sunburst': ['golden jupiter property ventures', 'golden jupiter', 'golden sunburst'],
  'golden sunburst ventures': ['golden jupiter property ventures', 'golden jupiter', 'golden sunburst'],
  'filcap': ['filcap prime holdings', 'filcam', 'filcap'],
  'filcap prime holdings corp.': ['filcap prime holdings', 'filcap', 'filcam'],
  'far east asia': ['far east asia trading corporation', 'far east asia'],
  'mc tolentino': ['m.c tolentino', 'tolentino college', 'college foundation'],
  'bagong bansa': ['bagong bansa may pag asa', 'bagong bansa'],
  'bookworld': ['bookworld systems solutions', 'bookworld'],
  'medsys': ['medsys uni horizon', 'medsys'],
}

const COMMON_STOP_WORDS = new Set([
  'corporation',
  'corp',
  'inc',
  'incorporation',
  'company',
  'co',
  'holdings',
  'services',
  'service',
  'ventures',
  'the',
  'and',
  'trading',
  'business',
])

/**
 * Checks whether two company names refer to the same company,
 * accounting for legal entity suffixes and known aliases.
 */
export function isCompanyMatch(
  companyA?: string | null,
  companyB?: string | null
): boolean {
  if (!companyA || !companyB) return false

  const a = companyA.trim().toLowerCase()
  const b = companyB.trim().toLowerCase()

  if (a === b) return true
  if (a === 'all companies' || b === 'all companies') return true

  // 1. Direct contains check
  if (a.includes(b) || b.includes(a)) return true

  // 2. Check alias map for A
  for (const [key, aliases] of Object.entries(KNOWN_COMPANY_ALIASES)) {
    if (a.includes(key) || key.includes(a)) {
      if (aliases.some((alias) => b.includes(alias) || alias.includes(b))) {
        return true
      }
    }
  }

  // 3. Check alias map for B
  for (const [key, aliases] of Object.entries(KNOWN_COMPANY_ALIASES)) {
    if (b.includes(key) || key.includes(b)) {
      if (aliases.some((alias) => a.includes(alias) || alias.includes(a))) {
        return true
      }
    }
  }

  // 4. Token-based matching on significant distinctive words
  const extractTokens = (str: string) =>
    str
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !COMMON_STOP_WORDS.has(w))

  const tokensA = extractTokens(a)
  const tokensB = extractTokens(b)

  return tokensA.some((ta) => tokensB.some((tb) => ta === tb || ta.includes(tb) || tb.includes(ta)))
}
