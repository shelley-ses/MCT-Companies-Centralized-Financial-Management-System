import * as React from 'react'
import {
  TrendingDown,
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
  CheckCircle2,
  Wallet,
} from 'lucide-react'
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
import { AddExpenseModal } from '@/components/dashboard/AddExpenseModal'
import { ExpenseSummaryChart } from '@/components/dashboard/CategorySummaryChart'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import {
  expenseService,
  type ExpenseItem,
} from '@/services/expenseService'
import type { DashboardTransactionItem } from '@/services/dashboardService'
import { isDateInRange, normalizeDateToYYYYMMDD, formatToYYYYMMDD } from '@/utils/dateUtils'
import { getParticularsSummary } from '@/utils/particularsUtils'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { loanService } from '@/services/loanService'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { useCompany } from '@/context/CompanyContext'

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

export const ExpensePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const { activeCompany, setActiveCompany } = useCompany()
  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const isCompanyUser = (userRole === 'company' || userRole === 'supervisor') && !isAudit
  const isFinance = userRole === 'finance'
  const isAdmin = userRole === 'admin' || isAudit
  const isCompanyScoped = !isAdmin && !isFinance
  const isAuditor = isAudit
  const canAdd = !isAudit && (isCompanyUser || isFinance)
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [expenses, setExpenses] = React.useState<ExpenseItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Dynamic companies list
  const [companyList, setCompanyList] = React.useState<string[]>(COMPANY_LIST)

  React.useEffect(() => {
    let mounted = true
    loanService.getCompanies().then((companies) => {
      if (mounted && companies.length > 0) {
        const names = companies.map((c) => c.company_name).filter(Boolean)
        const combined = Array.from(new Set(['All Companies', ...names, ...COMPANY_LIST]))
        setCompanyList(combined)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Filter state
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isCompanyScoped ? assignedCompany : (activeCompany || 'All Companies')
  )

  // Keep selectedCompany in sync if user profile loads after initial render
  React.useEffect(() => {
    if (isCompanyScoped && user?.assignedCompany) {
      setSelectedCompany(user.assignedCompany)
    }
  }, [isCompanyScoped, user?.assignedCompany])

  // Keep selectedCompany in sync with global activeCompany from context
  React.useEffect(() => {
    if (!isCompanyScoped && activeCompany) {
      setSelectedCompany(activeCompany)
    }
  }, [activeCompany, isCompanyScoped])
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Paid' | 'Pending' | 'Unpaid' | 'Overdue'>('All')
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodOption>('Monthly')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    preset: 'this_month',
    label: 'This Month',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  })
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
  const [deleteConfirmExpense, setDeleteConfirmExpense] = React.useState<ExpenseItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Audit / Details modal state
  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [selectedExpense, setSelectedExpense] = React.useState<ExpenseItem | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false)
  const [highlightedExpenseId, setHighlightedExpenseId] = React.useState<string | null>(null)

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period)
    setIsPeriodDropdownOpen(false)
    const currentToday = formatToYYYYMMDD(new Date())
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
      case 'Monthly': {
        const lastDay = new Date(parseInt(currYear, 10), parseInt(currMonth, 10), 0).getDate()
        setDateRange({
          preset: 'this_month',
          label: 'This Month',
          startDate: `${currYear}-${currMonth}-01`,
          endDate: `${currYear}-${currMonth}-${String(lastDay).padStart(2, '0')}`,
        })
        break
      }
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

  const loadExpenses = React.useCallback(async () => {
    try {
      setLoading(true)
      const targetCompany = isCompanyScoped
        ? assignedCompany
        : (selectedCompany === 'All Companies' ? undefined : selectedCompany)
      const data = await expenseService.getExpenses({
        company: targetCompany,
      })
      setExpenses(data)
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [isCompanyScoped, assignedCompany, selectedCompany])

  React.useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
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
  const filteredExpenses = React.useMemo(() => {
    const targetCompany = isCompanyScoped ? assignedCompany : selectedCompany

    return expenses
      .filter((item) => {
        if (
          targetCompany !== 'All Companies' &&
          item.company.trim().toLowerCase() !== targetCompany.trim().toLowerCase()
        ) {
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
          const matchAmount = String(item.withdrawal || '').includes(q)

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
  }, [expenses, isAuditor, selectedCompany, dateRange, statusFilter, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, searchQuery, selectedCompany, selectedPeriod, statusFilter])

  // KPI Calculation: Total Expense & Total Cash
  const kpis = React.useMemo(() => {
    let expenseTotal = 0
    let cashTotal = 0
    filteredExpenses.forEach((e) => {
      expenseTotal += e.withdrawal || 0
      if (e.items && e.items.length > 0) {
        e.items.forEach((item) => {
          if (item.status === 'Paid') {
            cashTotal += item.total || 0
          }
        })
      } else if (e.status === 'Paid') {
        cashTotal += e.withdrawal || 0
      }
      if (e.totalPaid && e.totalPaid > 0) {
        cashTotal = Math.max(cashTotal, e.totalPaid)
      }
    })
    return {
      totalExpense: expenseTotal,
      totalCash: cashTotal,
    }
  }, [filteredExpenses])

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredExpenses.length)
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  // Map expenses to DashboardTransactionItems for ExpenseSummaryChart
  const mappedTransactions = React.useMemo(() => {
    return filteredExpenses.map((e) => expenseService.toDashboardTransaction(e))
  }, [filteredExpenses])

  // Export handlers
  const companyForExport = selectedCompany

  const handleExportCsv = () => {
    expenseService.exportCsv(
      filteredExpenses,
      `expense_summary_${companyForExport.replace(/\s+/g, '_')}_${Date.now()}.csv`
    )
    setIsExportDropdownOpen(false)
  }

  const handleExportPdf = () => {
    expenseService.exportPdf(filteredExpenses, companyForExport)
    setIsExportDropdownOpen(false)
  }

  const handleExpenseAdded = (newItem: ExpenseItem) => {
    setExpenses((prev) => [newItem, ...prev])
    setSearchQuery('')

    const newDateIso = newItem.rawDate || normalizeDateToYYYYMMDD(newItem.date)
    if (!isDateInRange(newDateIso, dateRange.startDate, dateRange.endDate)) {
      setDateRange((prev: DateRange) => ({
        ...prev,
        startDate: prev.startDate && prev.startDate < newDateIso ? prev.startDate : newDateIso,
        endDate: prev.endDate && prev.endDate > newDateIso ? prev.endDate : newDateIso,
      }))
    }

    setCurrentPage(1)
    setHighlightedExpenseId(newItem.id)

    setTimeout(() => {
      tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)

    setTimeout(() => {
      setHighlightedExpenseId(null)
    }, 3500)
  }

  const handleOpenRow = (expense: ExpenseItem) => {
    setSelectedExpense(expense)
    setSelectedTx(expenseService.toDashboardTransaction(expense))
    setIsAuditModalOpen(true)
  }

  const handleRowClick = (expense: ExpenseItem) => {
    handleOpenRow(expense)
  }

  const handleExpenseUpdated = (updatedItem: ExpenseItem) => {
    setExpenses((prev) => prev.map((e) => (e.id === updatedItem.id ? updatedItem : e)))
    setSelectedExpense(updatedItem)
    setSelectedTx(expenseService.toDashboardTransaction(updatedItem))
    setHighlightedExpenseId(updatedItem.id)
    setTimeout(() => {
      setHighlightedExpenseId(null)
    }, 3000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmExpense || isAdmin) return
    try {
      setIsDeleting(true)
      await expenseService.deleteExpense(deleteConfirmExpense.id)
      setExpenses((prev) => prev.filter((e) => e.id !== deleteConfirmExpense.id))
      setDeleteConfirmExpense(null)
    } catch (err) {
      console.error('Failed to delete expense:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkExpenseAudited = (expense: ExpenseItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    })
    const auditorName = user?.fullName || 'Admin'
    const updated: ExpenseItem = {
      ...expense,
      auditStatus: 'Verified',
      auditedBy: auditorName,
      auditDate: today,
    }
    setExpenses((prev) => prev.map((item) => (item.id === expense.id ? updated : item)))
    expenseService.updateExpenseAuditStatus(expense.id, 'Verified', auditorName)
  }

  const filteredCompanyList = React.useMemo(() => {
    if (!companySearch.trim()) return companyList
    return companyList.filter((c) =>
      c.toLowerCase().includes(companySearch.toLowerCase().trim())
    )
  }, [companySearch, companyList])

  const displayedCompanyTitle = isCompanyScoped
    ? assignedCompany
    : selectedCompany === 'All Companies'
    ? 'All Subsidiaries'
    : selectedCompany

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header & Controls */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Date/Time, Export & Add Expense) sitting on the right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />
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

            {/* Add Expense Button (Exclusively for operational users: Company and Finance; Admin has no Add Expense button) */}
            {canAdd && (
              <Button
                type="button"
                onClick={() => navigate('/expense/add')}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Expense</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right (level with Title & Subtitle) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Expense
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Comprehensive breakdown of operational expenses.
            </p>
          </div>

          {/* Filter Toolbar (Aligned with Title/Subtitle, sitting directly under Export & Add Expense) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
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
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {(['All', 'Paid', 'Pending', 'Unpaid', 'Overdue'] as const).map((st) => (
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
                            ? 'Paid / Settled'
                            : st}
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

            {/* Company Scope: Dropdown for Admin/Finance, static assigned company pill for Supervisor/Company Employee */}
            {isCompanyScoped ? (
              <div className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs">
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90">{assignedCompany}</span>
              </div>
            ) : (
              <div ref={companyDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
                aria-label="Filter expenses by company"
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
                      setActiveCompany('All Companies')
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
                          setActiveCompany('All Companies')
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
                            setActiveCompany(c)
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

      {/* 3. Total Expense & Total Cash KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Expense Card */}
        <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
          <div className="w-full max-w-[calc(100%-60px)]">
            <span className="text-xs font-medium text-muted-fg block">
              Total Expense
            </span>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-36 bg-slate-200/80 animate-pulse rounded-md" />
                <div className="h-3 w-56 bg-slate-200/60 animate-pulse rounded-md" />
              </div>
            ) : (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-red-600 mt-1 tabular-nums tracking-tight">
                  {formatPHP(kpis.totalExpense)}
                </h3>
                <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5 truncate">
                  Total operational expense withdrawals for {dateRange.label || 'the selected period'} in {displayedCompanyTitle}
                </p>
              </>
            )}
          </div>

          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
            <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </Card>

        {/* Total Cash (Disbursed) Card */}
        <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
          <div className="w-full max-w-[calc(100%-60px)]">
            <span className="text-xs font-medium text-muted-fg block">
              Total Cash
            </span>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-36 bg-slate-200/80 animate-pulse rounded-md" />
                <div className="h-3 w-56 bg-slate-200/60 animate-pulse rounded-md" />
              </div>
            ) : (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-rose-600 mt-1 tabular-nums tracking-tight">
                  {formatPHP(kpis.totalCash)}
                </h3>
                <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5 truncate">
                  Actual cash disbursed for settled expenses in {displayedCompanyTitle}
                </p>
              </>
            )}
          </div>

          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </Card>
      </div>

      {/* 4. Charts Section: Single Diagram with Dropdown (matching SalesPage) */}
      <div className="w-full">
        {loading ? (
          <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stroke/20">
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-slate-200/80 animate-pulse rounded-md" />
                <div className="h-3.5 w-64 bg-slate-200/60 animate-pulse rounded-md" />
              </div>
              <div className="h-9 w-28 bg-slate-200/60 animate-pulse rounded-xl" />
            </div>
            <div className="h-56 sm:h-64 w-full bg-slate-50/70 rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-red-400 animate-spin opacity-60" />
              <div className="h-3.5 w-40 bg-slate-200/70 animate-pulse rounded" />
            </div>
          </Card>
        ) : (
          <ExpenseSummaryChart
            transactions={mappedTransactions}
            className="w-full"
          />
        )}
      </div>

      {/* 5. Summary Transactions in Expense */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Table Search Bar Toolbar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by ref no, cheque, particulars, category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-10 w-full text-xs sm:text-sm rounded-full bg-white border border-stroke/60 shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
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

        {/* Expense Table: equal spacing across all 8 columns including Company */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[900px]">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-[10%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DATE
                </TableHead>
                <TableHead className="w-[17%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  COMPANY
                </TableHead>
                <TableHead className="w-[12%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CHEQUE NO.
                </TableHead>
                <TableHead className="w-[17%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  PARTICULARS
                </TableHead>
                <TableHead className="w-[12%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  WITHDRAWAL
                </TableHead>
                <TableHead className="w-[12%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  CATEGORY
                </TableHead>
                <TableHead className="w-[12%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  NET AMOUNT
                </TableHead>
                <TableHead className="w-[8%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100">
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-16 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-28 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-20 bg-slate-200/60 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-32 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-5 w-16 bg-slate-200/60 animate-pulse rounded-full" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4">
                      <div className="h-4 w-16 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3.5 py-4 text-center">
                      <div className="h-6 w-14 bg-slate-200/60 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-14 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-focus text-sm sm:text-base">
                        No expense records found
                      </p>
                      <p className="text-xs text-muted-fg leading-relaxed">
                        There are no expense transactions recorded for {displayedCompanyTitle} matching your current filters. {isAuditor && 'Click "Add Expense" above to record a new transaction.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    id={`expense-row-${expense.id}`}
                    onClick={() => handleRowClick(expense)}
                    className={cn(
                      'border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-300 cursor-pointer',
                      highlightedExpenseId === expense.id &&
                        'bg-amber-100/90 hover:bg-amber-100/90 ring-2 ring-amber-500 shadow-md font-semibold'
                    )}
                    title="Click to view complete details"
                  >
                    {/* 1. Date */}
                    <TableCell className="w-[10%] px-3.5 py-3.5 text-xs font-medium text-focus truncate text-left">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{expense.date}</span>
                        {highlightedExpenseId === expense.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#960C01] text-white shadow-xs animate-bounce shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Company */}
                    <TableCell className="w-[17%] px-3.5 py-3.5 text-xs font-semibold text-focus truncate text-left" title={expense.company}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{expense.company}</span>
                      </div>
                    </TableCell>

                    {/* 3. Cheque No */}
                    <TableCell className="w-[12%] px-3.5 py-3.5 text-xs text-focus/90 truncate font-mono text-left">
                      {expense.chequeNo || '—'}
                    </TableCell>

                    {/* 4. Particulars */}
                    <TableCell className="w-[17%] px-3.5 py-3.5 text-xs text-focus/90 font-normal truncate text-left" title={expense.particulars}>
                      {(() => {
                        const summary = getParticularsSummary(expense.particulars, expense.items)
                        if (summary.count > 1) {
                          return (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate block font-medium">{summary.firstItemName}</span>
                              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#960C01]/10 text-[#960C01] border border-[#960C01]/20">
                                +{summary.count - 1} more
                              </span>
                            </div>
                          )
                        }
                        return <span className="truncate block">{summary.firstItemName}</span>
                      })()}
                    </TableCell>

                    {/* 5. Withdrawal */}
                    <TableCell className="w-[12%] px-3.5 py-3.5 text-xs font-semibold text-left tabular-nums whitespace-nowrap text-red-600">
                      {expense.withdrawal > 0 ? formatPHP(expense.withdrawal) : ''}
                    </TableCell>

                    {/* 6. Category & Payment Method */}
                    <TableCell className="w-[12%] px-3.5 py-3.5 text-xs text-focus/90 font-medium truncate text-left">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="truncate font-semibold text-focus" title={expense.category || 'General'}>
                          {expense.category || 'General'}
                        </span>
                        <span className="text-[10px] text-muted-fg truncate" title={expense.paymentMethod || 'Cash'}>
                          {expense.paymentMethod || 'Cash'}
                        </span>
                      </div>
                    </TableCell>

                    {/* 7. Net Amount */}
                    <TableCell className="w-[12%] px-3.5 py-3.5 text-xs font-bold text-left tabular-nums whitespace-nowrap text-focus">
                      {formatPHP(expense.netAmount)}
                    </TableCell>

                    {/* 8. Actions */}
                    <TableCell
                      className="w-[8%] px-3.5 py-3.5 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        {isAdmin ? (
                          expense.auditStatus === 'Verified' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRow(expense)}
                              className="h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 flex items-center gap-1.5 cursor-pointer border border-emerald-300/80 shadow-2xs transition-all"
                              title="Audited (Click to view details or unmark)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Audited</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkExpenseAudited(expense, e)}
                              className="h-7 px-2.5 rounded-lg text-xs font-semibold text-focus/80 hover:text-primary hover:bg-red-50/50 flex items-center gap-1.5 cursor-pointer border border-slate-200/80 hover:border-primary/30 shadow-2xs transition-all"
                              title="Click to automatically mark as audited"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span>Audit</span>
                            </Button>
                          )
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmExpense(expense)}
                            className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          <span className="font-medium text-focus/80">
            {filteredExpenses.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredExpenses.length} records`}
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleExpenseAdded}
        assignedCompany={isAuditor ? assignedCompany : selectedCompany}
      />

      {/* Delete Confirmation Dialog (Hidden for Admin who has no delete ability) */}
      {!isAdmin && (
        <Dialog
          open={Boolean(deleteConfirmExpense)}
          onOpenChange={(open) => !open && setDeleteConfirmExpense(null)}
        >
          <DialogContent className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-focus flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Confirm Deletion</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-fg mt-1 leading-relaxed">
                Are you sure you want to delete this expense record? This action will remove the record from the company ledger.
              </DialogDescription>
            </DialogHeader>

            {deleteConfirmExpense && (
              <div className="my-4 p-4 rounded-2xl bg-red-50/60 border border-red-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-fg">Particulars:</span>
                  <span className="font-semibold text-focus truncate max-w-[200px]">
                    {deleteConfirmExpense.particulars}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-fg">Withdrawal:</span>
                  <span className="font-bold text-red-600">
                    {formatPHP(deleteConfirmExpense.withdrawal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-fg">Ref No:</span>
                  <span className="font-mono text-focus">{deleteConfirmExpense.refNo}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmExpense(null)}
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
      )}

      {/* Transaction Details & Audit Modal (View only for Admin just like in loan, editable for operational users) */}
      <AuditTransactionModal
        open={isAuditModalOpen}
        onOpenChange={(open) => {
          setIsAuditModalOpen(open)
          if (!open) {
            setSelectedExpense(null)
            setSelectedTx(null)
          }
        }}
        transaction={selectedTx}
        expense={selectedExpense}
        onExpenseUpdated={handleExpenseUpdated}
        editable={!isAdmin}
      />
    </div>
  )
}
