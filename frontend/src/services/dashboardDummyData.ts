import type { DashboardTransactionItem } from './dashboardService'

// Simple deterministic seeded PRNG so numbers are stable and don't flicker
function createPrng(seed = 20260501) {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

interface MonthItem {
  year: number
  month: number
}

function getMonthSequence(count = 18): MonthItem[] {
  const now = new Date()
  const seq: MonthItem[] = []
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  for (let i = 0; i < count; i++) {
    seq.push({ year: y, month: m })
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  return seq.reverse()
}

const COMPANIES: Record<string, number> = {
  'MCT Kitchen': 185000,
  'MCT Hotel': 260000,
  'JK Printing': 95000,
  Speedfire: 70000,
  'JK Property and Ventures': 140000,
  'Golden Sunburst Ventures': 60000,
}

// Expense ratios per month: all <= 0.65 to ensure every month is consistently profitable
const MONTH_EXPENSE_RATIO: Record<number, number> = {
  1: 0.60,
  2: 0.58,
  3: 0.55,
  4: 0.52,
  5: 0.54,
  6: 0.56,
  7: 0.64, // July: solid profit (~36% margin)
  8: 0.48,
  9: 0.62, // Sept: solid profit (~38% margin)
  10: 0.50,
  11: 0.52,
  12: 0.40, // Dec peak holiday revenue (huge profit ~60% margin)
}

const SALES_ITEMS: Array<[string, string]> = [
  ['Sales Revenue', 'Daily walk-in sales'],
  ['Sales Revenue', 'Weekend sales remittance'],
  ['Service Income', 'Service package billing'],
  ['Product Sales', 'Retail product sales'],
  ['Catering', 'Corporate lunch catering'],
  ['Other Income', 'Miscellaneous income'],
]
const SALES_METHODS = ['Cash', 'GCash', 'Maya', 'Bank Transfer', 'PayMongo', 'Cheque']

const EXPENSE_ITEMS: Array<[string, string, number]> = [
  ['Payroll', 'Staff payroll', 0.4],
  ['Electricity', 'Meralco electric bill', 0.1],
  ['Hotel Supplies', 'Supplies restock', 0.12],
  ['Rendered Fee', 'Contractor service fee', 0.1],
  ['BIR', 'Withholding tax remittance', 0.08],
  ['SSS', 'SSS contributions', 0.05],
  ['Philhealth', 'Philhealth contributions', 0.04],
  ['HDMF', 'Pag-IBIG contributions', 0.03],
  ['Revolving Funds', 'Revolving fund replenishment', 0.05],
  ['BBMP Foundation', 'Foundation donation', 0.03],
]
const EXPENSE_METHODS = ['Bank Transfer', 'Cash', 'Cheque', 'GCash']

function roundMoney(val: number): number {
  return Math.round(val / 5) * 5
}

export function generateDashboardDummyTransactions(): DashboardTransactionItem[] {
  const rng = createPrng(20260501)
  const monthSeq = getMonthSequence(18)
  const now = new Date()
  const todayDate = now.getDate()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const transactions: DashboardTransactionItem[] = []
  let txIdCounter = 1

  Object.entries(COMPANIES).forEach(([companyName, baseSales]) => {
    let saleNo = 0
    let expenseNo = 0

    monthSeq.forEach(({ year, month }) => {
      const isCurrentMonth = year === currentYear && month === currentMonth
      const daysInMonth = new Date(year, month, 0).getDate()
      const maxDay = isCurrentMonth ? Math.min(todayDate, daysInMonth) : daysInMonth
      if (maxDay <= 0) return

      const scale = maxDay / daysInMonth
      const variance = 0.9 + rng() * 0.2
      const monthSalesTarget = baseSales * variance * scale

      const baseRatio = MONTH_EXPENSE_RATIO[month] || 0.55
      const ratioVariance = 0.94 + rng() * 0.08
      // Cap at 0.70 to ensure every month and company is strictly profitable
      const effectiveRatio = Math.min(0.70, baseRatio * ratioVariance)
      const monthExpenseTarget = monthSalesTarget * effectiveRatio

      // Sales transactions (6 to 9 entries per month)
      const salesEntriesCount = Math.max(3, Math.round((6 + Math.floor(rng() * 4)) * scale))
      const weights = Array.from({ length: salesEntriesCount }, () => 0.6 + rng() * 0.8)
      const weightSum = weights.reduce((a, b) => a + b, 0)

      weights.forEach((w) => {
        saleNo += 1
        txIdCounter += 1
        const itemIndex = Math.floor(rng() * SALES_ITEMS.length)
        const [category, particulars] = SALES_ITEMS[itemIndex]
        const method = SALES_METHODS[Math.floor(rng() * SALES_METHODS.length)]
        const day = 1 + Math.floor(rng() * maxDay)
        const amount = roundMoney((monthSalesTarget * w) / weightSum)
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        transactions.push({
          id: `dummy_s_${txIdCounter}`,
          refNo: `CHK-S-${saleNo.toString().padStart(4, '0')}`,
          chequeNo: `CHK-S-${saleNo.toString().padStart(4, '0')}`,
          date: dateStr,
          type: 'Sales',
          company: companyName,
          description: particulars,
          particulars,
          amount,
          withdrawal: 0,
          deposit: amount,
          category,
          paymentMethod: method,
          status: 'Paid',
          auditStatus: 'Verified',
          createdAt: `${dateStr}T10:00:00.000Z`,
        })
      })

      // Expense transactions (one per expense category)
      EXPENSE_ITEMS.forEach(([category, particulars, share]) => {
        expenseNo += 1
        txIdCounter += 1
        const expVar = 0.88 + rng() * 0.24
        const amount = roundMoney(monthExpenseTarget * share * expVar)
        const method = EXPENSE_METHODS[Math.floor(rng() * EXPENSE_METHODS.length)]
        const day = 1 + Math.floor(rng() * maxDay)
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        transactions.push({
          id: `dummy_e_${txIdCounter}`,
          refNo: `REF-E-${expenseNo.toString().padStart(4, '0')}`,
          chequeNo: method === 'Cheque' ? `CHK-E-${expenseNo.toString().padStart(4, '0')}` : undefined,
          date: dateStr,
          type: 'Expense',
          company: companyName,
          description: particulars,
          particulars,
          amount,
          withdrawal: amount,
          deposit: 0,
          category,
          paymentMethod: method,
          status: 'Paid',
          auditStatus: 'Verified',
          createdAt: `${dateStr}T14:30:00.000Z`,
        })
      })
    })
  })

  return transactions
}
