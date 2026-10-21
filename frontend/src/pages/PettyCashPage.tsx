import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Wallet,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Check,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  MoreVertical,
  Eye,
  Pencil,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  TopUpPettyCashModal,
  CORPORATE_BANK_ACCOUNTS,
  type PettyCashTopUpRecord,
} from '@/components/dashboard/TopUpPettyCashModal'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { useSession } from '@/hooks/useSession'
import { useCompany } from '@/context/CompanyContext'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isDateInRange } from '@/utils/dateUtils'

export interface PettyCashTransaction {
  id: string
  recordId: number
  companyName: string
  date: string
  type: 'topup' | 'expense' | 'request'
  description: string
  category?: string
  referenceNo?: string
  bankSource?: string
  amountRequested: number
  amountIn: number
  amountOut: number
  runningBalance: number
  status: 'Approved' | 'Pending Finance Approval' | 'Rejected'
  requestedBy?: string
  approvedBy?: string
  approvedAt?: string
}

const STORAGE_KEY_LEDGER = 'mct_petty_cash_ledger_v3'
const STORAGE_KEY_BALANCES = 'mct_petty_cash_balances_v3'

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
  'FilCap Prime Holdings Corp.',
]

const INITIAL_COMPANY_BALANCES: Record<string, number> = {
  'MCT Kitchen': 25000,
  'MCT Hotel': 45000,
  'JK Cafe': 18000,
  'Annex Nine': 12000,
  'Merillon': 20000,
  'JK Printing': 14000,
  'Speedbox': 16000,
  'JK Property and Ventures': 35000,
  'Golden Sunburst Ventures': 22000,
  'FilCap Prime Holdings Corp.': 40000,
}

