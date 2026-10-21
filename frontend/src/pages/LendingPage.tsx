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
  AlertCircle,
  Clock,
  X,
  CreditCard,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
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
import { isLendingEnabledCompany } from '@/config/companyFeatures'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface LendingFacility {
  id: string
  facilityNumber: string
  borrower: string
  lenderCompany: string
  principal: number
  interestRateMonthly: number
  termMonths: number
  totalReceivable: number
  amountRepaid: number
  balanceRemaining: number
  disbursementDate: string
  maturityDate: string
  nextDueDate: string
  status: 'Active' | 'Completed' | 'Pending' | 'Overdue'
  notes?: string
}

const INITIAL_FACILITIES: LendingFacility[] = [
  {
    id: 'fac-001',
    facilityNumber: 'FAC-2026-001',
    borrower: 'MCT Hotel',
    lenderCompany: 'JK Property and Ventures',
    principal: 2500000,
    interestRateMonthly: 2.5,
    termMonths: 12,
    totalReceivable: 3250000,
    amountRepaid: 1354166,
    balanceRemaining: 1895834,
    disbursementDate: '2026-01-15',
    maturityDate: '2027-01-15',
    nextDueDate: '2026-11-15',
    status: 'Active',
    notes: 'Q1 Facility upgrade expansion credit',
  },
  {
    id: 'fac-002',
    facilityNumber: 'FAC-2026-002',
    borrower: 'Speedbox',
    lenderCompany: 'JK Property and Ventures',
    principal: 1200000,
    interestRateMonthly: 3.0,
    termMonths: 6,
    totalReceivable: 1416000,
    amountRepaid: 944000,
    balanceRemaining: 472000,
    disbursementDate: '2026-03-01',
    maturityDate: '2026-09-01',
    nextDueDate: '2026-10-30',
    status: 'Active',
    notes: 'Fleet acquisition financing',
  },
  {
    id: 'fac-003',
    facilityNumber: 'FAC-2026-003',
    borrower: 'Annex Nine',
    lenderCompany: 'JK Property and Ventures',
    principal: 800000,
    interestRateMonthly: 2.0,
    termMonths: 12,
    totalReceivable: 992000,
    amountRepaid: 992000,
    balanceRemaining: 0,
    disbursementDate: '2025-09-01',
    maturityDate: '2026-09-01',
    nextDueDate: '-',
    status: 'Completed',
    notes: 'Commercial lease renovation line',
  },
  {
    id: 'fac-004',
    facilityNumber: 'FAC-2026-004',
    borrower: 'JK Printing',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    principal: 1800000,
    interestRateMonthly: 2.75,
    termMonths: 18,
    totalReceivable: 2691000,
    amountRepaid: 897000,
    balanceRemaining: 1794000,
    disbursementDate: '2026-02-10',
    maturityDate: '2027-08-10',
    nextDueDate: '2026-11-10',
    status: 'Active',
    notes: 'Industrial press machinery line',
  },
  {
    id: 'fac-005',
    facilityNumber: 'FAC-2026-005',
    borrower: 'MCT Kitchen',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    principal: 950000,
    interestRateMonthly: 2.5,
    termMonths: 6,
    totalReceivable: 1092500,
    amountRepaid: 364166,
    balanceRemaining: 728334,
    disbursementDate: '2026-06-15',
    maturityDate: '2026-12-15',
    nextDueDate: '2026-11-15',
    status: 'Active',
    notes: 'Inventory working capital financing',
  },
  {
    id: 'fac-006',
    facilityNumber: 'FAC-2026-006',
    borrower: 'Golden Sunburst Ventures',
    lenderCompany: 'FilCap Prime Holdings Corp.',
    principal: 1500000,
    interestRateMonthly: 3.2,
    termMonths: 12,
    totalReceivable: 2076000,
    amountRepaid: 173000,
    balanceRemaining: 1903000,
    disbursementDate: '2026-09-01',
    maturityDate: '2027-09-01',
    nextDueDate: '2026-10-25',
    status: 'Overdue',
    notes: 'Short term bridging facility',
  },
]

