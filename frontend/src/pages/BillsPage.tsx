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
  MoreVertical,
  FileText,
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
import { formatPHP } from '@/lib/format'
import {
  billsService,
  getBillPaymentOptions,
  type BillItem,
  type BillReminder,
  type BillStatus,
} from '@/services/billsService'
import { loanService } from '@/services/loanService'
import { AddBillModal } from '@/components/dashboard/AddBillModal'
import { EditBillModal } from '@/components/dashboard/EditBillModal'
import {
  RecordBillPaymentModal,
  MONTH_NAMES,
  MONTH_FULL_NAMES,
} from '@/components/dashboard/RecordBillPaymentModal'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { isCompanyMatch } from '@/utils/companyUtils'
import { cn } from '@/lib/utils'

const DEFAULT_COMPANY_LIST = ['All Companies']

const ITEMS_PER_PAGE = 10

export const BillsPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const isAdmin = userRole === 'admin' || isAudit
  const isFinance = userRole === 'finance'
  const isCompanyScoped = !isAdmin && !isFinance
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Data states
  const [bills, setBills] = React.useState<BillItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [companyList, setCompanyList] = React.useState<string[]>(DEFAULT_COMPANY_LIST)

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

  const [statusFilter, setStatusFilter] = React.useState<'All' | BillStatus>('All')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Dropdowns
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [companySearch, setCompanySearch] = React.useState('')

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [editingBill, setEditingBill] = React.useState<BillItem | null>(null)
  const [paymentBill, setPaymentBill] = React.useState<BillItem | null>(null)
  const [deleteConfirmBill, setDeleteConfirmBill] = React.useState<BillItem | null>(null)
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
  const [detailCalendarYear, setDetailCalendarYear] = React.useState<number>(new Date().getFullYear())
  const [detailHistoryPage, setDetailHistoryPage] = React.useState<number>(1)

  React.useEffect(() => {
    if (selectedDetailBill) {
      const targetDate = selectedDetailBill.dueDate
      const parsedYear = targetDate ? parseInt(targetDate.slice(0, 4), 10) : new Date().getFullYear()
      setDetailCalendarYear(!isNaN(parsedYear) ? Math.max(2025, parsedYear) : Math.max(2025, new Date().getFullYear()))
      setDetailHistoryPage(1)
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
        const combined = Array.from(new Set(['All Companies', ...names]))
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
      let auditRecords: Record<string, any> = {}
      try {
        const stored = localStorage.getItem('bills_audit_records')
        if (stored) auditRecords = JSON.parse(stored)
      } catch {}
      const merged = data.map((b) => {
        if (auditRecords[b.id]) {
          return { ...b, ...auditRecords[b.id] }
        }
        return b
      })
      setBills(merged)
    } catch (err) {
      console.error('Failed to load bills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMarkBillAudit = (bill: BillItem, status: 'Verified' | 'Flagged') => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const updated: BillItem = {
      ...bill,
      auditStatus: status,
      auditDate: timestamp,
      auditedBy: user?.fullName,
    }
    setBills((prev) => prev.map((item) => (item.id === bill.id ? updated : item)))
    try {
      const stored = localStorage.getItem('bills_audit_records')
      const records = stored ? JSON.parse(stored) : {}
      records[bill.id] = { auditStatus: status, auditDate: timestamp, auditedBy: user?.fullName || 'Audit' }
      localStorage.setItem('bills_audit_records', JSON.stringify(records))
    } catch {
      // ignore
    }
    setOpenMenuBillId(null)
    setMenuPosition(null)
    setActiveMenuBill(null)
  }

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
        const matchesCompany = isCompanyMatch(bill.company, selectedCompany)
        if (!matchesCompany) return false
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
        const matchCat = (bill.category || '').toLowerCase().includes(q)
        const matchNotes = (bill.notes || '').toLowerCase().includes(q)
        if (!matchName && !matchAcc && !matchComp && !matchCat && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [bills, selectedCompany, statusFilter, searchQuery])

  // KPI stats for current company scope
  const scopedBills = React.useMemo(() => {
    if (selectedCompany === 'All Companies') return bills
    return bills.filter((b) => isCompanyMatch(b.company, selectedCompany))
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
  }, [selectedCompany, statusFilter, searchQuery])

  // Handlers
  const handleBillCreated = (newBill: BillItem) => {
    setBills((prev) => {
      const exists = prev.some((b) => b.id === newBill.id)
      return exists ? prev.map((b) => (b.id === newBill.id ? newBill : b)) : [newBill, ...prev]
    })
    setHighlightedBillId(newBill.id)
    setTimeout(() => setHighlightedBillId(null), 4000)

    // If active company filter doesn't match the new bill, reset to All Companies so it is immediately visible
    if (selectedCompany !== 'All Companies' && !isCompanyMatch(newBill.company, selectedCompany)) {
      setSelectedCompany('All Companies')
      setActiveCompany('All Companies')
    }
    // Clear filters that could hide the newly created bill
    setStatusFilter('All')
    setSearchQuery('')
    setCurrentPage(1)

    // Re-sync with backend to get latest generated records and relations
    loadBills()

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

  const handleRowClick = (bill: BillItem) => {
    setSelectedDetailBill(bill)
  }

  const handleExportCsv = () => {
    const compName = isCompanyScoped ? assignedCompany : selectedCompany
    billsService.exportCsv(
      filteredBills,
      `monthly_bills_${compName.replace(/\s+/g, '_')}_${Date.now()}.csv`
    )
    setIsExportDropdownOpen(false)
  }

  const handleExportPdf = () => {
    setIsExportDropdownOpen(false)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const companyTitle = isCompanyScoped ? assignedCompany : selectedCompany
    const rowsHtml =
      filteredBills.length === 0
        ? `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No monthly bills found matching the selected filters.</td></tr>`
        : filteredBills
            .map(
              (b) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${b.billerName}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${b.company}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${b.category}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${b.accountNo || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 600;">₱${b.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${b.dueDate}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${b.status}</td>
        </tr>
      `
            )
            .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Bills Report - ${companyTitle}</title>
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
          <p>Monthly Bills Report for <strong>${companyTitle}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Biller Name</th>
                <th>Company</th>
                <th>Category</th>
                <th>Account No</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: center;">Due Date</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${filteredBills.length}</div>
            <div><strong>Total Payable:</strong> ₱${stats.totalMonthlyAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Total Paid:</strong> ₱${stats.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Overdue / Unpaid:</strong> ₱${(stats.overdueAmount + stats.unpaidAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Controls */}
      <div className="space-y-4">
        {/* Top Header Row: Page Title on Left, Action Buttons on Right */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start shrink-0">
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

        {/* Second Row: Search Bar & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          {/* Extended Width Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by biller, account number, company, category, or notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 flex-wrap relative z-30 shrink-0">
            {/* Status Filter */}
            <div ref={statusDropdownRef} className="relative inline-block shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen((prev) => !prev)
                  setIsCompanyDropdownOpen(false)
                }}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border whitespace-nowrap shrink-0',
                  isStatusDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                )}
              >
                <span className="font-medium text-focus/90">
                  {statusFilter === 'All' ? 'Status: All' : statusFilter}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {(['All', 'Due Soon', 'Overdue', 'Unpaid', 'Partially Paid', 'Paid'] as const).map((st) => (
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
              <div className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs shrink-0 whitespace-nowrap">
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90 truncate max-w-[140px]">
                  {assignedCompany}
                </span>
              </div>
            ) : (
              <div ref={companyDropdownRef} className="relative inline-block shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompanyDropdownOpen((prev) => !prev)
                    setIsStatusDropdownOpen(false)
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border whitespace-nowrap shrink-0',
                    isCompanyDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                  )}
                >
                  <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                  <span className="font-medium text-focus/90 truncate max-w-[140px] sm:max-w-[180px]">
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
        {/* Table View */}
        <div className="w-full rounded-xl border border-slate-100 overflow-hidden">
          <Table containerClassName="overflow-hidden" className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-[28%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  BILLER
                </TableHead>
                <TableHead className="w-[22%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  COMPANY
                </TableHead>
                <TableHead className="w-[18%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  MONTHLY AMOUNT
                </TableHead>
                <TableHead className="w-[16%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DUE DATE
                </TableHead>
                <TableHead className="w-[11%] px-2.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
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
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-28 bg-slate-200/80 animate-pulse rounded" />
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="h-4 w-24 bg-slate-200/80 animate-pulse rounded" />
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
                    colSpan={6}
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
                      {/* Biller Name */}
                      <TableCell className="w-[28%] px-3 py-3.5 text-xs text-left truncate">
                        <span className="font-semibold text-xs sm:text-sm text-focus truncate block" title={bill.billerName}>
                          {bill.billerName}
                        </span>
                      </TableCell>

                      {/* Company */}
                      <TableCell
                        className="w-[22%] px-3 py-3.5 text-xs font-semibold text-focus truncate text-left"
                        title={bill.company}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{bill.company}</span>
                        </div>
                      </TableCell>

                      {/* Monthly Amount */}
                      <TableCell className="w-[18%] px-3 py-3.5 text-xs font-bold text-focus tabular-nums text-right truncate">
                        <div className="truncate">{formatPHP(bill.amount)}</div>
                        <div className="text-[10px] text-muted-fg font-normal truncate">
                          {bill.billingCycle}
                        </div>
                      </TableCell>

                      {/* Due Date & Reminder */}
                      <TableCell className="w-[16%] px-3 py-3.5 text-xs text-left truncate">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-focus truncate">{bill.dueDate}</span>
                          <span className="text-[11px] text-amber-600 flex items-center gap-1 truncate font-medium">
                            <BellRing className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">Remind {bill.reminderDaysBefore}d</span>
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="w-[10%] px-2.5 py-3.5 text-left truncate">
                        <div className="flex flex-col gap-1 items-start">
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
                          {bill.auditDate && (
                            <span className="text-[10px] text-slate-500 font-normal flex items-center gap-1" title={`Audited at: ${bill.auditDate}`}>
                              <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[110px]">{bill.auditDate}</span>
                            </span>
                          )}
                          {bill.auditStatus && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold w-fit",
                              bill.auditStatus === 'Verified' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-amber-50 text-amber-700 border border-amber-200/80"
                            )}>
                              {bill.auditStatus === 'Verified' ? 'Audited' : 'Discrepancy'}
                            </span>
                          )}
                        </div>
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
            className="bill-portal-menu bill-action-menu fixed w-48 bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 z-[99999] animate-in fade-in-50 zoom-in-95 duration-150"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              transform: menuPosition.openUpward ? 'translateY(-100%)' : 'none',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {isAudit ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    if (b) handleMarkBillAudit(b, 'Verified')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark as Audit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const b = activeMenuBill || bills.find((item) => item.id === openMenuBillId)
                    if (b) handleMarkBillAudit(b, 'Flagged')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors text-left cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mark as Discrepancy</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
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
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Details</span>
                </button>
              </>
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
                    if (b) handleRowClick(b)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-muted-fg" />
                  <span>View Details</span>
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



      {/* 5. Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteConfirmBill)}
        onOpenChange={(open) => !open && setDeleteConfirmBill(null)}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto p-6 rounded-[24px] bg-white border border-neutral-200 shadow-2xl">
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

      {/* 5. View Bill Details & Pay Modal */}
      <Dialog
        open={Boolean(selectedDetailBill)}
        onOpenChange={(open) => !open && setSelectedDetailBill(null)}
      >
        <DialogContent className="sm:max-w-[780px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl max-h-[85vh] overflow-y-auto">
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
                  ) : selectedDetailBill.status === 'Partially Paid' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Partially Paid</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs py-1">
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
                    Billing Cycle
                  </span>
                  <span className="font-semibold text-focus text-sm mt-0.5 block">
                    {selectedDetailBill.billingCycle}
                  </span>
                </div>

                {selectedDetailBill.notes && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Notes & Particulars
                    </span>
                    <span className="text-focus text-xs mt-0.5 block">
                      {selectedDetailBill.notes}
                    </span>
                  </div>
                )}

                {selectedDetailBill.status === 'Paid' && (
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
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

              {/* PAYMENT SCHEDULE CALENDAR (Matching Record Bill Payment Modal) */}
              {(() => {
                const todayStr = new Date().toISOString().slice(0, 10)
                const currentPeriodKey = todayStr.slice(0, 7)
                const detailSchedule = getBillPaymentOptions(selectedDetailBill).periods
                const dueDay =
                  selectedDetailBill.dueDayOfMonth ||
                  parseInt(selectedDetailBill.dueDate?.slice(8, 10) || '15', 10) ||
                  15

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 mt-3">
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#960C01]" />
                        <span className="text-xs font-bold text-focus">Payment Schedule Calendar</span>
                        <span className="text-[11px] text-muted-fg font-normal">
                          ({selectedDetailBill.billingCycle} Cycle)
                        </span>
                      </div>

                      {/* Year Navigator (Minimum 2025) */}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-2xs">
                        <button
                          type="button"
                          disabled={detailCalendarYear <= 2025}
                          onClick={() => setDetailCalendarYear((y) => Math.max(2025, y - 1))}
                          className={cn(
                            'w-6 h-6 rounded-lg flex items-center justify-center text-focus transition-colors',
                            detailCalendarYear <= 2025
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-slate-100 cursor-pointer'
                          )}
                          title="Previous Year (Minimum 2025)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs text-focus px-2 font-mono tabular-nums">
                          {detailCalendarYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailCalendarYear((y) => y + 1)}
                          className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-focus transition-colors cursor-pointer"
                          title="Next Year"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Monthly Calendar Matrix (12 months of selected year) */}
                    {selectedDetailBill.billingCycle === 'Monthly' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {MONTH_NAMES.map((monthAbbr, idx) => {
                          const monthNum = idx + 1
                          const monthKey = `${detailCalendarYear}-${String(monthNum).padStart(2, '0')}`
                          const lastDayOfMonth = new Date(detailCalendarYear, monthNum, 0).getDate()
                          const effectiveDay = Math.min(dueDay, lastDayOfMonth)
                          const periodDateStr = `${monthKey}-${String(effectiveDay).padStart(2, '0')}`

                          const scheduledPeriod = detailSchedule.find((p) => p.key === monthKey)
                          const isPaid = Boolean(scheduledPeriod?.paid && !scheduledPeriod?.partiallyPaid)
                          const isPartiallyPaid = Boolean(scheduledPeriod?.partiallyPaid)
                          const isOverdue =
                            !isPaid &&
                            !isPartiallyPaid &&
                            ((scheduledPeriod && !scheduledPeriod.isFuture && (scheduledPeriod.periodDate || '') < todayStr) ||
                              (!scheduledPeriod && periodDateStr < todayStr))
                          const isDueCurrent =
                            !isPaid && !isPartiallyPaid && !isOverdue && monthKey === currentPeriodKey

                          const paidAmount = scheduledPeriod?.paidAmount || 0
                          const remainingAmount =
                            scheduledPeriod?.remainingAmount !== undefined
                              ? scheduledPeriod.remainingAmount
                              : Math.max(0, selectedDetailBill.amount - paidAmount)

                          return (
                            <div
                              key={monthKey}
                              className={cn(
                                'p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[76px] select-none',
                                isPaid
                                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                                  : isPartiallyPaid
                                  ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                                  : isOverdue
                                  ? 'border-rose-300 bg-rose-50/80 text-rose-950'
                                  : isDueCurrent
                                  ? 'border-blue-200 bg-blue-50/70 text-blue-950'
                                  : 'border-slate-200 bg-white text-slate-700'
                              )}
                            >
                              {/* Top Header: Month Name */}
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold truncate text-focus">
                                  {MONTH_FULL_NAMES[idx]}
                                </span>
                              </div>

                              {/* Due date info */}
                              <div className="text-[10px] text-muted-fg font-medium truncate mt-0.5">
                                Due: {monthAbbr} {effectiveDay}
                              </div>

                              {/* Status Badge */}
                              <div className="mt-1 pt-1 border-t border-slate-200/50 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>Paid</span>
                                    </span>
                                  ) : isPartiallyPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>Partially Paid</span>
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                      <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                      <span>Overdue</span>
                                    </span>
                                  ) : isDueCurrent ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">
                                      <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span>Due Soon</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">Upcoming</span>
                                  )}

                                  {scheduledPeriod?.paymentDate && (
                                    <span className="text-[9px] text-emerald-600/90 font-mono truncate">
                                      {scheduledPeriod.paymentDate.slice(5)}
                                    </span>
                                  )}
                                </div>

                                {/* Partially Paid breakdown showing remaining amount left to pay */}
                                {isPartiallyPaid && (
                                  <div className="text-[9px] text-amber-900 font-medium font-mono pt-0.5 border-t border-amber-200/50 flex flex-col">
                                    <span>Paid: {formatPHP(paidAmount)}</span>
                                    <span className="font-bold text-amber-800">
                                      Remaining: {formatPHP(remainingAmount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Non-Monthly Billing Cycle (Daily / Yearly fallback schedule view) */}
                    {selectedDetailBill.billingCycle !== 'Monthly' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                        {detailSchedule.map((period) => {
                          const isPaid = Boolean(period.paid && !period.partiallyPaid)
                          const isPartiallyPaid = Boolean(period.partiallyPaid)
                          const isOverdue =
                            !isPaid && !isPartiallyPaid && !period.isFuture && (period.periodDate || '') < todayStr
                          return (
                            <div
                              key={period.key}
                              className={cn(
                                'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between select-none',
                                isPaid
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : isPartiallyPaid
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : isOverdue
                                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                                  : 'border-slate-200 bg-white text-slate-600'
                              )}
                            >
                              <div className="font-bold text-xs truncate">{period.label}</div>
                              <div className="text-[10px] mt-1 flex items-center gap-1">
                                {isPaid ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="font-semibold">Paid</span>
                                  </>
                                ) : isPartiallyPaid ? (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span className="font-semibold">Partially Paid</span>
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span className="font-semibold">Overdue</span>
                                  </>
                                ) : (
                                  <span>Upcoming</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* PAYMENT HISTORY (Embedded in Bill Details with Pagination) */}
              {(() => {
                const HISTORY_PAGE_SIZE = 5
                const payments = selectedDetailBill.payments || []
                const totalHistoryPages = Math.ceil(payments.length / HISTORY_PAGE_SIZE) || 1
                const paginatedPayments = payments.slice(
                  (detailHistoryPage - 1) * HISTORY_PAGE_SIZE,
                  detailHistoryPage * HISTORY_PAGE_SIZE
                )

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 mt-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#960C01]" />
                        <span className="text-xs font-bold text-focus uppercase tracking-wider">
                          Payment History
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                          {payments.length} Record{payments.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      {totalHistoryPages > 1 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-fg">
                          <span className="text-[11px] font-medium mr-1">
                            Page {detailHistoryPage} of {totalHistoryPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={detailHistoryPage <= 1}
                            onClick={() => setDetailHistoryPage((p) => Math.max(1, p - 1))}
                            className="h-7 w-7 p-0 rounded-lg bg-white border-slate-200 hover:bg-slate-100"
                            title="Previous history page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={detailHistoryPage >= totalHistoryPages}
                            onClick={() =>
                              setDetailHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                            }
                            className="h-7 w-7 p-0 rounded-lg bg-white border-slate-200 hover:bg-slate-100"
                            title="Next history page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {paginatedPayments.length > 0 ? (
                      <div className="space-y-2">
                        {paginatedPayments.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-semibold text-focus">
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-[#960C01]">
                                  {p.periodKey ? `Period ${p.periodKey}` : 'Billing Period'}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-muted-fg font-normal">{p.paymentDate}</span>
                              </span>
                              <span className="text-emerald-700 font-bold tabular-nums text-sm">
                                {formatPHP(p.amount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-fg">
                              <span>
                                Method: <strong className="text-focus font-medium">{p.paymentMethod}</strong>
                              </span>
                              {p.refNo && (
                                <span className="font-mono">
                                  Ref: <strong className="text-focus font-semibold">{p.refNo}</strong>
                                </span>
                              )}
                            </div>
                            {p.notes && (
                              <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {p.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-muted-fg">
                        <p className="font-semibold text-focus">No payment history records yet</p>
                        <p className="text-[11px] text-muted-fg mt-0.5">
                          Payments recorded through "Pay Bill" will be logged here.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Action Buttons: Close and Pay Bill */}
              <div className="pt-4 border-t border-stroke/20 flex items-center justify-end gap-2.5 mt-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedDetailBill(null)}
                  className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
                >
                  Close
                </Button>

                {!isAudit && (
                  <Button
                    type="button"
                    onClick={() => {
                      const billToPay = selectedDetailBill
                      setSelectedDetailBill(null)
                      setPaymentBill(billToPay)
                    }}
                    className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Bill</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
