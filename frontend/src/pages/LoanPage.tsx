import * as React from 'react'
import {
  Landmark,
  Building2,
  Calendar,
  ChevronDown,
  Check,
  Search,
  Plus,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react'
import { UpdateLoanStatusModal } from '@/components/dashboard/UpdateLoanStatusModal'
import { LoanHistoryModal } from '@/components/dashboard/LoanHistoryModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/DateRangePicker'
import { AuditTransactionModal } from '@/components/dashboard/AuditTransactionModal'
import { AddLoanModal } from '@/components/dashboard/AddLoanModal'
import { LoanHorizontalBarChart } from '@/components/dashboard/LoanHorizontalBarChart'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import {
  loanService,
  type LoanItem,
} from '@/services/loanService'
import type { DashboardTransactionItem } from '@/services/dashboardService'
import { useLocation } from 'react-router-dom'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

const COMPANY_LIST = [
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

const PERIOD_OPTIONS = ['Daily', 'Monthly', 'Quarterly', 'Annually'] as const
type PeriodOption = (typeof PERIOD_OPTIONS)[number]

const ITEMS_PER_PAGE = 10

interface LoanPageProps {
  initialType?: 'Borrower' | 'Lender'
}

export const LoanPage: React.FC<LoanPageProps> = ({ initialType = 'Borrower' }) => {
  const { user } = useSession()
  const isAuditor = user?.role === 'Company Auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const location = useLocation()
  const [loanType, setLoanType] = React.useState<'Borrower' | 'Lender'>(() => {
    const path = location.pathname.toLowerCase()
    if (path.includes('lender')) return 'Lender'
    if (path.includes('borrower')) return 'Borrower'
    return initialType
  })
  const [isLoanTypeDropdownOpen, setIsLoanTypeDropdownOpen] = React.useState(false)
  const loanTypeDropdownRef = React.useRef<HTMLDivElement>(null)

  // Sync loanType with URL changes
  React.useEffect(() => {
    const path = location.pathname.toLowerCase()
    if (path.includes('lender')) {
      setLoanType('Lender')
    } else if (path.includes('borrower')) {
      setLoanType('Borrower')
    }
  }, [location.pathname])

  // Dynamic document title
  React.useEffect(() => {
    document.title = `${loanType} Loans - MCT Centralized Financial System`
  }, [loanType])

  const [loans, setLoans] = React.useState<LoanItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filter state
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isAuditor ? assignedCompany : 'All Companies'
  )
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodOption>('Monthly')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    preset: 'this_month',
    label: 'This Month',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  })
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Paid' | 'Pending'>('All')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Dropdown menus
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [companySearch, setCompanySearch] = React.useState('')

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Modals & Action state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [deleteConfirmLoan, setDeleteConfirmLoan] = React.useState<LoanItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Audit / Details modal state
  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [selectedLoan, setSelectedLoan] = React.useState<LoanItem | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false)
  const [highlightedLoanId, setHighlightedLoanId] = React.useState<string | null>(null)
  const [updateStatusLoan, setUpdateStatusLoan] = React.useState<LoanItem | null>(null)

  // Lender View-Only History Modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false)
  const [historyLoan, setHistoryLoan] = React.useState<LoanItem | null>(null)

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period)
    setIsPeriodDropdownOpen(false)
    const currentToday = new Date().toISOString().split('T')[0]
    const [currYear, currMonth] = currentToday.split('-')

    switch (period) {
      case 'Daily':
        setDateRange({
          preset: 'today',
          label: 'Today',
          startDate: currentToday,
          endDate: currentToday,
        })
        break
      case 'Monthly':
        setDateRange({
          preset: 'this_month',
          label: 'This Month',
          startDate: `${currYear}-${currMonth}-01`,
          endDate: `${currYear}-${currMonth}-31`,
        })
        break
      case 'Quarterly': {
        const monthNum = parseInt(currMonth, 10)
        let qStartMonth = '01'
        let qEndMonth = '03'
        let qEndDay = '31'
        let qLabel = 'Q1'

        if (monthNum >= 4 && monthNum <= 6) {
          qStartMonth = '04'
          qEndMonth = '06'
          qEndDay = '30'
          qLabel = 'Q2'
        } else if (monthNum >= 7 && monthNum <= 9) {
          qStartMonth = '07'
          qEndMonth = '09'
          qEndDay = '30'
          qLabel = 'Q3'
        } else if (monthNum >= 10) {
          qStartMonth = '10'
          qEndMonth = '12'
          qEndDay = '31'
          qLabel = 'Q4'
        }

        setDateRange({
          preset: 'this_quarter',
          label: `This Quarter (${qLabel})`,
          startDate: `${currYear}-${qStartMonth}-01`,
          endDate: `${currYear}-${qEndMonth}-${qEndDay}`,
        })
        break
      }
      case 'Annually':
        setDateRange({
          preset: 'this_year',
          label: 'This Year',
          startDate: `${currYear}-01-01`,
          endDate: `${currYear}-12-31`,
        })
        break
      default:
        break
    }
  }

  const loadLoans = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await loanService.getLoans()
      setLoans(data)
    } catch (err) {
      console.error('Failed to load loans:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadLoans()
  }, [loadLoans])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (loanTypeDropdownRef.current && !loanTypeDropdownRef.current.contains(target)) {
        setIsLoanTypeDropdownOpen(false)
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false)
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(target)) {
        setIsPeriodDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Client-side filtering and sorting
  const filteredLoans = React.useMemo(() => {
    return loans
      .filter((item) => {
        if (!isAuditor && selectedCompany !== 'All Companies' && item.company !== selectedCompany) {
          return false
        }

        if (!isDateInRange(item.rawDate || item.date, dateRange.startDate, dateRange.endDate)) {
          return false
        }

        if (statusFilter !== 'All' && item.status !== statusFilter) {
          return false
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchRef = (item.refNo || '').toLowerCase().includes(q)
          const matchCheque = (item.chequeNo || '').toLowerCase().includes(q)
          const matchParticulars = (item.particulars || '').toLowerCase().includes(q)
          const matchCategory = (item.category || '').toLowerCase().includes(q)
          const matchCompany = (item.company || '').toLowerCase().includes(q)
          const matchStatus = (item.status || '').toLowerCase().includes(q)
          const matchAmount = String(item.amount || '').includes(q)

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
  }, [loans, isAuditor, selectedCompany, dateRange, statusFilter, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, searchQuery, statusFilter, selectedCompany, selectedPeriod])

  // Total Loans KPI
  const kpis = React.useMemo(() => {
    const total = filteredLoans.reduce((sum, l) => sum + (l.amount || 0), 0)
    return { totalLoans: total }
  }, [filteredLoans])

  // Pagination
  const totalPages = Math.ceil(filteredLoans.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredLoans.length)
  const paginatedLoans = filteredLoans.slice(startIndex, endIndex)

  // Export handlers
  const companyForExport = isAuditor ? assignedCompany : selectedCompany

  const handleExportCsv = () => {
    loanService.exportCsv(
      filteredLoans,
      `loan_summary_${companyForExport.replace(/\s+/g, '_')}_${Date.now()}.csv`
    )
    setIsExportDropdownOpen(false)
  }

  const handleExportPdf = () => {
    loanService.exportPdf(filteredLoans, companyForExport)
    setIsExportDropdownOpen(false)
  }

  const handleLoanAdded = (newItem: LoanItem) => {
    setLoans((prev) => [newItem, ...prev])
    setSearchQuery('')
    setStatusFilter('All')

    const newDateIso = newItem.rawDate || normalizeDateToYYYYMMDD(newItem.date)
    if (!isDateInRange(newDateIso, dateRange.startDate, dateRange.endDate)) {
      setDateRange((prev: DateRange) => ({
        ...prev,
        startDate: prev.startDate && prev.startDate < newDateIso ? prev.startDate : newDateIso,
        endDate: prev.endDate && prev.endDate > newDateIso ? prev.endDate : newDateIso,
      }))
    }

    setCurrentPage(1)
    setHighlightedLoanId(newItem.id)

    setTimeout(() => {
      tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)

    setTimeout(() => {
      setHighlightedLoanId(null)
    }, 3500)
  }

  const handleOpenRow = (loan: LoanItem) => {
    setSelectedLoan(loan)
    setSelectedTx(loanService.toDashboardTransaction(loan))
    setIsAuditModalOpen(true)
  }

  const handleRowClick = (loan: LoanItem) => {
    if (loanType === 'Lender') {
      setHistoryLoan(loan)
      setIsHistoryModalOpen(true)
    } else {
      handleOpenRow(loan)
    }
  }

  const handleLoanUpdated = (updatedItem: LoanItem) => {
    setLoans((prev) => prev.map((l) => (l.id === updatedItem.id ? updatedItem : l)))
    setSelectedLoan(updatedItem)
    setSelectedTx(loanService.toDashboardTransaction(updatedItem))
    setHighlightedLoanId(updatedItem.id)
    setTimeout(() => {
      setHighlightedLoanId(null)
    }, 3000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmLoan) return
    try {
      setIsDeleting(true)
      await loanService.deleteLoan(deleteConfirmLoan.id)
      setLoans((prev) => prev.filter((l) => l.id !== deleteConfirmLoan.id))
      setDeleteConfirmLoan(null)
    } catch (err) {
      console.error('Failed to delete loan:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredCompanyList = React.useMemo(() => {
    if (!companySearch.trim()) return COMPANY_LIST
    return COMPANY_LIST.filter((c) =>
      c.toLowerCase().includes(companySearch.toLowerCase().trim())
    )
  }, [companySearch])

  const displayedCompanyTitle = isAuditor
    ? assignedCompany
    : selectedCompany === 'All Companies'
    ? 'All Subsidiaries'
    : selectedCompany

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Controls */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Export & Add Loan) sitting on top of the filters */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Export Dropdown Button */}
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

            {/* Add Loan Button (Exclusively for Company Auditor in Borrower view; Lender view is view-only) */}
            {isAuditor && loanType === 'Borrower' && (
              <Button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Loan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right (level with Title & Subtitle) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Loan
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Comprehensive breakdown of {loanType.toLowerCase()} loans in {displayedCompanyTitle}.
            </p>
          </div>

          {/* Filter Toolbar (Aligned with Title/Subtitle, sitting directly under Export & Add Loan) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Dropdown Filter for: Borrower / Lender */}
            <div ref={loanTypeDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsLoanTypeDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isLoanTypeDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
                aria-label="Filter by Borrower or Lender"
                aria-haspopup="listbox"
                aria-expanded={isLoanTypeDropdownOpen}
              >
                <Landmark className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90">{loanType}</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-fg shrink-0 transition-transform duration-200',
                    isLoanTypeDropdownOpen && 'transform rotate-180'
                  )}
                />
              </button>

              {isLoanTypeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {(['Borrower', 'Lender'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setLoanType(type)
                        setIsLoanTypeDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        loanType === type
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span>{type}</span>
                      {loanType === type && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period Dropdown */}
            <div ref={periodDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
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
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
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
                          ? 'Fully Settled'
                          : 'Pending / Active'}
                      </span>
                      {statusFilter === st && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Picker (presets hidden, period handled by Period dropdown) */}
            <DateRangePicker
              value={dateRange}
              onChange={(newRange: DateRange) => setDateRange(newRange)}
              hidePresets
            />

            {/* Company Scope Dropdown (Admin only) */}
            {!isAuditor && (
              <div ref={companyDropdownRef} className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                    isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                  )}
                  aria-label="Filter loans by company"
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

                    <div className="px-1 pb-2">
                      <Input
                        type="text"
                        placeholder="Search company…"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                        autoFocus
                      />
                    </div>

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

      {/* 3. Total Loans KPI Card */}
      <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
        <div>
          <span className="text-xs font-medium text-muted-fg block">
            Total Loans
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-focus mt-1 tabular-nums tracking-tight">
            {formatPHP(kpis.totalLoans)}
          </h3>
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5">
            Total loan financing and commitments for {dateRange.label || 'the selected period'} in {displayedCompanyTitle}
          </p>
        </div>

        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-focus shrink-0 shadow-2xs">
          <Landmark className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </Card>

      {/* 4. Diagrams Section: Horizontal Bar Graph only (per user request) */}
      <div className="w-full">
        <LoanHorizontalBarChart
          loans={filteredLoans}
          companyScope={selectedCompany}
          className="w-full"
        />
      </div>

      {/* 5. Summary Transactions in Loan */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Grey Header Banner with Search Input for Loan Table */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-focus leading-tight">
              {selectedPeriod === 'Annually' ? 'Annual Loans' : `${selectedPeriod} Loans`}
            </h2>
            <p className="text-xs text-muted-fg font-normal mt-0.5">
              Here's the summary of loans in {displayedCompanyTitle}.
            </p>
          </div>

          {/* Search bar moved to table */}
          <div className="relative w-full md:w-80 lg:w-[420px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by ref no, cheque, particulars, category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-10 text-xs sm:text-sm rounded-full bg-white border border-stroke/60 shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Loan Table: only include Date, Cheque No., Particulars, Category, Amount and Actions column with equal spacing (16.6667% each) */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[850px]">
            <colgroup>
              <col style={{ width: '16.6667%' }} />
              <col style={{ width: '16.6667%' }} />
              <col style={{ width: '16.6667%' }} />
              <col style={{ width: '16.6667%' }} />
              <col style={{ width: '16.6667%' }} />
              <col style={{ width: '16.6667%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DATE
                </TableHead>
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CHEQUE NO.
                </TableHead>
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  PARTICULARS
                </TableHead>
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CATEGORY
                </TableHead>
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  AMOUNT
                </TableHead>
                <TableHead className="w-[16.6667%] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-xs sm:text-sm text-muted-fg animate-pulse"
                  >
                    Loading loan records…
                  </TableCell>
                </TableRow>
              ) : paginatedLoans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-14 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-focus text-sm sm:text-base">
                        No loan records found
                      </p>
                      <p className="text-xs text-muted-fg leading-relaxed">
                        There are no loan facilities recorded for {displayedCompanyTitle} matching your current filters. {isAuditor && 'Click "Add Loan" above to record a new transaction.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoans.map((loan) => {
                  const isUnpaidOrPending = loan.status !== 'Paid'
                  return (
                    <TableRow
                      key={loan.id}
                      id={`loan-row-${loan.id}`}
                      onClick={() => handleRowClick(loan)}
                      className={cn(
                        'border-b transition-all duration-200 cursor-pointer',
                        isUnpaidOrPending
                          ? 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200/70'
                          : 'border-slate-100 hover:bg-slate-50/60',
                        highlightedLoanId === loan.id &&
                          'bg-amber-200/90 hover:bg-amber-200/90 ring-2 ring-amber-500 shadow-md font-semibold'
                      )}
                      title={
                        loanType === 'Lender'
                          ? 'Click to view loan history and details'
                          : isUnpaidOrPending
                          ? `Unpaid / Pending Loan (${loan.status}) — Click to view details or update status`
                          : 'Paid Loan — Click to view complete details'
                      }
                    >
                      {/* 1. Date */}
                      <TableCell className="w-[16.6667%] px-4 py-3.5 text-xs font-medium text-focus truncate text-left">
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{loan.date}</span>
                          {highlightedLoanId === loan.id && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#960C01] text-white shadow-xs animate-bounce shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 2. Cheque No */}
                      <TableCell className="w-[16.6667%] px-4 py-3.5 text-xs text-focus/90 truncate font-mono text-left">
                        {loan.chequeNo || '—'}
                      </TableCell>

                      {/* 3. Particulars */}
                      <TableCell className="w-[16.6667%] px-4 py-3.5 text-xs text-focus/90 font-normal truncate text-left" title={loan.particulars}>
                        <span className="truncate block">{loan.particulars}</span>
                      </TableCell>

                      {/* 4. Category */}
                      <TableCell className="w-[16.6667%] px-4 py-3.5 text-xs text-focus/90 font-medium truncate text-left">
                        {loan.category}
                      </TableCell>

                      {/* 5. Amount */}
                      <TableCell className="w-[16.6667%] px-4 py-3.5 text-xs font-bold text-left tabular-nums whitespace-nowrap text-focus">
                        {formatPHP(loan.amount)}
                      </TableCell>

                      {/* 6. Actions */}
                      <TableCell
                        className="w-[16.6667%] px-4 py-3.5 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          {loanType === 'Lender' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHistoryLoan(loan)
                                setIsHistoryModalOpen(true)
                              }}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-focus hover:bg-slate-100 cursor-pointer"
                              title="View Loan History"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmLoan(loan)}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Delete Loan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          <span className="font-medium text-focus/80">
            {filteredLoans.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredLoans.length} records`}
          </span>

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

      {/* Add Loan Modal */}
      <AddLoanModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleLoanAdded}
        assignedCompany={isAuditor ? assignedCompany : selectedCompany}
        companies={COMPANY_LIST}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmLoan}
        onOpenChange={(open) => !open && setDeleteConfirmLoan(null)}
      >
        <DialogContent className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-focus flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Confirm Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg mt-1 leading-relaxed">
              Are you sure you want to delete this loan record? This action will remove the record from the company ledger.
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmLoan && (
            <div className="my-4 p-4 rounded-2xl bg-red-50/60 border border-red-200/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-fg">Particulars:</span>
                <span className="font-semibold text-focus truncate max-w-[200px]">
                  {deleteConfirmLoan.particulars}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Amount:</span>
                <span className="font-bold text-focus">
                  {formatPHP(deleteConfirmLoan.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Ref No:</span>
                <span className="font-mono text-focus">{deleteConfirmLoan.refNo}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmLoan(null)}
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
              {isDeleting ? 'Deleting…' : 'Delete Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Details & Audit Modal */}
      <AuditTransactionModal
        open={isAuditModalOpen}
        onOpenChange={(open) => {
          setIsAuditModalOpen(open)
          if (!open) {
            setSelectedLoan(null)
            setSelectedTx(null)
          }
        }}
        transaction={selectedTx}
        loan={selectedLoan}
        onLoanUpdated={handleLoanUpdated}
        onOpenUpdateLoanStatus={(l) => setUpdateStatusLoan(l)}
        editable={true}
      />

      {/* Update Loan Status Modal */}
      <UpdateLoanStatusModal
        open={!!updateStatusLoan}
        onOpenChange={(open) => !open && setUpdateStatusLoan(null)}
        loan={updateStatusLoan}
        onSuccess={handleLoanUpdated}
      />

      {/* Loan History Modal for Lender (View Only) */}
      <LoanHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        loan={historyLoan}
      />
    </div>
  )
}
