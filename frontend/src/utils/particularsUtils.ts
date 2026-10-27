export interface ParticularItem {
  id?: string
  particulars: string
  quantity: number
  unitPrice: number
  total: number
  status?: 'Pending' | 'On hold' | 'Paid'
}

/**
 * Formats an array of particular items into a structured, readable string.
 * Each item is placed on its own line:
 * e.g. "Office Supplies (2x @ ₱500.00 = ₱1,000.00)"
 */
export function formatParticularsString(items: ParticularItem[]): string {
  if (!items || items.length === 0) return ''
  
  if (items.length === 1) {
    const item = items[0]
    if (item.quantity === 1 && item.unitPrice === item.total) {
      return item.particulars.trim()
    }
  }

  return items
    .map((item) => {
      const name = item.particulars.trim()
      const qty = item.quantity || 1
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0
      const total = typeof item.total === 'number' ? item.total : qty * price
      const priceStr = price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const totalStr = total.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      if (price > 0) {
        return `${name} (${qty}x @ ₱${priceStr} = ₱${totalStr})`
      }
      return `${name} (${qty}x)`
    })
    .join('\n')
}

/**
 * Parses raw particulars string or structured items into an array of ParticularItem objects.
 */
export function parseParticulars(
  rawParticulars?: string | null,
  explicitItems?: ParticularItem[] | null,
  fallbackTotal?: number
): ParticularItem[] {
  if (explicitItems && Array.isArray(explicitItems) && explicitItems.length > 0) {
    return explicitItems
  }

  if (!rawParticulars || !rawParticulars.trim()) {
    return []
  }

  const trimmed = rawParticulars.trim()

  // Multi-line particulars (one item per line)
  if (trimmed.includes('\n')) {
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines.map((line, idx) => parseSingleParticularLine(line, idx))
  }

  // Single line: check if it has parentheses with qty / price
  const parsedSingle = parseSingleParticularLine(trimmed, 0)
  if (parsedSingle.quantity > 1 || parsedSingle.unitPrice > 0) {
    return [parsedSingle]
  }

  const amt = typeof fallbackTotal === 'number' && fallbackTotal > 0 ? fallbackTotal : 0
  return [
    {
      id: `item-0`,
      particulars: trimmed,
      quantity: 1,
      unitPrice: amt,
      total: amt,
    },
  ]
}

function parseSingleParticularLine(line: string, index: number): ParticularItem {
  // Pattern: Item Name (2x @ ₱500.00 = ₱1,000.00) or Item Name (2x @ ₱500.00) or Item Name (2x)
  const regex = /^(.+?)\s*\(\s*(?:(\d+(?:\.\d+)?)\s*x)?\s*(?:@\s*(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?))?(?:\s*=\s*(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?))?\s*\)$/
  const match = line.match(regex)

  if (match) {
    const name = match[1].trim()
    const qty = match[2] ? parseFloat(match[2]) : 1
    const unitPrice = match[3] ? parseFloat(match[3].replace(/,/g, '')) : 0
    let total = match[4] ? parseFloat(match[4].replace(/,/g, '')) : qty * unitPrice
    if (isNaN(total) || total === 0) total = qty * unitPrice

    return {
      id: `item-${index}`,
      particulars: name,
      quantity: isNaN(qty) ? 1 : qty,
      unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
      total: isNaN(total) ? 0 : total,
    }
  }

  return {
    id: `item-${index}`,
    particulars: line,
    quantity: 1,
    unitPrice: 0,
    total: 0,
  }
}

/**
 * Returns summary information for table row display.
 */
export function getParticularsSummary(
  rawParticulars?: string | null,
  explicitItems?: ParticularItem[] | null
): { firstItemName: string; count: number } {
  const items = parseParticulars(rawParticulars, explicitItems)
  if (items.length === 0) {
    return { firstItemName: rawParticulars || '—', count: 0 }
  }
  return {
    firstItemName: items[0].particulars,
    count: items.length,
  }
}
