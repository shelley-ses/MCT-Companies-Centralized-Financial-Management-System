import type { DashboardTransactionItem } from './dashboardService'

export interface LoanItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string // e.g. "10/01/26"
  rawDate: string // e.g. "2026-10-01"
  particulars: string
  category: string
  amount: number
  company: string
  status: 'Paid' | 'Pending' | 'Overdue'
  auditStatus: 'Verified' | 'Pending Audit' | 'Flagged'
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  type: 'Loan'
}

export interface NewLoanInput {
  date: string
  chequeNo?: string
  particulars: string
  amount: number
  category: string
  company: string
  status: 'Paid' | 'Pending'
}

const INITIAL_LOANS: LoanItem[] = [
  {
    id: 'loan_1',
    refNo: 'REF-202610-401',
    chequeNo: 'CHK-99204',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Commercial Kitchen Heavy Equipment Term Loan Installment',
    category: 'In-house',
    amount: 25000,
    company: 'MCT Kitchen',
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Variance detected between amortization schedule and billed interest rate.',
    auditDate: '2026-10-04 16:40',
    createdBy: 'Accounting Specialist (Elena Gomez)',
    createdAt: '2026-10-01 10:00',
    updatedAt: '2026-10-04 16:40',
    type: 'Loan',
  },
  {
    id: 'loan_2',
    refNo: 'REF-202610-402',
    chequeNo: 'CHK-88104',
    date: '10/02/26',
    rawDate: '2026-10-02',
    particulars: 'Hotel Facility Expansion & Suite Renovation Facility',
    category: 'Bank Transfer',
    amount: 180000,
    company: 'MCT Hotel',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'BDO Term Loan draw verification confirmed with board resolution.',
    auditDate: '2026-10-03 14:00',
    createdBy: 'Head Auditor (Remi Lee)',
    createdAt: '2026-10-02 09:30',
    updatedAt: '2026-10-03 14:00',
    type: 'Loan',
  },
  {
    id: 'loan_3',
    refNo: 'REF-202610-403',
    chequeNo: 'CHK-77201',
    date: '10/03/26',
    rawDate: '2026-10-03',
    particulars: 'Espresso Bar Machinery Lease-to-Own Repayment',
    category: 'GCash',
    amount: 32000,
    company: 'JK Cafe',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Monthly equipment financing installment reconciled.',
    auditDate: '2026-10-04 10:30',
    createdBy: 'Store Manager (Carla Reyes)',
    createdAt: '2026-10-03 11:15',
    updatedAt: '2026-10-04 10:30',
    type: 'Loan',
  },
  {
    id: 'loan_4',
    refNo: 'REF-202610-404',
    chequeNo: 'CHK-99210',
    date: '10/04/26',
    rawDate: '2026-10-04',
    particulars: 'Working Capital Revolving Facility Drawdown',
    category: 'Cheque',
    amount: 95000,
    company: 'Annex Nine',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Loan disbursement check voucher stamped and validated.',
    auditDate: '2026-10-05 15:00',
    createdBy: 'Finance Manager (Luis Santos)',
    createdAt: '2026-10-04 13:45',
    updatedAt: '2026-10-05 15:00',
    type: 'Loan',
  },
  {
    id: 'loan_5',
    refNo: 'REF-202610-405',
    chequeNo: '',
    date: '10/05/26',
    rawDate: '2026-10-05',
    particulars: 'Industrial Offset Press Modernization Financing',
    category: 'In-house',
    amount: 110000,
    company: 'JK Printing',
    status: 'Pending',
    auditStatus: 'Pending Audit',
    auditNotes: 'Awaiting updated bank debt amortization schedule.',
    createdBy: 'Finance Officer (Maria Santos)',
    createdAt: '2026-10-05 10:00',
    updatedAt: '2026-10-05 10:00',
    type: 'Loan',
  },
  {
    id: 'loan_6',
    refNo: 'REF-202610-406',
    chequeNo: 'CHK-55102',
    date: '10/06/26',
    rawDate: '2026-10-06',
    particulars: 'Commissary Cold Storage Fleet Vehicle Financing',
    category: 'Maya',
    amount: 45000,
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Commercial vehicle chattel mortgage monthly installment verified.',
    auditDate: '2026-10-07 11:30',
    createdBy: 'Logistics Supervisor (Mario Cruz)',
    createdAt: '2026-10-06 08:30',
    updatedAt: '2026-10-07 11:30',
    type: 'Loan',
  },
  {
    id: 'loan_7',
    refNo: 'REF-202610-407',
    chequeNo: 'CHK-44101',
    date: '10/07/26',
    rawDate: '2026-10-07',
    particulars: 'Commercial Real Estate Refinancing Term Loan',
    category: 'Bank Transfer',
    amount: 220000,
    company: 'Merillon',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Mortgage redemption schedule cleared.',
    auditDate: '2026-10-08 09:00',
    createdBy: 'Corporate Controller (Ana Lim)',
    createdAt: '2026-10-07 15:00',
    updatedAt: '2026-10-08 09:00',
    type: 'Loan',
  },
  {
    id: 'loan_8',
    refNo: 'REF-202610-408',
    chequeNo: '',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Emergency Short-term Liquidity Facility',
    category: 'In-house',
    amount: 35000,
    company: 'Speedbox',
    status: 'Pending',
    auditStatus: 'Pending Audit',
    auditNotes: 'Submitted for audit review.',
    createdBy: 'Operations Lead (Danilo Cruz)',
    createdAt: '2026-10-08 11:30',
    updatedAt: '2026-10-08 11:30',
    type: 'Loan',
  },
]

