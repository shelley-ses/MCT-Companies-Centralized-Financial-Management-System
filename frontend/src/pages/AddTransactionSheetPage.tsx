import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { salesService } from '@/services/salesService'
import { expenseService } from '@/services/expenseService'
import { loanService, type CompanyOption } from '@/services/loanService'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import { formatToYYYYMMDD } from '@/utils/dateUtils'
import { formatParticularsString, type ParticularItem } from '@/utils/particularsUtils'
import { cn } from '@/lib/utils'

interface ParticularsRow {
  id: string
  particulars: string
  unitPrice: number | ''
  quantity: number | ''
}

const CATEGORY_OPTIONS = [
  'None',
  'Cash',
  'GCash',
  'Maya',
  'PayMongo',
  'Panda',
  'Cheque',
  'Bank Transfer',
  'In-house',
] as const

const DEFAULT_COMPANIES = [
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

interface AddTransactionSheetPageProps {
  initialType?: 'Sales' | 'Expense'
}

export const AddTransactionSheetPage: React.FC<AddTransactionSheetPageProps> = ({
  initialType,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSession()

  const isCompanyUser = user?.role === 'Company' || user?.role === 'Company Auditor'
  const isAuditor = isCompanyUser
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Strict transaction type determined by initialType or URL path (Sales stays in Sales, Expense stays in Expense)
  const transactionType: 'Sales' | 'Expense' = React.useMemo(() => {
    if (initialType) return initialType
    const path = location.pathname.toLowerCase()
    if (path.includes('expense')) return 'Expense'
    return 'Sales'
  }, [initialType, location.pathname])

  // Top header metadata form fields
  const [date, setDate] = React.useState(() => formatToYYYYMMDD(new Date()))
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isAuditor ? assignedCompany : 'MCT Kitchen'
  )

  // Keep selectedCompany in sync if user profile loads after initial render
  React.useEffect(() => {
    if (isAuditor && user?.assignedCompany) {
      setSelectedCompany(user.assignedCompany)
    }
  }, [isAuditor, user?.assignedCompany])

  const [category, setCategory] = React.useState<string>('Cash')
  const [chequeNo, setChequeNo] = React.useState<string>('')
  const [status, setStatus] = React.useState<'Paid' | 'Pending'>('Paid')

  // Dynamic companies list
  const [dbCompanies, setDbCompanies] = React.useState<string[]>(DEFAULT_COMPANIES)

  React.useEffect(() => {
    let mounted = true
    loanService.getCompanies().then((companies: CompanyOption[]) => {
      if (mounted && companies.length > 0) {
        const names = companies.map((c) => c.company_name).filter(Boolean)
        const combined = Array.from(new Set([...names, ...DEFAULT_COMPANIES]))
        setDbCompanies(combined)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Dynamic document title
  React.useEffect(() => {
    document.title = `Add ${transactionType} (Excel Sheet) - MCT Centralized Financial System`
  }, [transactionType])

  // Excel-style rows state: initialize with 4 clean rows
  const [rows, setRows] = React.useState<ParticularsRow[]>([
    { id: 'row-1', particulars: '', unitPrice: '', quantity: 1 },
    { id: 'row-2', particulars: '', unitPrice: '', quantity: 1 },
    { id: 'row-3', particulars: '', unitPrice: '', quantity: 1 },
    { id: 'row-4', particulars: '', unitPrice: '', quantity: 1 },
  ])

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successBanner, setSuccessBanner] = React.useState<{
    count: number
    total: number
    type: string
  } | null>(null)

  // Input refs to focus on newly added row
  const particularsInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Row operations
  const handleAddRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    setRows((prev) => [...prev, { id: newId, particulars: '', unitPrice: '', quantity: 1 }])
    setTimeout(() => {
      particularsInputRefs.current[newId]?.focus()
    }, 50)
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      // Don't remove last row, just clear it
      setRows([{ id: 'row-1', particulars: '', unitPrice: '', quantity: 1 }])
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRowChange = (
    id: string,
    field: keyof Omit<ParticularsRow, 'id'>,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return {
          ...r,
          [field]: value,
        }
      })
    )
  }

  // Handle Enter key on row: if on last row, auto-create next row
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex === rows.length - 1) {
        handleAddRow()
      } else {
        const nextId = rows[rowIndex + 1].id
        particularsInputRefs.current[nextId]?.focus()
      }
    }
  }

  // Calculations
  const calculatedRows = React.useMemo(() => {
    return rows.map((r) => {
      const price = typeof r.unitPrice === 'number' ? r.unitPrice : 0
      const qty = typeof r.quantity === 'number' ? r.quantity : 0
      const total = price * qty
      return {
        ...r,
        numericPrice: price,
        numericQty: qty,
        rowTotal: total,
        isValid: r.particulars.trim().length > 0 && price > 0 && qty > 0,
      }
    })
  }, [rows])

  const grandTotal = React.useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + r.rowTotal, 0)
  }, [calculatedRows])

  const validRowsCount = React.useMemo(() => {
    return calculatedRows.filter((r) => r.isValid).length
  }, [calculatedRows])

  const totalQuantity = React.useMemo(() => {
    return calculatedRows
      .filter((r) => r.isValid)
      .reduce((sum, r) => sum + r.numericQty, 0)
  }, [calculatedRows])

  // Handle Save
  const handleSave = async () => {
    setErrorMessage(null)

    // Validation
    const validItems = calculatedRows.filter((r) => r.isValid)
    if (validItems.length === 0) {
      setErrorMessage(
        'Please enter at least one valid row with Particulars, Price Each (> 0), and Quantity (> 0).'
      )
      return
    }

    if (!date) {
      setErrorMessage('Please select a valid transaction date.')
      return
    }

    const todayIso = formatToYYYYMMDD(new Date())
    if (date > todayIso) {
      setErrorMessage('Transaction date cannot be in the future.')
      return
    }

    const companyToUse = isAuditor ? assignedCompany : selectedCompany

    setIsSubmitting(true)
    try {
      // Map valid sheet rows to structured ParticularItems
      const itemizedParticulars: ParticularItem[] = validItems.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        particulars: item.particulars.trim(),
        quantity: item.numericQty,
        unitPrice: item.numericPrice,
        total: item.rowTotal,
      }))

      // Combine into formatted particulars text
      const formattedParticulars = formatParticularsString(itemizedParticulars)

      if (transactionType === 'Sales') {
        // Record all particulars consolidated as ONE single entry
        await salesService.addSale({
          company: companyToUse,
          date,
          particulars: formattedParticulars,
          amount: grandTotal,
          category: category === 'None' ? 'None' : category,
          chequeNo: chequeNo.trim() || undefined,
          status,
          items: itemizedParticulars,
        })
      } else {
        // Record all particulars consolidated as ONE single entry
        await expenseService.addExpense({
          company: companyToUse,
          date,
          particulars: formattedParticulars,
          amount: grandTotal,
          category: category === 'None' ? 'In-house' : category,
          chequeNo: chequeNo.trim() || undefined,
          status,
          items: itemizedParticulars,
        })
      }

      setSuccessBanner({
        count: validItems.length,
        total: grandTotal,
        type: transactionType,
      })

      // Redirect back after brief delay
      setTimeout(() => {
        navigate(transactionType === 'Sales' ? '/sales' : '/expense')
      }, 1200)
    } catch (err: any) {
      console.error('Failed to save entries:', err)
      setErrorMessage(err?.message || 'Failed to save transactions. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setRows([
      { id: 'row-1', particulars: '', unitPrice: '', quantity: 1 },
      { id: 'row-2', particulars: '', unitPrice: '', quantity: 1 },
      { id: 'row-3', particulars: '', unitPrice: '', quantity: 1 },
      { id: 'row-4', particulars: '', unitPrice: '', quantity: 1 },
    ])
    setErrorMessage(null)
  }

  const isSales = transactionType === 'Sales'

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(isSales ? '/sales' : '/expense')}
            className="h-8 px-2.5 -ml-2 text-muted-fg hover:text-focus text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {isSales ? 'Sales' : 'Expense'}</span>
          </Button>

          <div className="flex items-center gap-3 mt-1">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
                isSales
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              )}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-focus tracking-tight">
                Add {transactionType}
              </h1>
              <p className="text-xs sm:text-sm text-muted-fg font-normal">
                {isSales
                  ? 'Excel-style spreadsheet entry for sales particulars, unit pricing, and deposit calculations.'
                  : 'Excel-style spreadsheet entry for operational expense particulars, unit pricing, and withdrawal calculations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Type Indicator Badge */}
        <div className="self-start sm:self-auto">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-2xs',
              isSales
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isSales ? 'bg-emerald-500' : 'bg-rose-500'
              )}
            />
            <span>{isSales ? 'Sales Deposit Entry' : 'Expense Withdrawal Entry'}</span>
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm font-medium shadow-xs animate-in fade-in-50 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <strong>Successfully recorded 1 {successBanner.type} entry with {successBanner.count} particulars!</strong> Total:{' '}
            <span className="font-bold">{formatPHP(successBanner.total)}</span>. Redirecting to{' '}
            {successBanner.type} summary...
          </div>
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-sm font-medium shadow-xs animate-in fade-in-50 duration-200">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Transaction Parameters Card (Date, Company, Payment Method, Cheque/Ref) */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stroke/20">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
            Transaction Details & Setup
          </span>
          <span className="text-xs text-muted-fg font-medium">
            Applies to all particulars in this entry batch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-focus flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-fg" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              max={formatToYYYYMMDD(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus"
            />
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-focus flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-fg" />
              <span>Company</span>
            </label>
            {isAuditor ? (
              <div className="w-full h-10 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-xs sm:text-sm text-focus font-medium flex items-center truncate">
                {assignedCompany}
              </div>
            ) : (
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
              >
                {dbCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Method / Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-focus">
              Payment Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Cheque / Ref No */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-focus">
              Cheque / Reference No. <span className="text-muted-fg font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CHQ-99201"
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus placeholder:text-muted-fg/60 shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-focus">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Paid' | 'Pending')}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
            >
              <option value="Paid">Received / Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 3. Excel Spreadsheet Grid Table */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 shadow-xs overflow-hidden">
        {/* Spreadsheet Banner Header */}
        <div className="p-4 sm:p-5 bg-slate-100/90 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono shadow-xs">
              XLS
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-focus leading-tight">
                Particulars Spreadsheet
              </h2>
              <p className="text-xs text-muted-fg">
                Enter each specific item or purchase. Quantities and unit prices calculate the total automatically.
              </p>
            </div>
          </div>

          {/* Quick Toolbar Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 px-3 rounded-xl border-slate-200 text-xs font-semibold text-muted-fg hover:text-focus cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset Grid</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddRow}
              className="h-8 px-3.5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </Button>
          </div>
        </div>

        {/* Excel Grid Table */}
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[760px] border-collapse">
            <TableHeader className="bg-slate-50/90 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-[11px] font-bold uppercase tracking-wider text-muted-fg border-r border-slate-200/60 py-3">
                  #
                </TableHead>
                <TableHead className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-fg border-r border-slate-200/60 py-3 px-4">
                  PARTICULARS <span className="text-red-500">*</span>
                  <span className="font-normal text-muted-fg/70 ml-1.5 lowercase">
                    (specific thing bought/sold)
                  </span>
                </TableHead>
                <TableHead className="w-44 text-right text-[11px] font-bold uppercase tracking-wider text-muted-fg border-r border-slate-200/60 py-3 px-4">
                  PRICE EACH (₱) <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="w-28 text-center text-[11px] font-bold uppercase tracking-wider text-muted-fg border-r border-slate-200/60 py-3 px-3">
                  QUANTITY <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="w-44 text-right text-[11px] font-bold uppercase tracking-wider text-muted-fg border-r border-slate-200/60 py-3 px-4">
                  TOTAL PRICE (₱)
                </TableHead>
                <TableHead className="w-14 text-center text-[11px] font-bold uppercase tracking-wider text-muted-fg py-3">
                  DEL
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row, index) => {
                const price = typeof row.unitPrice === 'number' ? row.unitPrice : 0
                const qty = typeof row.quantity === 'number' ? row.quantity : 0
                const rowTotal = price * qty
                const isRowActive = row.particulars.trim().length > 0 || price > 0

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'border-b border-slate-200/60 hover:bg-slate-50/60 transition-colors',
                      isRowActive && 'bg-amber-50/20'
                    )}
                  >
                    {/* Row Index / Sheet Row Header */}
                    <TableCell className="w-12 text-center text-xs font-mono font-bold text-muted-fg/70 bg-slate-50/50 border-r border-slate-200/60 select-none py-2 px-1">
                      {index + 1}
                    </TableCell>

                    {/* Particulars Cell */}
                    <TableCell className="border-r border-slate-200/60 p-1.5 px-3">
                      <input
                        ref={(el) => {
                          particularsInputRefs.current[row.id] = el
                        }}
                        type="text"
                        placeholder="e.g. A4 Copy Paper Ream, Commercial Kitchen Gas, Espresso Beans..."
                        value={row.particulars}
                        onChange={(e) =>
                          handleRowChange(row.id, 'particulars', e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full h-9 px-3 text-xs sm:text-sm text-focus rounded-lg border border-transparent hover:border-slate-300 focus:border-focus focus:bg-white focus:outline-none focus:ring-1 focus:ring-focus transition-all"
                      />
                    </TableCell>

                    {/* Price Each Cell */}
                    <TableCell className="w-44 border-r border-slate-200/60 p-1.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-fg/70">
                          ₱
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={row.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                            handleRowChange(row.id, 'unitPrice', isNaN(val as number) ? '' : val)
                          }}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          className="w-full h-9 pl-6 pr-3 text-right text-xs sm:text-sm font-mono text-focus rounded-lg border border-transparent hover:border-slate-300 focus:border-focus focus:bg-white focus:outline-none focus:ring-1 focus:ring-focus transition-all"
                        />
                      </div>
                    </TableCell>

                    {/* Quantity Cell */}
                    <TableCell className="w-28 border-r border-slate-200/60 p-1.5 px-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                          handleRowChange(row.id, 'quantity', isNaN(val as number) ? '' : val)
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full h-9 px-2 text-center text-xs sm:text-sm font-mono text-focus rounded-lg border border-transparent hover:border-slate-300 focus:border-focus focus:bg-white focus:outline-none focus:ring-1 focus:ring-focus transition-all"
                      />
                    </TableCell>

                    {/* Total Price (Calculated formula) */}
                    <TableCell className="w-44 border-r border-slate-200/60 p-1.5 px-4 text-right">
                      <span
                        className={cn(
                          'font-mono text-xs sm:text-sm font-bold block py-1.5',
                          rowTotal > 0
                            ? isSales
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                            : 'text-muted-fg/50'
                        )}
                      >
                        {formatPHP(rowTotal)}
                      </span>
                    </TableCell>

                    {/* Delete Row Button */}
                    <TableCell className="w-14 text-center p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1 && !isRowActive}
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer mx-auto"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Add Row Prompt Bar */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200/60 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-9 px-4 rounded-xl border-dashed border-slate-300 hover:border-focus text-xs font-semibold text-focus gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>Add Row to Sheet</span>
            <span className="text-[10px] text-muted-fg ml-1">(or press Enter on last cell)</span>
          </Button>

          <span className="text-xs text-muted-fg hidden sm:inline-block">
            {rows.length} total rows • {validRowsCount} valid items
          </span>
        </div>
      </Card>

      {/* 4. Grand Summary Card & Final Actions */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: Summary Metrics */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div>
            <span className="text-xs font-medium text-muted-fg block">
              Valid Particulars
            </span>
            <span className="text-lg sm:text-xl font-bold text-focus mt-0.5 block">
              {validRowsCount} item{validRowsCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-6 sm:pl-10">
            <span className="text-xs font-medium text-muted-fg block">
              Total Units
            </span>
            <span className="text-lg sm:text-xl font-bold text-focus mt-0.5 block">
              {totalQuantity} unit{totalQuantity !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-6 sm:pl-10">
            <span className="text-xs font-medium text-muted-fg block">
              Grand Total {isSales ? 'Sales' : 'Expense'}
            </span>
            <span
              className={cn(
                'text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 block tabular-nums',
                isSales ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {formatPHP(grandTotal)}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isSales ? '/sales' : '/expense')}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-xl border-slate-200 text-xs sm:text-sm font-semibold text-focus hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || validRowsCount === 0}
            className={cn(
              'h-11 px-6 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all',
              'bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white disabled:opacity-40'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving {validRowsCount} items…</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  Save {validRowsCount > 0 ? `${validRowsCount} ` : ''}
                  {transactionType} {validRowsCount > 1 ? 'Records' : 'Record'}
                </span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
