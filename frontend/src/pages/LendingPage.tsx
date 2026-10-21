import * as React from 'react'
import { createPortal } from 'react-dom'
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
  CreditCard,
  AlertCircle,
  Pencil,
  Trash2,
  Coins,
  MoreVertical,
  Eye,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useCompany } from '@/context/CompanyContext'
import { useSession } from '@/hooks/useSession'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { formatPHP } from '@/lib/format'
import { isDateInRange, formatToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

// Data model for daily payment transactions
export interface DailyPaymentRecord {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  method: string // Cash | GCash | Bank Transfer | Cheque | N/A
  referenceNo?: string
  notes?: string
  status?: 'Paid' | 'Missed'
  missedReason?: string
  timestamp: string
}

// Data model for lending facilities matching required columns & fields
export interface LendingFacility {
  id: string
  loanId: string // "Loan ID"
  borrowerName: string // "Borrower's Name"
  loanAmount: number // "Loan Amount"
  interestRate: number // "Interest Rate" (%)
  dateBorrowed: string // "Date Borrowed" (YYYY-MM-DD)
  dueDate: string // "Due Date" (YYYY-MM-DD)
  totalAmountPayable: number // "Total Amount Payable"
  amountPaid: number // "Amount Paid"
  remainingBalance: number // "Remaining Balance"
  status: 'Active' | 'Completed' | 'Overdue' | 'Pending' // "Status"
  lenderCompany: string
  notes?: string
  dailyPayments: DailyPaymentRecord[]
}

const STORAGE_KEY = 'mct_filcap_lending_facilities_v2'

// Initial seed data for FilCap Prime Holdings Corp. (and JK Property) with rich everyday payment records
const INITIAL_FACILITIES: LendingFacility[] = [
  {
    id: 'fac-fc-001',
    loanId: 'LN-FC-2026-001',
    borrowerName: 'Elena Morales (Morales Grocery Store)',
    loanAmount: 100000,
    interestRate: 5.0,
    dateBorrowed: '2026-10-01',
    dueDate: '2026-11-15',
    totalAmountPayable: 105000,
    amountPaid: 42000,
    remainingBalance: 63000,
    status: 'Active',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Micro-retail everyday working capital facility. Daily installment rate: ₱2,100.',
    dailyPayments: [
      { id: 'dp-1', date: '2026-10-02', amount: 2100, method: 'Cash', referenceNo: 'OR-88201', notes: 'Daily remittance', timestamp: '2026-10-02T10:00:00Z' },
      { id: 'dp-2', date: '2026-10-03', amount: 2100, method: 'Cash', referenceNo: 'OR-88220', notes: 'Daily remittance', timestamp: '2026-10-03T10:15:00Z' },
      { id: 'dp-3', date: '2026-10-04', amount: 2100, method: 'GCash', referenceNo: 'GC-99210', notes: 'E-wallet transfer', timestamp: '2026-10-04T11:00:00Z' },
      { id: 'dp-4', date: '2026-10-05', amount: 2100, method: 'Cash', referenceNo: 'OR-88255', notes: 'Daily remittance', timestamp: '2026-10-05T09:45:00Z' },
      { id: 'dp-5', date: '2026-10-06', amount: 2100, method: 'Cash', referenceNo: 'OR-88280', notes: 'Daily remittance', timestamp: '2026-10-06T10:30:00Z' },
      { id: 'dp-6', date: '2026-10-07', amount: 2100, method: 'Cash', referenceNo: 'OR-88301', notes: 'Daily remittance', timestamp: '2026-10-07T10:00:00Z' },
      { id: 'dp-7', date: '2026-10-08', amount: 2100, method: 'Cash', referenceNo: 'OR-88320', notes: 'Daily remittance', timestamp: '2026-10-08T10:15:00Z' },
      { id: 'dp-8', date: '2026-10-09', amount: 2100, method: 'GCash', referenceNo: 'GC-99340', notes: 'E-wallet transfer', timestamp: '2026-10-09T14:00:00Z' },
      { id: 'dp-9', date: '2026-10-10', amount: 2100, method: 'Cash', referenceNo: 'OR-88350', notes: 'Daily remittance', timestamp: '2026-10-10T10:00:00Z' },
      { id: 'dp-10', date: '2026-10-11', amount: 2100, method: 'Cash', referenceNo: 'OR-88370', notes: 'Daily remittance', timestamp: '2026-10-11T10:30:00Z' },
      { id: 'dp-11', date: '2026-10-12', amount: 2100, method: 'Cash', referenceNo: 'OR-88390', notes: 'Daily remittance', timestamp: '2026-10-12T09:30:00Z' },
      { id: 'dp-12', date: '2026-10-13', amount: 2100, method: 'GCash', referenceNo: 'GC-99410', notes: 'E-wallet transfer', timestamp: '2026-10-13T10:45:00Z' },
      { id: 'dp-13', date: '2026-10-14', amount: 0, method: 'N/A', referenceNo: 'MISSED', notes: 'Shop closed due to storm / flood (Unpaid)', status: 'Missed', missedReason: 'Shop closed due to storm', timestamp: '2026-10-14T10:00:00Z' },
      { id: 'dp-14', date: '2026-10-15', amount: 2100, method: 'Cash', referenceNo: 'OR-88440', notes: 'Daily remittance', timestamp: '2026-10-15T11:20:00Z' },
      { id: 'dp-15', date: '2026-10-16', amount: 2100, method: 'Cash', referenceNo: 'OR-88460', notes: 'Daily remittance', timestamp: '2026-10-16T10:10:00Z' },
      { id: 'dp-16', date: '2026-10-17', amount: 2100, method: 'Cash', referenceNo: 'OR-88480', notes: 'Daily remittance', timestamp: '2026-10-17T09:50:00Z' },
      { id: 'dp-17', date: '2026-10-18', amount: 2100, method: 'GCash', referenceNo: 'GC-99520', notes: 'E-wallet transfer', timestamp: '2026-10-18T10:00:00Z' },
      { id: 'dp-18', date: '2026-10-19', amount: 2100, method: 'Cash', referenceNo: 'OR-88510', notes: 'Daily remittance', timestamp: '2026-10-19T10:15:00Z' },
      { id: 'dp-19', date: '2026-10-20', amount: 2100, method: 'Cash', referenceNo: 'OR-88530', notes: 'Daily remittance', timestamp: '2026-10-20T10:00:00Z' },
      { id: 'dp-20', date: '2026-10-21', amount: 2100, method: 'Cash', referenceNo: 'OR-88550', notes: 'Today payment collected', timestamp: '2026-10-21T09:30:00Z' },
    ],
  },
  {
    id: 'fac-fc-002',
    loanId: 'LN-FC-2026-002',
    borrowerName: 'Roberto Sanchez (Sanchez Hardware Supplies)',
    loanAmount: 250000,
    interestRate: 4.0,
    dateBorrowed: '2026-09-15',
    dueDate: '2026-12-15',
    totalAmountPayable: 260000,
    amountPaid: 130000,
    remainingBalance: 130000,
    status: 'Active',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Warehouse construction inventory expansion. Everyday collection of ₱3,000.',
    dailyPayments: [
      { id: 'dp-s1', date: '2026-10-18', amount: 3000, method: 'Cash', referenceNo: 'OR-88102', notes: 'Daily remittance', timestamp: '2026-10-18T14:20:00Z' },
      { id: 'dp-s2', date: '2026-10-19', amount: 3000, method: 'Cash', referenceNo: 'OR-88125', notes: 'Daily remittance', timestamp: '2026-10-19T14:00:00Z' },
      { id: 'dp-s3', date: '2026-10-20', amount: 3000, method: 'Bank Transfer', referenceNo: 'BT-30911', notes: 'Online collection', timestamp: '2026-10-20T15:30:00Z' },
      { id: 'dp-s4', date: '2026-10-21', amount: 3000, method: 'Cash', referenceNo: 'OR-88160', notes: 'Today payment collected', timestamp: '2026-10-21T11:00:00Z' },
    ],
  },
  {
    id: 'fac-fc-003',
    loanId: 'LN-FC-2026-003',
    borrowerName: 'Maria Corazon Santos (Corazon Enterprises)',
    loanAmount: 80000,
    interestRate: 5.0,
    dateBorrowed: '2026-09-01',
    dueDate: '2026-10-15',
    totalAmountPayable: 84000,
    amountPaid: 84000,
    remainingBalance: 0,
    status: 'Completed',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Seasonal agricultural goods trade. Completed fully via everyday daily payments.',
    dailyPayments: [
      { id: 'dp-c1', date: '2026-10-14', amount: 2000, method: 'Cash', referenceNo: 'OR-87990', notes: 'Daily collection', timestamp: '2026-10-14T10:00:00Z' },
      { id: 'dp-c2', date: '2026-10-15', amount: 2000, method: 'Cash', referenceNo: 'OR-88001', notes: 'Final payment - Loan completed', timestamp: '2026-10-15T10:30:00Z' },
    ],
  },
  {
    id: 'fac-fc-004',
    loanId: 'LN-FC-2026-004',
    borrowerName: 'Dionisio Bautista (DB Auto Repair & Parts)',
    loanAmount: 150000,
    interestRate: 6.0,
    dateBorrowed: '2026-08-20',
    dueDate: '2026-10-10',
    totalAmountPayable: 159000,
    amountPaid: 95000,
    remainingBalance: 64000,
    status: 'Overdue',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Diagnostic machine tooling loan. Maturity passed on Oct 10; everyday collection ongoing.',
    dailyPayments: [
      { id: 'dp-d1', date: '2026-10-18', amount: 1500, method: 'Cash', referenceNo: 'OR-88090', notes: 'Partial catch-up payment', timestamp: '2026-10-18T16:00:00Z' },
      { id: 'dp-d2', date: '2026-10-20', amount: 1500, method: 'Cash', referenceNo: 'OR-88145', notes: 'Partial payment', timestamp: '2026-10-20T16:15:00Z' },
    ],
  },
  {
    id: 'fac-fc-005',
    loanId: 'LN-FC-2026-005',
    borrowerName: 'Carmelo Cruz (Cruz Agrivet Supply)',
    loanAmount: 300000,
    interestRate: 3.5,
    dateBorrowed: '2026-10-10',
    dueDate: '2027-01-10',
    totalAmountPayable: 310500,
    amountPaid: 31050,
    remainingBalance: 279450,
    status: 'Active',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Poultry feeds and veterinary supply line. Daily collection rate: ₱3,450.',
    dailyPayments: [
      { id: 'dp-cr1', date: '2026-10-19', amount: 3450, method: 'Bank Transfer', referenceNo: 'BT-9901', notes: 'Daily installment', timestamp: '2026-10-19T09:00:00Z' },
      { id: 'dp-cr2', date: '2026-10-20', amount: 3450, method: 'Bank Transfer', referenceNo: 'BT-9922', notes: 'Daily installment', timestamp: '2026-10-20T09:15:00Z' },
      { id: 'dp-cr3', date: '2026-10-21', amount: 3450, method: 'Cash', referenceNo: 'OR-88188', notes: 'Today payment collected', timestamp: '2026-10-21T09:30:00Z' },
    ],
  },
  {
    id: 'fac-fc-006',
    loanId: 'LN-FC-2026-006',
    borrowerName: 'Teresa Mendoza (Mendoza Meat & Poultry)',
    loanAmount: 60000,
    interestRate: 5.0,
    dateBorrowed: '2026-10-05',
    dueDate: '2026-11-20',
    totalAmountPayable: 63000,
    amountPaid: 21000,
    remainingBalance: 42000,
    status: 'Active',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Market stall refrigeration setup. Everyday cash collection ₱1,400.',
    dailyPayments: [
      { id: 'dp-m1', date: '2026-10-19', amount: 1400, method: 'Cash', referenceNo: 'OR-88095', notes: 'Market collection', timestamp: '2026-10-19T07:30:00Z' },
      { id: 'dp-m2', date: '2026-10-20', amount: 1400, method: 'Cash', referenceNo: 'OR-88118', notes: 'Market collection', timestamp: '2026-10-20T07:15:00Z' },
      { id: 'dp-m3', date: '2026-10-21', amount: 1400, method: 'Cash', referenceNo: 'OR-88150', notes: 'Today collection', timestamp: '2026-10-21T07:00:00Z' },
    ],
  },
  {
    id: 'fac-jk-001',
    loanId: 'LN-JK-2026-001',
    borrowerName: 'MCT Hotel Corp.',
    loanAmount: 500000,
    interestRate: 3.0,
    dateBorrowed: '2026-08-01',
    dueDate: '2026-12-31',
    totalAmountPayable: 515000,
    amountPaid: 250000,
    remainingBalance: 265000,
    status: 'Active',
    lenderCompany: 'JK Property and Ventures',
    notes: 'Guest room refurbishment bridging credit facility.',
    dailyPayments: [],
  },
]

// Period options matching Sales Page
const PERIOD_OPTIONS = ['Daily', 'Quarterly', 'Monthly', 'Annually'] as const
type PeriodType = (typeof PERIOD_OPTIONS)[number]

const LENDING_COMPANIES = [
  'FilCap Prime Holdings Corp.',
  'JK Property and Ventures',
  'All Lending Companies',
]

const ITEMS_PER_PAGE = 10

export const LendingPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const { activeCompany, setActiveCompany } = useCompany()

  // Set document title
  React.useEffect(() => {
    document.title = 'Lending - FilCap Prime Holdings Corp.'
  }, [])

  // Resolve lender company scope: defaults to FilCap Prime Holdings Corp.
  const [selectedCompany, setSelectedCompany] = React.useState<string>(() => {
    if (activeCompany && activeCompany.toLowerCase().includes('jk')) {
      return 'JK Property and Ventures'
    }
    return 'FilCap Prime Holdings Corp.'
  })

  // Synchronize when global company changes to a lending-enabled company
  React.useEffect(() => {
    if (activeCompany) {
      if (activeCompany.toLowerCase().includes('jk')) {
        setSelectedCompany('JK Property and Ventures')
      } else if (activeCompany.toLowerCase().includes('filcap') || activeCompany.toLowerCase().includes('filcam')) {
        setSelectedCompany('FilCap Prime Holdings Corp.')
      }
    }
  }, [activeCompany])

  // Persistent storage for facilities so updates remain live across interactions
  const [facilities, setFacilities] = React.useState<LendingFacility[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch (err) {
        console.error('Error loading stored lending facilities:', err)
      }
    }
    return INITIAL_FACILITIES
  })

  // Save to localStorage whenever facilities update
  const saveFacilities = React.useCallback((newFacilities: LendingFacility[]) => {
    setFacilities(newFacilities)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFacilities))
      } catch (err) {
        console.error('Error saving lending facilities:', err)
      }
    }
  }, [])

  // Filter toolbar state matching SalesPage
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'Last 30 Days',
    preset: 'Last 30 Days',
  })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Active' | 'Completed' | 'Overdue' | 'Pending'>('All')
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodType>('Monthly')

  // Dropdowns state matching SalesPage
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isDailyPaymentModalOpen, setIsDailyPaymentModalOpen] = React.useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  // 3-dots actions menu state
  const [openMenuFacilityId, setOpenMenuFacilityId] = React.useState<string | null>(null)
  const [activeMenuFacility, setActiveMenuFacility] = React.useState<LendingFacility | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{
    top: number
    right: number
    openUpward: boolean
  } | null>(null)

  // Facility focus targets
  const [activeFacility, setActiveFacility] = React.useState<LendingFacility | null>(null)
  const [highlightedFacilityId, setHighlightedFacilityId] = React.useState<string | null>(null)
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Form state for New Lending Facility Modal
  // Requirement 2 fields: Name, Due Date, Loan Amount, Interest Rate, Date Borrowed, Due Date
  const [formData, setFormData] = React.useState({
    borrowerName: '',
    loanAmount: '',
    interestRate: '5.0',
    dateBorrowed: '2026-10-21',
    dueDate: '2026-11-21',
    notes: '',
  })

  // Form state for Edit Lending Facility Modal
  const [editFormData, setEditFormData] = React.useState({
    borrowerName: '',
    loanAmount: '',
    interestRate: '',
    dateBorrowed: '',
    dueDate: '',
    status: 'Active' as LendingFacility['status'],
    notes: '',
  })

  // Form state for Everyday Daily Payment Modal ("Update" button)
  const [dailyPaymentForm, setDailyPaymentForm] = React.useState<{
    paymentAmount: string
    paymentDate: string
    method: string
    referenceNo: string
    notes: string
    paymentStatus: 'Paid' | 'Missed'
    missedReason: string
  }>({
    paymentAmount: '',
    paymentDate: '2026-10-21',
    method: 'Cash',
    referenceNo: '',
    notes: '',
    paymentStatus: 'Paid',
    missedReason: '',
  })

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)

  // Period change handler
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period)
    setIsPeriodDropdownOpen(false)
    const currentToday = formatToYYYYMMDD(new Date())
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

  // Click outside listener for dropdowns and 3-dots actions menu
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
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
      if (!target.closest('.lending-portal-menu') && !target.closest('.lending-action-btn')) {
        setOpenMenuFacilityId(null)
        setMenuPosition(null)
        setActiveMenuFacility(null)
      }
    }

    const handleWindowScroll = () => {
      if (openMenuFacilityId) {
        setOpenMenuFacilityId(null)
        setMenuPosition(null)
        setActiveMenuFacility(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleWindowScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleWindowScroll, true)
    }
  }, [openMenuFacilityId])

  // Clean highlight timer on unmount
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  // Filter facilities based on company, status, date range, and search query
  const filteredFacilities = React.useMemo(() => {
    return facilities.filter((item) => {
      // 1. Company filter
      if (selectedCompany !== 'All Lending Companies') {
        const matchesLender = item.lenderCompany.toLowerCase().includes(
          selectedCompany.toLowerCase().includes('jk') ? 'jk' : 'filcap'
        )
        if (!matchesLender) return false
      }

      // 2. Status filter
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false
      }

      // 3. Search query filter (Loan ID, Borrower Name, Notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesLoanId = item.loanId.toLowerCase().includes(q)
        const matchesBorrower = item.borrowerName.toLowerCase().includes(q)
        const matchesNotes = item.notes?.toLowerCase().includes(q) || false
        if (!matchesLoanId && !matchesBorrower && !matchesNotes) return false
      }

      // 4. Date Range filter (matches either dateBorrowed or dueDate)
      if (dateRange.startDate && dateRange.endDate) {
        const borrowedInRange = isDateInRange(item.dateBorrowed, dateRange.startDate, dateRange.endDate)
        const dueInRange = isDateInRange(item.dueDate, dateRange.startDate, dateRange.endDate)
        if (!borrowedInRange && !dueInRange) return false
      }

      return true
    })
  }, [facilities, selectedCompany, statusFilter, searchQuery, dateRange])

  // Summary Metrics for KPI cards
  const metrics = React.useMemo(() => {
    const totalLoanAmount = filteredFacilities.reduce((sum, f) => sum + f.loanAmount, 0)
    const totalPayable = filteredFacilities.reduce((sum, f) => sum + f.totalAmountPayable, 0)
    const totalAmountPaid = filteredFacilities.reduce((sum, f) => sum + f.amountPaid, 0)
    const totalRemainingBalance = filteredFacilities.reduce((sum, f) => sum + f.remainingBalance, 0)
    const activeCount = filteredFacilities.filter((f) => f.status === 'Active' || f.status === 'Overdue').length
    const repaidRate = totalPayable > 0 ? (totalAmountPaid / totalPayable) * 100 : 0

    return {
      totalLoanAmount,
      totalPayable,
      totalAmountPaid,
      totalRemainingBalance,
      activeCount,
      repaidRate,
    }
  }, [filteredFacilities])

  // Pagination calculations
  const totalPages = Math.ceil(filteredFacilities.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredFacilities.length)
  const paginatedFacilities = React.useMemo(() => {
    return filteredFacilities.slice(startIndex, endIndex)
  }, [filteredFacilities, startIndex, endIndex])

  // Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      'Loan ID',
      "Borrower's Name",
      'Lender Company',
      'Loan Amount',
      'Interest Rate (%)',
      'Date Borrowed',
      'Due Date',
      'Total Amount Payable',
      'Amount Paid',
      'Remaining Balance',
      'Status',
    ]

    const rows = filteredFacilities.map((f) => [
      f.loanId,
      `"${f.borrowerName.replace(/"/g, '""')}"`,
      `"${f.lenderCompany.replace(/"/g, '""')}"`,
      f.loanAmount,
      `${f.interestRate}%`,
      f.dateBorrowed,
      f.dueDate,
      f.totalAmountPayable,
      f.amountPaid,
      f.remainingBalance,
      f.status,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `lending_portfolio_${selectedCompany.replace(/\s+/g, '_')}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setIsExportDropdownOpen(false)
  }

  // Export PDF handler
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = filteredFacilities
      .map(
        (f) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${f.loanId}</td>
          <td>${f.borrowerName}</td>
          <td style="text-align: right;">${formatPHP(f.loanAmount)}</td>
          <td style="text-align: center;">${f.dateBorrowed}</td>
          <td style="text-align: center;">${f.dueDate}</td>
          <td style="text-align: right; font-weight: bold;">${formatPHP(f.totalAmountPayable)}</td>
          <td style="text-align: right; color: #059669; font-weight: 600;">${formatPHP(f.amountPaid)}</td>
          <td style="text-align: right; color: #d97706; font-weight: bold;">${formatPHP(f.remainingBalance)}</td>
          <td style="text-align: center;">${f.status}</td>
        </tr>
      `
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lending Portfolio - ${selectedCompany}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 20px; margin: 0 0 4px; font-weight: 700; color: #0f172a; }
            p { font-size: 12px; color: #64748b; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; }
            th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #475569; }
            .summary { margin-top: 20px; display: flex; gap: 24px; font-size: 12px; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>MCT Financial Management - Lending Module</h1>
          <p>Portfolio Summary for <strong>${selectedCompany}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower's Name</th>
                <th style="text-align: right;">Loan Amount</th>
                <th>Date Borrowed</th>
                <th>Due Date</th>
                <th style="text-align: right;">Total Payable</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Remaining Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Facilities:</strong> ${filteredFacilities.length}</div>
            <div><strong>Total Disbursed:</strong> ${formatPHP(metrics.totalLoanAmount)}</div>
            <div><strong>Total Payable:</strong> ${formatPHP(metrics.totalPayable)}</div>
            <div><strong>Total Collected:</strong> ${formatPHP(metrics.totalAmountPaid)}</div>
            <div><strong>Remaining Balance:</strong> ${formatPHP(metrics.totalRemainingBalance)}</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    setIsExportDropdownOpen(false)
  }

  // Create new Lending Facility handler (Requirement 2)
  const handleCreateFacility = (e: React.FormEvent) => {
    e.preventDefault()
    const principalNum = parseFloat(formData.loanAmount)
    const rateNum = parseFloat(formData.interestRate)

    if (!formData.borrowerName.trim()) {
      alert("Please provide the Borrower's Name.")
      return
    }
    if (isNaN(principalNum) || principalNum <= 0) {
      alert('Please enter a valid loan amount.')
      return
    }
    if (isNaN(rateNum) || rateNum < 0) {
      alert('Please enter a valid interest rate.')
      return
    }
    if (!formData.dateBorrowed || !formData.dueDate) {
      alert('Please specify both Date Borrowed and Due Date.')
      return
    }

    const totalInterest = principalNum * (rateNum / 100)
    const totalAmountPayable = principalNum + totalInterest
    const remainingBalance = totalAmountPayable

    // Generate unique Loan ID (e.g. LN-FC-2026-007)
    const companyPrefix = selectedCompany.toLowerCase().includes('jk') ? 'JK' : 'FC'
    const newFacilityNumber = String(facilities.length + 1).padStart(3, '0')
    const loanId = `LN-${companyPrefix}-2026-${newFacilityNumber}`

    const newFacility: LendingFacility = {
      id: `fac-${Date.now()}`,
      loanId,
      borrowerName: formData.borrowerName.trim(),
      loanAmount: principalNum,
      interestRate: rateNum,
      dateBorrowed: formData.dateBorrowed,
      dueDate: formData.dueDate,
      totalAmountPayable,
      amountPaid: 0,
      remainingBalance,
      status: 'Active',
      lenderCompany: selectedCompany === 'All Lending Companies' ? 'FilCap Prime Holdings Corp.' : selectedCompany,
      notes: formData.notes.trim() || 'Everyday micro-credit lending facility.',
      dailyPayments: [],
    }

    const updatedList = [newFacility, ...facilities]
    saveFacilities(updatedList)
    setIsAddModalOpen(false)

    // Reset form
    setFormData({
      borrowerName: '',
      loanAmount: '',
      interestRate: '5.0',
      dateBorrowed: '2026-10-21',
      dueDate: '2026-11-21',
      notes: '',
    })

    // Reset filters and highlight newly created item
    setSearchQuery('')
    setStatusFilter('All')
    setCurrentPage(1)
    setHighlightedFacilityId(newFacility.id)

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedFacilityId(null)
    }, 3000)

    setTimeout(() => {
      tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Open Edit Modal for a specific facility
  const handleOpenEditModal = (facility: LendingFacility, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveFacility(facility)
    setEditFormData({
      borrowerName: facility.borrowerName,
      loanAmount: String(facility.loanAmount),
      interestRate: String(facility.interestRate),
      dateBorrowed: facility.dateBorrowed,
      dueDate: facility.dueDate,
      status: facility.status,
      notes: facility.notes || '',
    })
    setIsEditModalOpen(true)
  }

  // Save changes from Edit Modal
  const handleSaveEditFacility = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeFacility) return

    const principalNum = parseFloat(editFormData.loanAmount)
    const rateNum = parseFloat(editFormData.interestRate)

    if (!editFormData.borrowerName.trim() || isNaN(principalNum) || principalNum <= 0) {
      alert('Please fill out all required fields with valid values.')
      return
    }

    const totalInterest = principalNum * (rateNum / 100)
    const newTotalPayable = principalNum + totalInterest
    const newRemaining = Math.max(0, newTotalPayable - activeFacility.amountPaid)
    const resolvedStatus = newRemaining <= 0 ? 'Completed' : editFormData.status

    const updated: LendingFacility = {
      ...activeFacility,
      borrowerName: editFormData.borrowerName.trim(),
      loanAmount: principalNum,
      interestRate: rateNum,
      dateBorrowed: editFormData.dateBorrowed,
      dueDate: editFormData.dueDate,
      totalAmountPayable: newTotalPayable,
      remainingBalance: newRemaining,
      status: resolvedStatus,
      notes: editFormData.notes.trim(),
    }

    const updatedList = facilities.map((f) => (f.id === activeFacility.id ? updated : f))
    saveFacilities(updatedList)
    setIsEditModalOpen(false)
    setActiveFacility(null)
  }

  // Open Everyday Daily Payment Modal ("Update" action button per Requirement 2)
  const handleOpenDailyPaymentModal = (facility: LendingFacility, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveFacility(facility)
    // Suggested daily amount: if total payable is spread across 30 days, or remaining balance
    const estimatedDaily = Math.min(
      facility.remainingBalance,
      Math.max(500, Math.round(facility.totalAmountPayable / 30))
    )
    setDailyPaymentForm({
      paymentAmount: String(estimatedDaily),
      paymentDate: formatToYYYYMMDD(new Date()),
      method: 'Cash',
      referenceNo: `OR-${Math.floor(88000 + Math.random() * 999)}`,
      notes: 'Everyday daily remittance collection',
      paymentStatus: 'Paid',
      missedReason: '',
    })
    setIsDailyPaymentModalOpen(true)
  }

  // Confirm Everyday Daily Payment or Missed Payment
  const handleRecordDailyPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeFacility) return

    // 1. Handling when tenant did NOT pay for the day
    if (dailyPaymentForm.paymentStatus === 'Missed') {
      const reasonText =
        dailyPaymentForm.missedReason.trim() ||
        dailyPaymentForm.notes.trim() ||
        'Tenant did not pay for this day (Unpaid)'

      const newPaymentRecord: DailyPaymentRecord = {
        id: `dp-${Date.now()}`,
        date: dailyPaymentForm.paymentDate,
        amount: 0,
        method: 'N/A',
        referenceNo: dailyPaymentForm.referenceNo.trim() || 'MISSED',
        notes: reasonText,
        status: 'Missed',
        missedReason: reasonText,
        timestamp: new Date().toISOString(),
      }

      const updatedFacility: LendingFacility = {
        ...activeFacility,
        dailyPayments: [newPaymentRecord, ...(activeFacility.dailyPayments || [])],
      }

      const updatedList = facilities.map((f) => (f.id === activeFacility.id ? updatedFacility : f))
      saveFacilities(updatedList)

      setActiveFacility(updatedFacility)
      setIsDailyPaymentModalOpen(false)
      return
    }

    // 2. Handling when tenant PAID today
    const paymentNum = parseFloat(dailyPaymentForm.paymentAmount)
    if (isNaN(paymentNum) || paymentNum <= 0) {
      alert(
        'Please enter a valid everyday payment amount greater than ₱0, or select "Missed / Did Not Pay" if the tenant did not pay today.'
      )
      return
    }

    if (paymentNum > activeFacility.remainingBalance) {
      alert(
        `Payment amount (${formatPHP(paymentNum)}) cannot exceed the remaining balance of ${formatPHP(activeFacility.remainingBalance)}.`
      )
      return
    }

    const updatedAmountPaid = activeFacility.amountPaid + paymentNum
    const updatedRemainingBalance = Math.max(0, activeFacility.totalAmountPayable - updatedAmountPaid)
    const updatedStatus: LendingFacility['status'] =
      updatedRemainingBalance <= 0 ? 'Completed' : activeFacility.status === 'Completed' ? 'Active' : activeFacility.status

    const newPaymentRecord: DailyPaymentRecord = {
      id: `dp-${Date.now()}`,
      date: dailyPaymentForm.paymentDate,
      amount: paymentNum,
      method: dailyPaymentForm.method,
      referenceNo: dailyPaymentForm.referenceNo.trim(),
      notes: dailyPaymentForm.notes.trim() || 'Daily payment remittance',
      status: 'Paid',
      timestamp: new Date().toISOString(),
    }

    const updatedFacility: LendingFacility = {
      ...activeFacility,
      amountPaid: updatedAmountPaid,
      remainingBalance: updatedRemainingBalance,
      status: updatedStatus,
      dailyPayments: [newPaymentRecord, ...(activeFacility.dailyPayments || [])],
    }

    const updatedList = facilities.map((f) => (f.id === activeFacility.id ? updatedFacility : f))
    saveFacilities(updatedList)

    // Keep active facility updated if complete detail modal is also open
    setActiveFacility(updatedFacility)
    setIsDailyPaymentModalOpen(false)
  }

  // Open Delete Confirmation
  const handleOpenDeleteModal = (facility: LendingFacility, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveFacility(facility)
    setIsDeleteConfirmOpen(true)
  }

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!activeFacility) return
    const updatedList = facilities.filter((f) => f.id !== activeFacility.id)
    saveFacilities(updatedList)
    setIsDeleteConfirmOpen(false)
    setActiveFacility(null)
  }

  // Open Complete Information Modal on row click (Requirement 3)
  const handleRowClick = (facility: LendingFacility) => {
    setActiveFacility(facility)
    setIsDetailModalOpen(true)
  }

  const displayedCompanyTitle =
    selectedCompany === 'All Lending Companies' ? 'All Inter-Company Lending' : selectedCompany

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Controls matching Sales Page */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Live Date/Time, Export & New Lending Facility) sitting on the right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />
            {/* Export Dropdown Button matching SalesPage */}
            <div ref={exportDropdownRef} className="relative inline-block">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-stroke/50 bg-white text-focus hover:bg-surface box-border"
                aria-haspopup="true"
                aria-expanded={isExportDropdownOpen}
              >
                <Download className="h-4 w-4 text-focus/70 shrink-0" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg ml-0.5" />
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

            {/* New Lending Facility Button (Red primary button per Sales Page aesthetic - hidden for Audit) */}
            {!isAudit && (
              <Button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Lending Facility</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right (level with Title & Subtitle) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Lending
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Here's the summary of lending facilities in {displayedCompanyTitle}
            </p>
          </div>

          {/* Filter Toolbar matching SalesPage layout */}
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
                  {(['All', 'Active', 'Completed', 'Overdue'] as const).map((st) => (
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
                          : st === 'Active'
                          ? 'Active Loans'
                          : st === 'Completed'
                          ? 'Completed'
                          : 'Overdue'}
                      </span>
                      {statusFilter === st && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={(newRange) => setDateRange(newRange)}
              hidePresets
            />

            {/* Company Scope Dropdown */}
            <div ref={companyDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
                aria-label="Filter lending by company"
              >
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90 truncate max-w-[160px]">
                  {selectedCompany}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="space-y-1">
                    {LENDING_COMPANIES.map((comp) => (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setSelectedCompany(comp)
                          if (comp !== 'All Lending Companies') {
                            setActiveCompany(comp)
                          }
                          setIsCompanyDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Total Capital Lent KPI Card (Single card matching Sales, Expense, and Loan pages) */}
      <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
        <div className="w-full max-w-[calc(100%-60px)]">
          <span className="text-xs font-semibold text-muted-fg block">
            Total Capital Lent
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-focus mt-1 tabular-nums tracking-tight">
            {formatPHP(metrics.totalLoanAmount)}
          </h3>
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5 truncate">
            Total capital disbursed across {filteredFacilities.length} facilities in {displayedCompanyTitle}
          </p>
        </div>
        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </Card>

      {/* 3. Main Table Card matching Sales Page */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Table Search Bar Toolbar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-5 flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-fg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Loan ID, Borrower's Name, or Notes…"
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

        {/* Table with Requirement 3 columns and Action Buttons */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[1100px]">
            <colgroup>
              <col style={{ width: '11%' }} /> {/* Loan ID */}
              <col style={{ width: '17%' }} /> {/* Borrower's Name */}
              <col style={{ width: '11%' }} /> {/* Loan Amount */}
              <col style={{ width: '10%' }} /> {/* Date Borrowed */}
              <col style={{ width: '10%' }} /> {/* Due Date */}
              <col style={{ width: '12%' }} /> {/* Total Amount Payable */}
              <col style={{ width: '11%' }} /> {/* Amount Paid */}
              <col style={{ width: '11%' }} /> {/* Remaining Balance */}
              <col style={{ width: '9%' }} />  {/* Status */}
              <col style={{ width: '8%' }} />  {/* Actions */}
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-stroke/30 hover:bg-transparent">
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  LOAN ID
                </TableHead>
                <TableHead className="w-[17%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  BORROWER'S NAME
                </TableHead>
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  LOAN AMOUNT
                </TableHead>
                <TableHead className="w-[10%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  DATE BORROWED
                </TableHead>
                <TableHead className="w-[10%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  DUE DATE
                </TableHead>
                <TableHead className="w-[12%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  TOTAL AMOUNT PAYABLE
                </TableHead>
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  AMOUNT PAID
                </TableHead>
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  REMAINING BALANCE
                </TableHead>
                <TableHead className="w-[9%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  STATUS
                </TableHead>
                <TableHead className="w-[8%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFacilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-fg">
                      <CreditCard className="h-8 w-8 text-muted-fg/40 mb-2" />
                      <p className="text-sm font-semibold">No lending facilities found</p>
                      <p className="text-xs text-muted-fg/70 mt-0.5">
                        Try adjusting your search, status, or date range filter, or click "New Lending Facility".
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFacilities.map((facility) => {
                  const statusColors = {
                    Active: 'bg-blue-50 text-blue-700 border-blue-200',
                    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
                  }[facility.status]

                  const isHighlighted = highlightedFacilityId === facility.id

                  return (
                    <TableRow
                      key={facility.id}
                      onClick={() => handleRowClick(facility)}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer group',
                        isHighlighted && 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      )}
                      title="Click row to view complete lending and borrower details"
                    >
                      {/* 1. Loan ID */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 font-mono text-xs font-bold text-focus text-left whitespace-nowrap">
                        {facility.loanId}
                      </TableCell>

                      {/* 2. Borrower's Name */}
                      <TableCell className="w-[17%] px-3.5 py-3.5 text-left">
                        <div className="font-semibold text-xs text-focus truncate max-w-[220px]" title={facility.borrowerName}>
                          {facility.borrowerName}
                        </div>
                        <div className="text-[10.5px] text-muted-fg truncate max-w-[220px]">
                          {facility.lenderCompany}
                        </div>
                      </TableCell>

                      {/* 3. Loan Amount */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-semibold text-xs text-focus tabular-nums whitespace-nowrap">
                        {formatPHP(facility.loanAmount)}
                      </TableCell>

                      {/* 4. Date Borrowed */}
                      <TableCell className="w-[10%] px-3.5 py-3.5 text-left font-mono text-xs text-muted-fg whitespace-nowrap">
                        {facility.dateBorrowed}
                      </TableCell>

                      {/* 5. Due Date */}
                      <TableCell className="w-[10%] px-3.5 py-3.5 text-left font-mono text-xs text-muted-fg whitespace-nowrap">
                        {facility.dueDate}
                      </TableCell>

                      {/* 6. Total Amount Payable */}
                      <TableCell className="w-[12%] px-3.5 py-3.5 text-left font-bold text-xs text-focus tabular-nums whitespace-nowrap">
                        {formatPHP(facility.totalAmountPayable)}
                      </TableCell>

                      {/* 7. Amount Paid */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-semibold text-xs text-emerald-600 tabular-nums whitespace-nowrap">
                        {formatPHP(facility.amountPaid)}
                      </TableCell>

                      {/* 8. Remaining Balance */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-bold text-xs text-amber-600 tabular-nums whitespace-nowrap">
                        {formatPHP(facility.remainingBalance)}
                      </TableCell>

                      {/* 9. Status */}
                      <TableCell className="w-[9%] px-3.5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider',
                            statusColors
                          )}
                        >
                          {facility.status}
                        </span>
                      </TableCell>

                      {/* 10. Actions: 3 dots dropdown (Edit, Delete, Update) */}
                      <TableCell className="w-[8%] px-3.5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuFacilityId === facility.id) {
                              setOpenMenuFacilityId(null)
                              setMenuPosition(null)
                              setActiveMenuFacility(null)
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const openUpward = rect.bottom + 140 > window.innerHeight
                              setMenuPosition({
                                top: openUpward ? rect.top - 6 : rect.bottom + 6,
                                right: Math.max(12, window.innerWidth - rect.right),
                                openUpward,
                              })
                              setActiveMenuFacility(facility)
                              setOpenMenuFacilityId(facility.id)
                            }
                          }}
                          className="lending-action-btn h-8 w-8 p-0 rounded-lg text-muted-fg hover:text-focus hover:bg-slate-100 cursor-pointer mx-auto flex items-center justify-center transition-colors"
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

        {/* 6. Pagination Footer (Matching Sales table reference: Showing X of Y and Page 1 out of 10) */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Left: Record summary */}
          <span className="font-medium text-focus/80">
            {filteredFacilities.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredFacilities.length} records`}
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
      </Card>

      {/* Floating 3-dots Action Menu Portal (rendered directly to body to prevent table overflow clipping) */}
      {openMenuFacilityId && activeMenuFacility && menuPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="lending-portal-menu fixed w-36 bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 z-[99999] animate-in fade-in-50 zoom-in-95 duration-150"
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
                  const fac = activeMenuFacility
                  setOpenMenuFacilityId(null)
                  setMenuPosition(null)
                  setActiveMenuFacility(null)
                  if (fac) {
                    handleRowClick(fac)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                <span>View Details</span>
              </button>
            ) : (
              <>
                {/* Update: Everyday payment */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const fac = activeMenuFacility
                    setOpenMenuFacilityId(null)
                    setMenuPosition(null)
                    setActiveMenuFacility(null)
                    if (fac) {
                      handleOpenDailyPaymentModal(fac, e)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Update</span>
                </button>

                {/* Edit: Facility details */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const fac = activeMenuFacility
                    setOpenMenuFacilityId(null)
                    setMenuPosition(null)
                    setActiveMenuFacility(null)
                    if (fac) {
                      handleOpenEditModal(fac, e)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Edit</span>
                </button>

                {/* Delete: Remove facility */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const fac = activeMenuFacility
                    setOpenMenuFacilityId(null)
                    setMenuPosition(null)
                    setActiveMenuFacility(null)
                    if (fac) {
                      handleOpenDeleteModal(fac, e)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      {/* 4. Modal: New Lending Facility (Requirement 2) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus">
              New Lending Facility
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Enter the borrower and loan details to disburse a new credit agreement for{' '}
              <strong className="text-focus">{selectedCompany}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFacility} className="space-y-4 mt-3">
            {/* Field 1: Name */}
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Name (Borrower's Name) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.borrowerName}
                onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                placeholder="e.g. Elena Morales (Morales Grocery Store)"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* Field 2 & 3: Loan Amount & Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Loan Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1000"
                  step="500"
                  value={formData.loanAmount}
                  onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                  placeholder="100000"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Interest Rate (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  placeholder="5.0"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Field 4 & 5: Date Borrowed & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Date Borrowed <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="date"
                  value={formData.dateBorrowed}
                  onChange={(e) => setFormData({ ...formData, dateBorrowed: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Dynamic Calculation Summary Box */}
            {formData.loanAmount && !isNaN(parseFloat(formData.loanAmount)) && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-fg">Total Interest ({formData.interestRate}%):</span>
                  <span className="font-semibold text-focus">
                    {formatPHP(parseFloat(formData.loanAmount) * (parseFloat(formData.interestRate || '0') / 100))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1">
                  <span className="font-bold text-focus">Total Amount Payable:</span>
                  <span className="font-bold text-emerald-600">
                    {formatPHP(
                      parseFloat(formData.loanAmount) +
                        parseFloat(formData.loanAmount) * (parseFloat(formData.interestRate || '0') / 100)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-muted-fg text-[11px] pt-0.5">
                  <span>Estimated Daily Installment (30 days):</span>
                  <span className="font-medium text-focus">
                    {formatPHP(
                      (parseFloat(formData.loanAmount) +
                        parseFloat(formData.loanAmount) * (parseFloat(formData.interestRate || '0') / 100)) /
                        30
                    )}{' '}
                    / day
                  </span>
                </div>
              </div>
            )}

            {/* Optional Facility Purpose / Notes */}
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Facility Purpose / Notes (Optional)
              </label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Everyday grocery inventory replenishment"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
              >
                Create Lending Facility
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal: Everyday Daily Payment ("Update" Action Button per Requirement 2) */}
      <Dialog open={isDailyPaymentModalOpen} onOpenChange={setIsDailyPaymentModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>Update Daily Payment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Record everyday remittance or missed payment for{' '}
              <strong className="text-focus">{activeFacility?.borrowerName}</strong> ({activeFacility?.loanId}).
            </DialogDescription>
          </DialogHeader>

          {activeFacility && (
            <form onSubmit={handleRecordDailyPayment} className="space-y-4 mt-2">
              {/* Financial Balance Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-fg">Remaining Balance:</span>
                  <span className="font-bold text-amber-600 text-sm">
                    {formatPHP(activeFacility.remainingBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-fg">Total Amount Paid so far:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatPHP(activeFacility.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-t border-slate-200/60 pt-1">
                  <span className="text-muted-fg">Total Amount Payable:</span>
                  <span className="font-medium text-focus">
                    {formatPHP(activeFacility.totalAmountPayable)}
                  </span>
                </div>
              </div>

              {/* Payment Status Segmented Control: Paid Today vs Missed / Did Not Pay */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1.5">
                  Collection Status for Today <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setDailyPaymentForm((prev) => ({
                        ...prev,
                        paymentStatus: 'Paid',
                        paymentAmount:
                          prev.paymentAmount && prev.paymentAmount !== '0'
                            ? prev.paymentAmount
                            : String(
                                Math.min(
                                  activeFacility.remainingBalance,
                                  Math.max(500, Math.round(activeFacility.totalAmountPayable / 30))
                                )
                              ),
                      }))
                    }
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      dailyPaymentForm.paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-focus hover:bg-slate-200/60'
                    )}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Paid Today</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDailyPaymentForm((prev) => ({
                        ...prev,
                        paymentStatus: 'Missed',
                        paymentAmount: '0',
                        method: 'N/A',
                        referenceNo: prev.referenceNo || 'MISSED',
                        missedReason: prev.missedReason || 'Shop / Stall Closed',
                      }))
                    }
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      dailyPaymentForm.paymentStatus === 'Missed'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-focus hover:bg-slate-200/60'
                    )}
                  >
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>Missed / Did Not Pay</span>
                  </button>
                </div>
              </div>

              {/* Conditional Content based on Payment Status */}
              {dailyPaymentForm.paymentStatus === 'Paid' ? (
                <>
                  {/* Payment Amount Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-focus">
                        Everyday Payment Amount (₱) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-muted-fg">
                        Max: {formatPHP(activeFacility.remainingBalance)}
                      </span>
                    </div>
                    <Input
                      required
                      type="number"
                      min="0.01"
                      step="any"
                      value={dailyPaymentForm.paymentAmount}
                      onChange={(e) =>
                        setDailyPaymentForm({ ...dailyPaymentForm, paymentAmount: e.target.value })
                      }
                      placeholder="e.g. 2100"
                      className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                    />

                    {/* Preset Quick Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[
                        Math.round(activeFacility.totalAmountPayable / 30),
                        1000,
                        2000,
                        activeFacility.remainingBalance,
                      ]
                        .filter(
                          (amt, idx, arr) =>
                            amt > 0 &&
                            amt <= activeFacility.remainingBalance &&
                            arr.indexOf(amt) === idx
                        )
                        .map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              setDailyPaymentForm({
                                ...dailyPaymentForm,
                                paymentAmount: String(preset),
                              })
                            }
                            className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-focus transition-colors cursor-pointer"
                          >
                            {preset === activeFacility.remainingBalance
                              ? 'Full Balance'
                              : formatPHP(preset)}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Payment Date & Method */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        type="date"
                        value={dailyPaymentForm.paymentDate}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, paymentDate: e.target.value })
                        }
                        className="h-10 text-xs sm:text-sm rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Payment Method
                      </label>
                      <select
                        value={dailyPaymentForm.method}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, method: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                      >
                        <option value="Cash">Cash</option>
                        <option value="GCash">GCash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  {/* Reference No & Notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Receipt / Ref No.
                      </label>
                      <Input
                        value={dailyPaymentForm.referenceNo}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, referenceNo: e.target.value })
                        }
                        placeholder="OR-88201"
                        className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Remarks / Notes
                      </label>
                      <Input
                        value={dailyPaymentForm.notes}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, notes: e.target.value })
                        }
                        placeholder="Daily collection"
                        className="h-10 text-xs sm:text-sm rounded-xl"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Missed / Did Not Pay State */}
                  <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl space-y-1.5 text-xs text-rose-900">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Tenant Did Not Pay Today (₱0.00 Collection)</span>
                    </div>
                    <p className="text-[11.5px] text-rose-700 leading-relaxed">
                      Logging a missed payment records an audit trail for this date without deducting the remaining balance.
                    </p>
                  </div>

                  {/* Missed Date & Reference */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Missed Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        type="date"
                        value={dailyPaymentForm.paymentDate}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, paymentDate: e.target.value })
                        }
                        className="h-10 text-xs sm:text-sm rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-focus block mb-1">
                        Audit Tracking No.
                      </label>
                      <Input
                        value={dailyPaymentForm.referenceNo}
                        onChange={(e) =>
                          setDailyPaymentForm({ ...dailyPaymentForm, referenceNo: e.target.value })
                        }
                        placeholder="MISSED"
                        className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Preset Reasons for Missed Payment */}
                  <div>
                    <label className="text-xs font-semibold text-focus block mb-1">
                      Reason for Missed Payment <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Shop / Stall Closed',
                        'Requested Extension',
                        'Delayed Remittance',
                        'Tenant Out of Town',
                        'Emergency / Weather',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setDailyPaymentForm((prev) => ({
                              ...prev,
                              missedReason: preset,
                              notes: preset,
                            }))
                          }
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-colors cursor-pointer border',
                            dailyPaymentForm.missedReason === preset
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-focus border-transparent'
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Input
                      required
                      value={dailyPaymentForm.missedReason}
                      onChange={(e) =>
                        setDailyPaymentForm({
                          ...dailyPaymentForm,
                          missedReason: e.target.value,
                          notes: e.target.value,
                        })
                      }
                      placeholder="e.g. Shop closed due to heavy rain / store maintenance"
                      className="h-10 text-xs sm:text-sm rounded-xl"
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDailyPaymentModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    'h-10 px-5 rounded-xl text-xs font-semibold text-white cursor-pointer transition-colors',
                    dailyPaymentForm.paymentStatus === 'Missed'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  {dailyPaymentForm.paymentStatus === 'Missed'
                    ? 'Log Missed Payment (₱0)'
                    : 'Confirm Daily Payment'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Modal: Edit Facility Details */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus">
              Edit Lending Facility
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Update terms and facility records for{' '}
              <strong className="text-focus">{activeFacility?.loanId}</strong>.
            </DialogDescription>
          </DialogHeader>

          {activeFacility && (
            <form onSubmit={handleSaveEditFacility} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Borrower's Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editFormData.borrowerName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, borrowerName: e.target.value })
                  }
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Loan Amount (₱) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1000"
                    step="500"
                    value={editFormData.loanAmount}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, loanAmount: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Interest Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    value={editFormData.interestRate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, interestRate: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Date Borrowed <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="date"
                    value={editFormData.dateBorrowed}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dateBorrowed: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dueDate: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      status: e.target.value as LendingFacility['status'],
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Notes
                </label>
                <Input
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Modal: Delete Facility Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>Delete Lending Facility</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg mt-1">
              Are you sure you want to delete lending agreement{' '}
              <strong className="text-focus">{activeFacility?.loanId}</strong> for{' '}
              <strong className="text-focus">{activeFacility?.borrowerName}</strong>? This action will remove all recorded daily payment history and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Delete Facility
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. Modal: Complete Facility Information on Row Click (Requirement 3) */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          {activeFacility && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <div className="flex items-center gap-2.5">
                    <DialogTitle className="text-xl font-bold text-focus">
                      {activeFacility.loanId}
                    </DialogTitle>
                    <span
                      className={cn(
                        'inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider',
                        {
                          Active: 'bg-blue-50 text-blue-700 border-blue-200',
                          Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                          Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
                        }[activeFacility.status]
                      )}
                    >
                      {activeFacility.status}
                    </span>
                  </div>
                </div>
                <DialogDescription className="text-xs text-muted-fg mt-1">
                  Complete lending agreement & everyday payment information for{' '}
                  <strong className="text-focus">{activeFacility.borrowerName}</strong>
                </DialogDescription>
              </DialogHeader>

              {/* Requirement 3: Complete Information Grid */}
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  {/* Loan ID */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Loan ID
                    </span>
                    <span className="font-mono text-sm font-bold text-focus">
                      {activeFacility.loanId}
                    </span>
                  </div>

                  {/* Borrower's Name */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Borrower's Name
                    </span>
                    <span className="text-sm font-bold text-focus">
                      {activeFacility.borrowerName}
                    </span>
                  </div>

                  {/* Loan Amount */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Loan Amount
                    </span>
                    <span className="text-sm font-bold text-focus">
                      {formatPHP(activeFacility.loanAmount)}
                    </span>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Interest Rate
                    </span>
                    <span className="text-sm font-bold text-focus">
                      {activeFacility.interestRate}% ({formatPHP(activeFacility.totalAmountPayable - activeFacility.loanAmount)})
                    </span>
                  </div>

                  {/* Date Borrowed */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Date Borrowed
                    </span>
                    <span className="font-mono text-xs font-semibold text-focus">
                      {activeFacility.dateBorrowed}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Due Date
                    </span>
                    <span className="font-mono text-xs font-semibold text-focus">
                      {activeFacility.dueDate}
                    </span>
                  </div>

                  {/* Total Amount Payable */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Total Amount Payable
                    </span>
                    <span className="text-base font-extrabold text-focus">
                      {formatPHP(activeFacility.totalAmountPayable)}
                    </span>
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                      Amount Paid
                    </span>
                    <span className="text-base font-extrabold text-emerald-600">
                      {formatPHP(activeFacility.amountPaid)}
                    </span>
                  </div>

                  {/* Remaining Balance */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                        Remaining Balance
                      </span>
                      <span className="text-lg font-black text-amber-600">
                        {formatPHP(activeFacility.remainingBalance)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
                        Collection Progress
                      </span>
                      <span className="text-sm font-bold text-focus">
                        {activeFacility.totalAmountPayable > 0
                          ? ((activeFacility.amountPaid / activeFacility.totalAmountPayable) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        activeFacility.totalAmountPayable > 0
                          ? (activeFacility.amountPaid / activeFacility.totalAmountPayable) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>

                {/* Notes & Purpose */}
                {activeFacility.notes && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-muted-fg">
                    <strong className="text-focus font-semibold block mb-0.5">Facility Notes:</strong>
                    {activeFacility.notes}
                  </div>
                )}

                {/* Everyday Daily Payment History Log */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-focus flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-600" />
                      <span>Everyday Payment History ({activeFacility.dailyPayments?.length || 0})</span>
                    </h4>

                    {activeFacility.remainingBalance > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          setIsDetailModalOpen(false)
                          handleOpenDailyPaymentModal(activeFacility, e)
                        }}
                        className="h-7 px-2.5 text-[11px] font-semibold bg-[#960C01] hover:bg-[#800a01] text-white rounded-lg cursor-pointer"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Record Daily Payment
                      </Button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-muted-fg font-semibold">
                        <tr>
                          <th className="py-2 px-3 text-left">Date</th>
                          <th className="py-2 px-3 text-left">Status</th>
                          <th className="py-2 px-3 text-left">Amount</th>
                          <th className="py-2 px-3 text-left">Method</th>
                          <th className="py-2 px-3 text-left">Reference</th>
                          <th className="py-2 px-3 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!activeFacility.dailyPayments || activeFacility.dailyPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-muted-fg text-xs">
                              No daily payments recorded yet. Click "Record Daily Payment" to collect.
                            </td>
                          </tr>
                        ) : (
                          activeFacility.dailyPayments.map((p) => {
                            const isMissed = p.status === 'Missed' || p.amount === 0
                            return (
                              <tr key={p.id} className={cn('hover:bg-slate-50/60', isMissed && 'bg-rose-50/30')}>
                                <td className="py-2 px-3 font-mono text-muted-fg whitespace-nowrap">{p.date}</td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {isMissed ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Missed
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Paid
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-3 font-bold whitespace-nowrap',
                                    isMissed ? 'text-rose-500 font-medium' : 'text-emerald-600'
                                  )}
                                >
                                  {formatPHP(p.amount)}
                                </td>
                                <td className="py-2 px-3 text-focus whitespace-nowrap">{p.method}</td>
                                <td className="py-2 px-3 font-mono text-muted-fg whitespace-nowrap">{p.referenceNo || '-'}</td>
                                <td className="py-2 px-3 text-muted-fg truncate max-w-[180px]" title={p.notes || '-'}>
                                  {p.notes || '-'}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Modal Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        setIsDetailModalOpen(false)
                        handleOpenEditModal(activeFacility, e)
                      }}
                      className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit Terms
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LendingPage
