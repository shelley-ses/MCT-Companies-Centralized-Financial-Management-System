import * as React from 'react'
import {
  Download,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Check,
  FileSpreadsheet,
  FileText,
  Calendar,
  TrendingDown,
  TrendingUp,
  Landmark,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/DateRangePicker'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { IncomeSummaryChart } from '@/components/dashboard/CategorySummaryChart'
import { AuditTransactionModal } from '@/components/dashboard/AuditTransactionModal'
import { AddSalesModal } from '@/components/dashboard/AddSalesModal'
import {
  salesService,
  type SalesItem,
} from '@/services/salesService'
import type { DashboardTransactionItem } from '@/services/dashboardService'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

const DEFAULT_COMPANIES = [
  'All Companies',
  'MCT Kitchen',
  'MCT Hotel',
  'JK Cafe',
  'Annex Nine',
  'Merillon',
  'JK Printing',
  'Speedbox',
  'JK Property and Ventures',
  'Golden Sunburst Ventures',
]

// Period options: Daily, Quarterly, Monthly, Annually (added per user request)
const PERIOD_OPTIONS = ['Daily', 'Quarterly', 'Monthly', 'Annually'] as const
type PeriodType = (typeof PERIOD_OPTIONS)[number]

const ITEMS_PER_PAGE = 10

export const SalesPage: React.FC = () => {
  const { user } = useSession()
  const isAuditor = user?.role === 'Company Auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Filter state
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isAuditor ? assignedCompany : 'All Companies'
  )
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'Last 30 Days',
    preset: 'Last 30 Days',
  })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Paid' | 'Pending'>('All')
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodType>('Daily')

  // Handle switching period (Daily, Quarterly, Monthly, Annually)
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period)
    setIsPeriodDropdownOpen(false)
    if (period === 'Daily') {
      setDateRange({
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        label: '10/01/2026',
        preset: 'Daily',
      })
    } else if (period === 'Monthly') {
      setDateRange({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        preset: 'This Month',
      })
    } else if (period === 'Quarterly') {
      setDateRange({
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        label: 'Q4 2026',
        preset: 'This Quarter',
      })
    } else if (period === 'Annually') {
      setDateRange({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        label: 'Year 2026',
        preset: 'This Year',
      })
    }
  }

  // Dropdowns state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [companySearch, setCompanySearch] = React.useState('')

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)

  const filteredCompanyList = React.useMemo(() => {
    const q = companySearch.toLowerCase().trim()
    if (!q) return DEFAULT_COMPANIES
    return DEFAULT_COMPANIES.filter((c) => c.toLowerCase().includes(q))
  }, [companySearch])

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false)

  // Highlight state for newly added sale
  const [highlightedSaleId, setHighlightedSaleId] = React.useState<string | null>(null)
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Clear highlight timeout on unmount
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)

  // Data state
  const [sales, setSales] = React.useState<SalesItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Load sales data
  const loadSales = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await salesService.getSales(
        isAuditor ? assignedCompany : selectedCompany
      )
      setSales(data)
    } catch (err) {
      console.error('Failed to load sales data:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuditor, assignedCompany, selectedCompany])

  React.useEffect(() => {
    loadSales()
  }, [loadSales])

  // Click-outside listeners for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(target)) {
        setIsPeriodDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false)
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Client-side filtering and sorting (latest first)
  const filteredSales = React.useMemo(() => {
    return sales
      .filter((item) => {
        // 1. Company filter (if Admin)
        if (
          !isAuditor &&
          selectedCompany !== 'All Companies' &&
          item.company !== selectedCompany
        ) {
          return false
        }

        // 2. Date range filter
        if (
          !isDateInRange(
            item.rawDate || item.date,
            dateRange.startDate,
            dateRange.endDate
          )
        ) {
          return false
        }

        // 3. Status filter
        if (statusFilter !== 'All' && item.status !== statusFilter) {
          return false
        }

        // 4. Search query (by refNo, chequeNo, particulars, customer)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchRef = item.refNo.toLowerCase().includes(q)
          const matchCheque = (item.chequeNo || '').toLowerCase().includes(q)
          const matchParticulars = item.particulars.toLowerCase().includes(q)
          const matchCategory = item.category.toLowerCase().includes(q)
          if (!matchRef && !matchCheque && !matchParticulars && !matchCategory) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        const dateA = a.rawDate || normalizeDateToYYYYMMDD(a.date)
        const dateB = b.rawDate || normalizeDateToYYYYMMDD(b.date)
        const cmp = dateB.localeCompare(dateA)
        if (cmp !== 0) return cmp
        return (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
      })
  }, [sales, isAuditor, selectedCompany, dateRange, statusFilter, searchQuery])

  // Reset to page 1 on filter change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, searchQuery, statusFilter, selectedCompany, selectedPeriod])

  // KPI Calculations matching the dashboard:
  // 1. Total Expenses
  // 2. Total Income (Total Sales)
  // 3. Net Income (Income - Expenses)
  // 4. Overdue / Due Soon
  const kpis = React.useMemo(() => {
    const expenses = filteredSales.reduce((sum, s) => sum + (s.withdrawal || 0), 0)
    const income = filteredSales.reduce((sum, s) => sum + (s.deposit || 0), 0)
    const net = income - expenses
    const overdue = filteredSales.filter(
      (s) => s.status === 'Overdue' || s.auditStatus === 'Flagged'
    ).length
    const dueSoon = filteredSales.filter(
      (s) => s.status === 'Pending'
    ).length

    return {
      totalExpenses: expenses,
      totalIncome: income,
      netIncome: net,
      overdueCount: overdue,
      dueSoonCount: dueSoon,
    }
  }, [filteredSales])

  // Pagination calculation
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredSales.length)
  const paginatedSales = filteredSales.slice(startIndex, endIndex)

  // Map sales to DashboardTransactionItems for IncomeSummaryChart
  const mappedTransactions = React.useMemo(() => {
    return filteredSales.map((s) => salesService.toDashboardTransaction(s))
  }, [filteredSales])

  // Export handlers
  const companyForExport = isAuditor ? assignedCompany : selectedCompany

  const handleExportCsv = () => {
    salesService.exportCsv(
      filteredSales,
      `sales_summary_${companyForExport.replace(/\s+/g, '_')}_${Date.now()}.csv`
    )
    setIsExportDropdownOpen(false)
  }

  const handleExportPdf = () => {
    salesService.exportPdf(filteredSales, companyForExport)
    setIsExportDropdownOpen(false)
  }

  const handleSaleAdded = (newItem: SalesItem) => {
    // 1. Prepend to sales
    setSales((prev) => [newItem, ...prev])

    // 2. Clear filters so the new sale is immediately visible on the table
    setSearchQuery('')
    setStatusFilter('All')

    // 3. Ensure date range covers the new sale date
    const newDateIso = newItem.rawDate || normalizeDateToYYYYMMDD(newItem.date)
    if (!isDateInRange(newDateIso, dateRange.startDate, dateRange.endDate)) {
      setDateRange((prev) => ({
        ...prev,
        startDate: prev.startDate && prev.startDate < newDateIso ? prev.startDate : newDateIso,
        endDate: prev.endDate && prev.endDate > newDateIso ? prev.endDate : newDateIso,
      }))
    }

    // 4. Reset to page 1 where the latest sale appears
    setCurrentPage(1)

    // 5. Highlight the newly added sale
    setHighlightedSaleId(newItem.id)

    // 6. Smooth scroll/redirect to the sales table card
    setTimeout(() => {
      tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    // 7. Remove highlight after exactly 3 seconds
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSaleId(null)
    }, 3000)
  }

  const handleOpenRow = (item: SalesItem) => {
    const tx = salesService.toDashboardTransaction(item)
    setSelectedTx(tx)
    setIsAuditModalOpen(true)
  }

  const displayedCompanyTitle = isAuditor
    ? assignedCompany
    : selectedCompany === 'All Companies'
    ? 'MCT Group of Companies'
    : selectedCompany

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Action Buttons (Matching EmployeePage Create Company / Create User layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-focus">
            Sales
          </h1>
          <p className="text-xs sm:text-sm text-muted-fg font-normal mt-0.5">
            Here's the summary of sales in {displayedCompanyTitle}
          </p>
        </div>

        {/* Top Right Actions: Export (Dropdown: CSV / PDF) & Add Sales */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Export Dropdown Button (Red in Admin sales page per user request; Outline for Auditor where Add Sales is red) */}
          <div ref={exportDropdownRef} className="relative inline-block">
            <Button
              type="button"
              variant={!isAuditor ? 'default' : 'outline'}
              onClick={() => setIsExportDropdownOpen((prev) => !prev)}
              className={cn(
                'h-11 px-4 sm:px-5 rounded-xl font-semibold text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all box-border',
                !isAuditor
                  ? 'bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white border-transparent'
                  : 'border border-stroke/50 bg-white text-focus hover:bg-surface'
              )}
              aria-haspopup="true"
              aria-expanded={isExportDropdownOpen}
            >
              <Download
                className={cn(
                  'h-4 w-4 shrink-0',
                  !isAuditor ? 'text-white' : 'text-focus/70'
                )}
              />
              <span>Export</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 ml-0.5',
                  !isAuditor ? 'text-white/90' : 'text-muted-fg'
                )}
              />
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

          {/* Add Sales Button (Exclusively for Company Auditor; Admin side has NO Add Sales button per user request) */}
          {isAuditor && (
            <Button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Sales</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Unified Filter Bar: Search, Period Dropdown (Daily, Quarterly, Monthly, Annually), Status, Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-fg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ref No. or Cheque No. (or customer)…"
            className="w-full h-11 pl-9 pr-8 rounded-full border border-stroke/60 bg-white text-xs sm:text-sm text-focus placeholder:text-muted-fg/70 shadow-xs box-border focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-0.5 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom Period Dropdown: Daily, Quarterly, Monthly, Annually */}
          <div ref={periodDropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                isPeriodDropdownOpen && 'ring-2 ring-focus/20 border-focus'
              )}
            >
              <Calendar className="h-4 w-4 text-muted-fg shrink-0" />
              <span className="font-medium text-focus/90">{selectedPeriod}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-fg shrink-0 transition-transform duration-200',
                  isPeriodDropdownOpen && 'transform rotate-180'
                )}
              />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodChange(period)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                      selectedPeriod === period
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-focus/80 hover:bg-slate-50'
                    )}
                  >
                    <span>{period}</span>
                    {selectedPeriod === period && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div ref={statusDropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                isStatusDropdownOpen && 'ring-2 ring-focus/20 border-focus'
              )}
            >
              <span className="font-medium text-focus/90">
                {statusFilter === 'All' ? 'Status' : statusFilter}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-fg shrink-0 transition-transform duration-200',
                  isStatusDropdownOpen && 'transform rotate-180'
                )}
              />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                {(['All', 'Paid', 'Pending'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st)
                      setIsStatusDropdownOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                      statusFilter === st
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-focus/80 hover:bg-slate-50'
                    )}
                  >
                    <span>
                      {st === 'All'
                        ? 'All Status'
                        : st === 'Paid'
                        ? 'Received / Paid'
                        : 'Pending'}
                    </span>
                    {statusFilter === st && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unified Date Range Picker (Presets + Custom Start & End Date) */}
          <DateRangePicker
            value={dateRange}
            onChange={(newRange) => setDateRange(newRange)}
          />

          {/* Company Scope Dropdown (Admin only - no "Assigned: MCT Kitchen" badge per user request) */}
          {!isAuditor && (
            <div ref={companyDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
                aria-label="Filter sales by company"
              >
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-medium text-focus/90 truncate max-w-[150px]">
                  {selectedCompany}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                {selectedCompany !== 'All Companies' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCompany('All Companies')
                    }}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-muted-fg hover:text-focus transition-colors ml-0.5 inline-flex items-center justify-center cursor-pointer"
                    title="Reset to All Companies"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-68 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stroke/20 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">
                      Filter By Company
                    </span>
                    {selectedCompany !== 'All Companies' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany('All Companies')
                          setIsCompanyDropdownOpen(false)
                        }}
                        className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  {/* Company Quick Search */}
                  <div className="relative mb-2 px-1">
                    <Search className="w-3.5 h-3.5 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Search company…"
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-stroke/40 bg-slate-50/70 text-xs text-focus placeholder:text-muted-fg/60 focus:outline-none focus:ring-1 focus:ring-focus focus:bg-white"
                    />
                    {companySearch && (
                      <button
                        type="button"
                        onClick={() => setCompanySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Company list */}
                  <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
                    {filteredCompanyList.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-fg">
                        No matching companies
                      </div>
                    ) : (
                      filteredCompanyList.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c)
                            setIsCompanyDropdownOpen(false)
                            setCompanySearch('')
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                            selectedCompany === c
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-focus/80 hover:bg-slate-50'
                          )}
                        >
                          <span className="truncate">{c}</span>
                          {selectedCompany === c && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. KPI Cards matching Dashboard (4 cards: Total Expenses, Total Income, Net Income, Overdue / Due Soon) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="Total Expenses"
          value={formatPHP(kpis.totalExpenses)}
          icon={TrendingDown}
          subtext="Total withdrawals for period"
        />
        <DashboardKpiCard
          label="Total Income"
          value={formatPHP(kpis.totalIncome)}
          icon={TrendingUp}
          subtext="Total deposits for period"
        />
        <DashboardKpiCard
          label="Net Income (Income - Expenses)"
          value={formatPHP(kpis.netIncome)}
          icon={Landmark}
          subtext={kpis.netIncome >= 0 ? 'Positive net cashflow' : 'Negative net cashflow'}
        />
        <DashboardKpiCard
          label="Overdue / Due Soon"
          value={`${kpis.overdueCount} / ${kpis.dueSoonCount}`}
          icon={AlertCircle}
          subtext="Requires prompt review"
        />
      </div>

      {/* 4. Charts Section: Diagram - Income Summary extended to full width (weekly sales trend removed) */}
      <div className="w-full">
        <IncomeSummaryChart
          transactions={mappedTransactions}
          className="w-full"
        />
      </div>

      {/* 5. Summary Transactions in Sales (Following the Sales table from the provided mockup) */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Grey Header Banner from the mockup */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5">
          <h2 className="text-sm sm:text-base font-bold text-focus leading-tight">
            {selectedPeriod === 'Annually' ? 'Annual Sales' : `${selectedPeriod} Sales`}
          </h2>
          <p className="text-xs text-muted-fg font-normal mt-0.5">
            Here's the summary of sales in {displayedCompanyTitle}.
          </p>
        </div>

        {/* Table matching the Sales table from mockup */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg">
                  DATE
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
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-xs sm:text-sm text-muted-fg animate-pulse"
                  >
                    Loading sales records…
                  </TableCell>
                </TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    No sales records found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    id={`sale-row-${sale.id}`}
                    onClick={() => handleOpenRow(sale)}
                    className={cn(
                      'border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-300 cursor-pointer',
                      highlightedSaleId === sale.id &&
                        'bg-amber-100/90 hover:bg-amber-100/90 ring-2 ring-amber-500 shadow-md font-semibold'
                    )}
                    title="Click to view complete details"
                  >
                    {/* 1. Date */}
                    <TableCell className="px-4 py-3.5 text-xs font-medium text-focus whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{sale.date}</span>
                        {highlightedSaleId === sale.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#960C01] text-white shadow-xs animate-bounce">
                            NEW
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Cheque No */}
                    <TableCell className="px-4 py-3.5 text-xs text-focus/90 whitespace-nowrap font-mono">
                      {sale.chequeNo || '—'}
                    </TableCell>

                    {/* 3. Particulars */}
                    <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-normal max-w-xs">
                      <span className="line-clamp-1">{sale.particulars}</span>
                    </TableCell>

                    {/* 4. Withdrawal */}
                    <TableCell className="px-4 py-3.5 text-xs font-medium text-right tabular-nums whitespace-nowrap text-muted-fg">
                      {sale.withdrawal > 0 ? formatPHP(sale.withdrawal) : ''}
                    </TableCell>

                    {/* 5. Deposit */}
                    <TableCell className="px-4 py-3.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap text-emerald-600">
                      {sale.deposit > 0 ? formatPHP(sale.deposit) : ''}
                    </TableCell>

                    {/* 6. Category (Clean text per Sales table reference) */}
                    <TableCell className="px-4 py-3.5 text-xs text-focus/90 font-medium whitespace-nowrap">
                      {sale.category}
                    </TableCell>

                    {/* 7. Net Amount */}
                    <TableCell className="px-4 py-3.5 text-xs font-bold text-right tabular-nums whitespace-nowrap text-focus">
                      {formatPHP(sale.netAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 6. Pagination Footer (Matching Sales table reference: Showing X of Y and Page 1 out of 10) */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Left: Record summary */}
          <span className="font-medium text-focus/80">
            {filteredSales.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredSales.length} records`}
          </span>

          {/* Right: Page Indicator & Navigation */}
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
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40"
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
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Sales Modal */}
      <AddSalesModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleSaleAdded}
        assignedCompany={isAuditor ? assignedCompany : selectedCompany}
      />

      {/* Audit / Details Modal */}
      <AuditTransactionModal
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
        transaction={selectedTx}
      />
    </div>
  )
}