const INITIAL_LEDGER: PettyCashTransaction[] = [
  {
    id: 'pc-req-001',
    recordId: 101,
    companyName: 'MCT Kitchen',
    date: '2026-10-21',
    type: 'request',
    description: 'Weekly commissary petty cash buffer for perishable ingredients & local market trips',
    referenceNo: 'PC-REQ-2026-8812',
    bankSource: 'Bank Account (Finance Designated)',
    amountRequested: 15000,
    amountIn: 0, // Unapproved: not in IN column yet
    amountOut: 0,
    runningBalance: 25000,
    status: 'Pending Finance Approval',
    requestedBy: 'Supervisor (MCT Kitchen)',
  },
  {
    id: 'pc-topup-001',
    recordId: 102,
    companyName: 'MCT Kitchen',
    date: '2026-10-18',
    type: 'topup',
    description: 'Petty cash top up from BDO corporate checking for minor dining room consumables',
    referenceNo: 'PC-TOPUP-2026-004',
    bankSource: 'BDO Unibank (0012-3456-7890)',
    amountRequested: 20000,
    amountIn: 20000, // Approved: received into IN column
    amountOut: 0,
    runningBalance: 25000,
    status: 'Approved',
    requestedBy: 'Supervisor',
    approvedBy: 'Finance Officer',
    approvedAt: '2026-10-18T10:30:00Z',
  },
  {
    id: 'pc-exp-001',
    recordId: 103,
    companyName: 'MCT Kitchen',
    date: '2026-10-19',
    type: 'expense',
    description: 'Emergency culinary gas tank replacement and safety hose fitting',
    category: 'Repairs & Maintenance',
    referenceNo: 'OR-GAS-9912',
    bankSource: 'Petty Cash Fund',
    amountRequested: 0,
    amountIn: 0,
    amountOut: 3200,
    runningBalance: 21800,
    status: 'Approved',
    requestedBy: 'Kitchen Supervisor',
  },
  {
    id: 'pc-exp-002',
    recordId: 104,
    companyName: 'MCT Kitchen',
    date: '2026-10-20',
    type: 'expense',
    description: 'Printing of updated banquet menu flyers and laminated table signs',
    category: 'Marketing & Office Supplies',
    referenceNo: 'OR-PRT-4401',
    bankSource: 'Petty Cash Fund',
    amountRequested: 0,
    amountIn: 0,
    amountOut: 1850,
    runningBalance: 19950,
    status: 'Approved',
    requestedBy: 'Supervisor',
  },
  {
    id: 'pc-topup-002',
    recordId: 105,
    companyName: 'MCT Hotel',
    date: '2026-10-15',
    type: 'topup',
    description: 'Petty cash replenishment from BPI Commercial Operating for front desk cash float',
    referenceNo: 'PC-TOPUP-2026-003',
    bankSource: 'BPI (0987-6543-2100)',
    amountRequested: 30000,
    amountIn: 30000,
    amountOut: 0,
    runningBalance: 45000,
    status: 'Approved',
    requestedBy: 'Finance',
    approvedBy: 'Finance Manager',
    approvedAt: '2026-10-15T09:15:00Z',
  },
  {
    id: 'pc-exp-003',
    recordId: 106,
    companyName: 'MCT Hotel',
    date: '2026-10-17',
    type: 'expense',
    description: 'VIP guest lobby welcome basket supplies and fresh floral arrangement',
    category: 'Guest Hospitality',
    referenceNo: 'OR-HTL-1120',
    bankSource: 'Petty Cash Fund',
    amountRequested: 0,
    amountIn: 0,
    amountOut: 2450,
    runningBalance: 42550,
    status: 'Approved',
    requestedBy: 'Hotel Front Office',
  },
  {
    id: 'pc-topup-003',
    recordId: 107,
    companyName: 'JK Property and Ventures',
    date: '2026-10-14',
    type: 'topup',
    description: 'Replenishment from Metrobank Central Treasury for commercial building hardware repairs',
    referenceNo: 'PC-TOPUP-2026-002',
    bankSource: 'Metrobank (0554-1234-9876)',
    amountRequested: 25000,
    amountIn: 25000,
    amountOut: 0,
    runningBalance: 35000,
    status: 'Approved',
    requestedBy: 'Property Supervisor',
    approvedBy: 'Finance Officer',
    approvedAt: '2026-10-14T14:00:00Z',
  },
  {
    id: 'pc-topup-004',
    recordId: 108,
    companyName: 'FilCap Prime Holdings Corp.',
    date: '2026-10-12',
    type: 'topup',
    description: 'Petty cash fund replenishment from UnionBank Digital Treasury',
    referenceNo: 'PC-TOPUP-2026-001',
    bankSource: 'UnionBank (1029-3847-5610)',
    amountRequested: 20000,
    amountIn: 20000,
    amountOut: 0,
    runningBalance: 40000,
    status: 'Approved',
    requestedBy: 'Finance',
    approvedBy: 'Finance',
    approvedAt: '2026-10-12T11:00:00Z',
  },
]

const PERIOD_OPTIONS = ['Daily', 'Quarterly', 'Monthly', 'Annually'] as const
type PeriodType = (typeof PERIOD_OPTIONS)[number]

