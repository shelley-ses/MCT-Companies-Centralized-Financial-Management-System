import type { DashboardTransactionItem } from './dashboardService'
import { normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { type ParticularItem, parseParticulars } from '@/utils/particularsUtils'

export interface SalesItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string // e.g. "10/01/26"
  rawDate: string // e.g. "2026-10-01"
  particulars: string
  withdrawal: number
  deposit: number
  netAmount: number
  category: string       // user-configurable category (from DB Category table)
  paymentMethod?: string // payment method: GCash, Cash, Cheque, Bank Transfer, etc.
  company: string
  items?: ParticularItem[]
  status: 'Paid' | 'Pending' | 'Overdue' | 'On hold' | 'Unpaid'
  auditStatus: 'Verified' | 'Pending Audit' | 'Flagged'
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  type: 'Sales'
}

export interface NewSalesInput {
  date: string
  chequeNo?: string
  particulars: string
  amount: number
  category?: string        // optional sales category (e.g. Sales Revenue, Catering)
  paymentMethod?: string  // payment method (GCash, Cash, etc.)
  company: string
  status: 'Paid' | 'Pending' | 'On hold' | 'Unpaid'
  items?: ParticularItem[]
  bankAccountId?: string
}

let inMemorySales: SalesItem[] = []
function mapBackendSaleToItem(b: any): SalesItem {
  const rawDate = b.transaction_date || (b.created_at ? b.created_at.split('T')[0] : '2026-10-01')
  const [year, month, day] = rawDate.split('-')
  const displayDate = month && day ? `${month}/${day}/${year?.slice(2) || '26'}` : rawDate
  const amt = Number(b.amount) || 0
  
  let chequeNo = b.cheque_no || b.chequeNo || b.reference_no || ''
  let particulars = b.particulars || b.description || 'Sales Entry'
  if (!chequeNo && particulars.includes('[Cheque:')) {
    const parts = particulars.split('[Cheque:')
    particulars = parts[0].trim()
    chequeNo = parts[1].replace(']', '').trim()
  }

  const parsedItems = parseParticulars(particulars, null, amt)

  return {
    id: String(b.sales_id),
    refNo: chequeNo || `REF-${b.sales_id}`,
    chequeNo: chequeNo || undefined,
    date: displayDate,
    rawDate: rawDate,
    particulars: particulars || 'Sales Entry',
    withdrawal: 0,
    deposit: amt,
    netAmount: amt,
    category: b.category_name || 'None',
    paymentMethod: b.payment_method || undefined,
    company: b.company_name || 'MCT Kitchen',
    items: parsedItems,
    status: 'Paid',
    auditStatus: 'Verified',
    createdBy: 'Company Auditor',
    createdAt: b.created_at || new Date().toISOString(),
    type: 'Sales',
  }
}

const salesCache = new Map<string, { data: SalesItem[]; timestamp: number }>()
const SALES_CACHE_TTL = 30000

