export interface DashboardKpis {
  totalSales: number
  totalExpense: number
  totalLoan: number
  overdueLoans: number
  dueSoon: number
}

export interface WeeklySalesPoint {
  day: string
  shortDay: string
  amount: number
}

export interface ExpenseBreakdownPoint {
  id: string
  label: string
  amount: number
  color: string
}

export interface CompanyIncomePoint {
  rank: number
  company: string
  score: number
  amount: number
}

export type AuditStatus = 'Verified' | 'Pending Audit' | 'Flagged'

export interface DashboardTransactionItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string
  type: 'Expense' | 'Sales' | 'Loan' | 'Income'
  company: string
  description: string
  amount: number
  status: 'Paid' | 'Pending' | 'Overdue'
  auditStatus: AuditStatus
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
}

export interface DashboardData {
  kpis: DashboardKpis
  weeklySales: WeeklySalesPoint[]
  expenses: ExpenseBreakdownPoint[]
  companyIncome: CompanyIncomePoint[]
  recentTransactions: DashboardTransactionItem[]
}

const INITIAL_KPIS: DashboardKpis = {
  totalSales: 120000,
  totalExpense: 120000,
  totalLoan: 120000,
  overdueLoans: 3,
  dueSoon: 3,
}

const INITIAL_WEEKLY_SALES: WeeklySalesPoint[] = [
  { day: 'Monday', shortDay: 'Mon', amount: 300000 },
  { day: 'Tuesday', shortDay: 'Tue', amount: 430000 },
  { day: 'Wednesday', shortDay: 'Wed', amount: 180000 },
  { day: 'Thursday', shortDay: 'Thu', amount: 260000 },
  { day: 'Friday', shortDay: 'Fri', amount: 320000 },
  { day: 'Saturday', shortDay: 'Sat', amount: 270000 },
  { day: 'Sunday', shortDay: 'Sun', amount: 140000 },
]

const INITIAL_EXPENSES: ExpenseBreakdownPoint[] = [
  { id: 'interest', label: 'Interest', amount: 45000, color: '#960C01' },
  { id: 'electricity', label: 'Electricity', amount: 75000, color: '#C5C8CE' },
]

const INITIAL_COMPANY_INCOME: CompanyIncomePoint[] = [
  { rank: 1, company: 'MCT Kitchen', score: 9, amount: 980000 },
  { rank: 2, company: 'MCT Hotel', score: 8, amount: 850000 },
  { rank: 3, company: 'JK Cafe', score: 7, amount: 720000 },
  { rank: 4, company: 'Annex Nine', score: 6, amount: 610000 },
  { rank: 5, company: 'Merillon', score: 5, amount: 530000 },
  { rank: 6, company: 'JK Printing', score: 4, amount: 440000 },
  { rank: 7, company: 'Speedbox', score: 3, amount: 320000 },
  { rank: 8, company: 'JK Property and Ventures', score: 2, amount: 210000 },
  { rank: 9, company: 'Golden Sunburst Ventures', score: 1, amount: 110000 },
]

