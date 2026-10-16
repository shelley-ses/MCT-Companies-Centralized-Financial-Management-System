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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { formatPHP } from '@/lib/format'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'

export const TransactionPage: React.FC = () => {
  const { user } = useSession()
  const isFinance = user?.role === 'Finance'
  const isAdmin = user?.role === 'Admin'
  const isCompanyScoped = !isAdmin && !isFinance
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [transactions, setTransactions] = React.useState<DashboardTransactionItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Filters (Company dropdown removed per user request)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'All Dates',
  })
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc')

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const exportDropdownRef = React.useRef<HTMLDivElement>(null)

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 12

  // Modal inspection
  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Close export dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target as Node)
      ) {
        setIsExportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch all transactions across Sales, Expenses, and Loans
  const fetchAllTransactions = React.useCallback(async () => {
    try {
      const targetCompany = isCompanyScoped ? assignedCompany : undefined
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
        status: s.status,
        auditStatus: s.auditStatus,
        auditedBy: s.auditedBy,
        auditNotes: s.auditNotes,
        auditDate: s.auditDate,
        createdBy: s.createdBy,
        createdAt: s.createdAt || s.rawDate,
        updatedAt: s.updatedAt,
        attachments: [],
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
        status: e.status,
        auditStatus: e.auditStatus,
        auditedBy: e.auditedBy,
        auditNotes: e.auditNotes,
        auditDate: e.auditDate,
        createdBy: e.createdBy,
        createdAt: e.createdAt || e.rawDate,
        updatedAt: e.updatedAt,
        attachments: [],
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
  }, [])

  React.useEffect(() => {
    setLoading(true)
    fetchAllTransactions()
  }, [fetchAllTransactions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllTransactions()
  }

  // Filtered and sorted transactions
  const filteredTransactions = React.useMemo(() => {
    let result = transactions

    // Company employees and supervisors only see their assigned company
    if (isCompanyScoped) {
      result = result.filter(
        (t) => (t.company || '').toLowerCase().trim() === assignedCompany.toLowerCase().trim()
      )
    }

    // Search query
    const q = searchQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (t) =>
          t.refNo.toLowerCase().includes(q) ||
          (t.chequeNo && t.chequeNo.toLowerCase().includes(q)) ||
          t.description.toLowerCase().includes(q) ||
          (t.particulars && t.particulars.toLowerCase().includes(q)) ||
          t.company.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      result = result.filter((t) =>
        isDateInRange(t.date, dateRange.startDate, dateRange.endDate)
      )
    }

    // Chronological sort (by date and timestamp)
    result = [...result].sort((a, b) => {
      const dateA = normalizeDateToYYYYMMDD(a.date)
      const dateB = normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) {
        return sortOrder === 'desc' ? cmp : -cmp
      }
      const timeCmp = (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
      return sortOrder === 'desc' ? timeCmp : -timeCmp
    })

    return result
  }, [
    transactions,
    isCompanyScoped,
    assignedCompany,
    searchQuery,
    dateRange,
    sortOrder,
  ])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))
  const displayedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTransactions.slice(start, start + itemsPerPage)
  }, [filteredTransactions, currentPage, itemsPerPage])

  const handleClearFilters = () => {
    setSearchQuery('')
    setDateRange({ startDate: null, endDate: null, label: 'All Dates' })
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    (dateRange.startDate !== null && dateRange.endDate !== null)

  const handleRowClick = (tx: DashboardTransactionItem) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  // Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      'DATE',
      'COMPANY',
      'CHEQUE NO.',
      'PARTICULARS',
      'WITHDRAWAL',
      'DEPOSIT',
      'CATEGORY',
      'NET AMOUNT',
    ]

    const rows = filteredTransactions.map((t) => {
      const net = (t.deposit || 0) - (t.withdrawal || 0)
      return [
        `"${t.date}"`,
        `"${(t.company || '').replace(/"/g, '""')}"`,
        `"${t.chequeNo || '—'}"`,
        `"${(t.particulars || t.description).replace(/"/g, '""')}"`,
        t.withdrawal > 0 ? t.withdrawal : 0,
        t.deposit > 0 ? t.deposit : 0,
        `"${t.category}"`,
        net,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `mct_transactions_${new Date().toISOString().slice(0, 10)}.csv`)
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

    const rowsHtml =
      filteredTransactions.length === 0
        ? `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No transaction records found for this selection.</td></tr>`
        : filteredTransactions
            .map((tx) => {
              const netAmount = (tx.deposit || 0) - (tx.withdrawal || 0)
              return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.date}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${tx.company || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${tx.chequeNo || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.particulars || tx.description}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #dc2626;">${tx.withdrawal > 0 ? `₱${tx.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 600;">${tx.deposit > 0 ? `₱${tx.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tx.category}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">₱${netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        </tr>
      `
            })
            .join('')

    const displayedTitle = 'MCT Group of Companies'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transactions Report - ${displayedTitle}</title>
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
          <p>Consolidated Transactions Report for <strong>${displayedTitle}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Withdrawal</th>
                <th style="text-align: right;">Deposit</th>
                <th>Category</th>
                <th style="text-align: right;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${filteredTransactions.length}</div>
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

  const displayedTitle = isCompanyScoped ? assignedCompany : 'MCT Group of Companies'

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
            Transactions
          </h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            {isCompanyScoped
              ? `Financial transactions record for ${assignedCompany}`
              : 'Consolidated record of all transactions in chronological order'}
          </p>
        </div>

        {/* Top Right Action Buttons: Refresh, Sort & Red Export Dropdown */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            className="h-10 sm:h-11 px-3.5 rounded-xl border border-stroke/50 bg-white text-focus hover:bg-surface font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer"
            title="Toggle chronological sorting order"
          >
            <ArrowUpDown className="h-4 w-4 text-focus/70 shrink-0" />
            <span className="hidden sm:inline">
              {sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}
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

          {/* Red Export Button with CSV & PDF options */}
          <div ref={exportDropdownRef} className="relative inline-block">
            <Button
              type="button"
              disabled={filteredTransactions.length === 0}
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

      {/* 2. Filters Toolbar with Extended Width Search Bar and No Company Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Expanded Width Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
          <Input
            type="search"
            placeholder="Search by Cheque No., particulars, category, or reference..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
          />
        </div>

        {/* Right: Date Range Picker & Clear Button */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Date Range Picker */}
          <DateRangePicker
            value={dateRange}
            onChange={(newRange) => {
              setDateRange(newRange)
              setCurrentPage(1)
            }}
          />

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-10 px-3 rounded-full text-xs font-semibold text-muted-fg hover:text-focus hover:bg-surface flex items-center gap-1.5 cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Main Transactions Card & Table matching Recent Transactions in Dashboard */}
      <div className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs">
        {/* Grey Header Banner matching Recent Transactions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5">
          <h2 className="text-sm sm:text-base font-bold text-focus leading-tight">
            All Transactions
          </h2>
          <p className="text-xs text-muted-fg font-normal mt-0.5">
            Here's the summary of all transactions in {displayedTitle}.
          </p>
        </div>

        {/* Table containing strictly:
            DATE | CHEQUE NO. | PARTICULARS | WITHDRAWAL | DEPOSIT | CATEGORY | NET AMOUNT
        */}
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
                  CHEQUE NO.
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  PARTICULARS
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  WITHDRAWAL
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  DEPOSIT
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  CATEGORY
                </TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  NET AMOUNT
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-52 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md ml-auto" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md ml-auto" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell className="px-4 py-3.5"><Skeleton className="h-4 w-24 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : displayedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    No transactions found for the selected filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((tx) => {
                  const netAmount = (tx.deposit || 0) - (tx.withdrawal || 0)

                  return (
                    <TableRow
                      key={tx.id}
                      onClick={() => handleRowClick(tx)}
                      title="Click to view complete details"
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

                      {/* 3. Cheque No. */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 whitespace-nowrap font-mono">
                        {tx.chequeNo || '—'}
                      </TableCell>

                      {/* 3. Particulars */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-normal max-w-xs">
                        <span className="line-clamp-1">{tx.particulars || tx.description}</span>
                      </TableCell>

                      {/* 4. Withdrawal */}
                      <TableCell className="px-4 py-3.5 text-xs font-medium text-right tabular-nums whitespace-nowrap text-muted-fg">
                        {tx.withdrawal > 0 ? formatPHP(tx.withdrawal) : ''}
                      </TableCell>

                      {/* 5. Deposit */}
                      <TableCell className="px-4 py-3.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap text-emerald-600">
                        {tx.deposit > 0 ? formatPHP(tx.deposit) : ''}
                      </TableCell>

                      {/* 6. Category */}
                      <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-medium whitespace-nowrap">
                        {tx.category}
                      </TableCell>

                      {/* 7. Net Amount */}
                      <TableCell className="px-4 py-3.5 text-xs font-bold text-right tabular-nums whitespace-nowrap text-focus">
                        {formatPHP(netAmount)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Footer matching Recent Transactions */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Record summary */}
          <span className="font-medium text-focus/80">
            {filteredTransactions.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
                  currentPage * itemsPerPage,
                  filteredTransactions.length
                )} of ${filteredTransactions.length} records`}
          </span>

          {/* Page Indicator & Navigation */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-fg italic">
              Page {currentPage} out of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Complete Read-Only Transaction Details Modal */}
      <AuditTransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        transaction={selectedTx}
      />
    </div>
  )
}