export const LendingPage: React.FC = () => {
  const { user } = useSession()
  const { activeCompany, setActiveCompany } = useCompany()

  const [facilities, setFacilities] = React.useState<LendingFacility[]>(INITIAL_FACILITIES)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Active' | 'Completed' | 'Overdue'>('All')
  const [selectedFacility, setSelectedFacility] = React.useState<LendingFacility | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = React.useState(false)
  const [repaymentAmount, setRepaymentAmount] = React.useState('')
  const [repaymentRef, setRepaymentRef] = React.useState('')

  // New facility form state
  const [formData, setFormData] = React.useState({
    borrower: '',
    principal: '',
    interestRateMonthly: '2.5',
    termMonths: '12',
    notes: '',
  })

  // Set document title
  React.useEffect(() => {
    document.title = 'Lending - MCT Centralized Financial System'
  }, [])

  // Resolve lender company scope:
  // If active company is one of the authorized lending companies, filter to that company.
  // Otherwise, default to showing JK Property and Ventures.
  const currentLender = isLendingEnabledCompany(activeCompany)
    ? activeCompany
    : 'JK Property and Ventures'

  const filteredFacilities = React.useMemo(() => {
    return facilities.filter((f) => {
      // Must belong to current active lending company (normalized check)
      const lenderMatches =
        f.lenderCompany.toLowerCase().includes('jk') === currentLender.toLowerCase().includes('jk') ||
        f.lenderCompany.toLowerCase().includes('filcap') === currentLender.toLowerCase().includes('filcap')

      if (!lenderMatches) return false

      if (statusFilter !== 'All' && f.status !== statusFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesBorrower = f.borrower.toLowerCase().includes(q)
        const matchesNumber = f.facilityNumber.toLowerCase().includes(q)
        const matchesNotes = f.notes?.toLowerCase().includes(q)
        if (!matchesBorrower && !matchesNumber && !matchesNotes) return false
      }

      return true
    })
  }, [facilities, currentLender, statusFilter, searchQuery])

  // Summary Metrics
  const metrics = React.useMemo(() => {
    const totalPrincipal = filteredFacilities.reduce((sum, f) => sum + f.principal, 0)
    const totalReceivable = filteredFacilities.reduce((sum, f) => sum + f.totalReceivable, 0)
    const totalRepaid = filteredFacilities.reduce((sum, f) => sum + f.amountRepaid, 0)
    const totalOutstanding = filteredFacilities.reduce((sum, f) => sum + f.balanceRemaining, 0)
    const activeCount = filteredFacilities.filter((f) => f.status === 'Active' || f.status === 'Overdue').length
    const totalInterestExpected = totalReceivable - totalPrincipal

    return {
      totalPrincipal,
      totalReceivable,
      totalRepaid,
      totalOutstanding,
      activeCount,
      totalInterestExpected,
    }
  }, [filteredFacilities])

  const handleExportCsv = () => {
    const headers = [
      'Facility Number',
      'Borrower',
      'Lender Company',
      'Principal',
      'Interest Rate (%/mo)',
      'Term (Months)',
      'Total Receivable',
      'Amount Repaid',
      'Balance Remaining',
      'Status',
      'Disbursement Date',
      'Maturity Date',
    ]

    const rows = filteredFacilities.map((f) => [
      f.facilityNumber,
      `"${f.borrower}"`,
      `"${f.lenderCompany}"`,
      f.principal,
      f.interestRateMonthly,
      f.termMonths,
      f.totalReceivable,
      f.amountRepaid,
      f.balanceRemaining,
      f.status,
      f.disbursementDate,
      f.maturityDate,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Lending_Portfolio_${currentLender.replace(/\s+/g, '_')}_2026.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault()
    const principalNum = parseFloat(formData.principal)
    const rateNum = parseFloat(formData.interestRateMonthly)
    const termNum = parseInt(formData.termMonths, 10)

    if (!formData.borrower || isNaN(principalNum) || principalNum <= 0) {
      alert('Please enter a valid borrower name and principal amount.')
      return
    }

    const totalInterest = (principalNum * (rateNum / 100)) * termNum
    const totalReceivable = principalNum + totalInterest

    const todayStr = '2026-10-21'
    const maturityDate = new Date(2026, 9 + termNum, 21).toISOString().split('T')[0]
    const nextDueDate = new Date(2026, 10, 21).toISOString().split('T')[0]

    const newFacility: LendingFacility = {
      id: `fac-${Date.now()}`,
      facilityNumber: `FAC-2026-${String(facilities.length + 1).padStart(3, '0')}`,
      borrower: formData.borrower,
      lenderCompany: currentLender,
      principal: principalNum,
      interestRateMonthly: rateNum,
      termMonths: termNum,
      totalReceivable,
      amountRepaid: 0,
      balanceRemaining: totalReceivable,
      disbursementDate: todayStr,
      maturityDate,
      nextDueDate,
      status: 'Active',
      notes: formData.notes,
    }

    setFacilities([newFacility, ...facilities])
    setIsAddModalOpen(false)
    setFormData({
      borrower: '',
      principal: '',
      interestRateMonthly: '2.5',
      termMonths: '12',
      notes: '',
    })
  }

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFacility) return
    const amt = parseFloat(repaymentAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid repayment amount.')
      return
    }

    const updatedRepaid = selectedFacility.amountRepaid + amt
    const updatedBalance = Math.max(0, selectedFacility.totalReceivable - updatedRepaid)
    const updatedStatus = updatedBalance === 0 ? 'Completed' : selectedFacility.status

    setFacilities((prev) =>
      prev.map((f) =>
        f.id === selectedFacility.id
          ? {
              ...f,
              amountRepaid: updatedRepaid,
              balanceRemaining: updatedBalance,
              status: updatedStatus,
            }
          : f
      )
    )

    setIsRepaymentModalOpen(false)
    setRepaymentAmount('')
    setRepaymentRef('')
    setSelectedFacility(null)
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 select-none">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-focus">
                  Lending Portfolio
                </h1>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Exclusive Module
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-fg mt-0.5">
                Centralized inter-company credit facility & lending management for{' '}
                <span className="font-semibold text-focus">{currentLender}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="h-10 px-4 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer bg-white text-focus hover:bg-surface border border-stroke/50"
          >
            <Download className="h-4 w-4 text-focus/70" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 rounded-xl font-semibold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer bg-[#960C01] hover:bg-[#800a01] text-white"
          >
            <Plus className="h-4 w-4" />
            <span>New Lending Facility</span>
          </Button>
        </div>
      </div>

      {/* 2. Switcher notice if user is admin viewing generic */}
      {user?.role === 'Admin' && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Currently viewing lending facilities for <strong>{currentLender}</strong>. Only{' '}
              <strong>JK Property and Ventures</strong> and <strong>FilCap Prime Holdings Corp.</strong>{' '}
              have access to this module.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveCompany('JK Property and Ventures')}
              className={cn(
                'h-7 text-xs font-semibold px-2.5 rounded-lg border',
                currentLender.toLowerCase().includes('jk')
                  ? 'bg-amber-200/60 border-amber-400 font-bold text-amber-950'
                  : 'bg-white hover:bg-amber-100/50'
              )}
            >
              JK Property
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveCompany('FilCap Prime Holdings Corp.')}
              className={cn(
                'h-7 text-xs font-semibold px-2.5 rounded-lg border',
                currentLender.toLowerCase().includes('filcap')
                  ? 'bg-amber-200/60 border-amber-400 font-bold text-amber-950'
                  : 'bg-white hover:bg-amber-100/50'
              )}
            >
              FilCap Prime
            </Button>
          </div>
        </div>
      )}

      {/* 3. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-stroke/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-fg tracking-tight">
              Total Capital Lent
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-focus tracking-tight">
              {formatPHP(metrics.totalPrincipal)}
            </div>
            <div className="text-[11px] text-muted-fg mt-0.5">
              Across {filteredFacilities.length} facilities
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-stroke/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-fg tracking-tight">
              Outstanding Receivables
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-amber-600 tracking-tight">
              {formatPHP(metrics.totalOutstanding)}
            </div>
            <div className="text-[11px] text-muted-fg mt-0.5">
              {metrics.activeCount} active agreements
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-stroke/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-fg tracking-tight">
              Principal Repaid
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
              {formatPHP(metrics.totalRepaid)}
            </div>
            <div className="text-[11px] text-muted-fg mt-0.5">
              Recovered capital to date
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-stroke/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-fg tracking-tight">
              Projected Interest Yield
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-purple-600 tracking-tight">
              {formatPHP(metrics.totalInterestExpected)}
            </div>
            <div className="text-[11px] text-muted-fg mt-0.5">
              Contracted gross yield
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stroke/30 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search borrower, facility number, notes…"
            className="pl-9 h-10 rounded-xl text-xs sm:text-sm bg-surface border-stroke/40"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Active', 'Completed', 'Overdue'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
                statusFilter === status
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface hover:bg-surface/80 text-focus border border-stroke/30'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Lending Facilities Table */}
      <Card className="rounded-2xl border border-stroke/30 shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface/60">
              <TableRow>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 pl-6">
                  Facility #
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5">
                  Borrower
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-right">
                  Principal
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-center">
                  Rate
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-right">
                  Repaid
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-right">
                  Outstanding
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-center">
                  Next Due
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 text-center">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-fg uppercase tracking-wider py-3.5 pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-fg">
                      <Landmark className="h-8 w-8 text-muted-fg/40 mb-2" />
                      <p className="text-sm font-semibold">No lending facilities found</p>
                      <p className="text-xs text-muted-fg/70 mt-0.5">
                        Try adjusting your filters or click "New Lending Facility" to issue a loan.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacilities.map((facility) => {
                  const statusColors = {
                    Active: 'bg-blue-50 text-blue-700 border-blue-200',
                    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
                  }[facility.status]

                  return (
                    <TableRow key={facility.id} className="hover:bg-surface/40 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-focus py-4 pl-6">
                        {facility.facilityNumber}
                      </TableCell>
                      <TableCell className="font-semibold text-xs sm:text-sm text-focus">
                        <div>{facility.borrower}</div>
                        {facility.notes && (
                          <div className="text-[11px] text-muted-fg font-normal truncate max-w-xs">
                            {facility.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs sm:text-sm text-focus">
                        {formatPHP(facility.principal)}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-muted-fg">
                        {facility.interestRateMonthly}% /mo
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-emerald-600">
                        {formatPHP(facility.amountRepaid)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs sm:text-sm text-focus">
                        {formatPHP(facility.balanceRemaining)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-fg">
                        {facility.nextDueDate}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider',
                            statusColors
                          )}
                        >
                          {facility.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFacility(facility)
                              setRepaymentAmount(String(Math.min(50000, facility.balanceRemaining)))
                              setIsRepaymentModalOpen(true)
                            }}
                            disabled={facility.balanceRemaining <= 0}
                            className="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          >
                            Repay
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFacility(facility)}
                            className="h-8 px-2.5 text-xs font-semibold text-muted-fg hover:text-focus hover:bg-surface rounded-lg cursor-pointer"
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 6. Modal: New Lending Facility */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus">
              Issue New Lending Facility
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Create a credit agreement and disburse capital from{' '}
              <strong className="text-focus">{currentLender}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFacility} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Borrower / Subsidiary Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.borrower}
                onChange={(e) => setFormData({ ...formData, borrower: e.target.value })}
                placeholder="e.g. MCT Hotel, Annex Nine, etc."
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Principal Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1000"
                  step="500"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  placeholder="500000"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Monthly Interest (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.interestRateMonthly}
                  onChange={(e) =>
                    setFormData({ ...formData, interestRateMonthly: e.target.value })
                  }
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Term (Months)
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={formData.termMonths}
                onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Facility Purpose / Notes
              </label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Operational supplies, kitchen overhaul, equipment line"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white"
              >
                Disburse Facility
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Modal: Record Repayment */}
      <Dialog open={isRepaymentModalOpen} onOpenChange={setIsRepaymentModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus">
              Record Repayment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Record collection for facility{' '}
              <strong className="text-focus">{selectedFacility?.facilityNumber}</strong> (
              {selectedFacility?.borrower}).
            </DialogDescription>
          </DialogHeader>

          {selectedFacility && (
            <form onSubmit={handleRecordRepayment} className="space-y-4 mt-2">
              <div className="p-3 bg-surface rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-fg">Outstanding Balance:</span>
                  <span className="font-bold text-focus">
                    {formatPHP(selectedFacility.balanceRemaining)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-fg">Total Principal:</span>
                  <span className="font-medium text-focus">
                    {formatPHP(selectedFacility.principal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Repayment Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  max={selectedFacility.balanceRemaining}
                  step="100"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Reference / Cheque Number
                </label>
                <Input
                  value={repaymentRef}
                  onChange={(e) => setRepaymentRef(e.target.value)}
                  placeholder="CHK-2026-9921 / Transfer Reference"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRepaymentModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. Modal: View Facility Details */}
      <Dialog
        open={Boolean(selectedFacility && !isRepaymentModalOpen)}
        onOpenChange={(open) => !open && setSelectedFacility(null)}
      >
        {selectedFacility && (
          <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-lg font-bold text-focus">
                  {selectedFacility.facilityNumber} Details
                </DialogTitle>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200">
                  {selectedFacility.status}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-fg">
                Issued by <strong className="text-focus">{selectedFacility.lenderCompany}</strong>{' '}
                to <strong className="text-focus">{selectedFacility.borrower}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface rounded-xl text-xs">
                <div>
                  <span className="text-muted-fg block">Principal Lent</span>
                  <span className="font-bold text-focus text-sm">
                    {formatPHP(selectedFacility.principal)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-fg block">Monthly Interest Rate</span>
                  <span className="font-bold text-focus text-sm">
                    {selectedFacility.interestRateMonthly}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-fg block">Disbursement Date</span>
                  <span className="font-medium text-focus">
                    {selectedFacility.disbursementDate}
                  </span>
                </div>
                <div>
                  <span className="text-muted-fg block">Maturity Date</span>
                  <span className="font-medium text-focus">
                    {selectedFacility.maturityDate}
                  </span>
                </div>
                <div>
                  <span className="text-muted-fg block">Total Collected</span>
                  <span className="font-semibold text-emerald-600">
                    {formatPHP(selectedFacility.amountRepaid)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-fg block">Outstanding Balance</span>
                  <span className="font-bold text-amber-600">
                    {formatPHP(selectedFacility.balanceRemaining)}
                  </span>
                </div>
              </div>

              {selectedFacility.notes && (
                <div className="text-xs bg-slate-50 border border-stroke/30 rounded-xl p-3">
                  <span className="font-semibold text-focus block mb-0.5">Agreement Purpose:</span>
                  <p className="text-muted-fg">{selectedFacility.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedFacility(null)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                {selectedFacility.balanceRemaining > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setRepaymentAmount(String(Math.min(50000, selectedFacility.balanceRemaining)))
                      setIsRepaymentModalOpen(true)
                    }}
                    className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white"
                  >
                    Record Repayment
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
