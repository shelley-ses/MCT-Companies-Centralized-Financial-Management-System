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
  Calendar,
  CreditCard,
  AlertCircle,
  Pencil,
  Trash2,
  Coins,
  MoreVertical,
  Eye,
  Lock,
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
import { useSession } from '@/hooks/useSession'
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { formatPHP } from '@/lib/format'
import { isDateInRange, formatToYYYYMMDD } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'
import {
  type DailyPaymentRecord,
  type LendingFacility,
  lendingService,
  INITIAL_FACILITIES,
  LENDING_STORAGE_KEY as STORAGE_KEY,
  getMonthlyProgress,
  getNextInstallmentInfo,
  buildDailyLedger,
} from '@/services/lendingService'

// Period options matching Sales Page
const PERIOD_OPTIONS = ['Daily', 'Quarterly', 'Monthly', 'Annually'] as const
type PeriodType = (typeof PERIOD_OPTIONS)[number]

const ITEMS_PER_PAGE = 10

export const LendingPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isAudit = userRole === 'audit' || userRole.includes('auditor')

  // Set document title
  React.useEffect(() => {
    document.title = 'Lending - MCT Centralized Financial Management'
  }, [])

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

  // Sync with backend lending service on mount
  React.useEffect(() => {
    lendingService
      .getFacilities()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFacilities(data)
        }
      })
      .catch((err) => {
        console.warn('Lending backend sync notice:', err)
      })
  }, [])

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

  // Dropdowns state matching SalesPage & TenantPage
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const periodDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)
  const tableCardRef = React.useRef<HTMLDivElement>(null)

  // View mode and modals state
  const [viewMode, setViewMode] = React.useState<'list' | 'details'>('list')
  const [paymentCalendarMonth, setPaymentCalendarMonth] = React.useState<Date>(() => new Date())
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isDailyPaymentModalOpen, setIsDailyPaymentModalOpen] = React.useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)

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

  // Helper to project due date from start date and term days
  const calculateProjectedDueDate = React.useCallback((startDateStr: string, daysStr: string): string => {
    if (!startDateStr) return ''
    const d = new Date(startDateStr)
    const days = parseInt(daysStr, 10)
    if (isNaN(d.getTime()) || isNaN(days) || days <= 0) return ''
    d.setDate(d.getDate() + days)
    return formatToYYYYMMDD(d)
  }, [])

  // Form state for New Lending Facility Modal
  // Default 40 term days for Daily and 20.0% interest rate
  const [formData, setFormData] = React.useState<{
    borrowerName: string
    loanAmount: string
    interestRate: string
    termDays: string
    dateBorrowed: string
    dueDate: string
    paymentFrequency: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
    notes: string
  }>({
    borrowerName: '',
    loanAmount: '',
    interestRate: '20.0',
    termDays: '40',
    dateBorrowed: '2026-10-21',
    dueDate: '2026-11-30',
    paymentFrequency: 'Daily',
    notes: '',
  })

  // Form state for Edit Lending Facility Modal
  const [editFormData, setEditFormData] = React.useState<{
    borrowerName: string
    loanAmount: string
    interestRate: string
    termDays: string
    dateBorrowed: string
    dueDate: string
    status: LendingFacility['status']
    paymentFrequency: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
    notes: string
  }>({
    borrowerName: '',
    loanAmount: '',
    interestRate: '',
    termDays: '40',
    dateBorrowed: '',
    dueDate: '',
    status: 'Active',
    paymentFrequency: 'Daily',
    notes: '',
  })

  // Search query for Payment History in Lending Information Modal
  const [historySearchQuery, setHistorySearchQuery] = React.useState('')

  // Form state for Update Payment Modal
  const [paymentForm, setPaymentForm] = React.useState<{
    paymentAmount: string
    paymentDate: string
    method: string
    referenceNo: string
    notes: string
  }>({
    paymentAmount: '',
    paymentDate: formatToYYYYMMDD(new Date()),
    method: 'Cash',
    referenceNo: '',
    notes: '',
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

  // Filter facilities based on status, date range, and search query (locked to FilCap Prime Holdings Corp.)
  const filteredFacilities = React.useMemo(() => {
    return facilities.filter((item) => {
      // 1. Status filter
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
  }, [facilities, statusFilter, searchQuery, dateRange])

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
    link.setAttribute('download', `lending_portfolio_${Date.now()}.csv`)
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
          <title>Lending Portfolio Summary</title>
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
          <p>Portfolio Summary for Lending Accounts · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
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
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAudit) return
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

    const termDaysNum = parseInt(formData.termDays || (formData.paymentFrequency === 'Daily' ? '40' : '60'), 10)

    const newFacility = await lendingService.createFacility({
      borrowerName: formData.borrowerName.trim(),
      loanAmount: principalNum,
      interestRate: rateNum,
      paymentFrequency: formData.paymentFrequency,
      termDays: termDaysNum,
      dateBorrowed: formData.dateBorrowed,
      dueDate: formData.dueDate,
      notes: formData.notes.trim() || 'Everyday micro-credit lending facility.',
    })

    const updatedList = [newFacility, ...facilities.filter((f) => f.id !== newFacility.id)]
    saveFacilities(updatedList)
    setIsAddModalOpen(false)

    // Reset form
    const currentToday = formatToYYYYMMDD(new Date())
    setFormData({
      borrowerName: '',
      loanAmount: '',
      interestRate: '20.0',
      termDays: '40',
      dateBorrowed: currentToday,
      dueDate: calculateProjectedDueDate(currentToday, '40'),
      paymentFrequency: 'Daily',
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
    if (isAudit) return
    setActiveFacility(facility)
    setEditFormData({
      borrowerName: facility.borrowerName,
      loanAmount: String(facility.loanAmount),
      interestRate: String(facility.interestRate),
      termDays: String(facility.termDays || (facility.paymentFrequency === 'Daily' ? 40 : 60)),
      dateBorrowed: facility.dateBorrowed,
      dueDate: facility.dueDate,
      status: facility.status,
      paymentFrequency: facility.paymentFrequency || 'Daily',
      notes: facility.notes || '',
    })
    setIsEditModalOpen(true)
  }

  // Save changes from Edit Modal
  const handleSaveEditFacility = (e: React.FormEvent) => {
    e.preventDefault()
    if (isAudit || !activeFacility) return

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
      status: resolvedStatus,
      paymentFrequency: editFormData.paymentFrequency,
      totalAmountPayable: newTotalPayable,
      remainingBalance: newRemaining,
      notes: editFormData.notes.trim(),
    }

    const updatedList = facilities.map((f) => (f.id === activeFacility.id ? updated : f))
    saveFacilities(updatedList)
    setIsEditModalOpen(false)
    setActiveFacility(null)
  }

  // Open Update Payment Modal ("Update" action button)
  const handleOpenPaymentModal = (facility: LendingFacility, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (isAudit) return
    setActiveFacility(facility)

    // Compute smart initial date: for Daily, pick the first unpaid date (or today if unpaid)
    let initialDate = formatToYYYYMMDD(new Date())
    if ((!facility.paymentFrequency || facility.paymentFrequency === 'Daily') && facility.dailyPayments) {
      const paidDates = new Set(
        facility.dailyPayments.filter((p) => p.status === 'Paid').map((p) => p.date)
      )
      if (paidDates.has(initialDate)) {
        const start = new Date(facility.dateBorrowed)
        const today = new Date(initialDate)
        let foundUnpaid: string | null = null
        if (!isNaN(start.getTime())) {
          const cur = new Date(start)
          while (cur <= today) {
            const d = formatToYYYYMMDD(cur)
            if (!paidDates.has(d)) {
              foundUnpaid = d
              break
            }
            cur.setDate(cur.getDate() + 1)
          }
        }
        if (foundUnpaid) {
          initialDate = foundUnpaid
        } else {
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          initialDate = formatToYYYYMMDD(tomorrow)
        }
      }
    }

    setPaymentForm({
      paymentAmount: '',
      paymentDate: initialDate,
      method: 'Cash',
      referenceNo: '',
      notes: '',
    })
    setPaymentCalendarMonth(new Date(initialDate || new Date()))
    setIsDailyPaymentModalOpen(true)
  }
  const handleOpenDailyPaymentModal = handleOpenPaymentModal

  // Confirm Payment
  const handleRecordDailyPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAudit || !activeFacility) return

    // Period immutability: check if daily date is already fully paid
    const isDaily = !activeFacility.paymentFrequency || activeFacility.paymentFrequency === 'Daily'
    if (isDaily) {
      const alreadyPaid = (activeFacility.dailyPayments || []).some(
        (p) => p.date === paymentForm.paymentDate && p.status === 'Paid'
      )
      if (alreadyPaid) {
        alert(
          `Date ${paymentForm.paymentDate} is already fully paid and locked. You cannot add or duplicate payments for a settled date.`
        )
        return
      }
    }

    const paymentNum = parseFloat(paymentForm.paymentAmount)
    if (isNaN(paymentNum) || paymentNum < 1) {
      alert('Payment Amount cannot be lower than ₱1.00.')
      return
    }

    if (paymentNum > activeFacility.remainingBalance) {
      alert(
        `Payment amount (${formatPHP(paymentNum)}) cannot exceed the remaining balance of ${formatPHP(activeFacility.remainingBalance)}.`
      )
      return
    }

    // Call backend lending service with authoritative settlement locking
    const backendRes = await lendingService.recordPayment({
      facilityId: activeFacility.id,
      paymentDate: paymentForm.paymentDate,
      amount: paymentNum,
      method: paymentForm.method,
      referenceNo: paymentForm.referenceNo,
      notes: paymentForm.notes,
    })
    if (!backendRes.success) {
      alert(backendRes.message || 'Payment could not be recorded.')
      return
    }

    // Monthly schedule: partial / full tracking
    const isMonthly = activeFacility.paymentFrequency === 'Monthly'
    let resolvedMonthIndex: number | undefined = undefined
    let resolvedPeriodLabel: string | undefined = undefined
    let paymentStatus: 'Paid' | 'Partial' = 'Paid'

    if (isMonthly) {
      const progress = getMonthlyProgress(activeFacility)
      const currentMonth = progress.activeMonth
      resolvedMonthIndex = currentMonth.monthIndex
      resolvedPeriodLabel = `Month ${currentMonth.monthIndex}`

      if (paymentNum > currentMonth.remaining) {
        alert(
          `For Month ${currentMonth.monthIndex}, the maximum due is ${formatPHP(currentMonth.remaining)}. Please settle this month first before paying for subsequent months.`
        )
        return
      }

      // If partial, the borrower has to settle the partial before paying another month.
      // Partial payment is not considered "Paid" for that month.
      if (paymentNum < currentMonth.remaining) {
        paymentStatus = 'Partial'
      } else {
        paymentStatus = 'Paid'
      }
    }

    const updatedAmountPaid = activeFacility.amountPaid + paymentNum
    const updatedRemainingBalance = Math.max(0, activeFacility.totalAmountPayable - updatedAmountPaid)
    const updatedStatus: LendingFacility['status'] =
      updatedRemainingBalance <= 0 ? 'Completed' : activeFacility.status === 'Completed' ? 'Active' : activeFacility.status

    const newPaymentRecord: DailyPaymentRecord = {
      id: `dp-${Date.now()}`,
      date: paymentForm.paymentDate,
      amount: paymentNum,
      method: paymentForm.method,
      referenceNo: paymentForm.referenceNo.trim(),
      notes: paymentForm.notes.trim(),
      status: paymentStatus,
      monthIndex: resolvedMonthIndex,
      periodLabel: resolvedPeriodLabel,
      timestamp: new Date().toISOString(),
      isLocked: paymentStatus === 'Paid',
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
    if (isAudit) return
    setActiveFacility(facility)
    setIsDeleteConfirmOpen(true)
  }

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (isAudit || !activeFacility) return
    const updatedList = facilities.filter((f) => f.id !== activeFacility.id)
    saveFacilities(updatedList)
    setIsDeleteConfirmOpen(false)
    setActiveFacility(null)
  }

  // Open Complete Information page on row click
  const handleRowClick = (facility: LendingFacility) => {
    setActiveFacility(facility)
    setHistorySearchQuery('')
    setViewMode('details')
  }

  // Filtered payment records for Lending Information View
  const filteredHistoryPayments = React.useMemo(() => {
    if (!activeFacility) return []
    const baseList =
      !activeFacility.paymentFrequency || activeFacility.paymentFrequency === 'Daily'
        ? buildDailyLedger(activeFacility)
        : activeFacility.dailyPayments || []

    if (!historySearchQuery.trim()) return baseList
    const q = historySearchQuery.toLowerCase().trim()
    return baseList.filter((p) => {
      const matchStatus = p.status ? p.status.toLowerCase().includes(q) : false
      const matchDate = p.date.toLowerCase().includes(q)
      const matchNotes = p.notes && p.notes !== '-' ? p.notes.toLowerCase().includes(q) : false
      const matchRef = p.referenceNo && p.referenceNo !== '-' ? p.referenceNo.toLowerCase().includes(q) : false
      const matchMethod = p.method && p.method !== '-' ? p.method.toLowerCase().includes(q) : false
      const matchPeriod = p.periodLabel ? p.periodLabel.toLowerCase().includes(q) : false
      return matchStatus || matchDate || matchNotes || matchRef || matchMethod || matchPeriod
    })
  }, [activeFacility, historySearchQuery])

  // Dedicated Full Screen Details Page View
  const renderDetailsPage = () => {
    if (!activeFacility) return null

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top navigation row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewMode('list')}
            className="h-10 px-4 rounded-xl font-semibold text-xs sm:text-sm border border-stroke/60 bg-white text-focus hover:bg-surface flex items-center gap-2 cursor-pointer shadow-2xs self-start"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Lending Facilities</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />
            <span
              className={cn(
                'inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider',
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

            {!isAudit && activeFacility.remainingBalance > 0 && (
              <Button
                type="button"
                onClick={(e) => handleOpenPaymentModal(activeFacility, e)}
                className="h-10 px-4 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Coins className="h-4 w-4" />
                <span>Record Payment</span>
              </Button>
            )}

            {!isAudit && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleOpenEditModal(activeFacility, e)}
                className="h-10 px-3.5 rounded-xl border border-stroke/60 font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-surface text-focus"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Terms</span>
              </Button>
            )}
          </div>
        </div>

        {/* Borrower & Facility Header Card */}
        <div className="bg-white border border-stroke/60 rounded-2xl p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {activeFacility.loanId}
                </span>
                <span className="text-xs text-muted-fg font-medium">
                  Schedule: <strong className="text-focus">{activeFacility.paymentFrequency || 'Daily'}</strong>
                </span>
                <span className="text-xs text-muted-fg font-medium">
                  Term: <strong className="text-focus">{activeFacility.termDays || (activeFacility.paymentFrequency === 'Daily' ? 40 : 60)} Days</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-focus tracking-tight">
                {activeFacility.borrowerName}
              </h1>
              {(activeFacility.borrowerContact || activeFacility.borrowerAddress) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-fg mt-2">
                  {activeFacility.borrowerContact && (
                    <span className="flex items-center gap-1">
                      <strong className="text-focus">Contact:</strong> {activeFacility.borrowerContact}
                    </span>
                  )}
                  {activeFacility.borrowerAddress && (
                    <span className="flex items-center gap-1">
                      <strong className="text-focus">Address:</strong> {activeFacility.borrowerAddress}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Collection Progress Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:min-w-[280px]">
              <div className="flex justify-between items-center text-xs font-semibold text-muted-fg mb-1.5">
                <span>Collection Progress</span>
                <span className="font-bold text-focus">
                  {activeFacility.totalAmountPayable > 0
                    ? ((activeFacility.amountPaid / activeFacility.totalAmountPayable) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
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
              <div className="flex justify-between items-center text-[11px] text-muted-fg mt-1.5">
                <span>Paid: <strong className="text-emerald-600">{formatPHP(activeFacility.amountPaid)}</strong></span>
                <span>Total: <strong className="text-focus">{formatPHP(activeFacility.totalAmountPayable)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Spacious Financial Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Principal Amount
            </span>
            <span className="text-base sm:text-xl font-bold text-focus block mt-1">
              {formatPHP(activeFacility.loanAmount)}
            </span>
            <span className="text-[10.5px] text-muted-fg mt-0.5 block">
              Disbursed capital
            </span>
          </div>

          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Interest Rate
            </span>
            <span className="text-base sm:text-xl font-bold text-focus block mt-1">
              {activeFacility.interestRate}%
            </span>
            <span className="text-[10.5px] text-muted-fg mt-0.5 block">
              +{formatPHP(Math.max(0, activeFacility.totalAmountPayable - activeFacility.loanAmount))} interest
            </span>
          </div>

          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Total Payable
            </span>
            <span className="text-base sm:text-xl font-extrabold text-focus block mt-1">
              {formatPHP(activeFacility.totalAmountPayable)}
            </span>
            <span className="text-[10.5px] text-muted-fg mt-0.5 block">
              Principal + interest
            </span>
          </div>

          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Amount Paid
            </span>
            <span className="text-base sm:text-xl font-extrabold text-emerald-600 block mt-1">
              {formatPHP(activeFacility.amountPaid)}
            </span>
            <span className="text-[10.5px] text-emerald-700/80 mt-0.5 block">
              Total collections
            </span>
          </div>

          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Remaining Balance
            </span>
            <span className="text-base sm:text-xl font-extrabold text-amber-600 block mt-1">
              {formatPHP(activeFacility.remainingBalance)}
            </span>
            <span className="text-[10.5px] text-amber-700/80 mt-0.5 block">
              Balance to complete
            </span>
          </div>

          <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Installment Target
            </span>
            <span className="text-base sm:text-xl font-bold text-focus block mt-1">
              {formatPHP(
                activeFacility.installmentTarget ||
                  Math.round(
                    (activeFacility.totalAmountPayable /
                      (activeFacility.termDays || (activeFacility.paymentFrequency === 'Daily' ? 40 : 60))) *
                      100
                  ) / 100
              )}
            </span>
            <span className="text-[10.5px] text-muted-fg mt-0.5 block">
              Per {activeFacility.paymentFrequency === 'Daily' ? 'day' : 'month'}
            </span>
          </div>
        </div>

        {/* Two Section Layout: Terms Summary (Left) & Complete Schedule Ledger (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left 1 Column: Agreement Terms & Dates */}
          <div className="bg-white border border-stroke/60 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-focus">
              Loan Agreement & Terms
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Payment Frequency:</span>
                <span className="font-semibold text-focus">{activeFacility.paymentFrequency || 'Daily'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Loan Term Duration:</span>
                <span className="font-semibold text-focus">
                  {activeFacility.termDays || (activeFacility.paymentFrequency === 'Daily' ? 40 : 60)} Days
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Date Borrowed:</span>
                <span className="font-mono text-focus">{activeFacility.dateBorrowed}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Maturity Due Date:</span>
                <span className="font-mono text-focus">{activeFacility.dueDate}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Advance Credit:</span>
                <span className="font-bold text-sky-600">{formatPHP(activeFacility.advanceAmount || 0)}</span>
              </div>
            </div>

            {activeFacility.notes && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-muted-fg mt-3">
                <strong className="text-focus font-semibold block mb-0.5">Agreement Notes:</strong>
                {activeFacility.notes}
              </div>
            )}
          </div>

          {/* Right 3 Columns: Full Width Payment History & Schedule Table */}
          <div className="lg:col-span-3 bg-white border border-stroke/60 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-focus">
                  Payment Schedule & History ({filteredHistoryPayments.length})
                </h3>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search payments by date, ref, remarks..."
                  className="w-full h-8.5 pl-8 pr-7 rounded-xl border border-stroke/60 bg-white text-xs text-focus placeholder:text-muted-fg/70 focus:outline-none focus:ring-2 focus:ring-focus/20 transition-all"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-muted-fg font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Target Due</th>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Amount Paid</th>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Method</th>
                    <th className="py-2.5 px-3.5 text-left whitespace-nowrap">Reference No.</th>
                    <th className="py-2.5 px-3.5 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-fg text-xs">
                        {historySearchQuery
                          ? `No payment records matching "${historySearchQuery}".`
                          : 'No payments recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryPayments.map((p) => {
                      const isAdvancePaid = p.status === 'Advance Paid'
                      const isMissed = p.status === 'Missed' || (p.amount === 0 && p.status !== 'Paid' && !isAdvancePaid)
                      const isPartial = p.status === 'Partial'
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            'hover:bg-slate-50/70 transition-colors',
                            isAdvancePaid && 'bg-sky-50/20',
                            isMissed && 'bg-rose-50/20',
                            isPartial && 'bg-amber-50/20'
                          )}
                        >
                          <td className="py-2.5 px-3.5 font-mono text-muted-fg whitespace-nowrap font-medium">
                            {p.date}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            {isAdvancePaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <Lock className="w-2.5 h-2.5 text-sky-600" />
                                <span>Advance Paid</span>
                              </span>
                            ) : isMissed ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Missed
                              </span>
                            ) : isPartial ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {p.periodLabel ? `${p.periodLabel} (Partial)` : 'Partial'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{p.periodLabel ? `${p.periodLabel} (Paid)` : 'Paid'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-fg whitespace-nowrap">
                            {p.target ? formatPHP(p.target) : '-'}
                          </td>
                          <td
                            className={cn(
                              'py-2.5 px-3.5 font-bold whitespace-nowrap',
                              isAdvancePaid ? 'text-sky-600' : isMissed ? 'text-muted-fg font-normal' : isPartial ? 'text-amber-700' : 'text-emerald-600'
                            )}
                          >
                            {isAdvancePaid ? 'Covered' : isMissed ? '-' : formatPHP(p.amount)}
                          </td>
                          <td className="py-2.5 px-3.5 text-focus whitespace-nowrap">
                            {isAdvancePaid ? 'Advance Credit' : isMissed ? '-' : p.method || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-muted-fg whitespace-nowrap">
                            {isAdvancePaid ? 'ADVANCE' : isMissed ? '-' : p.referenceNo || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-fg truncate max-w-[200px]" title={isMissed ? '-' : p.notes || '-'}>
                            {isAdvancePaid ? 'Covered by advance payment' : isMissed ? '-' : p.notes || '-'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {viewMode === 'details' && activeFacility ? (
        renderDetailsPage()
      ) : (
        <>
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
              Here's the summary of all lending accounts and borrower facilities.
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
          </div>
        </div>
      </div>

      {/* Main Table Card matching Sales Page */}
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
              <col style={{ width: '22%' }} /> {/* Borrower's Name */}
              <col style={{ width: '11%' }} /> {/* Loan Amount */}
              <col style={{ width: '10%' }} /> {/* Date Borrowed */}
              <col style={{ width: '10%' }} /> {/* Due Date */}
              <col style={{ width: '12%' }} /> {/* Total Amount Payable */}
              <col style={{ width: '11%' }} /> {/* Amount Paid */}
              <col style={{ width: '11%' }} /> {/* Remaining Balance */}
              <col style={{ width: '8%' }} />  {/* Status */}
              <col style={{ width: '5%' }} />  {/* Actions */}
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-stroke/30 hover:bg-transparent">
                <TableHead className="w-[22%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
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
                <TableHead className="w-[8%] px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  STATUS
                </TableHead>
                <TableHead className="w-[5%] px-2 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFacilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center py-8">
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
                      {/* 1. Borrower's Name */}
                      <TableCell className="w-[22%] px-3.5 py-3.5 text-left">
                        <div className="font-semibold text-xs text-focus truncate max-w-[280px]" title={facility.borrowerName}>
                          {facility.borrowerName}
                        </div>
                        {facility.borrowerContact ? (
                          <div className="text-[10.5px] text-muted-fg truncate max-w-[280px]">
                            {facility.borrowerContact}
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-slate-400 font-mono truncate max-w-[280px]">
                            {facility.loanId}
                          </div>
                        )}
                      </TableCell>

                      {/* 2. Loan Amount */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-semibold text-xs text-focus tabular-nums whitespace-nowrap">
                        {formatPHP(facility.loanAmount)}
                      </TableCell>

                      {/* 3. Date Borrowed */}
                      <TableCell className="w-[10%] px-3.5 py-3.5 text-left font-mono text-xs text-muted-fg whitespace-nowrap">
                        {facility.dateBorrowed}
                      </TableCell>

                      {/* 4. Due Date */}
                      <TableCell className="w-[10%] px-3.5 py-3.5 text-left text-xs whitespace-nowrap">
                        <div className="font-mono text-muted-fg font-medium">{facility.dueDate}</div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {facility.termDays || (facility.paymentFrequency === 'Daily' ? 40 : 60)} days term
                        </div>
                      </TableCell>

                      {/* 5. Total Amount Payable */}
                      <TableCell className="w-[12%] px-3.5 py-3.5 text-left font-bold text-xs text-focus tabular-nums whitespace-nowrap">
                        {formatPHP(facility.totalAmountPayable)}
                      </TableCell>

                      {/* 6. Amount Paid */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-semibold text-xs text-emerald-600 tabular-nums whitespace-nowrap">
                        {formatPHP(facility.amountPaid)}
                      </TableCell>

                      {/* 7. Remaining Balance */}
                      <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-bold text-xs text-amber-600 tabular-nums whitespace-nowrap">
                        <div>{formatPHP(facility.remainingBalance)}</div>
                      </TableCell>

                      {/* 8. Status */}
                      <TableCell className="w-[8%] px-3 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider',
                            statusColors
                          )}
                        >
                          {facility.status}
                        </span>

                        {facility.auditStatus && (
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span
                              className={cn(
                                'inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border',
                                facility.auditStatus === 'Verified'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              )}
                            >
                              {facility.auditStatus === 'Verified' ? 'Audited' : 'Discrepancy'}
                            </span>
                          </div>
                        )}
                        {facility.auditDate && (
                          <span className="block text-[9.5px] text-muted-fg font-mono mt-0.5">
                            {facility.auditDate}
                          </span>
                        )}
                      </TableCell>

                      {/* 9. Actions: 3 dots dropdown (Edit, Delete, Update) */}
                      <TableCell className="w-[5%] px-2 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
      </>
      )}

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
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const fac = activeMenuFacility
                    if (fac) {
                      const timestamp = new Date().toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      const updated = facilities.map((item) =>
                        item.id === fac.id
                          ? { ...item, auditStatus: 'Verified' as const, auditDate: timestamp, auditedBy: user?.fullName || 'Audit' }
                          : item
                      )
                      setFacilities(updated)
                      if (typeof window !== 'undefined') {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (err) {}
                      }
                      setOpenMenuFacilityId(null)
                      setMenuPosition(null)
                      setActiveMenuFacility(null)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Mark as Audit</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const fac = activeMenuFacility
                    if (fac) {
                      const timestamp = new Date().toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      const updated = facilities.map((item) =>
                        item.id === fac.id
                          ? { ...item, auditStatus: 'Flagged' as const, auditDate: timestamp, auditedBy: user?.fullName || 'Audit' }
                          : item
                      )
                      setFacilities(updated)
                      if (typeof window !== 'undefined') {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (err) {}
                      }
                      setOpenMenuFacilityId(null)
                      setMenuPosition(null)
                      setActiveMenuFacility(null)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Mark as Discrepancy</span>
                </button>

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
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-focus hover:bg-slate-50 transition-colors text-left cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                  <span>View Details</span>
                </button>
              </>
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
              Enter the borrower and loan details to disburse a new credit agreement.
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
                  placeholder="30000"
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
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
                  placeholder="20.0"
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                />
              </div>
            </div>

            {/* Field 4 & 5: Payment Schedule & Term Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Payment Schedule <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.paymentFrequency}
                  onChange={(e) => {
                    const freq = e.target.value as 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
                    const newTerm = freq === 'Daily' ? '40' : (freq === 'Monthly' ? '60' : formData.termDays)
                    const newDue = calculateProjectedDueDate(formData.dateBorrowed, newTerm)
                    setFormData({
                      ...formData,
                      paymentFrequency: freq,
                      termDays: newTerm,
                      dueDate: newDue || formData.dueDate,
                    })
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20 font-semibold"
                >
                  <option value="Daily">Daily</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Term (Days) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={formData.termDays}
                  onChange={(e) => {
                    const val = e.target.value
                    const newDue = calculateProjectedDueDate(formData.dateBorrowed, val)
                    setFormData({
                      ...formData,
                      termDays: val,
                      dueDate: newDue || formData.dueDate,
                    })
                  }}
                  placeholder="40"
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                />
              </div>
            </div>

            {/* Field 6 & 7: Date Borrowed & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Date Borrowed <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="date"
                  value={formData.dateBorrowed}
                  onChange={(e) => {
                    const val = e.target.value
                    const newDue = calculateProjectedDueDate(val, formData.termDays)
                    setFormData({
                      ...formData,
                      dateBorrowed: val,
                      dueDate: newDue || formData.dueDate,
                    })
                  }}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Due Date (Auto projected) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Dynamic Calculation Summary Box */}
            {formData.loanAmount && !isNaN(parseFloat(formData.loanAmount)) && (() => {
              const p = parseFloat(formData.loanAmount) || 0
              const r = parseFloat(formData.interestRate || '20.0') || 0
              const interest = p * (r / 100)
              const totalPayable = p + interest
              const termDays = parseInt(formData.termDays || '40', 10) || 40
              const cycleCount = formData.paymentFrequency === 'Daily' ? termDays : Math.max(1, Math.round(termDays / 30))
              const installmentTarget = cycleCount > 0 ? totalPayable / cycleCount : totalPayable
              const penaltyFee = installmentTarget * 0.05

              return (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-fg">Total Interest ({formData.interestRate}%):</span>
                    <span className="font-semibold text-focus">
                      {formatPHP(interest)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-1">
                    <span className="font-bold text-focus">Total Amount Payable:</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {formatPHP(totalPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-fg text-[11px] pt-0.5">
                    <span>
                      {formData.paymentFrequency} Installment Target ({termDays} days):
                    </span>
                    <span className="font-bold text-focus">
                      {formatPHP(installmentTarget)}{' '}
                      / {formData.paymentFrequency === 'Daily' ? 'day' : 'month'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-0.5 text-rose-600 border-t border-slate-200/40">
                    <span className="font-medium">
                      5% Missed Installment Penalty:
                    </span>
                    <span className="font-bold">
                      +{formatPHP(penaltyFee)} / missed {formData.paymentFrequency === 'Daily' ? 'day' : 'month'}
                    </span>
                  </div>
                </div>
              )
            })()}

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

      {/* 5. Modal: Update Payment ("Update" Action Button) */}
      <Dialog open={isDailyPaymentModalOpen} onOpenChange={setIsDailyPaymentModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>Record Payment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Record payment remittance for{' '}
              <strong className="text-focus">{activeFacility?.borrowerName}</strong> ({activeFacility?.paymentFrequency || 'Daily'} Schedule).
            </DialogDescription>
          </DialogHeader>

          {activeFacility && (() => {
            const isDaily = !activeFacility.paymentFrequency || activeFacility.paymentFrequency === 'Daily'
            const maxAllowed = activeFacility.remainingBalance
            const currentPaymentNum = parseFloat(paymentForm.paymentAmount)
            const isAmountValid =
              !isNaN(currentPaymentNum) &&
              currentPaymentNum >= 1 &&
              currentPaymentNum <= maxAllowed
            const isDateAlreadySettled =
              isDaily &&
              (activeFacility.dailyPayments || []).some(
                (p) => p.date === paymentForm.paymentDate && (p.status === 'Paid' || p.status === 'Advance Paid' || !!p.isLocked)
              )

            return (
              <form onSubmit={handleRecordDailyPayment} className="space-y-4 mt-2">
                {/* Financial Balance Summary Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-fg">Payment Schedule:</span>
                    <span className="font-semibold text-focus">
                      {activeFacility.paymentFrequency || 'Daily'}
                    </span>
                  </div>
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

                {/* Date Settlement Alert if already paid */}
                {isDateAlreadySettled && (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Date Already Settled ({paymentForm.paymentDate})</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Payment for this calendar date has already been recorded and locked. Please select an unpaid date from the calendar below.
                    </p>
                  </div>
                )}

                {/* Payment Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-focus">
                      Payment Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-fg font-medium">
                      Min: ₱1.00 • Max: {formatPHP(maxAllowed)}
                    </span>
                  </div>
                  <Input
                    required
                    type="number"
                    min="1"
                    max={maxAllowed}
                    step="any"
                    value={paymentForm.paymentAmount}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })
                    }
                    placeholder="Enter payment amount"
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {paymentForm.paymentAmount && !isAmountValid && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {currentPaymentNum < 1
                        ? 'Payment amount cannot be lower than ₱1.00.'
                        : `Payment amount cannot exceed ${formatPHP(maxAllowed)}.`}
                    </p>
                  )}
                </div>

                {/* Interactive Calendar Date Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-focus">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-focus">
                      {paymentForm.paymentDate ? `Selected: ${paymentForm.paymentDate}` : 'Please select date'}
                    </span>
                  </div>

                  <div className="border border-stroke/60 rounded-xl p-3 bg-white space-y-2.5">
                    {/* Month Header & Controls */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-focus">
                        {paymentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const prev = new Date(paymentCalendarMonth)
                            prev.setMonth(prev.getMonth() - 1)
                            setPaymentCalendarMonth(prev)
                          }}
                          className="p-1 rounded-md hover:bg-slate-100 text-muted-fg hover:text-focus cursor-pointer"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Date(paymentCalendarMonth)
                            next.setMonth(next.getMonth() + 1)
                            setPaymentCalendarMonth(next)
                          }}
                          className="p-1 rounded-md hover:bg-slate-100 text-muted-fg hover:text-focus cursor-pointer"
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-muted-fg uppercase py-1 border-b border-slate-100">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    {(() => {
                      const calYear = paymentCalendarMonth.getFullYear()
                      const calMonth = paymentCalendarMonth.getMonth()
                      const firstDay = new Date(calYear, calMonth, 1).getDay()
                      const totalDays = new Date(calYear, calMonth + 1, 0).getDate()

                      const existingMap = new Map<string, DailyPaymentRecord>()
                      ;(activeFacility.dailyPayments || []).forEach((p) => {
                        if (p.date) existingMap.set(p.date, p)
                      })

                      const startBorrowed = activeFacility.dateBorrowed || ''

                      return (
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`cal-empty-${i}`} className="h-8" />
                          ))}

                          {Array.from({ length: totalDays }).map((_, i) => {
                            const d = i + 1
                            const dStr = String(d).padStart(2, '0')
                            const mStr = String(calMonth + 1).padStart(2, '0')
                            const dateStr = `${calYear}-${mStr}-${dStr}`

                            const isBefore = startBorrowed ? dateStr < startBorrowed : false
                            const paymentRecord = existingMap.get(dateStr)
                            const isPaid = paymentRecord
                              ? (paymentRecord.status === 'Paid' || paymentRecord.status === 'Advance Paid' || !!paymentRecord.isLocked)
                              : false
                            const isPartial = paymentRecord ? paymentRecord.status === 'Partial' : false
                            const isSelected = paymentForm.paymentDate === dateStr
                            const isDisabled = isBefore || isPaid

                            return (
                              <button
                                key={dateStr}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  if (!isDisabled) {
                                    setPaymentForm({ ...paymentForm, paymentDate: dateStr })
                                  }
                                }}
                                className={cn(
                                  'h-8 rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all',
                                  isSelected &&
                                    'bg-[#960C01] text-white font-bold shadow-xs ring-2 ring-[#960C01]/30 z-10',
                                  !isSelected &&
                                    isPaid &&
                                    'bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-not-allowed opacity-90',
                                  !isSelected &&
                                    isBefore &&
                                    'text-slate-300 cursor-not-allowed bg-slate-50/50',
                                  !isSelected &&
                                    !isPaid &&
                                    !isBefore &&
                                    'hover:bg-slate-100 text-focus cursor-pointer hover:font-bold border border-transparent'
                                )}
                                title={
                                  isPaid
                                    ? `${dateStr}: Fully Paid & Locked (Cannot select)`
                                    : isBefore
                                    ? `${dateStr}: Prior to loan date`
                                    : isPartial
                                    ? `${dateStr}: Partial payment recorded (Select to settle)`
                                    : `Select ${dateStr}`
                                }
                              >
                                <span>{d}</span>
                                {isPaid && <Check className="h-2.5 w-2.5 text-emerald-600 -mt-0.5" />}
                                {isPartial && !isSelected && (
                                  <span className="w-1 h-1 rounded-full bg-amber-500 absolute bottom-1" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {/* Calendar Legend */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-fg pt-2 border-t border-slate-100 gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Paid (Locked)
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#960C01] inline-block" /> Selected
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Partial
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, method: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Receipt / Ref No. (no default value) */}
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Receipt / Ref No.
                  </label>
                  <Input
                    value={paymentForm.referenceNo}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, referenceNo: e.target.value })
                    }
                    placeholder="e.g. OR-88201"
                    className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                  />
                </div>

                {/* Remarks / Notes (Longer text field without default value) */}
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    placeholder="Enter payment remarks or notes..."
                    className="w-full p-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20 resize-none transition-all placeholder:text-muted-fg/60"
                  />
                </div>

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
                    disabled={!isAmountValid || isDateAlreadySettled || !paymentForm.paymentDate}
                    className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    Confirm Payment
                  </Button>
                </div>
              </form>
            )
          })()}
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

              <div className="grid grid-cols-2 gap-3">
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
                    Payment Schedule
                  </label>
                  <select
                    value={editFormData.paymentFrequency}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        paymentFrequency: e.target.value as 'Daily' | 'Monthly' | 'Quarterly' | 'Annually',
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
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
    </div>
  )
}

export default LendingPage
