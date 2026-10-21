import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  BellRing,
  Plus,
  Download,
  FileSpreadsheet,
  Trash2,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Building2,
  Calendar,
  X,
  AlertCircle,
  Eye,
  RotateCcw,
  MoreVertical,
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
import { useSession } from '@/hooks/useSession'
import { useCompany } from '@/context/CompanyContext'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { formatPHP } from '@/lib/format'
import {
  billsService,
  getBillPaymentOptions,
  getBillPaymentPeriods,
  type BillItem,
  type BillReminder,
  type BillStatus,
  BILL_CATEGORIES,
} from '@/services/billsService'
import { loanService } from '@/services/loanService'
import { AddBillModal } from '@/components/dashboard/AddBillModal'
import { EditBillModal } from '@/components/dashboard/EditBillModal'
import { RecordBillPaymentModal } from '@/components/dashboard/RecordBillPaymentModal'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
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

const ITEMS_PER_PAGE = 10

export const BillsPage: React.FC = () => {
  const { user } = useSession()
  const userRole = user?.role || ''
  const isSupervisor = userRole.toLowerCase() === 'supervisor'
  const isAudit =
    userRole.toLowerCase() === 'audit' ||
    userRole.toLowerCase() === 'company auditor'
  const isCompanyScoped =
    isSupervisor ||
    userRole.toLowerCase() === 'company' ||
    userRole.toLowerCase() === 'company auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Data states
  const [bills, setBills] = React.useState<BillItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [companyList, setCompanyList] = React.useState<string[]>(COMPANY_LIST)

  const { activeCompany, setActiveCompany } = useCompany()

  // Filters
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isCompanyScoped ? assignedCompany : (activeCompany || 'All Companies')
  )

  React.useEffect(() => {
    if (!isCompanyScoped && activeCompany) {
      setSelectedCompany(activeCompany)
    }
  }, [activeCompany, isCompanyScoped])

  const [selectedCategory, setSelectedCategory] = React.useState<string>('All')
  const [statusFilter, setStatusFilter] = React.useState<'All' | BillStatus>('All')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Dropdowns
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [companySearch, setCompanySearch] = React.useState('')

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [editingBill, setEditingBill] = React.useState<BillItem | null>(null)
  const [paymentBill, setPaymentBill] = React.useState<BillItem | null>(null)
  const [deleteConfirmBill, setDeleteConfirmBill] = React.useState<BillItem | null>(null)
  const [viewHistoryBill, setViewHistoryBill] = React.useState<BillItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [highlightedBillId, setHighlightedBillId] = React.useState<string | null>(null)
  const [openMenuBillId, setOpenMenuBillId] = React.useState<string | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{
    top: number
    right: number
    openUpward?: boolean
  } | null>(null)
  const [activeMenuBill, setActiveMenuBill] = React.useState<BillItem | null>(null)

  // Close portal action menu on outside click, window scroll or resize
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.bill-portal-menu') && !target.closest('.bill-action-btn') && !target.closest('.bill-action-menu')) {
        setOpenMenuBillId(null)
        setMenuPosition(null)
        setActiveMenuBill(null)
      }
    }
    const handleScrollOrResize = () => {
      setOpenMenuBillId(null)
      setMenuPosition(null)
      setActiveMenuBill(null)
    }

    if (openMenuBillId) {
      document.addEventListener('mousedown', handleOutsideClick)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [openMenuBillId])

  // Details pop-up modal state
  const [selectedDetailBill, setSelectedDetailBill] = React.useState<BillItem | null>(null)
  const [detailPayDate, setDetailPayDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [detailPayMethod, setDetailPayMethod] = React.useState<string>('Bank Transfer')
  const [detailRefNo, setDetailRefNo] = React.useState<string>('')
  const [isDetailPaying, setIsDetailPaying] = React.useState(false)

  React.useEffect(() => {
    if (selectedDetailBill) {
      setDetailPayDate(new Date().toISOString().slice(0, 10))
      setDetailPayMethod('Bank Transfer')
      setDetailRefNo('')
    }
  }, [selectedDetailBill])

  // Sync assigned company if scoped
  React.useEffect(() => {
    if (isCompanyScoped && user?.assignedCompany) {
      setSelectedCompany(user.assignedCompany)
    }
  }, [isCompanyScoped, user?.assignedCompany])

  // Load companies
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

  // Load bills
  const loadBills = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await billsService.getBills()
      setBills(data)
    } catch (err) {
      console.error('Failed to load bills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBills()
  }, [loadBills])

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Active filtered bills
  const filteredBills = React.useMemo(() => {
    return bills.filter((bill) => {
      // Company filter
      if (selectedCompany !== 'All Companies') {
        const matchesCompany =
          bill.company.toLowerCase().trim() === selectedCompany.toLowerCase().trim()
        if (!matchesCompany) return false
      }

      // Category filter
      if (selectedCategory !== 'All') {
        if (bill.category !== selectedCategory) return false
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (bill.status !== statusFilter) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = bill.billerName.toLowerCase().includes(q)
        const matchAcc = (bill.accountNo || '').toLowerCase().includes(q)
        const matchComp = bill.company.toLowerCase().includes(q)
        const matchCat = bill.category.toLowerCase().includes(q)
        const matchNotes = (bill.notes || '').toLowerCase().includes(q)
        if (!matchName && !matchAcc && !matchComp && !matchCat && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [bills, selectedCompany, selectedCategory, statusFilter, searchQuery])

  // KPI stats for current company scope
  const scopedBills = React.useMemo(() => {
    if (selectedCompany === 'All Companies') return bills
    return bills.filter(
      (b) => b.company.toLowerCase().trim() === selectedCompany.toLowerCase().trim()
    )
  }, [bills, selectedCompany])

  const stats = React.useMemo(() => {
    return billsService.getStats(scopedBills)
  }, [scopedBills])

  // Active reminders
  const reminders = React.useMemo<BillReminder[]>(() => {
    return billsService.getReminders(scopedBills)
  }, [scopedBills])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredBills.length)
  const paginatedBills = React.useMemo(() => {
    return filteredBills.slice(startIndex, endIndex)
  }, [filteredBills, startIndex, endIndex])

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedCategory, statusFilter, searchQuery])

  // Handlers
  const handleBillCreated = (newBill: BillItem) => {
    setBills((prev) => [newBill, ...prev])
    setHighlightedBillId(newBill.id)
    setTimeout(() => setHighlightedBillId(null), 3000)
    tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleBillUpdated = (updated: BillItem) => {
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    setHighlightedBillId(updated.id)
    setTimeout(() => setHighlightedBillId(null), 3000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmBill) return
    try {
      setIsDeleting(true)
      await billsService.deleteBill(deleteConfirmBill.id)
      setBills((prev) => prev.filter((b) => b.id !== deleteConfirmBill.id))
      setDeleteConfirmBill(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete bill')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCheckboxToggle = async (bill: BillItem, checked: boolean) => {
    try {
      if (checked) {
        setPaymentBill(bill)
      } else {
        const updated = await billsService.markAsUnpaid(bill.id)
        handleBillUpdated(updated)
      }
    } catch (err: any) {
      console.error('Failed to toggle bill status:', err)
    }
  }

  const handleRowClick = (bill: BillItem) => {
    setSelectedDetailBill(bill)
  }

  const handlePayFromDetailsModal = async () => {
    if (!selectedDetailBill) return
    try {
      setIsDetailPaying(true)
      const updated = await billsService.recordPayment(selectedDetailBill.id, {
        periodKey: getBillPaymentOptions(selectedDetailBill).nextPayable.key,
        paymentDate: detailPayDate || new Date().toISOString().slice(0, 10),
        amount: selectedDetailBill.amount,
        paymentMethod: detailPayMethod,
        refNo: detailRefNo.trim() || undefined,
        notes: 'Paid via bill details modal',
      })
      handleBillUpdated(updated)
      setSelectedDetailBill(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment')
    } finally {
      setIsDetailPaying(false)
    }
  }

  const handleUndoFromDetailsModal = async () => {
    if (!selectedDetailBill) return
    try {
      setIsDetailPaying(true)
      const updated = await billsService.markAsUnpaid(selectedDetailBill.id)
      handleBillUpdated(updated)
      setSelectedDetailBill(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to revert bill')
    } finally {
      setIsDetailPaying(false)
    }
  }

  const handleExportCsv = () => {
    billsService.exportCsv(
      filteredBills,
      `monthly_bills_${selectedCompany.replace(/\s+/g, '_')}_${Date.now()}.csv`
    )
    setIsExportDropdownOpen(false)
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
  const selectedDetailNextPeriod = selectedDetailBill
    ? getBillPaymentOptions(selectedDetailBill).nextPayable
    : null

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Controls */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Live Date/Time, Export & Add Bill) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />
            {/* Export Dropdown Button */}
            <div ref={exportDropdownRef} className="relative inline-block">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all box-border border border-stroke/50 bg-white text-focus hover:bg-surface"
                aria-haspopup="true"
                aria-expanded={isExportDropdownOpen}
              >
                <Download className="h-4 w-4 shrink-0 text-focus/70" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-muted-fg" />
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
                </div>
              )}
            </div>

            {/* Add Bill Button (Hidden for Audit) */}
            {!isAudit && (
              <Button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Bill</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
                Monthly Bills
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#960C01]/10 text-[#960C01] border border-[#960C01]/20">
                {stats.totalBillsCount} Bills
              </span>
            </div>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Track recurring utility, rental, and scheduled bills for {displayedCompanyTitle} with automated due date reminders and payment history.
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 self-start lg:self-auto relative z-30">
            {/* Category Filter */}
            <div ref={categoryDropdownRef} className="relative inline-block shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen((prev) => !prev)
                  setIsStatusDropdownOpen(false)
                  setIsCompanyDropdownOpen(false)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs font-medium shadow-xs transition-colors cursor-pointer select-none box-border whitespace-nowrap shrink-0',
                  isCategoryDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
              >
                <Receipt className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                <span className="font-medium text-focus/90">
                  {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-fg shrink-0" />
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All')
                      setIsCategoryDropdownOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                      selectedCategory === 'All'
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-focus/80 hover:bg-slate-50'
                    )}
                  >
                    <span>All Categories</span>
                    {selectedCategory === 'All' && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                  {BILL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat)
                        setIsCategoryDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        selectedCategory === cat
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span className="truncate">{cat}</span>
                      {selectedCategory === cat && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div ref={statusDropdownRef} className="relative inline-block shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen((prev) => !prev)
                  setIsCategoryDropdownOpen(false)
                  setIsCompanyDropdownOpen(false)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs font-medium shadow-xs transition-colors cursor-pointer select-none box-border whitespace-nowrap shrink-0',
                  isStatusDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
              >
                <span className="font-medium text-focus/90">
                  {statusFilter === 'All' ? 'Status: All' : statusFilter}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-fg shrink-0" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {(['All', 'Due Soon', 'Overdue', 'Unpaid', 'Paid'] as const).map((st) => (
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
                      <span>{st === 'All' ? 'All Status' : st}</span>
                      {statusFilter === st && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company Filter (Locked for Supervisor, dropdown for Finance/Admin) */}
            {isCompanyScoped ? (
              <div className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs font-medium shadow-xs shrink-0 whitespace-nowrap">
                <Building2 className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90 truncate max-w-[130px]">
                  {assignedCompany}
                </span>
              </div>
            ) : (
              <div ref={companyDropdownRef} className="relative inline-block shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompanyDropdownOpen((prev) => !prev)
                    setIsCategoryDropdownOpen(false)
                    setIsStatusDropdownOpen(false)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs font-medium shadow-xs transition-colors cursor-pointer select-none box-border whitespace-nowrap shrink-0',
                    isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                  <span className="font-medium text-focus/90 truncate max-w-[110px] sm:max-w-[130px]">
                    {selectedCompany}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-fg shrink-0" />
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
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>

                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-68 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stroke/20 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">
                        Filter by Company
                      </span>
                    </div>

                    <div className="px-1 mb-2">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-fg" />
                        <input
                          type="text"
                          placeholder="Search company..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-surface rounded-xl text-xs border border-stroke/40 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {filteredCompanyList.map((c) => (
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Containers (4 Cards) matching Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Bills */}
        <DashboardKpiCard
          label="Total Monthly Bills"
          value={loading ? '...' : formatPHP(stats.totalMonthlyAmount)}
          icon={Receipt}
          subtext={`Across ${stats.totalBillsCount} scheduled bills`}
        />

        {/* Paid / Settled */}
        <DashboardKpiCard
          label="Paid / Settled"
          value={loading ? '...' : formatPHP(stats.paidAmount)}
          icon={CheckCircle2}
          subtext={`${stats.paidCount} of ${stats.totalBillsCount} bills settled`}
          valueClassName="text-emerald-600"
          iconContainerClassName="bg-emerald-50 text-emerald-600 border border-emerald-200/60"
        />

        {/* Unpaid / Outstanding */}
        <DashboardKpiCard
          label="Unpaid / Outstanding"
          value={loading ? '...' : formatPHP(stats.unpaidAmount)}
          icon={Clock}
          subtext={`${stats.unpaidCount} bills pending payment`}
          valueClassName="text-amber-600"
          iconContainerClassName="bg-amber-50 text-amber-600 border border-amber-200/60"
        />

        {/* Urgent Reminders */}
        <DashboardKpiCard
          label="Urgent Reminders"
          value={loading ? '...' : String(reminders.length)}
          icon={BellRing}
          subtext={
            stats.overdueCount > 0
              ? `${stats.overdueCount} overdue (${formatPHP(stats.overdueAmount)})`
              : `${stats.dueSoonCount} due soon`
          }
          valueClassName="text-rose-600"
          iconContainerClassName="bg-rose-50 text-rose-600 border border-rose-200/60"
        />
      </div>

      {/* 3. Due Date Reminders Banner (Alert section) */}
      {reminders.length > 0 && (
        <Card className="rounded-[20px] bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-red-500/10 border border-amber-200/70 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#960C01] text-white flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 tracking-tight">
                  Due Date Reminders & Alerts
                </h4>
                <p className="text-2xs text-neutral-600">
                  {reminders.length} bill{reminders.length > 1 ? 's' : ''} require attention for payment settlement
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminders.slice(0, 6).map((rem) => {
              const isOverdue = rem.type === 'overdue'
              const isToday = rem.type === 'due_today'

              return (
                <div
                  key={rem.bill.id}
                  className={cn(
                    'p-3 rounded-xl border flex items-center justify-between gap-3 transition-all',
                    isOverdue
                      ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                      : isToday
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                      : 'bg-white border-neutral-200 text-neutral-800'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">{rem.bill.billerName}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0',
                          isOverdue
                            ? 'bg-rose-600 text-white'
                            : isToday
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {isOverdue
                          ? `${rem.daysDiff}d Overdue`
                          : isToday
                          ? 'DUE TODAY'
                          : `Due in ${rem.daysDiff}d`}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5 flex items-center gap-1.5">
                      <span>{rem.bill.company}</span>
                      <span>•</span>
                      <span className="font-semibold">{formatPHP(rem.bill.amount)}</span>
                    </div>
                  </div>

                  {!isAudit && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPaymentBill(rem.bill)}
                      className={cn(
                        'h-7 px-2.5 rounded-lg text-xs font-semibold shrink-0 shadow-2xs',
                        isOverdue
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#960C01] hover:bg-[#800a01] text-white'
                      )}
                    >
                      Pay
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 4. Bills Summary Table Container */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Table Search Bar Toolbar (Title & subtext removed) */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by biller, account number, company, category, or notes…"
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

        {/* Table View */}
        <div className="w-full rounded-xl border border-slate-100 overflow-hidden">
          <Table containerClassName="overflow-hidden" className="w-full table-fixed">
            <colgroup>
              {!isAudit && <col style={{ width: '4%' }} />}
              <col style={{ width: isAudit ? '24%' : '21%' }} />
              <col style={{ width: isAudit ? '18%' : '17%' }} />
              <col style={{ width: isAudit ? '14%' : '13%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: isAudit ? '10%' : '11%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                {!isAudit && (
                  <TableHead className="w-[4%] px-2 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                    <span className="sr-only">Mark as Paid</span>
                  </TableHead>
                )}
                <TableHead
                  className={cn(
                    isAudit ? 'w-[24%]' : 'w-[21%]',
                    'px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left'
                  )}
                >
                  BILLER / ACCOUNT
                </TableHead>
                <TableHead
                  className={cn(
                    isAudit ? 'w-[18%]' : 'w-[17%]',
                    'px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left'
                  )}
                >
                  COMPANY
                </TableHead>
                <TableHead
                  className={cn(
                    isAudit ? 'w-[14%]' : 'w-[13%]',
                    'px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left'
                  )}
                >
                  CATEGORY
                </TableHead>
                <TableHead className="w-[15%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  MONTHLY AMOUNT
                </TableHead>
                <TableHead className="w-[14%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DUE DATE
                </TableHead>
                <TableHead
                  className={cn(
                    isAudit ? 'w-[10%]' : 'w-[11%]',
                    'px-2.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left'
                  )}
                >
                  STATUS
                </TableHead>
                <TableHead className="w-[5%] px-1 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100">
                    {!isAudit && (
                      <TableCell className="px-2 py-4 text-center">
                        <div className="h-4 w-4 bg-slate-200/70 animate-pulse rounded mx-auto" />
                      </TableCell>
                    )}
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-28 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-24 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3 py-4 text-right">
                      <div className="h-4 w-20 bg-slate-200/80 animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-2.5 py-4">
                      <div className="h-5 w-16 bg-slate-200/60 animate-pulse rounded-full" />
                    </TableCell>
                    <TableCell className="px-1 py-4 text-center">
                      <div className="h-6 w-6 bg-slate-200/60 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedBills.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAudit ? 7 : 8}
                    className="py-14 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-focus text-sm sm:text-base">
                        No bill records found
                      </p>
                      <p className="text-xs text-muted-fg leading-relaxed">
                        There are no monthly bills recorded for {displayedCompanyTitle} matching your current filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBills.map((bill) => {
                  const isHighlighted = highlightedBillId === bill.id
                  const isPaid = bill.status === 'Paid'
                  const isOverdue = bill.status === 'Overdue'
                  const isDueSoon = bill.status === 'Due Soon'

                  return (
                    <TableRow
                      key={bill.id}
                      id={`bill-row-${bill.id}`}
                      onClick={() => handleRowClick(bill)}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-300 cursor-pointer',
                        isHighlighted &&
                          'bg-amber-100/90 hover:bg-amber-100/90 ring-2 ring-amber-500 shadow-md font-semibold'
                      )}
                      title="Click to view complete bill details"
                    >
                      {/* Checkbox: Easily check bill to mark as paid (Hidden for Audit) */}
                      {!isAudit && (
                        <TableCell
                          className="w-[4%] px-2 py-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={(e) => handleCheckboxToggle(bill, e.target.checked)}
                            className="w-4 h-4 rounded text-[#960C01] focus:ring-[#960C01] border-slate-300 cursor-pointer accent-[#960C01] mx-auto block"
                            title={
                              isPaid
                                ? 'Paid (Click to revert to Unpaid)'
                                : `Pay ${getBillPaymentOptions(bill).nextPayable.label}`
                            }
                          />
                        </TableCell>
                      )}

                      {/* Biller & Account No */}
                      <TableCell
                        className={cn(
                          isAudit ? 'w-[24%]' : 'w-[21%]',
                          'px-3 py-3.5 text-xs text-left truncate'
                        )}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs sm:text-sm text-focus truncate" title={bill.billerName}>
                            {bill.billerName}
                          </span>
                          <span className="text-[11px] text-muted-fg font-mono truncate" title={bill.accountNo}>
                            {bill.accountNo || '—'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Company */}
                      <TableCell
                        className={cn(
                          isAudit ? 'w-[18%]' : 'w-[17%]',
                          'px-3 py-3.5 text-xs font-semibold text-focus truncate text-left'
                        )}
                        title={bill.company}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{bill.company}</span>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell
                        className={cn(
                          isAudit ? 'w-[14%]' : 'w-[13%]',
                          'px-3 py-3.5 text-xs text-left truncate'
                        )}
                      >
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-full" title={bill.category}>
                          {bill.category}
                        </span>
                      </TableCell>

                      {/* Monthly Amount */}
                      <TableCell className="w-[15%] px-3 py-3.5 text-xs font-bold text-focus tabular-nums text-right truncate">
                        <div className="truncate">{formatPHP(bill.amount)}</div>
                        <div className="text-[10px] text-muted-fg font-normal truncate">
                          {bill.billingCycle}
                        </div>
                      </TableCell>

                      {/* Due Date & Reminder */}
                      <TableCell className="w-[14%] px-3 py-3.5 text-xs text-left truncate">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-focus truncate">{bill.dueDate}</span>
                          <span className="text-[11px] text-amber-600 flex items-center gap-1 truncate font-medium">
                            <BellRing className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">Remind {bill.reminderDaysBefore}d</span>
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell
                        className={cn(
                          isAudit ? 'w-[10%]' : 'w-[11%]',
                          'px-2.5 py-3.5 text-left truncate'
                        )}
                      >
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Paid</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Overdue</span>
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Due Soon</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Unpaid</span>
                          </span>
                        )}
                      </TableCell>

                      {/* Actions: 3 dots button with Edit and Delete choices (Delete removed for Audit) */}
                      <TableCell
                        className="w-[5%] px-1 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuBillId === bill.id) {
                              setOpenMenuBillId(null)
                              setMenuPosition(null)
                              setActiveMenuBill(null)
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const openUpward = rect.bottom + 120 > window.innerHeight
                              setMenuPosition({
                                top: openUpward ? rect.top - 6 : rect.bottom + 6,
                                right: Math.max(12, window.innerWidth - rect.right),
                                openUpward,
                              })
                              setActiveMenuBill(bill)
                              setOpenMenuBillId(bill.id)
                            }
                          }}
                          className="bill-action-btn h-8 w-8 p-0 rounded-lg text-muted-fg hover:text-focus hover:bg-slate-100 cursor-pointer mx-auto flex items-center justify-center"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer (Matching Sales table reference) */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Left: Record summary */}
          <span className="font-medium text-focus/80">
            {filteredBills.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredBills.length} records`}
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

      {/* Floating Action Menu Portal (rendered directly to body to prevent table overflow clipping) */}
      {openMenuBillId && (activeMenuBill || bills.some((item) => item.id === openMenuBillId)) && menuPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="bill-portal-menu bill-action-menu fixed w-36 bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 z-[99999] animate-in fade-in-50 zoom-in-95 duration-150"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              transform: menuPosition.openUpward ? 'translateY(-100%)' : 'none',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {isAudit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                  setOpenMenuBillId(null)
                  setMenuPosition(null)
                  setActiveMenuBill(null)
                  if (b) handleRowClick(b)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-muted-fg" />
                <span>View Details</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    setOpenMenuBillId(null)
                    setMenuPosition(null)
                    setActiveMenuBill(null)
                    if (b) setPaymentBill(b)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {activeMenuBill?.status === 'Paid' ? 'Pay in Advance' : 'Record Payment'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    setOpenMenuBillId(null)
                    setMenuPosition(null)
                    setActiveMenuBill(null)
                    if (b) setViewHistoryBill(b)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-fg" />
                  <span>Payment History</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    setOpenMenuBillId(null)
                    setMenuPosition(null)
                    setActiveMenuBill(null)
                    if (b) setEditingBill(b)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-fg" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    setOpenMenuBillId(null)
                    setMenuPosition(null)
                    setActiveMenuBill(null)
                    if (b) setDeleteConfirmBill(b)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      {/* Modals */}
      {/* 1. Add Bill Modal */}
      <AddBillModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleBillCreated}
        assignedCompany={assignedCompany}
        isCompanyScoped={isCompanyScoped}
        companies={companyList}
      />

      {/* 2. Edit Bill Modal */}
      <EditBillModal
        open={Boolean(editingBill)}
        onOpenChange={(open) => !open && setEditingBill(null)}
        bill={editingBill}
        onSuccess={handleBillUpdated}
        isCompanyScoped={isCompanyScoped}
        companies={companyList}
      />

      {/* 3. Record Bill Payment Modal */}
      <RecordBillPaymentModal
        open={Boolean(paymentBill)}
        onOpenChange={(open) => !open && setPaymentBill(null)}
        bill={paymentBill}
        onBillPaid={handleBillUpdated}
      />

      {/* 4. Payment History Modal */}
      <Dialog
        open={Boolean(viewHistoryBill)}
        onOpenChange={(open) => !open && setViewHistoryBill(null)}
      >
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              Payment Transactions
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Payment records for {viewHistoryBill?.billerName} ({viewHistoryBill?.company})
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {viewHistoryBill?.payments && viewHistoryBill.payments.length > 0 ? (
              viewHistoryBill.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-neutral-800">
                    <span>
                      {p.periodKey ? `Period ${p.periodKey}` : 'Billing period'} • {p.paymentDate}
                    </span>
                    <span className="text-emerald-700">{formatPHP(p.amount)}</span>
                  </div>
                  <div className="text-neutral-500 flex items-center justify-between">
                    <span>Method: {p.paymentMethod}</span>
                    {p.refNo && <span>Ref: {p.refNo}</span>}
                  </div>
                  {p.notes && <div className="text-neutral-400 italic">{p.notes}</div>}
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">No payment records yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteConfirmBill)}
        onOpenChange={(open) => !open && setDeleteConfirmBill(null)}
      >
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              Delete Monthly Bill?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-600 mt-1">
              Are you sure you want to delete the bill for{' '}
              <strong className="text-neutral-800">{deleteConfirmBill?.billerName}</strong> (
              {deleteConfirmBill?.company})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmBill(null)}
              className="rounded-xl h-10 px-4 text-xs font-semibold border-neutral-200 hover:bg-neutral-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="rounded-xl h-10 px-5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
            >
              {isDeleting ? 'Deleting...' : 'Delete Bill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. View Bill Details & Pay Modal */}
      <Dialog
        open={Boolean(selectedDetailBill)}
        onOpenChange={(open) => !open && setSelectedDetailBill(null)}
      >
        <DialogContent className="sm:max-w-[620px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-5 [&>button]:right-5 max-h-[92vh] overflow-y-auto">
          {selectedDetailBill && (
            <>
              {/* Header */}
              <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                        {selectedDetailBill.billerName}
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                        Monthly Recurring Bill • {selectedDetailBill.company}
                      </DialogDescription>
                    </div>
                  </div>

                  {selectedDetailBill.status === 'Paid' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paid</span>
                    </span>
                  ) : selectedDetailBill.status === 'Overdue' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Overdue</span>
                    </span>
                  ) : selectedDetailBill.status === 'Due Soon' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Due Soon</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unpaid</span>
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* Amount Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs my-3">
                <div>
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Monthly Obligation Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-focus tabular-nums">
                    {formatPHP(selectedDetailBill.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Scheduled Due Date
                  </span>
                  <span className="text-sm font-bold text-focus flex items-center justify-end gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-fg" />
                    {selectedDetailBill.dueDate}
                  </span>
                  <span className="text-[11px] text-amber-600 font-medium block mt-0.5">
                    Remind {selectedDetailBill.reminderDaysBefore} days before
                  </span>
                </div>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs py-1">
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Company / Entity
                  </span>
                  <span className="font-semibold text-focus text-sm mt-0.5 block truncate">
                    {selectedDetailBill.company}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Category
                  </span>
                  <span className="font-semibold text-focus text-sm mt-0.5 block truncate">
                    {selectedDetailBill.category}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Account / Ref No.
                  </span>
                  <span className="font-semibold text-focus text-sm mt-0.5 font-mono block truncate">
                    {selectedDetailBill.accountNo || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                    Billing Cycle
                  </span>
                  <span className="font-semibold text-focus text-sm mt-0.5 block">
                    {selectedDetailBill.billingCycle}
                  </span>
                </div>

                {selectedDetailBill.notes && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Notes & Particulars
                    </span>
                    <span className="text-focus text-xs mt-0.5 block">
                      {selectedDetailBill.notes}
                    </span>
                  </div>
                )}

                {selectedDetailBill.status === 'Paid' && (
                  <div className="col-span-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Settlement Information</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs text-emerald-800">
                      <div>
                        <span className="opacity-75 block text-[11px]">Paid Date:</span>
                        <span className="font-semibold">{selectedDetailBill.lastPaidDate || 'Recorded'}</span>
                      </div>
                      <div>
                        <span className="opacity-75 block text-[11px]">Payment Method:</span>
                        <span className="font-semibold">{selectedDetailBill.lastPaymentMethod || 'Bank Transfer'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring payment period tracking */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 mt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-focus uppercase tracking-wider">
                    Payment Schedule
                  </span>
                  <span className="text-[11px] text-muted-fg">
                    {selectedDetailBill.billingCycle} periods
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                  {getBillPaymentPeriods(selectedDetailBill).map((period) => {
                    const isNext = period.key === selectedDetailNextPeriod?.key
                    return (
                      <div
                        key={period.key}
                        className={cn(
                          'p-2.5 rounded-xl border text-[11px] transition-all',
                          isNext
                            ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-300/60 shadow-xs'
                            : period.paid
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : period.isFuture
                            ? 'bg-white border-slate-200 text-slate-500'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        )}
                      >
                        <div className="font-semibold truncate text-xs">{period.label}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {period.paid ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-medium">
                                {period.isFuture ? 'Paid (Advance)' : 'Paid'}
                              </span>
                            </>
                          ) : isNext ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="font-bold">Next to pay</span>
                            </>
                          ) : period.isFuture ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Upcoming</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="font-medium">Overdue</span>
                            </>
                          )}
                        </div>
                        {period.paid && period.paymentDate && (
                          <div className="text-[10px] opacity-75 mt-0.5 truncate">
                            Paid {period.paymentDate}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Settlement Fields (Available for both outstanding and advance payments, hidden for Audit) */}
              {!isAudit && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-focus uppercase tracking-wider block">
                      {selectedDetailBill.status === 'Paid'
                        ? 'Advance Payment Settlement'
                        : 'Payment Settlement Details'}
                    </span>
                    {selectedDetailBill.status === 'Paid' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Up to date • Advance payment enabled
                      </span>
                    )}
                  </div>

                  <div
                    className={cn(
                      'p-2.5 rounded-xl border',
                      selectedDetailBill.status === 'Paid'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider block',
                        selectedDetailBill.status === 'Paid' ? 'text-emerald-700' : 'text-amber-800'
                      )}
                    >
                      {selectedDetailBill.status === 'Paid'
                        ? 'This advance payment will settle'
                        : 'This payment will settle'}
                    </span>
                    <span className="text-sm font-bold block mt-0.5">
                      {selectedDetailNextPeriod?.label || selectedDetailBill.dueDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-fg block mb-1">
                        Payment Date
                      </label>
                      <Input
                        type="date"
                        value={detailPayDate}
                        onChange={(e) => setDetailPayDate(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white border-stroke/60"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-fg block mb-1">
                        Payment Method
                      </label>
                      <select
                        value={detailPayMethod}
                        onChange={(e) => setDetailPayMethod(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl text-xs bg-white border border-stroke/60 focus:ring-1 focus:ring-[#960C01] outline-none"
                      >
                        {['Bank Transfer', 'Cash', 'Cheque', 'GCash', 'Maya', 'In-house', 'Auto-Debit'].map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Cancel, Pay/Advance, and Revert */}
              <div className="pt-4 border-t border-stroke/20 flex items-center justify-end gap-2.5 mt-3 flex-wrap">
                {isAudit ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDetailBill(null)}
                    className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
                  >
                    Close
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedDetailBill(null)}
                      disabled={isDetailPaying}
                      className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
                    >
                      Cancel
                    </Button>

                    {/* Pay Button: Supports both standard backlog payment and advance payment */}
                    <Button
                      type="button"
                      onClick={handlePayFromDetailsModal}
                      disabled={isDetailPaying}
                      className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {isDetailPaying
                          ? 'Processing...'
                          : selectedDetailBill.status === 'Paid'
                          ? `Pay in Advance (${selectedDetailNextPeriod?.label || 'Next Period'}) • ${formatPHP(selectedDetailBill.amount)}`
                          : `Pay ${selectedDetailNextPeriod?.label || 'Next Period'} (${formatPHP(selectedDetailBill.amount)})`}
                      </span>
                    </Button>

                    {/* Secondary Revert action if bill already has payments recorded */}
                    {selectedDetailBill.status === 'Paid' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUndoFromDetailsModal}
                        disabled={isDetailPaying}
                        className="rounded-xl h-10 sm:h-11 px-4 text-xs sm:text-sm font-semibold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
                        title="Revert the most recent payment"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert Recent</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