export const salesService = {
  invalidateCache(): void {
    salesCache.clear()
  },

  async getSales(company?: string): Promise<SalesItem[]> {
    const cacheKey = company || 'All Companies'
    const cached = salesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SALES_CACHE_TTL) {
      return cached.data
    }

    try {
      const url =
        company && company !== 'All Companies'
          ? `/api/v1/sales?company_name=${encodeURIComponent(company)}`
          : '/api/v1/sales'

      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const apiSales = data.map(mapBackendSaleToItem)
          const sorted = apiSales.sort((a, b) => {
            const dateA = a.rawDate || normalizeDateToYYYYMMDD(a.date)
            const dateB = b.rawDate || normalizeDateToYYYYMMDD(b.date)
            const cmp = dateB.localeCompare(dateA)
            if (cmp !== 0) return cmp
            return Number(b.id) - Number(a.id)
          })
          salesCache.set(cacheKey, { data: sorted, timestamp: Date.now() })
          return sorted
        }
      }
    } catch (err) {
      console.warn('Backend /sales fetch error, using local fallback:', err)
    }

    const list =
      !company || company === 'All Companies'
        ? [...inMemorySales]
        : inMemorySales.filter((s) => s.company === company)

    return list.sort((a, b) => {
      const dateA = a.rawDate || normalizeDateToYYYYMMDD(a.date)
      const dateB = b.rawDate || normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) return cmp
      return (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    })
  },

  async addSale(input: NewSalesInput): Promise<SalesItem> {
    const payload = {
      company: input.company,
      transaction_date: input.date,
      amount: input.amount,
      particulars: input.particulars,
      description: input.particulars,
      category: input.category && input.category !== 'None' ? input.category : null,
      payment_method: input.paymentMethod || null,
      chequeNo: input.chequeNo || undefined,
      bank_account_id: input.bankAccountId || undefined,
    }

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const created = await res.json()
        const newItem = mapBackendSaleToItem(created)
        if (input.items && input.items.length > 0) {
          newItem.items = input.items
        }
        inMemorySales = [newItem, ...inMemorySales]
        return newItem
      } else {
        const errData = await res.json().catch(() => ({}))
        const errorMsg =
          errData.detail ||
          (typeof errData === 'string' ? errData : 'Failed to record sales entry.')
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      console.warn('Backend POST /sales failed, creating local record:', err)
      // If network error occurred, create local fallback item
      const id = `sale_${Date.now()}`
      const refNo = `REF-${input.date.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
      const [year, month, day] = input.date.split('-')
      const displayDate = `${month}/${day}/${year?.slice(2) || '26'}`

      const newItem: SalesItem = {
        id,
        refNo,
        chequeNo: input.chequeNo || '',
        date: displayDate,
        rawDate: input.date,
        particulars: input.particulars,
        withdrawal: 0,
        deposit: input.amount,
        netAmount: input.amount,
        category: input.category || 'None',
        paymentMethod: input.paymentMethod,
        company: input.company,
        items: input.items || parseParticulars(input.particulars, null, input.amount),
        status: input.status,
        auditStatus: 'Verified',
        createdBy: 'Company Auditor',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        type: 'Sales',
      }

      inMemorySales = [newItem, ...inMemorySales]
      return newItem
    }
  },

  async updateSale(
    id: string,
    input: Partial<NewSalesInput>
  ): Promise<SalesItem> {
    const payload: Record<string, any> = {}
    if (input.date) payload.transaction_date = input.date
    if (input.amount !== undefined) payload.amount = input.amount
    if (input.particulars) payload.particulars = input.particulars
    if (input.category !== undefined) {
      payload.category = input.category === 'None' ? null : input.category
    }
    if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod || null
    if (input.chequeNo !== undefined) payload.chequeNo = input.chequeNo

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/sales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        const mapped = mapBackendSaleToItem(updated)
        inMemorySales = inMemorySales.map((s) => (s.id === id ? mapped : s))
        return mapped
      }
    } catch (err) {
      console.warn('Backend update sale failed, updating locally:', err)
    }

    // Local update fallback
    inMemorySales = inMemorySales.map((s) => {
      if (s.id !== id) return s
      const amt = input.amount !== undefined ? input.amount : s.deposit
      const [year, month, day] = (input.date || s.rawDate || '').split('-')
      const displayDate = month && day ? `${month}/${day}/${year?.slice(2) || '26'}` : s.date
      return {
        ...s,
        date: input.date ? displayDate : s.date,
        rawDate: input.date || s.rawDate,
        particulars: input.particulars || s.particulars,
        chequeNo: input.chequeNo !== undefined ? input.chequeNo : s.chequeNo,
        category: input.category || s.category,
        paymentMethod: input.paymentMethod || s.paymentMethod,
        company: input.company || s.company,
        status: input.status || s.status,
        items: input.items || s.items,
        deposit: amt,
        netAmount: amt,
        updatedAt: new Date().toISOString(),
      }
    })
    return inMemorySales.find((s) => s.id === id)!
  },

  async deleteSale(id: string): Promise<boolean> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/sales/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        inMemorySales = inMemorySales.filter((s) => s.id !== id)
        return true
      }
    } catch (err) {
      console.warn('Backend delete sale failed, deleting locally:', err)
    }

    inMemorySales = inMemorySales.filter((s) => s.id !== id)
    return true
  },

  async updateSaleAuditStatus(
    id: string,
    auditStatus: 'Verified' | 'Pending Audit' | 'Flagged',
    auditedBy?: string
  ): Promise<SalesItem | null> {
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    })
    inMemorySales = inMemorySales.map((s) => {
      if (s.id !== id) return s
      return {
        ...s,
        auditStatus,
        auditedBy: auditStatus === 'Verified' ? (auditedBy || 'Admin') : undefined,
        auditDate: auditStatus === 'Verified' ? today : undefined,
        updatedAt: new Date().toISOString(),
      }
    })
    return inMemorySales.find((s) => s.id === id) || null
  },

  exportCsv(items: SalesItem[], filename = 'sales_report.csv') {
    const headers = [
      'Date',
      'Ref No',
      'Cheque No',
      'Particulars',
      'Withdrawal',
      'Deposit',
      'Net Amount',
      'Payment Method',
      'Company',
    ]

    const rows = items.map((s) => [
      s.date,
      s.refNo,
      s.chequeNo || '—',
      `"${s.particulars.replace(/"/g, '""')}"`,
      s.withdrawal,
      s.deposit,
      s.netAmount,
      s.paymentMethod || 'Cash',
      s.company,
    ])

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n')

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

  exportPdf(items: SalesItem[], company = 'MCT Kitchen') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalDeposit = items.reduce((sum, s) => sum + (s.deposit || 0), 0)
    const totalWithdrawal = items.reduce((sum, s) => sum + (s.withdrawal || 0), 0)
    const netTotal = totalDeposit - totalWithdrawal

    const rowsHtml =
      items.length === 0
        ? `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No sales transactions recorded for this selection.</td></tr>`
        : items
            .map(
              (s) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.date}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${s.chequeNo || '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.particulars}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #dc2626;">${s.withdrawal > 0 ? `₱${s.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 600;">${s.deposit > 0 ? `₱${s.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.paymentMethod || 'Cash'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">₱${s.netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.status}</td>
      </tr>
    `
            )
            .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Summary Report - ${company}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 24px; }
            h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #960C01; }
            p { font-size: 12px; color: #64748B; margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background-color: #F8FAFC; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; border-bottom: 2px solid #CBD5E1; }
            .summary { margin-top: 20px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 12px; }
            @media print {
              body { padding: 10px; }
              @page { size: landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h1>MCT Group of Companies</h1>
          <p>Sales Summary Report for <strong>${company}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Withdrawal</th>
                <th style="text-align: right;">Deposit</th>
                <th>Payment Method</th>
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
            <div><strong>Total Sales (Inflows):</strong> ₱${totalDeposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Net Total:</strong> ₱${netTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
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

  // Map a SalesItem to DashboardTransactionItem so it can be viewed in AuditTransactionModal
  toDashboardTransaction(sale: SalesItem): DashboardTransactionItem {
    return {
      id: sale.id,
      refNo: sale.refNo,
      chequeNo: sale.chequeNo,
      date: sale.date,
      type: 'Sales',
      company: sale.company,
      description: sale.particulars,
      particulars: sale.particulars,
      amount: sale.deposit,
      withdrawal: sale.withdrawal,
      deposit: sale.deposit,
      category: (sale.category || 'General') as any,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      auditStatus: sale.auditStatus,
      auditedBy: sale.auditedBy,
      auditNotes: sale.auditNotes,
      auditDate: sale.auditDate,
      createdBy: sale.createdBy,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      attachments: [],
      items: sale.items || parseParticulars(sale.particulars, null, sale.deposit),
    }
  },
}
