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
  TrendingUp,
  AlertCircle,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodType>('Monthly')

  // Handle switching period (Daily, Quarterly, Monthly, Annually)
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period)
    setIsPeriodDropdownOpen(false)
    const currentToday = new Date().toISOString().split('T')[0]
    const [currYear, currMonth, currDay] = currentToday.split('-')

    if (period === 'Daily') {
      setDateRange({
        startDate: currentToday,
        endDate: currentToday,
        label: `Today (${currMonth}/${currDay}/${currYear})`,
        preset: 'Daily',
      })
    } else if (period === 'Monthly') {
      setDateRange({
        startDate: `${currYear}-${currMonth}-01`,
        endDate: `${currYear}-${currMonth}-31`,
        label: 'This Month',
        preset: 'This Month',
      })
    } else if (period === 'Quarterly') {
      setDateRange({
        startDate: `${currYear}-10-01`,
        endDate: `${currYear}-12-31`,
        label: 'Q4 2026',
        preset: 'This Quarter',
      })
    } else if (period === 'Annually') {
      setDateRange({
        startDate: `${currYear}-01-01`,
        endDate: `${currYear}-12-31`,
        label: `Year ${currYear}`,
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
  const [selectedSale, setSelectedSale] = React.useState<SalesItem | null>(null)
  const [deleteConfirmSale, setDeleteConfirmSale] = React.useState<SalesItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
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

  // Handlers for edit and delete
  const handleSaleUpdated = (updatedItem: SalesItem) => {
    setSales((prev) => prev.map((s) => (s.id === updatedItem.id ? updatedItem : s)))
    setSelectedSale(updatedItem)
    setSelectedTx(salesService.toDashboardTransaction(updatedItem))
    setHighlightedSaleId(updatedItem.id)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSaleId(null)
    }, 3000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmSale) return
    setIsDeleting(true)
    try {
      await salesService.deleteSale(deleteConfirmSale.id)
      setSales((prev) => prev.filter((s) => s.id !== deleteConfirmSale.id))
      setDeleteConfirmSale(null)
    } catch (err) {
      console.error('Delete sale error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

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

        // 4. Search query (by refNo, chequeNo, particulars, category, company, status, amount)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchRef = (item.refNo || '').toLowerCase().includes(q)
          const matchCheque = (item.chequeNo || '').toLowerCase().includes(q)
          const matchParticulars = (item.particulars || '').toLowerCase().includes(q)
          const matchCategory = (item.category || '').toLowerCase().includes(q)
          const matchCompany = (item.company || '').toLowerCase().includes(q)
          const matchStatus = (item.status || '').toLowerCase().includes(q)
          const matchAmount = String(item.netAmount || item.deposit || '').includes(q)

          if (
            !matchRef &&
            !matchCheque &&
            !matchParticulars &&
            !matchCategory &&
            !matchCompany &&
            !matchStatus &&
            !matchAmount
          ) {
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

  // KPI Calculation: Total Income only (Total Sales)
  const kpis = React.useMemo(() => {
    const income = filteredSales.reduce((sum, s) => sum + (s.deposit || 0), 0)
    return {
      totalIncome: income,
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
    setSelectedSale(item)
    setSelectedTx(salesService.toDashboardTransaction(item))
    setIsAuditModalOpen(true)
  }

  const displayedCompanyTitle = isAuditor
    ? assignedCompany
    : selectedCompany === 'All Companies'
    ? 'MCT Group of Companies'
    : selectedCompany

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Controls */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Export & Add Sales) sitting on top of the filters */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Export Dropdown Button (Red in Admin sales page per user request; Outline for Auditor where Add Sales is red) */}
            <div ref={exportDropdownRef} className="relative inline-block">
              <Button
                type="button"
                variant={!isAuditor ? 'default' : 'outline'}
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className={cn(
                  'h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all box-border',
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
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Sales</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right (level with Title & Subtitle) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Sales
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Here's the summary of sales in {displayedCompanyTitle}
            </p>
          </div>

          {/* Filter Toolbar (Aligned with Title/Subtitle, sitting directly under Export & Add Sales) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
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

            {/* Unified Date Range Picker (presets hidden, period handled by Period dropdown) */}
            <DateRangePicker
              value={dateRange}
              onChange={(newRange) => setDateRange(newRange)}
              hidePresets
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
      </div>

      {/* 3. Total Income KPI Card */}
      <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
        <div>
          <span className="text-xs font-medium text-muted-fg block">
            Total Income
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 tabular-nums tracking-tight">
            {formatPHP(kpis.totalIncome)}
          </h3>
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5">
            Total sales deposits for {dateRange.label || 'the selected period'} in {displayedCompanyTitle}
          </p>
        </div>

        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </Card>

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
        {/* Grey Header Banner with Search Input for the table */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-focus leading-tight">
              {selectedPeriod === 'Annually' ? 'Annual Sales' : `${selectedPeriod} Sales`}
            </h2>
            <p className="text-xs text-muted-fg font-normal mt-0.5">
              Here's the summary of sales in {displayedCompanyTitle}.
            </p>
          </div>

          {/* Search bar moved to table */}
          <div className="relative w-full md:w-80 lg:w-[420px]">
            <Search className="w-4 h-4 text-muted-fg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ref No. or Cheque No. (or customer)…"
              className="w-full h-10 pl-9 pr-8 rounded-full border border-stroke/60 bg-white text-xs sm:text-sm text-focus placeholder:text-muted-fg/70 shadow-xs box-border focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-0.5 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table matching the Sales table from mockup with equal spacing across all columns */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[900px]">
            <colgroup>
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
              <col style={{ width: '14.2857%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DATE
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CHEQUE NO.
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  PARTICULARS
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DEPOSIT
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CATEGORY
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  NET AMOUNT
                </TableHead>
                <TableHead className="w-[14.2857%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
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
                    className="py-14 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-focus text-sm sm:text-base">
                        No sales records found
                      </p>
                      <p className="text-xs text-muted-fg leading-relaxed">
                        There are no sales transactions recorded for {displayedCompanyTitle} matching your current filters. {isAuditor && 'Click "Add Sales" above to record a new transaction.'}
                      </p>
                    </div>
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
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs font-medium text-focus truncate text-left">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{sale.date}</span>
                        {highlightedSaleId === sale.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#960C01] text-white shadow-xs animate-bounce shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Cheque No */}
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs text-focus/90 truncate font-mono text-left">
                      {sale.chequeNo || '—'}
                    </TableCell>

                    {/* 3. Particulars */}
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs text-focus/90 font-normal truncate text-left" title={sale.particulars}>
                      <span className="truncate block">{sale.particulars}</span>
                    </TableCell>

                    {/* 4. Deposit */}
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs font-semibold text-left tabular-nums whitespace-nowrap text-emerald-600">
                      {sale.deposit > 0 ? formatPHP(sale.deposit) : ''}
                    </TableCell>

                    {/* 5. Category */}
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs text-focus/90 font-medium truncate text-left">
                      {sale.category}
                    </TableCell>

                    {/* 6. Net Amount */}
                    <TableCell className="w-[14.2857%] px-4 py-3.5 text-xs font-bold text-left tabular-nums whitespace-nowrap text-focus">
                      {formatPHP(sale.netAmount)}
                    </TableCell>

                    {/* 7. Actions */}
                    <TableCell
                      className="w-[14.2857%] px-4 py-3.5 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmSale(sale)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Sale"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmSale} onOpenChange={(open) => !open && setDeleteConfirmSale(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-focus">
              Delete Sale Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg mt-1">
              Are you sure you want to delete this sale entry{' '}
              <strong className="text-focus">{deleteConfirmSale?.particulars}</strong> ({deleteConfirmSale?.refNo}) for{' '}
              <strong className="text-focus">{deleteConfirmSale?.deposit ? formatPHP(deleteConfirmSale.deposit) : ''}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmSale(null)}
              disabled={isDeleting}
              className="h-9 px-4 text-xs font-medium rounded-xl border-stroke/50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-9 px-5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Details & Audit Modal (with direct editing, Cancel & Save Changes) */}
      <AuditTransactionModal
        open={isAuditModalOpen}
        onOpenChange={(open) => {
          setIsAuditModalOpen(open)
          if (!open) {
            setSelectedSale(null)
            setSelectedTx(null)
          }
        }}
        transaction={selectedTx}
        sale={selectedSale}
        onSaleUpdated={handleSaleUpdated}
        editable={true}
      />
    </div>
  )
}

