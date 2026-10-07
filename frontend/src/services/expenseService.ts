import type { DashboardTransactionItem } from './dashboardService'

export interface ExpenseItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string // e.g. "10/01/26"
  rawDate: string // e.g. "2026-10-01"
  particulars: string
  withdrawal: number
  netAmount: number
  category: string
  company: string
  status: 'Paid' | 'Pending' | 'Overdue'
  auditStatus: 'Verified' | 'Pending Audit' | 'Flagged'
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  type: 'Expense'
}

export interface NewExpenseInput {
  date: string
  chequeNo?: string
  particulars: string
  amount: number
  category: string
  company: string
  status: 'Paid' | 'Pending'
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp_1',
    refNo: 'REF-202610-301',
    chequeNo: 'CHK-99201',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Commercial Kitchen Utilities & Gas Refill',
    withdrawal: 9000,
    netAmount: 9000,
    category: 'In-house',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Invoice and receipt verified against Meralco & Solane statements.',
    auditDate: '2026-10-02 14:15',
    createdBy: 'Finance Officer (Maria Santos)',
    createdAt: '2026-10-01 08:30',
    updatedAt: '2026-10-02 14:15',
    type: 'Expense',
  },
  {
    id: 'exp_2',
    refNo: 'REF-202610-302',
    chequeNo: 'CHK-99203',
    date: '10/02/26',
    rawDate: '2026-10-02',
    particulars: 'Fresh Produce & Wholesale Seafood Supplies',
    withdrawal: 15200,
    netAmount: 15200,
    category: 'Maya',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    auditNotes: 'Awaiting supplier delivery receipt countersignature.',
    createdBy: 'Inventory Head (Carlos Dizon)',
    createdAt: '2026-10-02 07:15',
    updatedAt: '2026-10-02 07:20',
    type: 'Expense',
  },
  {
    id: 'exp_3',
    refNo: 'REF-202610-303',
    chequeNo: 'CHK-88101',
    date: '10/03/26',
    rawDate: '2026-10-03',
    particulars: 'Main Facility Electricity & Power Generation',
    withdrawal: 24000,
    netAmount: 24000,
    category: 'In-house',
    company: 'MCT Hotel',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Utility voucher cleared by Head of Audit.',
    auditDate: '2026-10-04 11:20',
    createdBy: 'Hotel General Admin (Paul Tan)',
    createdAt: '2026-10-03 09:10',
    updatedAt: '2026-10-04 11:20',
    type: 'Expense',
  },
  {
    id: 'exp_4',
    refNo: 'REF-202610-304',
    chequeNo: 'CHK-77102',
    date: '10/04/26',
    rawDate: '2026-10-04',
    particulars: 'Beverage Syrup & Espresso Roast Procurement',
    withdrawal: 12500,
    netAmount: 12500,
    category: 'GCash',
    company: 'JK Cafe',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Supplier invoice and GCash voucher validated.',
    auditDate: '2026-10-05 10:00',
    createdBy: 'Store Manager (Carla Reyes)',
    createdAt: '2026-10-04 14:20',
    updatedAt: '2026-10-05 10:00',
    type: 'Expense',
  },
  {
    id: 'exp_5',
    refNo: 'REF-202610-305',
    chequeNo: '',
    date: '10/05/26',
    rawDate: '2026-10-05',
    particulars: 'Weekly Staff Transport & Logistics Fuel Voucher',
    withdrawal: 4800,
    netAmount: 4800,
    category: 'Cash',
    company: 'Annex Nine',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Fuel receipts and vehicle logbook checked.',
    auditDate: '2026-10-06 09:15',
    createdBy: 'Logistics Supervisor (Mario Cruz)',
    createdAt: '2026-10-05 17:30',
    updatedAt: '2026-10-06 09:15',
    type: 'Expense',
  },
  {
    id: 'exp_6',
    refNo: 'REF-202610-306',
    chequeNo: 'CHK-66201',
    date: '10/06/26',
    rawDate: '2026-10-06',
    particulars: 'High-Volume Paper Stock & Offset Ink Restock',
    withdrawal: 31000,
    netAmount: 31000,
    category: 'Cheque',
    company: 'JK Printing',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'PDC voucher cleared and verified with depository statement.',
    auditDate: '2026-10-07 13:00',
    createdBy: 'Production Manager (Dante Cruz)',
    createdAt: '2026-10-06 11:00',
    updatedAt: '2026-10-07 13:00',
    type: 'Expense',
  },
  {
    id: 'exp_7',
    refNo: 'REF-202610-307',
    chequeNo: '',
    date: '10/07/26',
    rawDate: '2026-10-07',
    particulars: 'Cold Storage Maintenance & Freezing Inspection',
    withdrawal: 8500,
    netAmount: 8500,
    category: 'PayMongo',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Technician service report attached and verified.',
    auditDate: '2026-10-07 16:45',
    createdBy: 'Operations Lead (David Ramos)',
    createdAt: '2026-10-07 14:15',
    updatedAt: '2026-10-07 16:45',
    type: 'Expense',
  },
  {
    id: 'exp_8',
    refNo: 'REF-202610-308',
    chequeNo: 'CHK-99208',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Corporate Software Licensing & ERP Cloud Hosting',
    withdrawal: 18500,
    netAmount: 18500,
    category: 'Bank Transfer',
    company: 'Merillon',
    status: 'Pending',
    auditStatus: 'Pending Audit',
    auditNotes: 'Invoice under verification with corporate IT administrator.',
    createdBy: 'IT Specialist (Kevin Flores)',
    createdAt: '2026-10-08 09:30',
    updatedAt: '2026-10-08 09:30',
    type: 'Expense',
  },
  {
    id: 'exp_9',
    refNo: 'REF-202610-309',
    chequeNo: '',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Packaging Supplies & Biodegradable Takeout Boxes',
    withdrawal: 7400,
    netAmount: 7400,
    category: 'Panda',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Supplier packing list confirmed upon arrival at commissary.',
    auditDate: '2026-10-08 12:00',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-08 10:15',
    updatedAt: '2026-10-08 12:00',
    type: 'Expense',
  },
]

