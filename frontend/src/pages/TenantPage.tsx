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
}

const STORAGE_KEY = 'mct_jk_tenants_leases_v1'

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
  const [selectedStatus, setSelectedStatus] = React.useState('All')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'Last 30 Days',
    preset: 'Last 30 Days',
  })

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)

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

  // 3-dots dropdown menu state
  const [menuOpenTenantId, setMenuOpenTenantId] = React.useState<string | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const exportRef = React.useRef<HTMLDivElement>(null)

  // Status dropdown filter
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenTenantId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered tenants
  const filteredTenants = React.useMemo(() => {
    return tenants.filter((tenant) => {
      // Company check
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
        const q = searchQuery.toLowerCase()
        const matchesQuery =
          tenant.tenantId.toLowerCase().includes(q) ||
          tenant.tenantName.toLowerCase().includes(q) ||
          tenant.unitName.toLowerCase().includes(q)
        if (!matchesQuery) return false
      }

      // Date range check
      if (dateRange.startDate && dateRange.endDate) {
        if (!isDateInRange(tenant.contractDate, dateRange.startDate, dateRange.endDate)) {
          return false
        }
      }

      return true
    })
  }, [tenants, activeCompany, selectedStatus, searchQuery, dateRange])

  // Single KPI calculation (Total Capital / Receivables)
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
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / itemsPerPage))
  const paginatedTenants = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredTenants.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredTenants, currentPage, itemsPerPage])

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
    setIsEditModalOpen(true)
  }

  // Open Delete Modal
  const handleOpenDelete = (tenant: TenantLease, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setActiveTenant(tenant)
    setMenuOpenTenantId(null)
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
      errors.tenantName = "Tenant Name is required"
    }
    if (!formData.unitName.trim()) {
      errors.unitName = "Leased Unit / Stall is required"
    }
    if (!formData.contractDate) {
      errors.contractDate = "Date Contracted is required"
    }
    if (!formData.dueDate) {
      errors.dueDate = "Due Date is required"
    }
    const rent = parseFloat(formData.rentAmount)
    if (isNaN(rent) || rent <= 0) {
      errors.rentAmount = "Rent amount must be greater than 0"
    }
    const payable = parseFloat(formData.totalAmountPayable || formData.rentAmount)
    if (isNaN(payable) || payable <= 0) {
      errors.totalAmountPayable = "Total amount payable must be greater than 0"
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
      setPaymentError('Date is required')
      return
    }

    if (paymentStatusType === 'Paid') {
      const amt = parseFloat(paymentAmount)
      if (isNaN(amt) || amt <= 0) {
        setPaymentError('Payment amount must be greater than 0')
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
        notes: paymentNotes.trim() || `Unpaid for the day: ${missedReason}`,
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

  // Export to CSV
  const handleExportCSV = () => {
    setIsExportOpen(false)
    const headers = [
      'Tenant ID',
      "Tenant's Name",
      'Leased Stall/Unit',
      'Rental Rate',
      'Contract Date',
      'Due Date',
      'Total Amount Payable',
      'Amount Paid',
      'Remaining Balance',
      'Status',
      'Company',
    ]

    const rows = filteredTenants.map((t) => [
      `"${t.tenantId}"`,
      `"${t.tenantName.replace(/"/g, '""')}"`,
      `"${t.unitName.replace(/"/g, '""')}"`,
      t.rentAmount,
      t.contractDate,
      t.dueDate,
      t.totalAmountPayable,
      t.amountPaid,
      t.remainingBalance,
      t.status,
      `"${t.companyName}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `JK_Property_Tenants_${formatToYYYYMMDD(new Date())}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to PDF (Print-ready)
  const handleExportPDF = () => {
    setIsExportOpen(false)
    window.print()
  }

  return (
    <div className="w-full min-h-screen bg-surface/30 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tenants Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              JK Property and Ventures
            </span>
          </div>
          <p className="text-sm text-muted-fg mt-0.5">
            Commercial stall leases, everyday rental remittances, and tenant accounts tracking.
          </p>
        </div>

        {/* Live Date & Time Stamp Badge beside Export Button on the right */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <LiveDateTimeBadge />

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 h-9 px-3.5 border-stroke/60 font-semibold text-xs shadow-xs"
            >
              <Download className="w-4 h-4 text-muted-fg" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-fg" />
            </Button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-surface rounded-xl border border-stroke/60 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Export / Print PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* New Tenant Button (Hidden for Audit) */}
          {!isAudit && (
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 h-9 px-4 font-semibold text-xs bg-primary hover:bg-primary/90 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Tenant Lease</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Single KPI Card: Total Rental Portfolio */}
      <Card className="p-6 bg-surface border-stroke/50 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Total Tenant Receivables
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {formatPHP(totalReceivables)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-fg pt-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Collected: {formatPHP(totalCollected)}
              </span>
              <span>•</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Remaining Balance: {formatPHP(totalRemaining)}
              </span>
              <span>•</span>
              <span>{filteredTenants.length} active tenant leases</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Store className="w-7 h-7 text-primary" />
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-surface border-stroke/50 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
            <Input
              type="text"
              placeholder="Search by tenant name, stall/unit, or tenant ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 pr-8 h-9 text-xs bg-surface border-stroke/60 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center justify-between gap-2 h-9 px-3.5 rounded-xl border border-stroke/60 bg-surface text-xs font-medium text-foreground hover:bg-surface/80 transition-colors w-full sm:w-44"
            >
              <span className="truncate">Status: {selectedStatus}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-44 bg-surface rounded-xl border border-stroke/60 shadow-xl z-40 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                {['All', 'Active', 'Completed', 'Overdue', 'Pending'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(status)
                      setIsStatusDropdownOpen(false)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors text-left',
                      selectedStatus === status
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-foreground hover:bg-surface/60'
                    )}
                  >
                    <span>{status === 'All' ? 'All Statuses' : status}</span>
                    {selectedStatus === status && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Picker */}
          <div className="w-full sm:w-auto">
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range)
                setCurrentPage(1)
              }}
              hidePresets
            />
          </div>
        </div>
      </Card>

      {/* Tenants Table */}
      <Card className="bg-surface border-stroke/50 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface/60">
              <TableRow className="border-b border-stroke/40">
                <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-muted-fg pl-6 py-3.5">
                  Tenant ID
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Tenant's Name & Leased Unit
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Rent Amount
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Contract Date
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Due Date
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Total Payable
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Amount Paid
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Remaining Balance
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-fg py-3.5">
                  Status
                </TableHead>
                <TableHead className="w-[80px] text-center text-xs font-bold uppercase tracking-wider text-muted-fg pr-6 py-3.5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-48 text-center text-sm text-muted-fg">
                    <Store className="w-8 h-8 text-muted-fg/40 mx-auto mb-2" />
                    No tenant leases found matching the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    onClick={() => handleOpenDetail(tenant)}
                    className="border-b border-stroke/30 hover:bg-surface/50 transition-colors cursor-pointer group"
                  >
                    <TableCell className="pl-6 py-3.5 font-mono text-xs font-semibold text-primary">
                      {tenant.tenantId}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {tenant.tenantName}
                      </div>
                      <div className="text-[11px] text-muted-fg flex items-center gap-1.5 mt-0.5">
                        <Store className="w-3 h-3 text-muted-fg/70" />
                        <span>{tenant.unitName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3.5 font-semibold text-xs text-foreground">
                      {formatPHP(tenant.rentAmount)}
                    </TableCell>
                    <TableCell className="text-center py-3.5 text-xs text-muted-fg">
                      {tenant.contractDate}
                    </TableCell>
                    <TableCell className="text-center py-3.5 text-xs text-muted-fg font-medium">
                      {tenant.dueDate}
                    </TableCell>
                    <TableCell className="text-right py-3.5 font-semibold text-xs text-foreground">
                      {formatPHP(tenant.totalAmountPayable)}
                    </TableCell>
                    <TableCell className="text-right py-3.5 font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                      {formatPHP(tenant.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right py-3.5 font-bold text-xs text-amber-600 dark:text-amber-400">
                      {formatPHP(tenant.remainingBalance)}
                    </TableCell>
                    <TableCell className="text-center py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase',
                          tenant.status === 'Active' && 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
                          tenant.status === 'Completed' && 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                          tenant.status === 'Overdue' && 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
                          tenant.status === 'Pending' && 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        )}
                      >
                        {tenant.status}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-center pr-6 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setMenuPosition({
                            top: rect.bottom + window.scrollY + 4,
                            left: rect.right + window.scrollX - 160,
                          })
                          setMenuOpenTenantId(menuOpenTenantId === tenant.id ? null : tenant.id)
                          setActiveTenant(tenant)
                        }}
                        className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface/80 transition-colors"
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

        {/* Pagination Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-stroke/40 bg-surface/40">
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-7 px-2 rounded-lg border border-stroke/60 bg-surface text-xs font-medium text-foreground focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              Showing {filteredTenants.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTenants.length)} of {filteredTenants.length} tenants
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
      {menuOpenTenantId && menuPosition && activeTenant && (
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed w-44 bg-surface rounded-xl border border-stroke/60 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {isAudit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const t = activeTenant
                  setMenuOpenTenantId(null)
                  setMenuPosition(null)
                  if (t) handleOpenDetail(t)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left"
              >
                <Eye className="w-3.5 h-3.5 text-muted-fg" />
                <span>View Details</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleOpenDailyPayment(activeTenant, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left"
                >
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span>Update Rent Payment</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(activeTenant, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors text-left"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-fg" />
                  <span>Edit Lease</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleOpenDelete(activeTenant, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Lease</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )
      )}

      {/* MODAL: New Tenant Lease */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-6 bg-surface border-stroke/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              New Tenant Lease Agreement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Register a new commercial stall or office space tenant for JK Property and Ventures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Tenant / Lessee Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Maria Santos (Santos Refreshments)"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className={cn('h-9 text-xs', formErrors.tenantName && 'border-rose-500')}
              />
              {formErrors.tenantName && (
                <p className="text-[11px] text-rose-500">{formErrors.tenantName}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Leased Unit / Stall Number <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Stall 14 - Ground Floor Food Hall"
                value={formData.unitName}
                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                className={cn('h-9 text-xs', formErrors.unitName && 'border-rose-500')}
              />
              {formErrors.unitName && (
                <p className="text-[11px] text-rose-500">{formErrors.unitName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Rent Amount (₱) <span className="text-rose-500">*</span>
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
                  className={cn('h-9 text-xs', formErrors.rentAmount && 'border-rose-500')}
                />
                {formErrors.rentAmount && (
                  <p className="text-[11px] text-rose-500">{formErrors.rentAmount}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Total Payable (₱) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="35000"
                  value={formData.totalAmountPayable}
                  onChange={(e) => setFormData({ ...formData, totalAmountPayable: e.target.value })}
                  className={cn('h-9 text-xs', formErrors.totalAmountPayable && 'border-rose-500')}
                />
                {formErrors.totalAmountPayable && (
                  <p className="text-[11px] text-rose-500">{formErrors.totalAmountPayable}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Date Contracted <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  className={cn('h-9 text-xs', formErrors.contractDate && 'border-rose-500')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={cn('h-9 text-xs', formErrors.dueDate && 'border-rose-500')}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-stroke/60 bg-surface text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes / Remarks</label>
              <Input
                type="text"
                placeholder="Lease notes or special terms..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stroke/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 text-xs font-semibold bg-primary text-white hover:bg-primary/90"
              >
                Create Lease
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Tenant Lease */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-6 bg-surface border-stroke/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit Tenant Lease Agreement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Update lease details for {activeTenant?.tenantName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Tenant / Lessee Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className={cn('h-9 text-xs', formErrors.tenantName && 'border-rose-500')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Leased Unit / Stall Number <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.unitName}
                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                className={cn('h-9 text-xs', formErrors.unitName && 'border-rose-500')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Rent Amount (₱) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.rentAmount}
                  onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                  className={cn('h-9 text-xs', formErrors.rentAmount && 'border-rose-500')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Total Payable (₱) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.totalAmountPayable}
                  onChange={(e) => setFormData({ ...formData, totalAmountPayable: e.target.value })}
                  className={cn('h-9 text-xs', formErrors.totalAmountPayable && 'border-rose-500')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Date Contracted <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-stroke/60 bg-surface text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes / Remarks</label>
              <Input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stroke/40">
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
                className="h-9 text-xs font-semibold bg-primary text-white hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Delete Tenant Lease Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 bg-surface border-stroke/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Delete Tenant Lease
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg pt-1">
              Are you sure you want to delete the lease agreement for{' '}
              <strong className="text-foreground">{activeTenant?.tenantName}</strong> ({activeTenant?.tenantId})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4">
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
              Delete Lease
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Everyday Rent Payment Collection (Paid vs Missed Day) */}
      <Dialog open={isUpdatePaymentModalOpen} onOpenChange={setIsUpdatePaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-surface border-stroke/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Everyday Rent Collection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Record daily rent collection or report an unpaid / missed day for {activeTenant?.tenantName}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-surface/60 border border-stroke/40 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-fg">Leased Unit:</span>
              <span className="font-semibold text-foreground">{activeTenant?.unitName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Total Payable:</span>
              <span className="font-semibold text-foreground">{formatPHP(activeTenant?.totalAmountPayable || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Already Paid:</span>
              <span className="font-semibold text-emerald-600">{formatPHP(activeTenant?.amountPaid || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-stroke/30 pt-1">
              <span className="font-medium text-foreground">Remaining Balance:</span>
              <span className="font-bold text-amber-600">{formatPHP(activeTenant?.remainingBalance || 0)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmitDailyPayment} className="space-y-4 pt-1">
            {/* Status Type Toggle: Paid vs Missed Day */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Payment Collection Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('Paid')
                    setPaymentError('')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 h-9 rounded-xl border text-xs font-semibold transition-all',
                    paymentStatusType === 'Paid'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-xs'
                      : 'border-stroke/60 bg-surface text-muted-fg hover:bg-surface/80'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Paid Today</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('Missed')
                    setPaymentError('')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 h-9 rounded-xl border text-xs font-semibold transition-all',
                    paymentStatusType === 'Missed'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-600 shadow-xs'
                      : 'border-stroke/60 bg-surface text-muted-fg hover:bg-surface/80'
                  )}
                >
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Did Not Pay Today</span>
                </button>
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {paymentStatusType === 'Paid' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Remittance Amount (₱) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 1000"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value)
                      setPaymentError('')
                    }}
                    className={cn('h-9 text-xs', paymentError && 'border-rose-500')}
                  />
                  {paymentError && <p className="text-[11px] text-rose-500">{paymentError}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-stroke/60 bg-surface text-xs font-medium text-foreground focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      OR / Reference Number
                    </label>
                    <Input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-9 text-xs"
                      placeholder="OR-JK-101"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Missed / Unpaid Day Options */
              <div className="space-y-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-rose-600">
                    Reason for Non-Payment
                  </label>
                  <select
                    value={missedReason}
                    onChange={(e) => setMissedReason(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-rose-500/30 bg-surface text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="Stall closed for the day">Stall closed for the day</option>
                    <option value="Severe weather / Typhoon suspension">Severe weather / Typhoon suspension</option>
                    <option value="Delayed sales remittance">Delayed sales remittance (Promised tomorrow)</option>
                    <option value="Stall renovation / Maintenance">Stall renovation / Maintenance</option>
                    <option value="Official Holiday">Official Holiday / Market closed</option>
                    <option value="Other / Tenant absent">Other / Tenant absent</option>
                  </select>
                </div>
                <p className="text-[11px] text-muted-fg leading-relaxed">
                  This records a ₱0.00 collection entry with a timestamped record so daily audit and lease ledgers remain 100% accounted for.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Remarks / Notes</label>
              <Input
                type="text"
                placeholder="Optional collection notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stroke/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUpdatePaymentModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className={cn(
                  'h-9 text-xs font-semibold text-white shadow-xs',
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

      {/* MODAL: Full Row Detail View on Row Click */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto p-6 bg-surface border-stroke/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center justify-between">
              <span>Tenant Lease Details</span>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase',
                  activeTenant?.status === 'Active' && 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
                  activeTenant?.status === 'Completed' && 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                  activeTenant?.status === 'Overdue' && 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
                  activeTenant?.status === 'Pending' && 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                )}
              >
                {activeTenant?.status}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg font-mono">
              Tenant ID: {activeTenant?.tenantId} • {activeTenant?.companyName}
            </DialogDescription>
          </DialogHeader>

          {activeTenant && (
            <div className="space-y-5 pt-2">
              {/* Overview Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface/60 border border-stroke/40">
                <div>
                  <span className="text-[11px] text-muted-fg">Tenant / Lessee</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">{activeTenant.tenantName}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Leased Unit / Stall</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">{activeTenant.unitName}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Contract Date</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">{activeTenant.contractDate}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Due Date</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">{activeTenant.dueDate}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Rent Rate</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">{formatPHP(activeTenant.rentAmount)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Total Payable</span>
                  <div className="font-bold text-xs text-foreground mt-0.5">{formatPHP(activeTenant.totalAmountPayable)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Amount Paid</span>
                  <div className="font-bold text-xs text-emerald-600 mt-0.5">{formatPHP(activeTenant.amountPaid)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Remaining Balance</span>
                  <div className="font-bold text-xs text-amber-600 mt-0.5">{formatPHP(activeTenant.remainingBalance)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-muted-fg">Collection Progress</span>
                  <div className="font-semibold text-xs text-foreground mt-0.5">
                    {activeTenant.totalAmountPayable > 0
                      ? `${Math.round((activeTenant.amountPaid / activeTenant.totalAmountPayable) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              </div>

              {activeTenant.notes && (
                <div className="p-3 rounded-xl bg-surface/40 border border-stroke/30 text-xs">
                  <span className="font-semibold text-foreground">Notes: </span>
                  <span className="text-muted-fg">{activeTenant.notes}</span>
                </div>
              )}

              {/* Daily Rent Payment History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Daily Payment & Remittance Ledger ({activeTenant.dailyPayments.length})
                  </h4>
                  <Button
                    size="sm"
                    onClick={(e) => handleOpenDailyPayment(activeTenant, e)}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-primary text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Record Daily Rent
                  </Button>
                </div>

                <div className="border border-stroke/40 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-surface/80">
                      <TableRow className="border-b border-stroke/30">
                        <TableHead className="text-[11px] font-bold py-2">Date</TableHead>
                        <TableHead className="text-[11px] font-bold py-2">Status</TableHead>
                        <TableHead className="text-right text-[11px] font-bold py-2">Amount</TableHead>
                        <TableHead className="text-[11px] font-bold py-2">Method</TableHead>
                        <TableHead className="text-[11px] font-bold py-2">Reference No</TableHead>
                        <TableHead className="text-[11px] font-bold py-2">Notes / Reason</TableHead>
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
                          <TableRow key={p.id} className="border-b border-stroke/20 text-xs">
                            <TableCell className="py-2 font-medium">{p.date}</TableCell>
                            <TableCell className="py-2">
                              {p.status === 'Missed' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">
                                  Missed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                  Paid
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-right font-semibold">
                              {p.status === 'Missed' ? '₱0.00' : formatPHP(p.amount)}
                            </TableCell>
                            <TableCell className="py-2 text-muted-fg">{p.method}</TableCell>
                            <TableCell className="py-2 font-mono text-[11px] text-muted-fg">
                              {p.referenceNo || '—'}
                            </TableCell>
                            <TableCell className="py-2 text-muted-fg">
                              {p.status === 'Missed' ? p.missedReason || p.notes : p.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="h-8 text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