const LOANS_STORAGE_KEY = 'mct_loan_records_v1'

function loadStoredLoans(): LoanItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOANS_STORAGE_KEY)
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
  return INITIAL_LOANS
}

function saveStoredLoans(items: LoanItem[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }
}

let inMemoryLoans: LoanItem[] = loadStoredLoans()

export const loanService = {
  async getLoans(): Promise<LoanItem[]> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch('/api/v1/loans', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mapped: LoanItem[] = data.map((l: any) => ({
            id: `loan_${l.loan_id || l.id}`,
            refNo: `REF-LOAN-${l.loan_id}`,
            chequeNo: '',
            date: l.loan_date
              ? new Date(l.loan_date).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit',
                })
              : '10/01/26',
            rawDate: l.loan_date || '2026-10-01',
            particulars: l.purpose || 'Company Loan Facility',
            category: 'In-house',
            amount: Number(l.principal_amount || 0),
            company: l.borrower_company_name || 'MCT Kitchen',
            status: l.status === 'Fully Paid' ? 'Paid' : 'Pending',
            auditStatus: 'Verified',
            type: 'Loan',
            createdAt: l.created_at || '2026-10-01 10:00',
          }))
          return mapped
        }
      }
    } catch {
      // fallback
    }

    return [...inMemoryLoans]
  },

  async addLoan(input: NewLoanInput): Promise<LoanItem> {
    const rawDate = input.date
    const parts = rawDate.split('-')
    const formattedDate =
      parts.length === 3
        ? `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`
        : input.date

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const refNo = `REF-202610-${randomSuffix}`

    const newLoan: LoanItem = {
      id: `loan_${Date.now()}`,
      refNo,
      chequeNo: input.chequeNo || '',
      date: formattedDate,
      rawDate: input.date,
      particulars: input.particulars,
      category: input.category,
      amount: input.amount,
      company: input.company,
      status: input.status,
      auditStatus: 'Pending Audit',
      auditNotes: 'Newly recorded loan financing facility.',
      createdBy: 'Finance Auditor (Alex Cruz)',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'Loan',
    }

    inMemoryLoans = [newLoan, ...inMemoryLoans]
    saveStoredLoans(inMemoryLoans)
    return newLoan
  },

  async updateLoan(
    id: string,
    updates: Partial<LoanItem>
  ): Promise<LoanItem | null> {
    const index = inMemoryLoans.findIndex((l) => l.id === id)
    if (index === -1) return null

    const existing = inMemoryLoans[index]
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

    const amountVal = updates.amount !== undefined ? updates.amount : existing.amount

    const updated: LoanItem = {
      ...existing,
      ...updates,
      date: displayDate,
      rawDate: rawDate,
      amount: amountVal,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    }

    inMemoryLoans[index] = updated
    saveStoredLoans(inMemoryLoans)
    return updated
  },

  async deleteLoan(id: string): Promise<boolean> {
    inMemoryLoans = inMemoryLoans.filter((l) => l.id !== id)
    saveStoredLoans(inMemoryLoans)
    return true
  },

  exportCsv(items: LoanItem[], filename = 'loan_report.csv') {
    const headers = [
      'Date',
      'Ref No',
      'Cheque No',
      'Particulars',
      'Category',
      'Amount',
      'Company',
      'Status',
      'Audit Status',
    ]

    const rows = items.map((l) => [
      l.date,
      l.refNo,
      l.chequeNo || '—',
      `"${l.particulars.replace(/"/g, '""')}"`,
      l.category,
      l.amount,
      l.company,
      l.status,
      l.auditStatus,
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

  exportPdf(items: LoanItem[], company = 'MCT Kitchen') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalAmount = items.reduce((sum, l) => sum + (l.amount || 0), 0)

    const rowsHtml = items
      .map(
        (l) => `
        <tr>
          <td>${l.date}</td>
          <td>${l.chequeNo || '—'}</td>
          <td>${l.particulars}</td>
          <td>${l.category}</td>
          <td style="text-align: right;">₱${l.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td>${l.status}</td>
        </tr>
      `
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loan Summary Report — ${company}</title>
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
          <p>Loan Summary Report for <strong>${company}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${items.length}</div>
            <div><strong>Total Loan Financing:</strong> ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
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

  toDashboardTransaction(loan: LoanItem): DashboardTransactionItem {
    return {
      id: loan.id,
      refNo: loan.refNo,
      chequeNo: loan.chequeNo,
      date: loan.date,
      type: 'Loan',
      company: loan.company,
      description: loan.particulars,
      particulars: loan.particulars,
      amount: loan.amount,
      withdrawal: loan.amount,
      deposit: 0,
      category: (['GCash', 'Maya', 'PayMongo', 'Panda', 'In-house'].includes(loan.category)
        ? loan.category
        : 'In-house') as any,
      status: loan.status,
      auditStatus: loan.auditStatus,
      auditedBy: loan.auditedBy,
      auditNotes: loan.auditNotes,
      auditDate: loan.auditDate,
      createdBy: loan.createdBy,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      attachments: [],
    }
  },
}