const EXPENSES_STORAGE_KEY = 'mct_expense_records_v1'

function loadStoredExpenses(): ExpenseItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(EXPENSES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
  }
  return INITIAL_EXPENSES
}

function saveStoredExpenses(items: ExpenseItem[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }
}

let inMemoryExpenses: ExpenseItem[] = loadStoredExpenses()

export const expenseService = {
  async getExpenses(): Promise<ExpenseItem[]> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch('/api/v1/expenses', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mapped: ExpenseItem[] = data.map((exp: any) => ({
            id: `exp_${exp.expense_id || exp.id}`,
            refNo: exp.ref_no || `REF-${exp.expense_id}`,
            chequeNo: exp.cheque_no || '',
            date: exp.expense_date
              ? new Date(exp.expense_date).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit',
                })
              : '10/01/26',
            rawDate: exp.expense_date || '2026-10-01',
            particulars: exp.particulars || exp.description || 'Expense Transaction',
            withdrawal: Number(exp.amount || exp.withdrawal || 0),
            netAmount: Number(exp.amount || exp.withdrawal || 0),
            category: exp.category_name || exp.category || 'In-house',
            company: exp.company_name || 'MCT Kitchen',
            status: exp.unpaid_balance && exp.unpaid_balance > 0 ? 'Pending' : 'Paid',
            auditStatus: 'Verified',
            type: 'Expense',
            createdAt: exp.created_at || '2026-10-01 08:30',
          }))
          return mapped
        }
      }
    } catch {
      // fallback to local
    }

    return [...inMemoryExpenses]
  },

  async addExpense(input: NewExpenseInput): Promise<ExpenseItem> {
    const rawDate = input.date
    const parts = rawDate.split('-')
    const formattedDate =
      parts.length === 3
        ? `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`
        : input.date

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const refNo = `REF-202610-${randomSuffix}`

    const newExpense: ExpenseItem = {
      id: `exp_${Date.now()}`,
      refNo,
      chequeNo: input.chequeNo || '',
      date: formattedDate,
      rawDate: input.date,
      particulars: input.particulars,
      withdrawal: input.amount,
      netAmount: input.amount,
      category: input.category,
      company: input.company,
      status: input.status,
      auditStatus: 'Pending Audit',
      auditNotes: 'Newly recorded expense transaction.',
      createdBy: 'Finance Auditor (Alex Cruz)',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Expense',
    }

    inMemoryExpenses = [newExpense, ...inMemoryExpenses]
    saveStoredExpenses(inMemoryExpenses)
    return newExpense
  },

  async updateExpense(
    id: string,
    updates: Partial<ExpenseItem> & { amount?: number }
  ): Promise<ExpenseItem | null> {
    const index = inMemoryExpenses.findIndex((e) => e.id === id)
    if (index === -1) return null

    const existing = inMemoryExpenses[index]
    let displayDate = existing.date
    let rawDate = existing.rawDate
    if (updates.date && updates.date.includes('-')) {
      const [year, month, day] = updates.date.split('-')
      if (month && day) {
        displayDate = `${month}/${day}/${year?.slice(2) || '26'}`
        rawDate = updates.date
      }
    } else if (updates.date) {
      displayDate = updates.date
    }

    const withdrawalVal =
      updates.withdrawal !== undefined
        ? updates.withdrawal
        : updates.amount !== undefined
        ? updates.amount
        : existing.withdrawal
    const netAmountVal =
      updates.netAmount !== undefined ? updates.netAmount : withdrawalVal

    const updated: ExpenseItem = {
      ...existing,
      ...updates,
      date: displayDate,
      rawDate: rawDate,
      withdrawal: withdrawalVal,
      netAmount: netAmountVal,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    }

    inMemoryExpenses[index] = updated
    saveStoredExpenses(inMemoryExpenses)
    return updated
  },

  async deleteExpense(id: string): Promise<boolean> {
    inMemoryExpenses = inMemoryExpenses.filter((e) => e.id !== id)
    saveStoredExpenses(inMemoryExpenses)
    return true
  },

  exportCsv(items: ExpenseItem[], filename = 'expense_report.csv') {
    const headers = [
      'Date',
      'Ref No',
      'Cheque No',
      'Particulars',
      'Withdrawal',
      'Category',
      'Net Amount',
      'Company',
      'Status',
      'Audit Status',
    ]

    const rows = items.map((e) => [
      e.date,
      e.refNo,
      e.chequeNo || '—',
      `"${e.particulars.replace(/"/g, '""')}"`,
      e.withdrawal,
      e.category,
      e.netAmount,
      e.company,
      e.status,
      e.auditStatus,
    ])

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  exportPdf(items: ExpenseItem[], company = 'MCT Kitchen') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalWithdrawal = items.reduce((sum, e) => sum + (e.withdrawal || 0), 0)

    const rowsHtml = items
      .map(
        (e) => `
        <tr>
          <td>${e.date}</td>
          <td>${e.chequeNo || '—'}</td>
          <td>${e.particulars}</td>
          <td style="text-align: right;">₱${e.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td>${e.category}</td>
          <td style="text-align: right;">₱${e.netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td>${e.status}</td>
        </tr>
      `
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense Summary Report — ${company}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0B0F2B; }
            h1 { font-size: 20px; margin-bottom: 4px; color: #960C01; }
            p { font-size: 12px; color: #767B89; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th { background: #F8FAFC; text-align: left; padding: 8px; border-bottom: 2px solid #E2E8F0; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #767B89; }
            td { padding: 8px; border-bottom: 1px solid #F1F5F9; }
            .summary { margin-top: 24px; padding: 16px; background: #F8FAFC; border-radius: 8px; font-size: 12px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h1>MCT Group of Companies</h1>
          <p>Expense Summary Report for <strong>${company}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Withdrawal</th>
                <th>Category</th>
                <th style="text-align: right;">Net Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${items.length}</div>
            <div><strong>Total Expenses (Outflows):</strong> ₱${totalWithdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  },

  toDashboardTransaction(expense: ExpenseItem): DashboardTransactionItem {
    return {
      id: expense.id,
      refNo: expense.refNo,
      chequeNo: expense.chequeNo,
      date: expense.date,
      type: 'Expense',
      company: expense.company,
      description: expense.particulars,
      particulars: expense.particulars,
      amount: expense.withdrawal,
      withdrawal: expense.withdrawal,
      deposit: 0,
      category: (['GCash', 'Maya', 'PayMongo', 'Panda', 'In-house'].includes(expense.category)
        ? expense.category
        : 'In-house') as any,
      status: expense.status,
      auditStatus: expense.auditStatus,
      auditedBy: expense.auditedBy,
      auditNotes: expense.auditNotes,
      auditDate: expense.auditDate,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      attachments: [],
    }
  },
}
