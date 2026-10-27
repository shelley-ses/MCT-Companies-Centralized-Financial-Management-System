import * as React from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCw,
  ArrowUpDown,
  FilterX,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  TrendingUp,
  ArrowDownLeft,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { AuditTransactionModal } from '@/components/dashboard/AuditTransactionModal'
import { salesService } from '@/services/salesService'
import { expenseService } from '@/services/expenseService'
import { loanService } from '@/services/loanService'
import type { DashboardTransactionItem } from '@/services/dashboardService'
import { useSession } from '@/hooks/useSession'
import { useCompany } from '@/context/CompanyContext'
import { formatPHP } from '@/lib/format'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

export const TransactionPage: React.FC = () => {
  const { user } = useSession()
  const { activeCompany } = useCompany()
  const isFinance = user?.role === 'Finance'
  const isAdmin = user?.role === 'Admin' || user?.role === 'Audit'
  const isCompanyScoped = !isAdmin && !isFinance
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [transactions, setTransactions] = React.useState<DashboardTransactionItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Switch bar tab: 'deposit' | 'sales'
  const [activeTab, setActiveTab] = React.useState<'deposit' | 'sales'>('deposit')

  // Independent Filters & Pagination for DEPOSIT Tab
  const [depositSearchQuery, setDepositSearchQuery] = React.useState('')
  const [depositDateRange, setDepositDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'All Dates',
  })
  const [depositSortOrder, setDepositSortOrder] = React.useState<'desc' | 'asc'>('desc')
  const [depositCurrentPage, setDepositCurrentPage] = React.useState(1)

  // Independent Filters & Pagination for SALES RECORD Tab
  const [salesSearchQuery, setSalesSearchQuery] = React.useState('')
  const [salesStatusFilter, setSalesStatusFilter] = React.useState<'All' | 'Paid' | 'Unpaid' | 'Pending' | 'On hold'>('All')
  const [salesDateRange, setSalesDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'All Dates',
  })
  const [salesSortOrder, setSalesSortOrder] = React.useState<'desc' | 'asc'>('desc')
  const [salesCurrentPage, setSalesCurrentPage] = React.useState(1)
  const [isSalesStatusDropdownOpen, setIsSalesStatusDropdownOpen] = React.useState(false)
  const salesStatusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const exportDropdownRef = React.useRef<HTMLDivElement>(null)

  const itemsPerPage = 12

  // Modal inspection
  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Close dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (salesStatusDropdownRef.current && !salesStatusDropdownRef.current.contains(target)) {
        setIsSalesStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch all transactions across Sales, Expenses, and Loans
  const fetchAllTransactions = React.useCallback(async () => {
    try {
      const targetCompany = isCompanyScoped
        ? assignedCompany
        : activeCompany !== 'All Companies'
        ? activeCompany
        : undefined
      const [salesData, expenseData, loanData] = await Promise.all([
        salesService.getSales(targetCompany),
        expenseService.getExpenses({ company: targetCompany }),
        loanService.getLoans({ company: targetCompany }),
      ])

      const unifiedSales: DashboardTransactionItem[] = salesData.map((s) => ({
        id: s.id,
        refNo: s.refNo,
        chequeNo: s.chequeNo || '',
        date: s.date,
        type: 'Sales',
        company: s.company,
        description: s.particulars,
        particulars: s.particulars,
        amount: s.deposit || s.withdrawal || 0,
        withdrawal: s.withdrawal || 0,
        deposit: s.deposit || 0,
        category: s.category as any,
        paymentMethod: s.paymentMethod,
        status: s.status,
        auditStatus: s.auditStatus,
        auditedBy: s.auditedBy,
        auditNotes: s.auditNotes,
        auditDate: s.auditDate,
        createdBy: s.createdBy,
        createdAt: s.createdAt || s.rawDate,
        updatedAt: s.updatedAt,
        attachments: [],
        items: s.items,
      }))

      const unifiedExpenses: DashboardTransactionItem[] = expenseData.map((e) => ({
        id: e.id,
        refNo: e.refNo,
        chequeNo: e.chequeNo || '',
        date: e.date,
        type: 'Expense',
        company: e.company,
        description: e.particulars,
        particulars: e.particulars,
        amount: e.withdrawal || e.netAmount || 0,
        withdrawal: e.withdrawal || e.netAmount || 0,
        deposit: 0,
        category: e.category as any,
        paymentMethod: e.paymentMethod,
        status: e.status,
        auditStatus: e.auditStatus,
        auditedBy: e.auditedBy,
        auditNotes: e.auditNotes,
        auditDate: e.auditDate,
        createdBy: e.createdBy,
        createdAt: e.createdAt || e.rawDate,
        updatedAt: e.updatedAt,
        attachments: [],
        items: e.items,
      }))

      const unifiedLoans: DashboardTransactionItem[] = loanData.map((l) => ({
        id: l.id,
        refNo: l.refNo,
        chequeNo: l.chequeNo || '',
        date: l.date,
        type: 'Loan',
        company: l.company,
        description: l.particulars,
        particulars: l.particulars,
        amount: l.amount || 0,
        withdrawal: l.amount || 0,
        deposit: 0,
        category: l.category as any,
        status: (l.status === 'Approved' || l.status === 'Paid') ? 'Paid' : l.status === 'Overdue' ? 'Overdue' : 'Pending',
        auditStatus: l.auditStatus,
        auditedBy: l.auditedBy,
        auditNotes: l.auditNotes,
        auditDate: l.auditDate,
        createdBy: l.createdBy,
        createdAt: l.createdAt || l.rawDate,
        updatedAt: l.updatedAt,
        attachments: [],
      }))

      const combined = [...unifiedSales, ...unifiedExpenses, ...unifiedLoans]
      setTransactions(combined)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [isCompanyScoped, assignedCompany, activeCompany])

  React.useEffect(() => {
    setLoading(true)
    fetchAllTransactions()
  }, [fetchAllTransactions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllTransactions()
  }

  // 1. FILTERED DEPOSITS (All transactions / particulars that have already been deposited)
  const filteredDepositTransactions = React.useMemo(() => {
    let list = transactions.filter(
      (t) => (t.deposit || 0) > 0 || (t.type === 'Sales' && t.status === 'Paid')
    )

    // Company scope
    if (isCompanyScoped) {
      list = list.filter(
        (t) => (t.company || '').toLowerCase().trim() === assignedCompany.toLowerCase().trim()
      )
    } else if (activeCompany && activeCompany !== 'All Companies') {
      list = list.filter(
        (t) => (t.company || '').toLowerCase().trim() === activeCompany.toLowerCase().trim()
      )
    }

    // Search query
    const q = depositSearchQuery.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (t) =>
          t.refNo.toLowerCase().includes(q) ||
          (t.chequeNo && t.chequeNo.toLowerCase().includes(q)) ||
          t.description.toLowerCase().includes(q) ||
          (t.particulars && t.particulars.toLowerCase().includes(q)) ||
          t.company.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    // Date range
    if (depositDateRange.startDate && depositDateRange.endDate) {
      list = list.filter((t) =>
        isDateInRange(t.date, depositDateRange.startDate, depositDateRange.endDate)
      )
    }

    // Sort
    list = [...list].sort((a, b) => {
      const dateA = normalizeDateToYYYYMMDD(a.date)
      const dateB = normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) {
        return depositSortOrder === 'desc' ? cmp : -cmp
      }
      const timeCmp = (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
      return depositSortOrder === 'desc' ? timeCmp : -timeCmp
    })

    return list
  }, [
    transactions,
    isCompanyScoped,
    assignedCompany,
    activeCompany,
    depositSearchQuery,
    depositDateRange,
    depositSortOrder,
  ])

  const depositTotalPages = Math.max(1, Math.ceil(filteredDepositTransactions.length / itemsPerPage))
  const displayedDepositTransactions = React.useMemo(() => {
    const start = (depositCurrentPage - 1) * itemsPerPage
    return filteredDepositTransactions.slice(start, start + itemsPerPage)
  }, [filteredDepositTransactions, depositCurrentPage, itemsPerPage])

  // 2. FILTERED SALES RECORDS (All sales with paid and unpaid, including status filter)
  const filteredSalesTransactions = React.useMemo(() => {
    let list = transactions.filter((t) => t.type === 'Sales')

    // Company scope
    if (isCompanyScoped) {
      list = list.filter(
        (t) => (t.company || '').toLowerCase().trim() === assignedCompany.toLowerCase().trim()
      )
    } else if (activeCompany && activeCompany !== 'All Companies') {
      list = list.filter(
        (t) => (t.company || '').toLowerCase().trim() === activeCompany.toLowerCase().trim()
      )
    }

    // Status filter: All | Paid | Unpaid | Pending | On hold
    if (salesStatusFilter !== 'All') {
      if (salesStatusFilter === 'Unpaid') {
        list = list.filter((t) => t.status !== 'Paid')
      } else {
        list = list.filter((t) => t.status === salesStatusFilter)
      }
    }

    // Search query
    const q = salesSearchQuery.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (t) =>
          t.refNo.toLowerCase().includes(q) ||
          (t.chequeNo && t.chequeNo.toLowerCase().includes(q)) ||
          t.description.toLowerCase().includes(q) ||
          (t.particulars && t.particulars.toLowerCase().includes(q)) ||
          t.company.toLowerCase().includes(q) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      )
    }

    // Date range
    if (salesDateRange.startDate && salesDateRange.endDate) {
      list = list.filter((t) =>
        isDateInRange(t.date, salesDateRange.startDate, salesDateRange.endDate)
      )
    }

    // Sort
    list = [...list].sort((a, b) => {
      const dateA = normalizeDateToYYYYMMDD(a.date)
      const dateB = normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) {
        return salesSortOrder === 'desc' ? cmp : -cmp
      }
      const timeCmp = (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
      return salesSortOrder === 'desc' ? timeCmp : -timeCmp
    })

    return list
  }, [
    transactions,
    isCompanyScoped,
    assignedCompany,
    activeCompany,
    salesStatusFilter,
    salesSearchQuery,
    salesDateRange,
    salesSortOrder,
  ])

  const salesTotalPages = Math.max(1, Math.ceil(filteredSalesTransactions.length / itemsPerPage))
  const displayedSalesTransactions = React.useMemo(() => {
    const start = (salesCurrentPage - 1) * itemsPerPage
    return filteredSalesTransactions.slice(start, start + itemsPerPage)
  }, [filteredSalesTransactions, salesCurrentPage, itemsPerPage])

  // Active dataset & clear filters check
  const activeDataset = activeTab === 'deposit' ? filteredDepositTransactions : filteredSalesTransactions
  const hasDepositActiveFilters =
    depositSearchQuery.trim().length > 0 ||
    (depositDateRange.startDate !== null && depositDateRange.endDate !== null)

  const hasSalesActiveFilters =
    salesSearchQuery.trim().length > 0 ||
    salesStatusFilter !== 'All' ||
    (salesDateRange.startDate !== null && salesDateRange.endDate !== null)

  const handleClearDepositFilters = () => {
    setDepositSearchQuery('')
    setDepositDateRange({ startDate: null, endDate: null, label: 'All Dates' })
    setDepositCurrentPage(1)
  }

  const handleClearSalesFilters = () => {
    setSalesSearchQuery('')
    setSalesStatusFilter('All')
    setSalesDateRange({ startDate: null, endDate: null, label: 'All Dates' })
    setSalesCurrentPage(1)
  }

  const handleRowClick = (tx: DashboardTransactionItem) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const handleMarkTxAudited = (tx: DashboardTransactionItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    })
    const auditorName = user?.fullName || 'Admin'

    const updatedTx: DashboardTransactionItem = {
      ...tx,
      auditStatus: 'Verified',
      auditedBy: auditorName,
      auditDate: today,
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? updatedTx : t))
    )

    if (tx.type === 'Sales') {
      salesService.updateSaleAuditStatus(tx.id, 'Verified', auditorName)
    } else if (tx.type === 'Expense') {
      expenseService.updateExpenseAuditStatus(tx.id, 'Verified', auditorName)
    } else if (tx.type === 'Loan') {
      loanService.updateLoan(tx.id, {
        auditStatus: 'Verified',
        auditedBy: auditorName,
        auditDate: today,
      })
    }
  }

  const handleTransactionUpdated = (updatedItem: DashboardTransactionItem) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedItem.id ? updatedItem : t))
    )
    setSelectedTx(updatedItem)
  }

  // Export CSV handler
  const handleExportCsv = () => {
    const isDeposit = activeTab === 'deposit'
    const headers = isDeposit
      ? ['DATE', 'COMPANY', 'CHEQUE NO.', 'PARTICULARS', 'CATEGORY', 'DEPOSIT AMOUNT', 'AUDIT STATUS']
      : ['DATE', 'COMPANY', 'REF NO.', 'PARTICULARS', 'PAYMENT METHOD', 'AMOUNT', 'STATUS', 'AUDIT STATUS']

    const rows = (isDeposit ? filteredDepositTransactions : filteredSalesTransactions).map((t) => {
      if (isDeposit) {
        return [
          `"${t.date}"`,
          `"${(t.company || '').replace(/"/g, '""')}"`,
          `"${t.chequeNo || '—'}"`,
          `"${(t.particulars || t.description).replace(/"/g, '""')}"`,
          `"${t.category}"`,
          t.deposit > 0 ? t.deposit : (t.amount || 0),
          `"${t.auditStatus || 'Pending Audit'}"`,
        ]
      }
      return [
        `"${t.date}"`,
        `"${(t.company || '').replace(/"/g, '""')}"`,
        `"${t.refNo || '—'}"`,
        `"${(t.particulars || t.description).replace(/"/g, '""')}"`,
        `"${t.paymentMethod || 'Cash'}"`,
        t.deposit || t.amount || 0,
        `"${t.status || 'Paid'}"`,
        `"${t.auditStatus || 'Pending Audit'}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `mct_${activeTab}_records_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsExportDropdownOpen(false)
  }

  // Export PDF handler
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.')
      return
    }

    const isDeposit = activeTab === 'deposit'
    const records = isDeposit ? filteredDepositTransactions : filteredSalesTransactions

    const rowsHtml =
      records.length === 0
        ? `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No ${activeTab} records found for this selection.</td></tr>`
        : records
            .map((tx) => {
              if (isDeposit) {
                const amt = tx.deposit > 0 ? tx.deposit : (tx.amount || 0)
                return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.date}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${tx.company || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${tx.chequeNo || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.particulars || tx.description}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.category}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 700;">₱${amt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.auditStatus === 'Verified' ? 'Audited' : 'Pending Audit'}</td>
        </tr>
      `
              }
              const amt = tx.deposit || tx.amount || 0
              return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.date}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${tx.company || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${tx.refNo || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.particulars || tx.description}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.paymentMethod || 'Cash'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">₱${amt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${tx.status || 'Paid'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.auditStatus === 'Verified' ? 'Audited' : 'Pending Audit'}</td>
        </tr>
      `
            })
            .join('')

    const displayedTitle = isCompanyScoped
      ? assignedCompany
      : activeCompany !== 'All Companies'
      ? activeCompany
      : 'All Subsidiaries'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isDeposit ? 'Deposits' : 'Sales Records'} Report - ${displayedTitle}</title>
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
          <p>Consolidated <strong>${isDeposit ? 'Deposit Records' : 'Sales Records'}</strong> for <strong>${displayedTitle}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>${isDeposit ? 'Cheque No.' : 'Ref No.'}</th>
                <th>Particulars</th>
                <th>${isDeposit ? 'Category' : 'Payment Method'}</th>
                <th style="text-align: right;">Amount</th>
                ${!isDeposit ? '<th>Status</th>' : ''}
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${records.length}</div>
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
    setIsExportDropdownOpen(false)
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300 select-none">
      {/* 1. Header & Actions Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
            Transactions
          </h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            {isCompanyScoped
              ? `Financial transaction ledger for ${assignedCompany}`
              : activeCompany !== 'All Companies'
              ? `Financial transaction ledger for ${activeCompany}`
              : 'Consolidated records for deposits, sales inflows, and settlements'}
          </p>
        </div>

        {/* Top Right Action Buttons: Sort, Refresh, Live Date & Red Export Dropdown */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (activeTab === 'deposit') {
                setDepositSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
              } else {
                setSalesSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
              }
            }}
            className="h-10 sm:h-11 px-3.5 rounded-xl border border-stroke/50 bg-white text-focus hover:bg-surface font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
            title="Toggle chronological sorting order"
          >
            <ArrowUpDown className="h-4 w-4 text-focus/70 shrink-0" />
            <span className="hidden sm:inline">
              {(activeTab === 'deposit' ? depositSortOrder : salesSortOrder) === 'desc'
                ? 'Latest First'
                : 'Oldest First'}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border border-stroke/50 bg-white text-focus hover:bg-surface font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
            aria-label="Refresh transaction records"
          >
            <RotateCw
              className={`h-4 w-4 text-focus/70 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <LiveDateTimeBadge />

          {/* Red Export Button with CSV & PDF options */}
          <div ref={exportDropdownRef} className="relative inline-block">
            <Button
              type="button"
              disabled={activeDataset.length === 0}
              onClick={() => setIsExportDropdownOpen((prev) => !prev)}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white border-transparent disabled:opacity-50"
              aria-haspopup="true"
              aria-expanded={isExportDropdownOpen}
              aria-label="Export transaction records"
            >
              <Download className="h-4 w-4 shrink-0 text-white" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-white/90" />
            </Button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Download as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Download as PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Switch Bar: Deposit vs. Sales Record (Left Side) */}
      <div className="flex items-center justify-start w-full">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-stroke/30">
          <button
            type="button"
            onClick={() => setActiveTab('deposit')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs',
              activeTab === 'deposit'
                ? 'bg-[#960C01] text-white shadow-sm ring-1 ring-[#960C01]/30'
                : 'text-focus/80 hover:bg-white hover:text-focus'
            )}
          >
            <ArrowDownLeft className="h-4 w-4 shrink-0" />
            <span>Deposit</span>
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full font-bold ml-1',
                activeTab === 'deposit' ? 'bg-white/20 text-white' : 'bg-slate-200 text-focus/70'
              )}
            >
              {filteredDepositTransactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs',
              activeTab === 'sales'
                ? 'bg-[#960C01] text-white shadow-sm ring-1 ring-[#960C01]/30'
                : 'text-focus/80 hover:bg-white hover:text-focus'
            )}
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>Sales Record</span>
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full font-bold ml-1',
                activeTab === 'sales' ? 'bg-white/20 text-white' : 'bg-slate-200 text-focus/70'
              )}
            >
              {filteredSalesTransactions.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Independent Filters Toolbar per Active Tab */}
      {activeTab === 'deposit' ? (
        /* DEPOSIT FILTERS TOOLBAR */
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Extended Width Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
            <Input
              type="search"
              placeholder="Search deposited transactions by Cheque No., particulars, category..."
              value={depositSearchQuery}
              onChange={(e) => {
                setDepositSearchQuery(e.target.value)
                setDepositCurrentPage(1)
              }}
              className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
            />
          </div>

          {/* Right Controls: Date Range Picker & Clear Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <DateRangePicker
              value={depositDateRange}
              onChange={(newRange) => {
                setDepositDateRange(newRange)
                setDepositCurrentPage(1)
              }}
            />

            {hasDepositActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearDepositFilters}
                className="h-10 px-3 rounded-full text-xs font-semibold text-muted-fg hover:text-focus hover:bg-surface flex items-center gap-1.5 cursor-pointer"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* SALES RECORD FILTERS TOOLBAR (Includes Status Dropdown for Paid and Unpaid) */
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Extended Width Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
            <Input
              type="search"
              placeholder="Search sales particulars, Ref No., Cheque No., payment method..."
              value={salesSearchQuery}
              onChange={(e) => {
                setSalesSearchQuery(e.target.value)
                setSalesCurrentPage(1)
              }}
              className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
            />
          </div>

          {/* Right Controls: Status Filter (Paid/Unpaid/Pending), Date Range Picker & Clear Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Status Filter Dropdown */}
            <div ref={salesStatusDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsSalesStatusDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isSalesStatusDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                )}
              >
                <span className="font-semibold text-focus/90">
                  {salesStatusFilter === 'All' ? 'Status: All' : `Status: ${salesStatusFilter}`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isSalesStatusDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="space-y-1">
                    {[
                      { label: 'All Statuses', value: 'All' as const, dot: 'bg-slate-400' },
                      { label: 'Paid', value: 'Paid' as const, dot: 'bg-emerald-500' },
                      { label: 'Unpaid', value: 'Unpaid' as const, dot: 'bg-rose-500' },
                      { label: 'Pending', value: 'Pending' as const, dot: 'bg-amber-500' },
                      { label: 'On hold', value: 'On hold' as const, dot: 'bg-stone-500' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSalesStatusFilter(opt.value)
                          setIsSalesStatusDropdownOpen(false)
                          setSalesCurrentPage(1)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                          salesStatusFilter === opt.value
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', opt.dot)} />
                          <span>{opt.label}</span>
                        </div>
                        {salesStatusFilter === opt.value && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={salesDateRange}
              onChange={(newRange) => {
                setSalesDateRange(newRange)
                setSalesCurrentPage(1)
              }}
            />

            {hasSalesActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSalesFilters}
                className="h-10 px-3 rounded-full text-xs font-semibold text-muted-fg hover:text-focus hover:bg-surface flex items-center gap-1.5 cursor-pointer"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 4. Table Card Rendering Based on Active Tab */}
      <div className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  DATE
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  COMPANY
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  {activeTab === 'deposit' ? 'CHEQUE NO.' : 'REF NO.'}
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  PARTICULARS
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  {activeTab === 'deposit' ? 'CATEGORY' : 'PAYMENT METHOD'}
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  AMOUNT
                </TableHead>
                {activeTab === 'sales' && (
                  <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                    STATUS
                  </TableHead>
                )}
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  AUDIT STATUS
                </TableHead>
                {isAdmin && (
                  <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                    ACTION
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-48 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md ml-auto" /></TableCell>
                    {activeTab === 'sales' && (
                      <TableCell className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></TableCell>
                    )}
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></TableCell>
                    {isAdmin && (
                      <TableCell className="px-4 py-3.5 text-center">
                        <Skeleton className="h-6 w-16 rounded-md mx-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (activeTab === 'deposit' ? displayedDepositTransactions : displayedSalesTransactions).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'sales' ? (isAdmin ? 9 : 8) : (isAdmin ? 8 : 7)}
                    className="py-12 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    No {activeTab === 'deposit' ? 'deposit records' : 'sales records'} found for the selected filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                (activeTab === 'deposit' ? displayedDepositTransactions : displayedSalesTransactions).map((tx) => {
                  const depositAmt = tx.deposit > 0 ? tx.deposit : (tx.amount || 0)

                  return (
                    <TableRow
                      key={tx.id}
                      onClick={() => handleRowClick(tx)}
                      title="Click to view transaction details"
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* 1. Date */}
                      <TableCell className="px-4 py-3.5 text-xs font-medium text-focus whitespace-nowrap">
                        {tx.date}
                      </TableCell>

                      {/* 2. Company */}
                      <TableCell className="px-4 py-3.5 text-xs font-medium text-focus/90 truncate max-w-[160px]" title={tx.company}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200/60 max-w-full truncate">
                          {tx.company || '—'}
                        </span>
                      </TableCell>

                      {/* 3. Cheque No / Ref No */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 whitespace-nowrap font-mono">
                        {activeTab === 'deposit' ? (tx.chequeNo || '—') : (tx.refNo || '—')}
                      </TableCell>

                      {/* 4. Particulars */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-normal max-w-xs">
                        <span className="line-clamp-1">{tx.particulars || tx.description}</span>
                      </TableCell>

                      {/* 5. Category or Payment Method */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-medium whitespace-nowrap">
                        {activeTab === 'deposit' ? tx.category : (tx.paymentMethod || 'Cash')}
                      </TableCell>

                      {/* 6. Amount */}
                      <TableCell className="px-4 py-3.5 text-xs font-bold text-right tabular-nums whitespace-nowrap text-emerald-600">
                        {formatPHP(depositAmt)}
                      </TableCell>

                      {/* 7. Status (Sales Tab only: Paid, Unpaid, Pending, On hold) */}
                      {activeTab === 'sales' && (
                        <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                          {tx.status === 'Paid' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                          ) : tx.status === 'Pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          ) : tx.status === 'On hold' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                              On hold
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Unpaid
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* 8. Audit Status Badge */}
                      <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                        {tx.auditStatus === 'Verified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Audited</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </TableCell>

                      {/* 9. Action for Admin */}
                      {isAdmin && (
                        <TableCell
                          className="px-4 py-3.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            {tx.auditStatus === 'Verified' ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRowClick(tx)}
                                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 flex items-center gap-1.5 cursor-pointer border border-emerald-300/80 shadow-2xs transition-all"
                                title="Audited (Click to inspect or unmark)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Audited</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleMarkTxAudited(tx, e)}
                                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-focus/80 hover:text-primary hover:bg-red-50/50 flex items-center gap-1.5 cursor-pointer border border-slate-200/80 hover:border-primary/30 shadow-2xs transition-all"
                                title="Click to verify and mark as audited"
                              >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>Audit</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. Pagination Footer */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Record summary */}
          <span className="font-medium text-focus/80">
            {activeTab === 'deposit'
              ? filteredDepositTransactions.length === 0
                ? 'Showing 0 of 0 deposit records'
                : `Showing ${(depositCurrentPage - 1) * itemsPerPage + 1}-${Math.min(
                    depositCurrentPage * itemsPerPage,
                    filteredDepositTransactions.length
                  )} of ${filteredDepositTransactions.length} deposit records`
              : filteredSalesTransactions.length === 0
              ? 'Showing 0 of 0 sales records'
              : `Showing ${(salesCurrentPage - 1) * itemsPerPage + 1}-${Math.min(
                  salesCurrentPage * itemsPerPage,
                  filteredSalesTransactions.length
                )} of ${filteredSalesTransactions.length} sales records`}
          </span>

          {/* Page Indicator & Navigation */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-fg italic">
              Page {activeTab === 'deposit' ? depositCurrentPage : salesCurrentPage} out of{' '}
              {activeTab === 'deposit' ? depositTotalPages : salesTotalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                activeTab === 'deposit' ? depositCurrentPage <= 1 : salesCurrentPage <= 1
              }
              onClick={() => {
                if (activeTab === 'deposit') {
                  setDepositCurrentPage((p) => Math.max(1, p - 1))
                } else {
                  setSalesCurrentPage((p) => Math.max(1, p - 1))
                }
              }}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                activeTab === 'deposit'
                  ? depositCurrentPage >= depositTotalPages
                  : salesCurrentPage >= salesTotalPages
              }
              onClick={() => {
                if (activeTab === 'deposit') {
                  setDepositCurrentPage((p) => Math.min(depositTotalPages, p + 1))
                } else {
                  setSalesCurrentPage((p) => Math.min(salesTotalPages, p + 1))
                }
              }}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 6. Transaction Details Modal (If audited, editing is locked; if not audited, provides edit in Excel sheet) */}
      <AuditTransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        transaction={selectedTx}
        onTransactionUpdated={handleTransactionUpdated}
        editable={!isAdmin}
      />
    </div>
  )
}
