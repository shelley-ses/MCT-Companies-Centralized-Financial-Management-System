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
  Check,
  FileSpreadsheet,
  FileText,
  CreditCard,
  AlertCircle,
  Pencil,
  Trash2,
  MoreVertical,
  Store,
  Ban,
  CheckCircle2,
  Eye,
  Building2,
  Calendar,
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
import { formatPHP } from '@/lib/format'
import { isDateInRange, formatToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

// Data model for daily rent collections
export interface DailyRentRecord {
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

// Data model for JK Property and Ventures tenants
export interface TenantLease {
  id: string
  tenantId: string // "Tenant ID"
  tenantName: string // "Tenant's Name"
  unitName: string // "Leased Unit / Stall"
  rentAmount: number // "Rental Rate"
  contractDate: string // "Date Contracted"
  dueDate: string // "Due Date"
  totalAmountPayable: number // "Total Amount Payable"
  amountPaid: number // "Amount Paid"
  remainingBalance: number // "Remaining Balance"
  status: 'Active' | 'Completed' | 'Overdue' | 'Pending' // "Status"
  companyName: string
  notes?: string
  dailyPayments: DailyRentRecord[]
  auditStatus?: 'Verified' | 'Flagged'
  auditDate?: string
  auditedBy?: string
}

const STORAGE_KEY = 'mct_jk_tenants_leases_v1'

const PERIOD_OPTIONS = ['Daily', 'Quarterly', 'Monthly', 'Annually'] as const
type PeriodType = (typeof PERIOD_OPTIONS)[number]

const ITEMS_PER_PAGE = 10

const INITIAL_TENANTS: TenantLease[] = [
  {
    id: 'tnt-jk-001',
    tenantId: 'TNT-JK-2026-001',
    tenantName: 'Maria Santos (Santos Refreshments & Bakery)',
    unitName: 'Stall 12 - Ground Floor Food Hall',
    rentAmount: 30000,
    contractDate: '2026-10-01',
    dueDate: '2026-11-15',
    totalAmountPayable: 35000,
    amountPaid: 16000,
    remainingBalance: 19000,
    status: 'Active',
    companyName: 'JK Property and Ventures',
    notes: 'Commercial stall lease. Daily rent remittance target: ₱1,000.',
    dailyPayments: [
      { id: 'dp-1', date: '2026-10-02', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-101', notes: 'Daily rent collected', timestamp: '2026-10-02T10:00:00Z' },
      { id: 'dp-2', date: '2026-10-03', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-102', notes: 'Daily rent collected', timestamp: '2026-10-03T10:15:00Z' },
      { id: 'dp-3', date: '2026-10-04', amount: 1000, method: 'GCash', referenceNo: 'GC-JK-881', notes: 'E-wallet remittance', timestamp: '2026-10-04T11:00:00Z' },
      { id: 'dp-4', date: '2026-10-05', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-105', notes: 'Daily rent collected', timestamp: '2026-10-05T09:45:00Z' },
      { id: 'dp-5', date: '2026-10-06', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-108', notes: 'Daily rent collected', timestamp: '2026-10-06T10:30:00Z' },
      { id: 'dp-6', date: '2026-10-07', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-111', notes: 'Daily rent collected', timestamp: '2026-10-07T10:00:00Z' },
      { id: 'dp-7', date: '2026-10-08', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-114', notes: 'Daily rent collected', timestamp: '2026-10-08T10:15:00Z' },
      { id: 'dp-8', date: '2026-10-09', amount: 1000, method: 'GCash', referenceNo: 'GC-JK-892', notes: 'E-wallet remittance', timestamp: '2026-10-09T14:00:00Z' },
      { id: 'dp-9', date: '2026-10-10', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-118', notes: 'Daily rent collected', timestamp: '2026-10-10T10:00:00Z' },
      { id: 'dp-10', date: '2026-10-11', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-121', notes: 'Daily rent collected', timestamp: '2026-10-11T10:30:00Z' },
      { id: 'dp-11', date: '2026-10-12', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-125', notes: 'Daily rent collected', timestamp: '2026-10-12T09:30:00Z' },
      { id: 'dp-12', date: '2026-10-13', amount: 1000, method: 'GCash', referenceNo: 'GC-JK-904', notes: 'E-wallet remittance', timestamp: '2026-10-13T10:45:00Z' },
      { id: 'dp-13', date: '2026-10-14', amount: 0, method: 'N/A', referenceNo: 'MISSED', notes: 'Stall closed due to heavy rain (Unpaid)', status: 'Missed', missedReason: 'Stall closed due to typhoon/weather', timestamp: '2026-10-14T10:00:00Z' },
      { id: 'dp-14', date: '2026-10-15', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-129', notes: 'Daily rent collected', timestamp: '2026-10-15T11:20:00Z' },
      { id: 'dp-15', date: '2026-10-16', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-133', notes: 'Daily rent collected', timestamp: '2026-10-16T10:10:00Z' },
      { id: 'dp-16', date: '2026-10-17', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-137', notes: 'Daily rent collected', timestamp: '2026-10-17T09:50:00Z' },
      { id: 'dp-17', date: '2026-10-18', amount: 1000, method: 'GCash', referenceNo: 'GC-JK-915', notes: 'E-wallet remittance', timestamp: '2026-10-18T10:00:00Z' },
      { id: 'dp-18', date: '2026-10-19', amount: 0, method: 'N/A', referenceNo: 'MISSED', notes: 'Family emergency / stall closed', status: 'Missed', missedReason: 'Family emergency / stall closed', timestamp: '2026-10-19T10:00:00Z' },
      { id: 'dp-19', date: '2026-10-20', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-141', notes: 'Daily rent collected', timestamp: '2026-10-20T10:00:00Z' },
      { id: 'dp-20', date: '2026-10-21', amount: 1000, method: 'Cash', referenceNo: 'OR-JK-145', notes: 'Today rent collected', timestamp: '2026-10-21T09:30:00Z' },
    ],
  },
  {
    id: 'tnt-jk-002',
    tenantId: 'TNT-JK-2026-002',
    tenantName: 'Rolando Dalisay (QuickFix Electronics & Mobile)',
    unitName: 'Unit 204 - 2nd Floor IT Arcade',
    rentAmount: 45000,
    contractDate: '2026-09-15',
    dueDate: '2026-11-30',
    totalAmountPayable: 50000,
    amountPaid: 32000,
    remainingBalance: 18000,
    status: 'Active',
    companyName: 'JK Property and Ventures',
    notes: '2-year commercial tenant. Regular everyday remittance of ₱1,500.',
    dailyPayments: [
      { id: 'dp-21', date: '2026-10-15', amount: 1500, method: 'Cash', referenceNo: 'OR-JK-201', notes: 'Daily collection', timestamp: '2026-10-15T10:00:00Z' },
      { id: 'dp-22', date: '2026-10-16', amount: 1500, method: 'Bank Transfer', referenceNo: 'BPI-JK-991', notes: 'Online transfer', timestamp: '2026-10-16T11:00:00Z' },
      { id: 'dp-23', date: '2026-10-17', amount: 1500, method: 'Cash', referenceNo: 'OR-JK-205', notes: 'Daily collection', timestamp: '2026-10-17T09:30:00Z' },
      { id: 'dp-24', date: '2026-10-18', amount: 1500, method: 'GCash', referenceNo: 'GC-JK-992', notes: 'E-wallet collection', timestamp: '2026-10-18T10:00:00Z' },
      { id: 'dp-25', date: '2026-10-19', amount: 1500, method: 'Cash', referenceNo: 'OR-JK-209', notes: 'Daily collection', timestamp: '2026-10-19T10:15:00Z' },
      { id: 'dp-26', date: '2026-10-20', amount: 1500, method: 'Cash', referenceNo: 'OR-JK-212', notes: 'Daily collection', timestamp: '2026-10-20T10:00:00Z' },
      { id: 'dp-27', date: '2026-10-21', amount: 1500, method: 'Cash', referenceNo: 'OR-JK-215', notes: 'Today rent collected', timestamp: '2026-10-21T09:40:00Z' },
    ],
  },
  {
    id: 'tnt-jk-003',
    tenantId: 'TNT-JK-2026-003',
    tenantName: 'Grace Tan (Glam & Glow Beauty Lounge)',
    unitName: 'Suite 108 - East Wing Plaza',
    rentAmount: 60000,
    contractDate: '2026-08-01',
    dueDate: '2026-10-20',
    totalAmountPayable: 65000,
    amountPaid: 65000,
    remainingBalance: 0,
    status: 'Completed',
    companyName: 'JK Property and Ventures',
    notes: 'Lease quarter fully paid up with zero arrears.',
    dailyPayments: [
      { id: 'dp-30', date: '2026-10-18', amount: 5000, method: 'Cheque', referenceNo: 'CHK-BDO-4421', notes: 'Final quarterly settlement', timestamp: '2026-10-18T15:00:00Z' },
    ],
  },
  {
    id: 'tnt-jk-004',
    tenantId: 'TNT-JK-2026-004',
    tenantName: 'Danilo Ramos (Ramos Dental Clinic)',
    unitName: 'Suite 302 - Medical Arts Tower',
    rentAmount: 55000,
    contractDate: '2026-09-01',
    dueDate: '2026-10-15',
    totalAmountPayable: 60000,
    amountPaid: 25000,
    remainingBalance: 35000,
    status: 'Overdue',
    companyName: 'JK Property and Ventures',
    notes: 'Payment overdue by 6 days. Follow-up letter sent.',
    dailyPayments: [],
  },
  {
    id: 'tnt-jk-005',
    tenantId: 'TNT-JK-2026-005',
    tenantName: 'Patricia Lim (Café Ilustrado Manila)',
    unitName: 'Unit 101 - Al Fresco Promenade',
    rentAmount: 85000,
    contractDate: '2026-10-15',
    dueDate: '2026-12-31',
    totalAmountPayable: 95000,
    amountPaid: 30000,
    remainingBalance: 65000,
    status: 'Active',
    companyName: 'JK Property and Ventures',
    notes: 'Prime corner commercial restaurant space.',
    dailyPayments: [
      { id: 'dp-35', date: '2026-10-20', amount: 15000, method: 'Bank Transfer', referenceNo: 'METRO-JK-771', notes: 'Advance installment', timestamp: '2026-10-20T14:30:00Z' },
      { id: 'dp-36', date: '2026-10-21', amount: 15000, method: 'Bank Transfer', referenceNo: 'METRO-JK-789', notes: 'Mid-month settlement', timestamp: '2026-10-21T11:00:00Z' },
    ],
  },
]

export const TenantPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const { activeCompany } = useCompany()

  const [tenants, setTenants] = React.useState<TenantLease[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to parse tenants leases from storage', e)
    }
    return INITIAL_TENANTS
  })

  // Synchronize state with localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants))
    } catch (e) {
      console.error('Failed to save tenants to localStorage', e)
    }
  }, [tenants])

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('All')
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodType>('Monthly')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'This Month',
    preset: 'This Month',
  })

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1)

  // Highlight state for newly added / updated tenant
  const [highlightedTenantId, setHighlightedTenantId] = React.useState<string | null>(null)
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // Dropdown states
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // 3-dots action dropdown state (viewport positioning)
  const [menuOpenTenantId, setMenuOpenTenantId] = React.useState<string | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{
    top: number
    right: number
    openUpward: boolean
  } | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [isUpdatePaymentModalOpen, setIsUpdatePaymentModalOpen] = React.useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  // Active target tenant
  const [activeTenant, setActiveTenant] = React.useState<TenantLease | null>(null)

  // Form state for Add / Edit
  const [formData, setFormData] = React.useState<{
    tenantName: string
    unitName: string
    rentAmount: string
    dueDate: string
    contractDate: string
    totalAmountPayable: string
    status: 'Active' | 'Completed' | 'Overdue' | 'Pending'
    notes: string
  }>({
    tenantName: '',
    unitName: '',
    rentAmount: '',
    dueDate: '',
    contractDate: '',
    totalAmountPayable: '',
    status: 'Active',
    notes: '',
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Form state for Daily Payment Update
  const [paymentDate, setPaymentDate] = React.useState(formatToYYYYMMDD(new Date()))
  const [paymentAmount, setPaymentAmount] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState('Cash')
  const [paymentRef, setPaymentRef] = React.useState('')
  const [paymentNotes, setPaymentNotes] = React.useState('')
  const [paymentStatusType, setPaymentStatusType] = React.useState<'Paid' | 'Missed'>('Paid')
  const [missedReason, setMissedReason] = React.useState('Stall closed for the day')
  const [paymentError, setPaymentError] = React.useState('')

  // Clear highlight timeout on unmount
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  // Close dropdowns on outside click and window scroll
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
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpenTenantId(null)
        setMenuPosition(null)
      }
    }

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the modal dialog
      if ((e.target as HTMLElement)?.closest?.('[role="dialog"]')) return
      setMenuOpenTenantId(null)
      setMenuPosition(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Period change handler matching Sales and Expense pages
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

  // Filtered tenants
  const filteredTenants = React.useMemo(() => {
    return tenants
      .filter((tenant) => {
        // Company check (JK Property and Ventures scope)
        if (activeCompany && activeCompany !== 'All Companies') {
          const matchesCompany =
            tenant.companyName.toLowerCase().includes(activeCompany.toLowerCase()) ||
            activeCompany.toLowerCase().includes('jk')
          if (!matchesCompany) return false
        }

        // Status check
        if (selectedStatus !== 'All' && tenant.status !== selectedStatus) {
          return false
        }

        // Search check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchesId = (tenant.tenantId || '').toLowerCase().includes(q)
          const matchesName = (tenant.tenantName || '').toLowerCase().includes(q)
          const matchesUnit = (tenant.unitName || '').toLowerCase().includes(q)
          const matchesRent = String(tenant.rentAmount || '').includes(q)
          const matchesPayable = String(tenant.totalAmountPayable || '').includes(q)
          const matchesBalance = String(tenant.remainingBalance || '').includes(q)
          if (!matchesId && !matchesName && !matchesUnit && !matchesRent && !matchesPayable && !matchesBalance) {
            return false
          }
        }

        // Date range check
        if (dateRange.startDate && dateRange.endDate) {
          if (!isDateInRange(tenant.contractDate, dateRange.startDate, dateRange.endDate)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => b.contractDate.localeCompare(a.contractDate))
  }, [tenants, activeCompany, selectedStatus, searchQuery, dateRange])

  // Reset to page 1 on filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, selectedPeriod, dateRange])

  // KPI calculations matching Sales & Expense
  const totalReceivables = React.useMemo(() => {
    return filteredTenants.reduce((sum, item) => sum + (item.totalAmountPayable || 0), 0)
  }, [filteredTenants])

  const totalCollected = React.useMemo(() => {
    return filteredTenants.reduce((sum, item) => sum + (item.amountPaid || 0), 0)
  }, [filteredTenants])

  const totalRemaining = React.useMemo(() => {
    return filteredTenants.reduce((sum, item) => sum + (item.remainingBalance || 0), 0)
  }, [filteredTenants])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTenants.length)
  const paginatedTenants = React.useMemo(() => {
    return filteredTenants.slice(startIndex, endIndex)
  }, [filteredTenants, startIndex, endIndex])

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      tenantName: '',
      unitName: '',
      rentAmount: '',
      dueDate: '',
      contractDate: formatToYYYYMMDD(new Date()),
      totalAmountPayable: '',
      status: 'Active',
      notes: '',
    })
    setFormErrors({})
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (tenant: TenantLease, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveTenant(tenant)
    setFormData({
      tenantName: tenant.tenantName,
      unitName: tenant.unitName,
      rentAmount: tenant.rentAmount.toString(),
      dueDate: tenant.dueDate,
      contractDate: tenant.contractDate,
      totalAmountPayable: tenant.totalAmountPayable.toString(),
      status: tenant.status,
      notes: tenant.notes || '',
    })
    setFormErrors({})
    setMenuOpenTenantId(null)
    setMenuPosition(null)
    setIsEditModalOpen(true)
  }

  // Open Delete Modal
  const handleOpenDelete = (tenant: TenantLease, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveTenant(tenant)
    setMenuOpenTenantId(null)
    setMenuPosition(null)
    setIsDeleteModalOpen(true)
  }

  // Open Daily Payment Modal
  const handleOpenDailyPayment = (tenant: TenantLease, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveTenant(tenant)
    setPaymentDate(formatToYYYYMMDD(new Date()))
    setPaymentAmount('')
    setPaymentMethod('Cash')
    setPaymentRef(`OR-JK-${Math.floor(100 + Math.random() * 900)}`)
    setPaymentNotes('')
    setPaymentStatusType('Paid')
    setMissedReason('Stall closed for the day')
    setPaymentError('')
    setMenuOpenTenantId(null)
    setMenuPosition(null)
    setIsUpdatePaymentModalOpen(true)
  }

  // Open Row Detail Modal
  const handleOpenDetail = (tenant: TenantLease) => {
    setActiveTenant(tenant)
    setIsDetailModalOpen(true)
  }

  // Validate Add/Edit form
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.tenantName.trim()) {
      errors.tenantName = 'Tenant Name is required.'
    }
    if (!formData.unitName.trim()) {
      errors.unitName = 'Leased Unit / Stall is required.'
    }
    if (!formData.contractDate) {
      errors.contractDate = 'Date Contracted is required.'
    }
    if (!formData.dueDate) {
      errors.dueDate = 'Due Date is required.'
    }
    const rent = parseFloat(formData.rentAmount)
    if (isNaN(rent) || rent <= 0) {
      errors.rentAmount = 'Rent amount must be greater than 0.'
    }
    const payable = parseFloat(formData.totalAmountPayable || formData.rentAmount)
    if (isNaN(payable) || payable <= 0) {
      errors.totalAmountPayable = 'Total amount payable must be greater than 0.'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const rent = parseFloat(formData.rentAmount)
    const payable = parseFloat(formData.totalAmountPayable || formData.rentAmount)
    const newId = `TNT-JK-2026-${String(tenants.length + 1).padStart(3, '0')}`

    const newTenant: TenantLease = {
      id: `tnt-jk-${Date.now()}`,
      tenantId: newId,
      tenantName: formData.tenantName.trim(),
      unitName: formData.unitName.trim(),
      rentAmount: rent,
      contractDate: formData.contractDate,
      dueDate: formData.dueDate,
      totalAmountPayable: payable,
      amountPaid: 0,
      remainingBalance: payable,
      status: formData.status,
      companyName: 'JK Property and Ventures',
      notes: formData.notes.trim(),
      dailyPayments: [],
    }

    setTenants((prev) => [newTenant, ...prev])
    setIsAddModalOpen(false)

    // Highlight new tenant
    setCurrentPage(1)
    setHighlightedTenantId(newTenant.id)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedTenantId(null)
    }, 3000)

    setTimeout(() => {
      tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !validateForm()) return

    const rent = parseFloat(formData.rentAmount)
    const payable = parseFloat(formData.totalAmountPayable || formData.rentAmount)
    const remaining = Math.max(0, payable - activeTenant.amountPaid)

    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === activeTenant.id) {
          return {
            ...t,
            tenantName: formData.tenantName.trim(),
            unitName: formData.unitName.trim(),
            rentAmount: rent,
            contractDate: formData.contractDate,
            dueDate: formData.dueDate,
            totalAmountPayable: payable,
            remainingBalance: remaining,
            status: formData.status,
            notes: formData.notes.trim(),
          }
        }
        return t
      })
    )
    setIsEditModalOpen(false)
  }

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!activeTenant) return
    setTenants((prev) => prev.filter((t) => t.id !== activeTenant.id))
    setIsDeleteModalOpen(false)
    setActiveTenant(null)
  }

  // Submit Daily Payment / Missed Record
  const handleSubmitDailyPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant) return

    if (!paymentDate) {
      setPaymentError('Date is required.')
      return
    }

    if (paymentStatusType === 'Paid') {
      const amt = parseFloat(paymentAmount)
      if (isNaN(amt) || amt <= 0) {
        setPaymentError('Payment amount must be greater than 0.')
        return
      }

      const newRecord: DailyRentRecord = {
        id: `dp-${Date.now()}`,
        date: paymentDate,
        amount: amt,
        method: paymentMethod,
        referenceNo: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || 'Daily rent remittance',
        status: 'Paid',
        timestamp: new Date().toISOString(),
      }

      setTenants((prev) =>
        prev.map((t) => {
          if (t.id === activeTenant.id) {
            const newAmountPaid = t.amountPaid + amt
            const newRemaining = Math.max(0, t.totalAmountPayable - newAmountPaid)
            const newStatus = newRemaining === 0 ? 'Completed' : t.status
            return {
              ...t,
              amountPaid: newAmountPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              dailyPayments: [newRecord, ...t.dailyPayments],
            }
          }
          return t
        })
      )
    } else {
      // Missed / Did Not Pay Today
      const newRecord: DailyRentRecord = {
        id: `dp-${Date.now()}`,
        date: paymentDate,
        amount: 0,
        method: 'N/A',
        referenceNo: 'MISSED',
        notes: paymentNotes.trim() || `Unpaid: ${missedReason}`,
        status: 'Missed',
        missedReason: missedReason,
        timestamp: new Date().toISOString(),
      }

      setTenants((prev) =>
        prev.map((t) => {
          if (t.id === activeTenant.id) {
            return {
              ...t,
              dailyPayments: [newRecord, ...t.dailyPayments],
            }
          }
          return t
        })
      )
    }

    setIsUpdatePaymentModalOpen(false)
  }

  // Export to CSV: Exports only table contents
  const handleExportCSV = () => {
    setIsExportDropdownOpen(false)
    const headers = [
      'Tenant ID',
      "Tenant's Name",
      'Leased Stall/Unit',
      'Rental Rate',
      'Contract Date',
      'Due Date',
      'Total Payable',
      'Amount Paid',
      'Remaining Balance',
      'Status',
      'Company',
    ]

    const rows = filteredTenants.map((t) => [
      `"${t.tenantId}"`,
      `"${(t.tenantName || '').replace(/"/g, '""')}"`,
      `"${(t.unitName || '').replace(/"/g, '""')}"`,
      t.rentAmount,
      t.contractDate,
      t.dueDate,
      t.totalAmountPayable,
      t.amountPaid,
      t.remainingBalance,
      t.status,
      `"${t.companyName}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `tenant_leases_summary_JK_Property_and_Ventures_${Date.now()}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to PDF: Formats and exports ONLY the content of the table (matching Sales & Expense)
  const handleExportPDF = () => {
    setIsExportDropdownOpen(false)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml =
      filteredTenants.length === 0
        ? `<tr><td colspan="9" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No tenant leases found matching the selected filters.</td></tr>`
        : filteredTenants
            .map(
              (t) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: 600; color: #960C01;">${t.tenantId}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${t.tenantName}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${t.unitName}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;">₱${t.rentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${t.contractDate}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${t.dueDate}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 600;">₱${t.totalAmountPayable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 600;">₱${t.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #d97706; font-weight: 700;">₱${t.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${t.status}</td>
        </tr>
      `
            )
            .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tenant Leases Report - JK Property and Ventures</title>
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
          <p>Tenant Leases Summary Report for <strong>JK Property and Ventures</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Tenant ID</th>
                <th>Tenant's Name</th>
                <th>Leased Stall / Unit</th>
                <th style="text-align: right;">Rent Rate</th>
                <th style="text-align: center;">Contract Date</th>
                <th style="text-align: center;">Due Date</th>
                <th style="text-align: right;">Total Payable</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Remaining Balance</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Leases:</strong> ${filteredTenants.length}</div>
            <div><strong>Total Receivables:</strong> ₱${totalReceivables.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Total Collected:</strong> ₱${totalCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Total Remaining Balance:</strong> ₱${totalRemaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
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

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Controls (Matching Sales & Expense pages) */}
      <div className="space-y-4">
        {/* Top Header Row: Page Title on Left, Action Buttons on Right */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Tenants
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Here's the summary of tenant leases and collections in JK Property and Ventures
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
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Download as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Download as PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* New Tenant Lease Button (Operational users) */}
            {!isAudit && (
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Tenant Lease</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Row: Search Bar & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          {/* Extended Width Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-fg absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tenant name, stall/unit, or tenant ID..."
              className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 self-start lg:self-auto shrink-0">
            {/* Custom Period Dropdown: Daily, Quarterly, Monthly, Annually */}
            <div ref={periodDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  isPeriodDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
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
                  isStatusDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                )}
              >
                <span className="font-medium text-focus/90">
                  {selectedStatus === 'All' ? 'Status' : selectedStatus}
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
                  {['All', 'Active', 'Completed', 'Overdue', 'Pending'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(st)
                        setIsStatusDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        selectedStatus === st
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span>{st === 'All' ? 'All Status' : st}</span>
                      {selectedStatus === st && (
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
              onChange={(newRange) => setDateRange(newRange)}
              hidePresets
            />

            {/* Company Scope Pill for JK Property and Ventures */}
            <div className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs">
              <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
              <span className="font-semibold text-focus/90">JK Property and Ventures</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Total Tenant Receivables KPI Card (Exact UI match with Sales & Expense) */}
      <Card className="w-full bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40">
        <div className="w-full max-w-[calc(100%-60px)]">
          <span className="text-xs font-medium text-muted-fg block">
            Total Tenant Receivables
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 tabular-nums tracking-tight">
            {formatPHP(totalReceivables)}
          </h3>
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5 truncate">
            Collected: <span className="font-medium text-emerald-600">{formatPHP(totalCollected)}</span> · Remaining Balance: <span className="font-medium text-amber-600">{formatPHP(totalRemaining)}</span> ({filteredTenants.length} active tenant leases) in JK Property and Ventures
          </p>
        </div>

        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
          <Store className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </Card>

      {/* 3. Summary Tenants Table (Following Sales & Expense layout) */}
      <Card
        ref={tableCardRef}
        className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs scroll-mt-6"
      >
        {/* Table matching Sales/Expense formatting */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[1050px]">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 hover:bg-transparent">
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  TENANT ID
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  TENANT & UNIT
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  RENT RATE
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  CONTRACT
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  DUE DATE
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  TOTAL PAYABLE
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  AMOUNT PAID
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left">
                  BALANCE
                </TableHead>
                <TableHead className="px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedTenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-14 text-center text-xs sm:text-sm text-muted-fg"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="font-semibold text-focus text-sm sm:text-base">
                        No tenant lease records found
                      </p>
                      <p className="text-xs text-muted-fg leading-relaxed">
                        There are no tenant leases recorded for JK Property and Ventures matching your current filters. {!isAudit && 'Click "New Tenant Lease" above to register a commercial lease.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    id={`tenant-row-${tenant.id}`}
                    onClick={() => handleOpenDetail(tenant)}
                    className={cn(
                      'border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-200 cursor-pointer',
                      highlightedTenantId === tenant.id &&
                        'bg-amber-100/90 hover:bg-amber-100/90 ring-2 ring-amber-500 shadow-md font-semibold'
                    )}
                    title="Click to view complete details"
                  >
                    {/* 1. Tenant ID */}
                    <TableCell className="px-3.5 py-3.5 text-xs font-semibold text-focus truncate text-left">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[#960C01] font-bold">{tenant.tenantId}</span>
                        {highlightedTenantId === tenant.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#960C01] text-white shadow-xs animate-bounce shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Tenant & Unit */}
                    <TableCell className="px-3.5 py-3.5 text-xs font-medium text-focus truncate text-left" title={tenant.tenantName}>
                      <div className="truncate font-semibold text-focus">{tenant.tenantName}</div>
                      <div className="text-[11px] text-muted-fg flex items-center gap-1 mt-0.5 truncate">
                        <Store className="w-3 h-3 text-muted-fg/70 shrink-0" />
                        <span className="truncate">{tenant.unitName}</span>
                      </div>
                    </TableCell>

                    {/* 3. Rent Rate */}
                    <TableCell className="px-3.5 py-3.5 text-xs font-semibold text-left tabular-nums whitespace-nowrap text-focus">
                      {formatPHP(tenant.rentAmount)}
                    </TableCell>

                    {/* 4. Contract Date */}
                    <TableCell className="px-3.5 py-3.5 text-xs text-focus/90 text-center whitespace-nowrap">
                      {tenant.contractDate}
                    </TableCell>

                    {/* 5. Due Date */}
                    <TableCell className="px-3.5 py-3.5 text-xs text-focus/90 text-center whitespace-nowrap">
                      {tenant.dueDate}
                    </TableCell>

                    {/* 6. Total Payable */}
                    <TableCell className="px-3.5 py-3.5 text-xs font-bold text-left tabular-nums whitespace-nowrap text-focus">
                      {formatPHP(tenant.totalAmountPayable)}
                    </TableCell>

                    {/* 7. Amount Paid */}
                    <TableCell className="px-3.5 py-3.5 text-xs font-semibold text-left tabular-nums whitespace-nowrap text-emerald-600">
                      {formatPHP(tenant.amountPaid)}
                    </TableCell>

                    {/* 8. Balance & Status */}
                    <TableCell className="px-3.5 py-3.5 text-xs text-left tabular-nums whitespace-nowrap">
                      <div className="font-bold text-amber-600">{formatPHP(tenant.remainingBalance)}</div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold w-fit',
                            tenant.status === 'Active' && 'text-blue-700 bg-blue-50',
                            tenant.status === 'Completed' && 'text-emerald-700 bg-emerald-50',
                            tenant.status === 'Overdue' && 'text-rose-700 bg-rose-50',
                            tenant.status === 'Pending' && 'text-amber-700 bg-amber-50'
                          )}
                        >
                          {tenant.status}
                        </span>
                        {tenant.auditStatus && (
                          <div className="flex items-center gap-1">
                            <span
                              className={cn(
                                'inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border',
                                tenant.auditStatus === 'Verified'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              )}
                            >
                              {tenant.auditStatus === 'Verified' ? 'Audited' : 'Discrepancy'}
                            </span>
                          </div>
                        )}
                        {tenant.auditDate && (
                          <span className="text-[9.5px] text-muted-fg font-mono">
                            {tenant.auditDate}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 9. Actions */}
                    <TableCell
                      className="px-3.5 py-3.5 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (menuOpenTenantId === tenant.id) {
                            setMenuOpenTenantId(null)
                            setMenuPosition(null)
                            return
                          }
                          const rect = e.currentTarget.getBoundingClientRect()
                          const windowHeight = window.innerHeight
                          const spaceBelow = windowHeight - rect.bottom
                          const openUpward = spaceBelow < 180
                          setMenuPosition({
                            top: openUpward ? rect.top - 6 : rect.bottom + 6,
                            right: Math.max(16, window.innerWidth - rect.right),
                            openUpward,
                          })
                          setActiveTenant(tenant)
                          setMenuOpenTenantId(tenant.id)
                        }}
                        className="h-8 w-8 p-0 rounded-lg text-muted-fg hover:text-focus hover:bg-slate-100 cursor-pointer mx-auto flex items-center justify-center transition-colors"
                        title="Actions"
                        aria-label="Tenant actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Footer (Exact Sales & Expense matching) */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Left: Record summary */}
          <span className="font-medium text-focus/80">
            {filteredTenants.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredTenants.length} records`}
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

      {/* Floating Actions Portal Menu (Fixed positioning without scroll offset bug) */}
      {menuOpenTenantId && menuPosition && activeTenant && (
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              transform: menuPosition.openUpward ? 'translateY(-100%)' : undefined,
            }}
            className="fixed w-48 bg-white rounded-2xl border border-stroke/30 shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {isAudit ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const t = activeTenant
                    if (t) {
                      const timestamp = new Date().toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      const updated = tenants.map((item) =>
                        item.id === t.id
                          ? { ...item, auditStatus: 'Verified' as const, auditDate: timestamp, auditedBy: user?.fullName || 'Audit' }
                          : item
                      )
                      setTenants(updated)
                      if (typeof window !== 'undefined') {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) {}
                      }
                      setMenuOpenTenantId(null)
                      setMenuPosition(null)
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Mark as Audit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = activeTenant
                    if (t) {
                      const timestamp = new Date().toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      const updated = tenants.map((item) =>
                        item.id === t.id
                          ? { ...item, auditStatus: 'Flagged' as const, auditDate: timestamp, auditedBy: user?.fullName || 'Audit' }
                          : item
                      )
                      setTenants(updated)
                      if (typeof window !== 'undefined') {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) {}
                      }
                      setMenuOpenTenantId(null)
                      setMenuPosition(null)
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Mark as Discrepancy</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = activeTenant
                    setMenuOpenTenantId(null)
                    setMenuPosition(null)
                    if (t) handleOpenDetail(t)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                  <span>View Details</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    handleOpenDailyPayment(activeTenant, e)
                    setMenuOpenTenantId(null)
                    setMenuPosition(null)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Update Rent Payment</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleOpenEdit(activeTenant, e)
                    setMenuOpenTenantId(null)
                    setMenuPosition(null)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                  <span>Edit Lease</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleOpenDelete(activeTenant, e)
                    setMenuOpenTenantId(null)
                    setMenuPosition(null)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Delete Lease</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )
      )}

      {/* MODAL 1: New Tenant Lease (Matching system modal UI) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[680px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Store className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-focus leading-tight">
                New Tenant Lease Agreement
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-muted-fg font-normal mt-1">
              Register a new commercial stall or office space tenant for JK Property and Ventures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-3.5 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">
                Tenant / Lessee Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Maria Santos (Santos Refreshments)"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.tenantName && 'border-red-500')}
              />
              {formErrors.tenantName && (
                <p className="text-[10px] text-red-600 font-medium">{formErrors.tenantName}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">
                Leased Unit / Stall Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Stall 14 - Ground Floor Food Hall"
                value={formData.unitName}
                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.unitName && 'border-red-500')}
              />
              {formErrors.unitName && (
                <p className="text-[10px] text-red-600 font-medium">{formErrors.unitName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Rent Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="30000"
                  value={formData.rentAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rentAmount: e.target.value,
                      totalAmountPayable: formData.totalAmountPayable || e.target.value,
                    })
                  }
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.rentAmount && 'border-red-500')}
                />
                {formErrors.rentAmount && (
                  <p className="text-[10px] text-red-600 font-medium">{formErrors.rentAmount}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Total Payable (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="35000"
                  value={formData.totalAmountPayable}
                  onChange={(e) => setFormData({ ...formData, totalAmountPayable: e.target.value })}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.totalAmountPayable && 'border-red-500')}
                />
                {formErrors.totalAmountPayable && (
                  <p className="text-[10px] text-red-600 font-medium">{formErrors.totalAmountPayable}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Date Contracted <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.contractDate && 'border-red-500')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.dueDate && 'border-red-500')}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-1 focus:ring-focus"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">Notes / Remarks</label>
              <Input
                type="text"
                placeholder="Optional lease terms or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl border-stroke/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-stroke/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 px-4 text-xs font-medium rounded-xl border-stroke/50 hover:bg-slate-50 text-focus cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs cursor-pointer"
              >
                Create Lease
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Tenant Lease (Matching system modal UI) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[680px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Pencil className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-focus leading-tight">
                Edit Tenant Lease Agreement
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-muted-fg font-normal mt-1">
              Update lease details for {activeTenant?.tenantName} ({activeTenant?.tenantId}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-3.5 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">
                Tenant / Lessee Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.tenantName && 'border-red-500')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">
                Leased Unit / Stall Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.unitName}
                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.unitName && 'border-red-500')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Rent Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.rentAmount}
                  onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.rentAmount && 'border-red-500')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Total Payable (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.totalAmountPayable}
                  onChange={(e) => setFormData({ ...formData, totalAmountPayable: e.target.value })}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl border-stroke/50', formErrors.totalAmountPayable && 'border-red-500')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Date Contracted <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl border-stroke/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-focus block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl border-stroke/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-1 focus:ring-focus"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-focus block">Notes / Remarks</label>
              <Input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl border-stroke/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-stroke/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-4 text-xs font-medium rounded-xl border-stroke/50 hover:bg-slate-50 text-focus cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Delete Confirmation Modal (Matching Sales / Expense pages) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-3 mx-auto sm:mx-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-focus">
              Delete Tenant Lease
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg mt-1">
              Are you sure you want to delete the lease agreement for{' '}
              <strong className="text-focus">{activeTenant?.tenantName}</strong> ({activeTenant?.tenantId})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-9 px-4 text-xs font-medium rounded-xl border-stroke/50 hover:bg-slate-50 text-focus cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="h-9 px-5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs"
            >
              Delete Lease
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Update Rent Payment (Decreased height, compact & sleek) */}
      <Dialog open={isUpdatePaymentModalOpen} onOpenChange={setIsUpdatePaymentModalOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left pb-2.5 border-b border-stroke/20 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-focus leading-tight">
                Update Rent Payment
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-muted-fg font-normal mt-0.5 truncate">
              {activeTenant?.tenantName} • {activeTenant?.unitName}
            </DialogDescription>
          </DialogHeader>

          {/* Compact 2-column info card */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs grid grid-cols-2 gap-2 mt-1">
            <div className="truncate">
              <span className="text-[10px] text-muted-fg uppercase font-medium block">Total Payable</span>
              <span className="font-semibold text-focus truncate block">
                {formatPHP(activeTenant?.totalAmountPayable || 0)}
              </span>
            </div>
            <div className="truncate">
              <span className="text-[10px] text-muted-fg uppercase font-medium block">Rental Rate</span>
              <span className="font-semibold text-focus truncate block">
                {formatPHP(activeTenant?.rentAmount || 0)}
              </span>
            </div>
            <div className="truncate border-t border-slate-200/60 pt-1.5">
              <span className="text-[10px] text-muted-fg uppercase font-medium block">Amount Paid</span>
              <span className="font-bold text-emerald-600 truncate block">
                {formatPHP(activeTenant?.amountPaid || 0)}
              </span>
            </div>
            <div className="truncate border-t border-slate-200/60 pt-1.5">
              <span className="text-[10px] text-muted-fg uppercase font-medium block">Remaining Balance</span>
              <span className="font-bold text-amber-600 truncate block">
                {formatPHP(activeTenant?.remainingBalance || 0)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitDailyPayment} className="space-y-3 pt-1">
            {/* Payment Status Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentStatusType('Paid')
                  setPaymentError('')
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  paymentStatusType === 'Paid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-300'
                    : 'border-stroke/50 bg-white text-muted-fg hover:bg-slate-50'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paid Today</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentStatusType('Missed')
                  setPaymentError('')
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  paymentStatusType === 'Missed'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-300'
                    : 'border-stroke/50 bg-white text-muted-fg hover:bg-slate-50'
                )}
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Did Not Pay Today</span>
              </button>
            </div>

            {paymentStatusType === 'Paid' ? (
              <>
                {/* Compact grid: Date & Amount */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-focus block">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-9 text-xs rounded-xl border-stroke/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-focus block">
                      Remittance Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="1000"
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value)
                        setPaymentError('')
                      }}
                      className={cn('h-9 text-xs rounded-xl border-stroke/50', paymentError && 'border-red-500')}
                    />
                  </div>
                </div>

                {/* Compact grid: Method & Ref No */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-focus block">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-stroke/50 bg-white text-xs text-focus focus:outline-none focus:ring-1 focus:ring-focus"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-focus block">OR / Reference No</label>
                    <Input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-9 text-xs rounded-xl border-stroke/50"
                      placeholder="OR-JK-101"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Missed Day Options */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-focus block">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-9 text-xs rounded-xl border-stroke/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-rose-600 block">
                    Reason for Non-Payment
                  </label>
                  <select
                    value={missedReason}
                    onChange={(e) => setMissedReason(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-rose-300 bg-rose-50/50 text-xs text-focus focus:outline-none"
                  >
                    <option value="Stall closed for the day">Stall closed for the day</option>
                    <option value="Severe weather / Typhoon">Severe weather / Typhoon</option>
                    <option value="Delayed sales remittance">Delayed sales remittance</option>
                    <option value="Stall renovation / Maintenance">Stall renovation / Maintenance</option>
                    <option value="Official Holiday">Official Holiday</option>
                    <option value="Other / Tenant absent">Other / Tenant absent</option>
                  </select>
                </div>
              </div>
            )}

            {paymentError && <p className="text-[10px] text-red-600 font-medium">{paymentError}</p>}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-focus block">Notes / Remarks</label>
              <Input
                type="text"
                placeholder="Optional collection notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="h-9 text-xs rounded-xl border-stroke/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stroke/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUpdatePaymentModalOpen(false)}
                className="h-9 px-4 text-xs font-medium rounded-xl border-stroke/50 hover:bg-slate-50 text-focus cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className={cn(
                  'h-9 px-5 text-xs font-semibold rounded-xl text-white shadow-xs cursor-pointer',
                  paymentStatusType === 'Paid'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {paymentStatusType === 'Paid' ? 'Record Rent Payment' : 'Log Missed Day'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Full Tenant Details & Payment History Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-focus leading-tight">
                    Tenant Lease Details
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-fg font-normal mt-0.5">
                    Tenant ID: <span className="font-mono font-semibold text-focus">{activeTenant?.tenantId}</span> • {activeTenant?.companyName}
                  </DialogDescription>
                </div>
              </div>

              {activeTenant && (
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                    activeTenant.status === 'Active' && 'bg-blue-50 text-blue-700 border border-blue-200',
                    activeTenant.status === 'Completed' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    activeTenant.status === 'Overdue' && 'bg-rose-50 text-rose-700 border border-rose-200',
                    activeTenant.status === 'Pending' && 'bg-amber-50 text-amber-700 border border-amber-200'
                  )}
                >
                  {activeTenant.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {activeTenant && (
            <div className="space-y-4 pt-2">
              {/* Overview Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Tenant / Lessee</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">{activeTenant.tenantName}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Leased Stall / Unit</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">{activeTenant.unitName}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Rental Rate</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">{formatPHP(activeTenant.rentAmount)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Contract Date</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">{activeTenant.contractDate}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Due Date</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">{activeTenant.dueDate}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Collection Progress</span>
                  <div className="font-semibold text-xs text-focus mt-0.5">
                    {activeTenant.totalAmountPayable > 0
                      ? `${Math.round((activeTenant.amountPaid / activeTenant.totalAmountPayable) * 100)}%`
                      : '0%'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Total Payable</span>
                  <div className="font-bold text-xs text-focus mt-0.5">{formatPHP(activeTenant.totalAmountPayable)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Amount Paid</span>
                  <div className="font-bold text-xs text-emerald-600 mt-0.5">{formatPHP(activeTenant.amountPaid)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-fg block">Remaining Balance</span>
                  <div className="font-bold text-xs text-amber-600 mt-0.5">{formatPHP(activeTenant.remainingBalance)}</div>
                </div>
              </div>

              {activeTenant.notes && (
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/50 text-xs">
                  <span className="font-semibold text-focus">Notes: </span>
                  <span className="text-muted-fg">{activeTenant.notes}</span>
                </div>
              )}

              {/* Daily Rent Payment History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-focus uppercase tracking-wider">
                    Payment Ledger ({activeTenant.dailyPayments.length})
                  </h4>
                  {!isAudit && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        setIsDetailModalOpen(false)
                        handleOpenDailyPayment(activeTenant, e)
                      }}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Record Daily Rent
                    </Button>
                  )}
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-[10px] font-bold py-2.5 uppercase text-muted-fg">Date</TableHead>
                        <TableHead className="text-[10px] font-bold py-2.5 uppercase text-muted-fg">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-bold py-2.5 uppercase text-muted-fg">Amount</TableHead>
                        <TableHead className="text-[10px] font-bold py-2.5 uppercase text-muted-fg">Method</TableHead>
                        <TableHead className="text-[10px] font-bold py-2.5 uppercase text-muted-fg">Reference No</TableHead>
                        <TableHead className="text-[10px] font-bold py-2.5 uppercase text-muted-fg">Notes / Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTenant.dailyPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-fg py-6">
                            No payment records recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeTenant.dailyPayments.map((p) => (
                          <TableRow key={p.id} className="border-b border-slate-100 text-xs">
                            <TableCell className="py-2.5 font-medium text-focus">{p.date}</TableCell>
                            <TableCell className="py-2.5">
                              {p.status === 'Missed' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                  Missed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  Paid
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-semibold text-focus">
                              {p.status === 'Missed' ? '₱0.00' : formatPHP(p.amount)}
                            </TableCell>
                            <TableCell className="py-2.5 text-muted-fg">{p.method}</TableCell>
                            <TableCell className="py-2.5 font-mono text-[11px] text-muted-fg">
                              {p.referenceNo || '—'}
                            </TableCell>
                            <TableCell className="py-2.5 text-muted-fg">
                              {p.status === 'Missed' ? p.missedReason || p.notes : p.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {!isAudit && (
                <div className="flex justify-end pt-2 border-t border-stroke/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="h-9 px-4 text-xs font-medium rounded-xl border-stroke/50 hover:bg-slate-50 text-focus cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
