/**
 * Utility functions for matching and normalizing company names across
 * user-facing display names, shorthand aliases, and database registered entity names.
 */

export const COMPANY_ALIASES: Record<string, string[]> = {
  'mct kitchen': ['mycity kitchen', 'mycity.kitchen', 'mycity.kitchen corporation', 'kitchen'],
  'mycity.kitchen corporation': ['mct kitchen', 'mycity kitchen', 'mycity.kitchen', 'kitchen'],
  'mct hotel': [
    'mctolentino',
    'mctolentino hospitality',
    'mctolentino hospitality business corporation',
    'hotel',
    'hospitality',
  ],
  'mctolentino hospitality business corporation': [
    'mct hotel',
    'mctolentino',
    'mctolentino hospitality',
    'hotel',
    'hospitality',
  ],
  'jk printing': ['jk global headways', 'printing'],
  'jk global headways': ['jk printing', 'printing'],
  'speedbox': ['speedfire construction', 'speedfire'],
  'speedfire construction': ['speedbox', 'speedfire'],
  'jk property and ventures': ['jk property', 'property ventures', 'jk property & ventures'],
  'golden sunburst ventures': ['golden jupiter property ventures', 'golden jupiter', 'golden sunburst'],
  'golden jupiter property ventures': ['golden sunburst ventures', 'golden jupiter', 'golden sunburst'],
  'filcap': ['filcap prime', 'filcap prime holdings', 'filcap prime holdings corp.', 'filcam'],
  'filcap prime holdings corp.': ['filcap', 'filcap prime', 'filcam'],
}

/**
 * Checks whether two company names match, supporting aliases and normalized forms.
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

  // Direct alias lookup
  const aliasesA = COMPANY_ALIASES[a] || []
  if (aliasesA.some((item) => item === b || b.includes(item) || item.includes(b))) {
    return true
  }

  const aliasesB = COMPANY_ALIASES[b] || []
  if (aliasesB.some((item) => item === a || a.includes(item) || item.includes(a))) {
    return true
  }

  // Cross-family alias match
  for (const [key, list] of Object.entries(COMPANY_ALIASES)) {
    const family = [key, ...list]
    const aInFamily = family.some((member) => member === a || a.includes(member) || member.includes(a))
    const bInFamily = family.some((member) => member === b || b.includes(member) || member.includes(b))
    if (aInFamily && bInFamily) return true
  }

  // Substring containment for keywords with >= 4 characters (e.g. "kitchen", "hotel", "speedfire")
  const keywordsA = a.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)
  const keywordsB = b.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)
  const hasCommonKeyword = keywordsA.some((kw) => keywordsB.includes(kw))
  if (hasCommonKeyword) return true

  return false
}