export const PettyCashPage: React.FC = () => {
  const { user } = useSession()
  const { activeCompany, setActiveCompany } = useCompany()

  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const isFinance = userRole === 'finance'
  const isSupervisor = userRole === 'supervisor'
  const isAdmin = userRole === 'admin'
  const isFinanceOrAdmin = isFinance || isAdmin
  const isCompanyScoped = isSupervisor || userRole === 'company'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Selected company filter
  const [selectedCompany, setSelectedCompany] = React.useState<string>(() => {
    if (isCompanyScoped && assignedCompany) return assignedCompany
    if (activeCompany && activeCompany !== 'All Companies') return activeCompany
    return 'All Companies'
  })

  // Synchronize with activeCompany
  React.useEffect(() => {
    if (activeCompany && activeCompany !== 'All Companies' && !isCompanyScoped) {
      setSelectedCompany(activeCompany)
    }
  }, [activeCompany, isCompanyScoped])

  // Company balances
  const [balances, setBalances] = React.useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BALANCES)
      if (stored) return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse petty cash balances from storage', e)
    }
    return INITIAL_COMPANY_BALANCES
  })

  // Ledger transactions
  const [ledger, setLedger] = React.useState<PettyCashTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LEDGER)
      if (stored) return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse petty cash ledger from storage', e)
    }
    return INITIAL_LEDGER
  })

  // Sync to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balances))
    } catch (e) {
      console.error('Failed to persist petty cash balances', e)
    }
  }, [balances])

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(ledger))
    } catch (e) {
      console.error('Failed to persist petty cash ledger', e)
    }
  }, [ledger])

  // Filters state matching One UI
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Approved' | 'Pending Finance Approval' | 'Expense'>('All')
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodType>('Monthly')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'Last 30 Days',
    preset: 'Last 30 Days',
  })

  // Dropdowns state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)

  // Modals state
  const [isTopUpModalOpen, setIsTopUpModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isFinanceApproveModalOpen, setIsFinanceApproveModalOpen] = React.useState(false)

  // Target entry for actions
  const [targetEntry, setTargetEntry] = React.useState<PettyCashTransaction | null>(null)
  const [editFormData, setEditFormData] = React.useState({
    amountRequested: '',
    date: '',
    description: '',
    referenceNo: '',
  })
  const [selectedDisbursementBank, setSelectedDisbursementBank] = React.useState(CORPORATE_BANK_ACCOUNTS[0].id)
  const [approvalFeedback, setApprovalFeedback] = React.useState<string | null>(null)

  // 3-dots floating menu state
  const [menuOpenEntryId, setMenuOpenEntryId] = React.useState<string | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
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
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpenEntryId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Current balance calculation
  const isAllCompanies = selectedCompany === 'All Companies'
  const currentBalance = React.useMemo(() => {
    if (isAllCompanies) {
      return Object.values(balances).reduce((sum, b) => sum + b, 0)
    }
    return balances[selectedCompany] || 0
  }, [balances, selectedCompany, isAllCompanies])

  // Filtered ledger records
  const filteredLedger = React.useMemo(() => {
    return ledger.filter((item) => {
      // 1. Company Filter
      if (!isAllCompanies) {
        if (item.companyName.toLowerCase() !== selectedCompany.toLowerCase()) {
          return false
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Approved' && item.status !== 'Approved') return false
        if (statusFilter === 'Pending Finance Approval' && item.status !== 'Pending Finance Approval') return false
        if (statusFilter === 'Expense' && item.type !== 'expense') return false
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesDesc = item.description.toLowerCase().includes(q)
        const matchesRef = item.referenceNo?.toLowerCase().includes(q) || false
        const matchesBank = item.bankSource?.toLowerCase().includes(q) || false
        const matchesComp = item.companyName.toLowerCase().includes(q)
        const matchesCat = item.category?.toLowerCase().includes(q) || false
        if (!matchesDesc && !matchesRef && !matchesBank && !matchesComp && !matchesCat) {
          return false
        }
      }

      // 4. Date Range Filter
      if (dateRange.startDate && dateRange.endDate) {
        if (!isDateInRange(item.date, dateRange.startDate, dateRange.endDate)) {
          return false
        }
      }

      return true
    })
  }, [ledger, isAllCompanies, selectedCompany, statusFilter, searchQuery, dateRange])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / itemsPerPage))
  const paginatedLedger = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLedger.slice(start, start + itemsPerPage)
  }, [filteredLedger, currentPage, itemsPerPage])

  // Open Row Summary Modal
  const handleOpenSummary = (entry: PettyCashTransaction) => {
    setTargetEntry(entry)
    setIsSummaryModalOpen(true)
    setMenuOpenEntryId(null)
  }

  // Open Edit Modal for pending request
  const handleOpenEdit = (entry: PettyCashTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setTargetEntry(entry)
    setEditFormData({
      amountRequested: String(entry.amountRequested || entry.amountIn || 0),
      date: entry.date,
      description: entry.description,
      referenceNo: entry.referenceNo || '',
    })
    setIsEditModalOpen(true)
    setMenuOpenEntryId(null)
  }

  // Open Delete Confirmation Modal
  const handleOpenDelete = (entry: PettyCashTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setTargetEntry(entry)
    setIsDeleteModalOpen(true)
    setMenuOpenEntryId(null)
  }

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!targetEntry) return
    setLedger((prev) => prev.filter((item) => item.id !== targetEntry.id))
    setIsDeleteModalOpen(false)
    setTargetEntry(null)
    setApprovalFeedback('Record successfully removed.')
    setTimeout(() => setApprovalFeedback(null), 4000)
  }

  // Open Finance Approval Modal (where Finance chooses/confirms bank account)
  const handleOpenFinanceApprove = (entry: PettyCashTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setTargetEntry(entry)
    setSelectedDisbursementBank(CORPORATE_BANK_ACCOUNTS[0].id)
    setIsFinanceApproveModalOpen(true)
    setMenuOpenEntryId(null)
  }

  // Finance confirms approval & bank disbursement
  const handleConfirmFinanceApproval = () => {
    if (!targetEntry) return

    const approvedBank = CORPORATE_BANK_ACCOUNTS.find((b) => b.id === selectedDisbursementBank) || CORPORATE_BANK_ACCOUNTS[0]
    const approvedAmount = targetEntry.amountRequested
    const targetComp = targetEntry.companyName
    const bankLabel = `${approvedBank.bankName} (${approvedBank.accountNumber})`

    // Update balances
    setBalances((prev) => {
      const current = prev[targetComp] || 0
      return {
        ...prev,
        [targetComp]: current + approvedAmount,
      }
    })

    // Update ledger entry: amountIn becomes the received amount, status becomes Approved
    setLedger((prev) =>
      prev.map((item) => {
        if (item.id === targetEntry.id) {
          return {
            ...item,
            status: 'Approved',
            type: 'topup',
            bankSource: bankLabel,
            amountIn: approvedAmount, // Now credited into IN column!
            runningBalance: (balances[targetComp] || 0) + approvedAmount,
            approvedBy: user?.fullName || user?.email || 'Finance Officer',
            approvedAt: new Date().toISOString(),
          }
        }
        return item
      })
    )

    setIsFinanceApproveModalOpen(false)
    setTargetEntry(null)
    setApprovalFeedback(
      `Approved: ${formatPHP(approvedAmount)} credited to ${targetComp}'s petty cash fund from ${bankLabel}.`
    )
    setTimeout(() => setApprovalFeedback(null), 5000)
  }

  // Decline Request
  const handleDeclineRequest = (entry: PettyCashTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Decline top-up request for ${formatPHP(entry.amountRequested)}?`)) return

    setLedger((prev) =>
      prev.map((item) => {
        if (item.id === entry.id) {
          return {
            ...item,
            status: 'Rejected',
          }
        }
        return item
      })
    )
    setMenuOpenEntryId(null)
  }

  // Save Edit Request
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetEntry) return

    const amt = parseFloat(editFormData.amountRequested)
    if (isNaN(amt) || amt < 1) return

    setLedger((prev) =>
      prev.map((item) => {
        if (item.id === targetEntry.id) {
          return {
            ...item,
            amountRequested: amt,
            date: editFormData.date,
            description: editFormData.description.trim(),
            referenceNo: editFormData.referenceNo.trim() || undefined,
          }
        }
        return item
      })
    )

    setIsEditModalOpen(false)
    setTargetEntry(null)
    setApprovalFeedback('Request details updated.')
    setTimeout(() => setApprovalFeedback(null), 4000)
  }

  // Handle new top up created from modal
  const handleTopUpSuccess = (newRecord: PettyCashTopUpRecord) => {
    if (newRecord.status === 'Approved') {
      setBalances((prev) => {
        const cur = prev[newRecord.companyName] || 0
        return {
          ...prev,
          [newRecord.companyName]: cur + newRecord.amountIn,
        }
      })
      setApprovalFeedback(
        `Top-up successful: ${formatPHP(newRecord.amountIn)} credited to ${newRecord.companyName} from ${newRecord.bankSource}.`
      )
    } else {
      setApprovalFeedback(
        `Top-up request for ${formatPHP(newRecord.amountRequested)} submitted. Awaiting Finance review and bank disbursement.`
      )
    }
    setTimeout(() => setApprovalFeedback(null), 5000)

    setLedger((prev) => [newRecord, ...prev])
  }

  // Export CSV
  const handleExportCsv = () => {
    setIsExportDropdownOpen(false)
    const headers = [
      'Date',
      'Company',
      'Particulars',
      'Bank / Source',
      'Reference No',
      'Amount Requested (PHP)',
      'Cash In (PHP)',
      'Cash Out (PHP)',
      'Running Balance (PHP)',
      'Status',
    ]

    const rows = filteredLedger.map((e) => [
      `"${e.date}"`,
      `"${e.companyName.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${(e.bankSource || '').replace(/"/g, '""')}"`,
      `"${e.referenceNo || ''}"`,
      e.amountRequested,
      e.amountIn,
      e.amountOut,
      e.runningBalance,
      `"${e.status}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Petty_Cash_${selectedCompany.replace(/\s+/g, '_')}_${dateRange.startDate}_to_${dateRange.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export PDF
  const handleExportPdf = () => {
    setIsExportDropdownOpen(false)
    window.print()
  }

  const displayedCompanyTitle = isAllCompanies ? 'All Subsidiaries' : selectedCompany
  const pendingCount = ledger.filter((l) => l.status === 'Pending Finance Approval').length

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Top Header Row matching Sales, Loan, Expense pages */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Date/Time, Export & Top Up from Sales Button) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />

            {/* Export Dropdown Button (White style) */}
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

            {/* Top Up from Sales Button (Hidden for Audit - Audit only views) */}
            {!isAudit && (
              <Button
                type="button"
                onClick={() => setIsTopUpModalOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Top Up from Sales</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
                Petty Cash
              </h1>
              {pendingCount > 0 && isFinanceOrAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  {pendingCount} Pending Approval
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Top up company&rsquo;s petty cash wallet from sales and corporate bank accounts
            </p>
          </div>

          {/* Filter Toolbar matching Sales, Loan, Expense layout */}
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
                      onClick={() => {
                        setSelectedPeriod(period)
                        setIsPeriodDropdownOpen(false)
                      }}
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

            {/* Status Filter Dropdown */}
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {[
                    { id: 'All', label: 'All Transactions' },
                    { id: 'Approved', label: 'Approved Top-Ups' },
                    { id: 'Pending Finance Approval', label: 'Pending Approval' },
                    { id: 'Expense', label: 'Expenses' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st.id as any)
                        setIsStatusDropdownOpen(false)
                        setCurrentPage(1)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        statusFilter === st.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span>{st.label}</span>
                      {statusFilter === st.id && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unified Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={(newRange) => {
                setDateRange(newRange)
                setCurrentPage(1)
              }}
              hidePresets
            />

            {/* Company Scope Dropdown / Pill */}
            {isCompanyScoped ? (
              <div className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs select-none">
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
                >
                  <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                  <span className="font-medium text-focus/90 truncate max-w-[140px]">
                    {selectedCompany}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-fg shrink-0 transition-transform duration-200',
                      isCompanyDropdownOpen && 'transform rotate-180'
                    )}
                  />
                </button>

                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-64 overflow-y-auto">
                    {COMPANY_LIST.map((comp) => (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setSelectedCompany(comp)
                          setActiveCompany(comp)
                          setIsCompanyDropdownOpen(false)
                          setCurrentPage(1)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                          selectedCompany === comp
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <span className="truncate">{comp}</span>
                        {selectedCompany === comp && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Feedback Banner */}
      {approvalFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{approvalFeedback}</span>
        </div>
      )}

      {/* 2. ONLY ONE KPI CARD: Current Balance of the Petty Cash (matching Sales, Loan, Expense pages) */}
      <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
        <div className="w-full max-w-[calc(100%-60px)]">
          <span className="text-xs font-semibold text-muted-fg block uppercase tracking-wider">
            Current Balance
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-focus mt-1 tabular-nums tracking-tight">
            {formatPHP(currentBalance)}
          </h3>
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5 truncate">
            Available petty cash reserve for minor operational disbursements • {displayedCompanyTitle}
          </p>
        </div>
        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </Card>

      {/* 3. Main Table Card matching Sales, Loan, Expense Page */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6">
        {/* Table Search Bar Toolbar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by particulars, reference no, category, bank account…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
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

        {/* Unified Table Structure with new Amount Requested column and Status before Actions */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[1100px]">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  DATE
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  COMPANY
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  PARTICULARS
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  SOURCE / REF
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  AMOUNT REQUESTED
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  IN (+)
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  OUT (-)
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-right">
                  RUNNING BALANCE
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  STATUS
                </TableHead>
                <TableHead className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-44 text-center text-muted-fg text-xs sm:text-sm">
                    <Wallet className="w-8 h-8 text-muted-fg/40 mx-auto mb-2" />
                    No petty cash transactions found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLedger.map((entry) => {
                  const isPending = entry.status === 'Pending Finance Approval'
                  const isApproved = entry.status === 'Approved'
                  const isRejected = entry.status === 'Rejected'

                  return (
                    <TableRow
                      key={entry.id}
                      onClick={() => handleOpenSummary(entry)}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* 1. Date */}
                      <TableCell className="px-3 py-3.5 text-xs text-muted-fg tabular-nums font-medium">
                        {entry.date}
                      </TableCell>

                      {/* 2. Company */}
                      <TableCell className="px-3 py-3.5">
                        <div className="font-semibold text-xs text-focus truncate group-hover:text-primary transition-colors" title={entry.companyName}>
                          {entry.companyName}
                        </div>
                      </TableCell>

                      {/* 3. Particulars */}
                      <TableCell className="px-3 py-3.5">
                        <div className="font-medium text-xs text-focus line-clamp-1" title={entry.description}>
                          {entry.description || '—'}
                        </div>
                        {entry.category && (
                          <div className="text-[11px] text-muted-fg line-clamp-1">
                            {entry.category}
                          </div>
                        )}
                      </TableCell>

                      {/* 4. Source / Ref */}
                      <TableCell className="px-3 py-3.5">
                        <div className="text-xs text-focus font-medium truncate" title={entry.bankSource || entry.referenceNo || '—'}>
                          {entry.bankSource || entry.referenceNo || '—'}
                        </div>
                        {entry.referenceNo && entry.bankSource && (
                          <div className="text-[11px] text-muted-fg font-mono truncate">
                            {entry.referenceNo}
                          </div>
                        )}
                      </TableCell>

                      {/* 5. Amount Requested (New Column) */}
                      <TableCell className="px-3 py-3.5 text-right font-semibold text-xs text-focus tabular-nums">
                        {entry.amountRequested > 0 ? formatPHP(entry.amountRequested) : '—'}
                      </TableCell>

                      {/* 6. In (+) Validation: If unapproved/pending, displays '—' */}
                      <TableCell className="px-3 py-3.5 text-right font-bold text-xs text-emerald-700 tabular-nums">
                        {isApproved && entry.amountIn > 0 ? formatPHP(entry.amountIn) : '—'}
                      </TableCell>

                      {/* 7. Out (-) */}
                      <TableCell className="px-3 py-3.5 text-right font-bold text-xs text-rose-600 tabular-nums">
                        {entry.amountOut > 0 ? formatPHP(entry.amountOut) : '—'}
                      </TableCell>

                      {/* 8. Running Balance */}
                      <TableCell className="px-3 py-3.5 text-right font-semibold text-xs text-focus tabular-nums">
                        {formatPHP(entry.runningBalance)}
                      </TableCell>

                      {/* 9. Status (Positioned before Actions column) */}
                      <TableCell className="px-3 py-3.5 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 whitespace-nowrap">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Pending Finance</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        ) : entry.type === 'expense' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Expense</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                      </TableCell>

                      {/* 10. Actions (3 Dots Dropdown Menu) */}
                      <TableCell
                        className="px-3 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setMenuPosition({
                              top: rect.bottom + window.scrollY + 4,
                              left: rect.right + window.scrollX - 170,
                            })
                            setMenuOpenEntryId(menuOpenEntryId === entry.id ? null : entry.id)
                            setTargetEntry(entry)
                          }}
                          className="p-1.5 rounded-lg text-muted-fg hover:text-focus hover:bg-slate-100 transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Toolbar matching Sales, Loan, Expense pages */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 text-xs text-muted-fg">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-7 px-2 rounded-lg border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              Showing {filteredLedger.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredLedger.length)} of {filteredLedger.length} records
            </span>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 border-stroke/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 border-stroke/60"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3-Dots Floating Menu Portal */}
      {menuOpenEntryId && menuPosition && targetEntry && (
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed w-44 bg-white rounded-xl border border-stroke/50 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* View Summary (Available to all, including Audit) */}
            <button
              type="button"
              onClick={() => handleOpenSummary(targetEntry)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-focus hover:bg-primary/5 hover:text-primary transition-colors text-left"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>View Summary</span>
            </button>

            {/* If Pending Approval & user is Finance / Admin: Approve or Decline */}
            {!isAudit && targetEntry.status === 'Pending Finance Approval' && isFinanceOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={(e) => handleOpenFinanceApprove(targetEntry, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left font-semibold"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approve Request</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeclineRequest(targetEntry, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors text-left"
                >
                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Decline Request</span>
                </button>
              </>
            )}

            {/* Edit (if pending approval and not audit) */}
            {!isAudit && targetEntry.status === 'Pending Finance Approval' && (
              <button
                type="button"
                onClick={(e) => handleOpenEdit(targetEntry, e)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-focus hover:bg-slate-50 transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-fg" />
                <span>Edit Request</span>
              </button>
            )}

            {/* Delete (with confirmation modal) - Not available to Audit */}
            {!isAudit && (
              <button
                type="button"
                onClick={(e) => handleOpenDelete(targetEntry, e)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Record</span>
              </button>
            )}
          </div>,
          document.body
        )
      )}

      {/* MODAL: Row Detail Summary on Row Click */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-stroke/20">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span>Petty Cash Transaction Summary</span>
              </DialogTitle>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                  targetEntry?.status === 'Approved' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  targetEntry?.status === 'Pending Finance Approval' && 'bg-amber-50 text-amber-700 border border-amber-200',
                  targetEntry?.status === 'Rejected' && 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {targetEntry?.status}
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-fg">
              Reference: {targetEntry?.referenceNo || 'None'} • {targetEntry?.companyName}
            </DialogDescription>
          </DialogHeader>

          {targetEntry && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-stroke/30 text-xs">
                <div>
                  <span className="text-[11px] text-muted-fg">Transaction Date</span>
                  <div className="font-semibold text-focus mt-0.5">{targetEntry.date}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Subsidiary / Company</span>
                  <div className="font-semibold text-focus mt-0.5">{targetEntry.companyName}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Amount Requested</span>
                  <div className="font-semibold text-focus mt-0.5">
                    {targetEntry.amountRequested > 0 ? formatPHP(targetEntry.amountRequested) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Cash In (Received)</span>
                  <div className="font-bold text-emerald-700 mt-0.5">
                    {targetEntry.status === 'Approved' && targetEntry.amountIn > 0 ? formatPHP(targetEntry.amountIn) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Cash Out (Spent)</span>
                  <div className="font-bold text-rose-600 mt-0.5">
                    {targetEntry.amountOut > 0 ? formatPHP(targetEntry.amountOut) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Running Balance</span>
                  <div className="font-bold text-focus mt-0.5">{formatPHP(targetEntry.runningBalance)}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-muted-fg">Bank Source / Account</span>
                  <div className="font-semibold text-focus mt-0.5">{targetEntry.bankSource || '—'}</div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-semibold text-focus">Particulars / Description</span>
                <p className="p-3 rounded-xl bg-surface border border-stroke/40 text-muted-fg leading-relaxed">
                  {targetEntry.description}
                </p>
              </div>

              {targetEntry.requestedBy && (
                <div className="flex items-center justify-between text-xs text-muted-fg px-1">
                  <span>Requested By: <strong className="text-focus">{targetEntry.requestedBy}</strong></span>
                  {targetEntry.approvedBy && (
                    <span>Approved By: <strong className="text-emerald-700">{targetEntry.approvedBy}</strong></span>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-stroke/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="h-9 text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Delete Petty Cash Record</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg pt-1">
              Are you sure you want to delete this record for{' '}
              <strong className="text-focus">{targetEntry?.companyName}</strong> dated{' '}
              <strong className="text-focus">{targetEntry?.date}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-slate-50 border border-stroke/30 text-xs space-y-1">
            <div className="text-muted-fg font-medium">{targetEntry?.description}</div>
            <div className="font-bold text-focus">
              Amount: {formatPHP(targetEntry?.amountRequested || targetEntry?.amountIn || targetEntry?.amountOut || 0)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Pending Request */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-stroke/20">
            <DialogTitle className="text-lg font-bold text-focus">
              Edit Top Up Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Modify unreviewed top-up request details before Finance approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">Requested Amount (₱)</Label>
              <Input
                type="number"
                min="1"
                step="any"
                value={editFormData.amountRequested}
                onChange={(e) => setEditFormData({ ...editFormData, amountRequested: e.target.value })}
                className="h-9 text-xs font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">Request Date</Label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">Particulars / Description</Label>
              <Input
                type="text"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">Reference No.</Label>
              <Input
                type="text"
                value={editFormData.referenceNo}
                onChange={(e) => setEditFormData({ ...editFormData, referenceNo: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stroke/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Finance Approval & Bank Designation */}
      <Dialog open={isFinanceApproveModalOpen} onOpenChange={setIsFinanceApproveModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-stroke/20">
            <DialogTitle className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Approve & Disburse from Bank</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Designate corporate bank account to disburse funds to{' '}
              <strong className="text-focus">{targetEntry?.companyName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-stroke/30 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-fg">Requested Amount:</span>
              <span className="font-bold text-focus">{formatPHP(targetEntry?.amountRequested || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Requested By:</span>
              <span className="font-medium text-focus">{targetEntry?.requestedBy || 'Supervisor'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Particulars:</span>
              <span className="font-medium text-focus truncate max-w-[280px]">{targetEntry?.description}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-focus block">
              Disburse from Corporate Bank Account <span className="text-red-500">*</span>
            </Label>
            <select
              value={selectedDisbursementBank}
              onChange={(e) => setSelectedDisbursementBank(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {CORPORATE_BANK_ACCOUNTS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} — {b.accountNumber} ({b.type})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-fg">
              Upon approval, this amount will immediately credit to {targetEntry?.companyName}&rsquo;s petty cash fund and reflect in IN (+).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFinanceApproveModalOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmFinanceApproval}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Confirm Disbursement & Credit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Up from Sales / Bank Modal */}
      <TopUpPettyCashModal
        open={isTopUpModalOpen}
        onOpenChange={setIsTopUpModalOpen}
        company={selectedCompany === 'All Companies' ? (user?.assignedCompany || 'MCT Kitchen') : selectedCompany}
        currentBalance={currentBalance}
        companies={COMPANY_LIST}
        onSuccess={handleTopUpSuccess}
      />
    </div>
  )
}
