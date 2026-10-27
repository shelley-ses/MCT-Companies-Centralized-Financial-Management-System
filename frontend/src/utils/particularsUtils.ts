export interface ParticularItem {
  id?: string
  particulars: string
  quantity: number
  unitPrice: number
  total: number
  status?: 'Paid' | 'Unpaid' | 'Pending' | 'On hold'
}

/**
 * Formats an array of particular items into a structured, readable string.
 * Each item is placed on its own line:
 * e.g. "Office Supplies (2x @ ₱500.00 = ₱1,000.00) [Paid]"
 */
export function formatParticularsString(items: ParticularItem[]): string {
  if (!items || items.length === 0) return ''
  
  if (items.length === 1) {
    const item = items[0]
    const statusSuffix = item.status ? ` [${item.status}]` : ''
    if (item.quantity === 1 && item.unitPrice === item.total) {
      return `${item.particulars.trim()}${statusSuffix}`
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
      const statusSuffix = item.status ? ` [${item.status}]` : ''

      if (price > 0) {
        return `${name} (${qty}x @ ₱${priceStr} = ₱${totalStr})${statusSuffix}`
      }
      return `${name} (${qty}x)${statusSuffix}`
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
  if (parsedSingle.quantity > 1 || parsedSingle.unitPrice > 0 || parsedSingle.status) {
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
  let cleanedLine = line.trim()
  let itemStatus: 'Paid' | 'Unpaid' | 'Pending' | 'On hold' | undefined = undefined

  const statusTagMatch = cleanedLine.match(/\[(Paid|Unpaid|Pending|On hold)\]/i)
  if (statusTagMatch) {
    const rawTag = statusTagMatch[1].toLowerCase()
    if (rawTag === 'paid') itemStatus = 'Paid'
    else if (rawTag === 'unpaid') itemStatus = 'Unpaid'
    else if (rawTag === 'pending') itemStatus = 'Pending'
    else if (rawTag === 'on hold') itemStatus = 'On hold'
    cleanedLine = cleanedLine.replace(statusTagMatch[0], '').trim()
  }

  // Pattern: Item Name (2x @ ₱500.00 = ₱1,000.00) or Item Name (2x @ ₱500.00) or Item Name (2x)
  const regex = /^(.+?)\s*\(\s*(?:(\d+(?:\.\d+)?)\s*x)?\s*(?:@\s*(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?))?(?:\s*=\s*(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?))?\s*\)$/
  const match = cleanedLine.match(regex)

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
      ...(itemStatus ? { status: itemStatus } : {}),
    }
  }

  return {
    id: `item-${index}`,
    particulars: cleanedLine,
    quantity: 1,
    unitPrice: 0,
    total: 0,
    ...(itemStatus ? { status: itemStatus } : {}),
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
