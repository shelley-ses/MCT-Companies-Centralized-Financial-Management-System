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
 * Strips known operational prefixes from a particulars text string.
 */
export function stripParticularsPrefix(text: string): string {
  if (!text) return ''
  return text
    .replace(
      /^(?:Sales\s+Collection|Expense\s+Disbursement|Deposit\s+Remittance|Withdrawal\s+Settlement|Sales|Expense|Deposit|Withdrawal)\s*:\s*/i,
      ''
    )
    .trim()
}

/**
 * Splits a particulars string by comma or semicolon when not inside parentheses
 * and not between numerical digits (to preserve currency thousands separators like 1,000.00).
 */
export function splitParticularsItems(text: string): string[] {
  if (!text || !text.trim()) return []
  const trimmed = text.trim()

  // If already multi-line, split by newline
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }

  const results: string[] = []
  let current = ''
  let depth = 0

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]
    if (char === '(') {
      depth++
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (depth === 0 && (char === ',' || char === ';')) {
      const prevChar = i > 0 ? trimmed[i - 1] : ''
      const nextChar = i < trimmed.length - 1 ? trimmed[i + 1] : ''
      // Ignore commas in numbers like 1,000
      if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
        current += char
        continue
      }
      if (current.trim()) {
        results.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    results.push(current.trim())
  }

  return results
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

  // Strip operational prefixes if present
  const cleanedPrefix = stripParticularsPrefix(rawParticulars.trim())

  // Check if string has explicit "+ N more" suffix from prior formatting
  const plusMoreMatch = cleanedPrefix.match(/^(.+?)\s*\+(\d+)\s+more$/i)
  if (plusMoreMatch) {
    const baseName = plusMoreMatch[1].trim()
    const moreCount = parseInt(plusMoreMatch[2], 10) || 0
    const amt = typeof fallbackTotal === 'number' && fallbackTotal > 0 ? fallbackTotal : 0
    const itemsList: ParticularItem[] = [
      {
        id: 'item-0',
        particulars: baseName,
        quantity: 1,
        unitPrice: moreCount > 0 ? 0 : amt,
        total: moreCount > 0 ? 0 : amt,
      },
    ]
    for (let i = 1; i <= moreCount; i++) {
      itemsList.push({
        id: `item-${i}`,
        particulars: `Additional Item #${i}`,
        quantity: 1,
        unitPrice: 0,
        total: 0,
      })
    }
    return itemsList
  }

  // Split lines or delimiters (commas / semicolons)
  const segments = splitParticularsItems(cleanedPrefix)
  if (segments.length > 1) {
    return segments.map((seg, idx) => parseSingleParticularLine(seg, idx))
  }

  // Single line: check if it has parentheses with qty / price
  const parsedSingle = parseSingleParticularLine(cleanedPrefix, 0)
  if (parsedSingle.quantity > 1 || parsedSingle.unitPrice > 0 || parsedSingle.status) {
    return [parsedSingle]
  }

  const amt = typeof fallbackTotal === 'number' && fallbackTotal > 0 ? fallbackTotal : 0
  return [
    {
      id: `item-0`,
      particulars: cleanedPrefix,
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
 * Shows clean first item name and total count (e.g. "Dinuguan" + 3 more).
 */
export function getParticularsSummary(
  rawParticulars?: string | null,
  explicitItems?: ParticularItem[] | null
): { firstItemName: string; count: number } {
  const items = parseParticulars(rawParticulars, explicitItems)
  if (items.length === 0) {
    const fallback = stripParticularsPrefix(rawParticulars || '') || '—'
    return { firstItemName: fallback, count: 0 }
  }

  const cleanFirstName = stripParticularsPrefix(items[0].particulars)
  return {
    firstItemName: cleanFirstName || items[0].particulars,
    count: items.length,
  }
}