const inMemoryTransactions: DashboardTransactionItem[] = [
  {
    id: 'tx_1',
    refNo: 'REF-202610-101',
    chequeNo: 'CHK-99201',
    date: 'October 1, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Commercial Kitchen Utilities & Gas',
    amount: 9000,
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Invoice and receipt verified against Meralco statement.',
    auditDate: '2026-10-02 14:15',
  },
  {
    id: 'tx_2',
    refNo: 'REF-202610-102',
    chequeNo: 'CHK-99202',
    date: 'October 2, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Weekend Corporate Banquet Catering',
    amount: 42500,
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Bank deposit confirmation received and cross-matched.',
    auditDate: '2026-10-03 09:30',
  },
  {
    id: 'tx_3',
    refNo: 'REF-202610-103',
    chequeNo: 'CHK-99203',
    date: 'October 3, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Fresh Produce & Seafood Wholesale Supplies',
    amount: 15200,
    status: 'Paid',
    auditStatus: 'Pending Audit',
    auditNotes: 'Awaiting supplier delivery receipt countersignature.',
  },
  {
    id: 'tx_4',
    refNo: 'REF-202610-104',
    chequeNo: 'CHK-99204',
    date: 'October 4, 2026',
    type: 'Loan',
    company: 'MCT Kitchen',
    description: 'Kitchen Heavy Equipment Term Installment',
    amount: 25000,
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Variance detected between amortization schedule and billed interest rate.',
    auditDate: '2026-10-04 16:40',
  },
  {
    id: 'tx_5',
    refNo: 'REF-202610-105',
    chequeNo: 'CHK-99205',
    date: 'October 5, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Daily Dining Room & Walk-in Receipts',
    amount: 38000,
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'POS end-of-day register tape matches credit terminal batches.',
    auditDate: '2026-10-05 21:00',
  },
  {
    id: 'tx_6',
    refNo: 'REF-202610-201',
    chequeNo: 'CHK-88101',
    date: 'October 2, 2026',
    type: 'Expense',
    company: 'MCT Hotel',
    description: 'Main Facility Electricity Bill',
    amount: 24000,
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Utility voucher cleared by Head of Audit.',
    auditDate: '2026-10-03 11:20',
  },
  {
    id: 'tx_7',
    refNo: 'REF-202610-202',
    chequeNo: 'CHK-88102',
    date: 'October 3, 2026',
    type: 'Sales',
    company: 'MCT Hotel',
    description: 'Deluxe Suite Weekend Bookings',
    amount: 85000,
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'PMS reservation report and credit transactions audited.',
    auditDate: '2026-10-04 10:15',
  },
  {
    id: 'tx_8',
    refNo: 'REF-202610-301',
    chequeNo: 'CHK-77401',
    date: 'October 4, 2026',
    type: 'Expense',
    company: 'JK Cafe',
    description: 'Artisan Coffee Beans & Dairy Consumables',
    amount: 14500,
    status: 'Paid',
    auditStatus: 'Pending Audit',
  },
  {
    id: 'tx_9',
    refNo: 'REF-202610-401',
    chequeNo: 'CHK-66301',
    date: 'October 5, 2026',
    type: 'Loan',
    company: 'JK Printing',
    description: 'High-Capacity Offset Press Loan Amortization',
    amount: 32000,
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Remi Lee',
    auditNotes: 'Bank debit confirmation slip not yet uploaded.',
    auditDate: '2026-10-05 17:00',
  },
]

export const dashboardService = {
  async getDashboardData(filters?: {
    company?: string
    dateRange?: string
    period?: string
  }): Promise<DashboardData> {
    // Artificial latency for smooth realistic feel
    await new Promise((resolve) => setTimeout(resolve, 250))

    let transactions = [...inMemoryTransactions]
    const isCompanySpecific = filters?.company && filters.company !== 'All Companies'

    if (isCompanySpecific) {
      transactions = transactions.filter((t) => t.company === filters.company)
    }

    // Dynamic KPIs based on filtered transactions
    const totalSales = transactions
      .filter((t) => t.type === 'Sales' || t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0) || (isCompanySpecific ? 80500 : 120000)

    const totalExpense = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0) || (isCompanySpecific ? 24200 : 120000)

    const totalLoan = transactions
      .filter((t) => t.type === 'Loan')
      .reduce((sum, t) => sum + t.amount, 0) || (isCompanySpecific ? 25000 : 120000)

    const overdueLoans = transactions.filter((t) => t.type === 'Loan' && (t.status === 'Overdue' || t.auditStatus === 'Flagged')).length
    const dueSoon = transactions.filter((t) => t.type === 'Loan' && t.status === 'Pending').length

    return {
      kpis: {
        totalSales,
        totalExpense,
        totalLoan,
        overdueLoans: Math.max(overdueLoans, 1),
        dueSoon: Math.max(dueSoon, 1),
      },
      weeklySales: INITIAL_WEEKLY_SALES,
      expenses: INITIAL_EXPENSES,
      companyIncome: INITIAL_COMPANY_INCOME,
      recentTransactions: transactions,
    }
  },

  /**
   * Updates the audit status and notes for a specific transaction
   */
  async updateTransactionAudit(
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName = 'Alex Cruz'
  ): Promise<DashboardTransactionItem | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const index = inMemoryTransactions.findIndex((t) => t.id === id)
    if (index === -1) return null

    inMemoryTransactions[index] = {
      ...inMemoryTransactions[index],
      auditStatus,
      auditNotes: notes ?? inMemoryTransactions[index].auditNotes,
      auditedBy: auditorName,
      auditDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
    }

    return inMemoryTransactions[index]
  },
}
