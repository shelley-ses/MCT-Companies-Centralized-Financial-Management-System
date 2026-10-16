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

const EXPENSES_STORAGE_KEY = 'mct_expense_records_v1'

function loadStoredExpenses(): ExpenseItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(EXPENSES_STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
  }
  return []
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

function mapBackendExpenseToItem(exp: any): ExpenseItem {
  const rawDateStr = exp.expense_date || '2026-10-01'
  let displayDate = '10/01/26'
  if (rawDateStr) {
    const parts = rawDateStr.split('-')
    if (parts.length === 3) {
      displayDate = `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`
    }
  }

  const amt = Number(exp.amount || exp.withdrawal || 0)
  const isPending = (exp.unpaid_balance !== undefined && Number(exp.unpaid_balance) > 0) || exp.status === 'Pending'

  return {
    id: `exp_${exp.expense_id || exp.id}`,
    refNo: exp.reference_no || exp.ref_no || `REF-${exp.expense_id || '001'}`,
    chequeNo: exp.cheque_no || exp.cheque_number || '',
    date: displayDate,
    rawDate: rawDateStr,
    particulars: exp.particulars || exp.description || 'Expense Outflow',
    withdrawal: amt,
    netAmount: amt,
    category: exp.category_name || exp.category || 'In-house',
    company: exp.company_name || exp.company || 'MCT Kitchen',
    status: isPending ? 'Pending' : 'Paid',
    auditStatus: 'Verified',
    type: 'Expense',
    createdAt: exp.created_at || new Date().toISOString(),
    updatedAt: exp.updated_at || new Date().toISOString(),
  }
}

export const expenseService = {
  async getCategories(): Promise<{ category_id: number; name: string }[]> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch('/api/v1/categories', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          return data
        }
      }
    } catch (err) {
      console.warn('Failed to fetch categories from backend:', err)
    }
    return [
      { category_id: 1, name: 'GCash' },
      { category_id: 2, name: 'Maya' },
      { category_id: 3, name: 'PayMongo' },
      { category_id: 4, name: 'Panda' },
      { category_id: 5, name: 'In-house' },
      { category_id: 6, name: 'Cheque' },
      { category_id: 7, name: 'Bank Transfer' },
      { category_id: 8, name: 'Cash' },
    ]
  },

  async getExpenses(params?: {
    company?: string
    start_date?: string
    end_date?: string
    category_id?: number
  }): Promise<ExpenseItem[]> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const query = new URLSearchParams()
      if (params?.company && params.company !== 'All Companies') {
        query.append('company_name', params.company)
      }
      if (params?.start_date) query.append('start_date', params.start_date)
      if (params?.end_date) query.append('end_date', params.end_date)
      if (params?.category_id) query.append('category_id', String(params.category_id))

      const url = `/api/v1/expenses${query.toString() ? `?${query.toString()}` : ''}`
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data.map(mapBackendExpenseToItem)
          if (!params?.company || params.company === 'All Companies') {
            inMemoryExpenses = mapped
            saveStoredExpenses(mapped)
            return mapped
          } else {
            const otherCompaniesExpenses = inMemoryExpenses.filter(
              (e) => e.company.toLowerCase() !== params.company!.toLowerCase()
            )
            inMemoryExpenses = [...mapped, ...otherCompaniesExpenses]
            saveStoredExpenses(inMemoryExpenses)
            return mapped
          }
        }
      }
    } catch (err) {
      console.warn('Backend GET /expenses failed, falling back to local storage:', err)
    }

    const list =
      !params?.company || params.company === 'All Companies'
        ? [...inMemoryExpenses]
        : inMemoryExpenses.filter(
            (e) => e.company.toLowerCase() === params.company!.toLowerCase()
          )
    return list
  },

  async addExpense(input: NewExpenseInput): Promise<ExpenseItem> {
    const rawDate = input.date
    const parts = rawDate.split('-')
    const formattedDate =
      parts.length === 3
        ? `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`
        : input.date

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const refNo = `REF-${rawDate.replace(/-/g, '')}-${randomSuffix}`

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const payload = {
        company: input.company,
        expense_date: input.date,
        particulars: input.particulars,
        description: input.particulars,
        amount: input.amount,
        category: input.category,
        cheque_no: input.chequeNo || null,
        reference_no: refNo,
      }

      const res = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const created = await res.json()
        const mapped = mapBackendExpenseToItem(created)
        inMemoryExpenses = [mapped, ...inMemoryExpenses]
        saveStoredExpenses(inMemoryExpenses)
        return mapped
      } else {
        const errData = await res.json().catch(() => ({}))
        const errorMsg =
          errData.detail ||
          (typeof errData === 'string' ? errData : 'Failed to record expense entry.')
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err
      }
      console.warn('Backend POST /expenses failed, creating local record:', err)
    }

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
      createdBy: 'Finance Auditor',
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
    updates: Partial<ExpenseItem> & { amount?: number; particulars?: string; chequeNo?: string }
  ): Promise<ExpenseItem | null> {
    const numericId = id.replace(/^exp_/, '')
    const withdrawalVal =
      updates.withdrawal !== undefined
        ? updates.withdrawal
        : updates.amount !== undefined
        ? updates.amount
        : undefined

    const payload: Record<string, any> = {}
    if (updates.rawDate || (updates.date && updates.date.includes('-'))) {
      payload.expense_date = updates.rawDate || updates.date
    }
    if (withdrawalVal !== undefined) {
      payload.amount = withdrawalVal
    }
    if (updates.particulars) {
      payload.particulars = updates.particulars
      payload.description = updates.particulars
    }
    if (updates.category) {
      payload.category = updates.category
    }
    if (updates.chequeNo !== undefined) {
      payload.cheque_no = updates.chequeNo
    }

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/expenses/${numericId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        const mapped = mapBackendExpenseToItem(updated)
        inMemoryExpenses = inMemoryExpenses.map((e) => (e.id === id || e.id === `exp_${numericId}` ? mapped : e))
        saveStoredExpenses(inMemoryExpenses)
        return mapped
      }
    } catch (err) {
      console.warn('Backend PUT /expenses failed, updating locally:', err)
    }

    const index = inMemoryExpenses.findIndex((e) => e.id === id || e.id === `exp_${numericId}`)
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

    const finalWithdrawal = withdrawalVal !== undefined ? withdrawalVal : existing.withdrawal
    const updated: ExpenseItem = {
      ...existing,
      ...updates,
      date: displayDate,
      rawDate: rawDate,
      withdrawal: finalWithdrawal,
      netAmount: finalWithdrawal,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    }

    inMemoryExpenses[index] = updated
    saveStoredExpenses(inMemoryExpenses)
    return updated
  },

  async deleteExpense(id: string): Promise<boolean> {
    const numericId = id.replace(/^exp_/, '')
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/expenses/${numericId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        inMemoryExpenses = inMemoryExpenses.filter((e) => e.id !== id && e.id !== `exp_${numericId}`)
        saveStoredExpenses(inMemoryExpenses)
        return true
      }
    } catch (err) {
      console.warn('Backend DELETE /expenses failed, deleting locally:', err)
    }

    inMemoryExpenses = inMemoryExpenses.filter((e) => e.id !== id && e.id !== `exp_${numericId}`)
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
