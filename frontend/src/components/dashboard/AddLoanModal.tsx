import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PlusCircle,
  ChevronDown,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  Percent,
} from 'lucide-react'
import {
  loanService,
  type NewLoanInput,
  type LoanItem,
  type CompanyOption,
} from '@/services/loanService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatToYYYYMMDD } from '@/utils/dateUtils'

interface AddLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: LoanItem) => void
  assignedCompany: string
  companies?: string[]
}

const DEFAULT_COMPANY_OPTIONS = [
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

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  assignedCompany,
  companies: propsCompanies,
}) => {
  const [dbCompanies, setDbCompanies] = React.useState<CompanyOption[]>([])

  // Fetch companies from DB
  React.useEffect(() => {
    let mounted = true
    loanService.getCompanies().then((res) => {
      if (mounted && res.length > 0) {
        setDbCompanies(res)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const allCompanyNames = React.useMemo(() => {
    if (dbCompanies.length > 0) {
      return dbCompanies.map((c) => c.company_name)
    }
    if (propsCompanies && propsCompanies.length > 0) {
      return propsCompanies.filter((c) => c !== 'All Companies')
    }
    return DEFAULT_COMPANY_OPTIONS
  }, [dbCompanies, propsCompanies])

  const defaultBorrower =
    assignedCompany && assignedCompany !== 'All Companies'
      ? assignedCompany
      : allCompanyNames[0] || 'MCT Kitchen'

  const [date, setDate] = React.useState(formatToYYYYMMDD(new Date()))
  const [dueDate, setDueDate] = React.useState('')
  const [interestRate, setInterestRate] = React.useState('0')
  const [particulars, setParticulars] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [borrowerCompany, setBorrowerCompany] = React.useState(defaultBorrower)
  const [lenderCompany, setLenderCompany] = React.useState('')

  const [isLenderOpen, setIsLenderOpen] = React.useState(false)
  const lenderRef = React.useRef<HTMLDivElement>(null)

  // Confirmation dialogue state
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState<{
    date?: string
    dueDate?: string
    particulars?: string
    amount?: string
    borrower?: string
    lender?: string
  }>({})

  // Lender options cannot include the chosen borrower
  const availableLenders = React.useMemo(() => {
    return allCompanyNames.filter(
      (c) => c.toLowerCase() !== borrowerCompany.toLowerCase()
    )
  }, [allCompanyNames, borrowerCompany])

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (lenderRef.current && !lenderRef.current.contains(target)) {
        setIsLenderOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      const todayStr = formatToYYYYMMDD(new Date())
      setDate(todayStr)
      setDueDate('')
      setInterestRate('0')
      setParticulars('')
      setAmount('')
      setBorrowerCompany(defaultBorrower)
      // Pick first eligible lender
      const eligible = allCompanyNames.filter(
        (c) => c.toLowerCase() !== defaultBorrower.toLowerCase()
      )
      setLenderCompany(eligible[0] || '')
      setIsLenderOpen(false)
      setIsConfirmOpen(false)
      setIsSubmitting(false)
      setError('')
      setFieldErrors({})
    }
  }, [open, defaultBorrower, allCompanyNames])

  // Pre-validate and show confirmation dialogue
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const errors: typeof fieldErrors = {}

    const todayIso = formatToYYYYMMDD(new Date())
    if (!date.trim()) {
      errors.date = 'Date is required.'
    } else if (date.trim() > todayIso) {
      errors.date = 'Date cannot be in the future (maximum date is today).'
    }

    if (!particulars.trim()) {
      errors.particulars = 'Particulars description is required.'
    }

    if (!borrowerCompany.trim()) {
      errors.borrower = 'Borrower company is required.'
    }

    if (!lenderCompany.trim()) {
      errors.lender = 'Lender company is required.'
    } else if (
      borrowerCompany.trim().toLowerCase() === lenderCompany.trim().toLowerCase()
    ) {
      errors.lender = 'Borrower and lender cannot be the same company.'
    }

    const cleanedAmount = amount.replace(/,/g, '').trim()
    const parsedAmount = parseFloat(cleanedAmount)
    if (!cleanedAmount || isNaN(parsedAmount) || parsedAmount < 1.0) {
      errors.amount = 'Amount must be at least 1.00 (cannot be 0 or letters).'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fill in all required fields.')
      return
    }

    setFieldErrors({})
    setIsConfirmOpen(true)
  }

  // Confirmed submission
  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const parsedAmount = parseFloat(amount.replace(/,/g, ''))
      const payload: NewLoanInput = {
        date: date.trim() || formatToYYYYMMDD(new Date()),
        dueDate: dueDate.trim() || undefined,
        interestRate: parseFloat(interestRate) || 0.0,
        particulars: particulars.trim(),
        amount: parsedAmount,
        borrowerCompany: borrowerCompany.trim(),
        lenderCompany: lenderCompany.trim(),
        status: 'Pending Approval',
      }
      const created = await loanService.addLoan(payload)

      setIsConfirmOpen(false)
      onOpenChange(false)
      onSuccess(created)
    } catch (err: any) {
      setError(err?.message || 'Failed to record loan entry.')
      setIsConfirmOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* 1. Main Add Loan Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                  Record New Loan
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                  Borrowing request for <span className="font-semibold text-focus">{borrowerCompany}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handlePreSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Loan Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Loan Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: undefined }))
                  }}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl', fieldErrors.date && 'border-red-500')}
                  required
                />
                {fieldErrors.date && <p className="text-2xs text-red-500">{fieldErrors.date}</p>}
              </div>

              {/* 2. Due Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Due Date (Repayment)
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              {/* 3. Borrower Company (Automatic from account) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Borrower Company
                </Label>
                <div className="h-10 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-focus/90 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs select-none">
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate font-semibold">{borrowerCompany}</span>
                  </div>
                  <span className="text-[11px] text-muted-fg font-normal px-2 py-0.5 rounded-md bg-white border border-stroke/30 shrink-0">
                    Automatic (Account)
                  </span>
                </div>
              </div>

              {/* 4. Lender Company */}
              <div className="space-y-1.5 relative" ref={lenderRef}>
                <Label className="text-xs font-semibold text-focus block">
                  Lender Company <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsLenderOpen((p) => !p)}
                  className={cn(
                    'w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs transition-colors cursor-pointer',
                    isLenderOpen && 'ring-2 ring-focus/20 border-focus'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-muted-fg shrink-0" />
                    <span className="truncate">{lenderCompany || 'Select Lender Company'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-fg shrink-0" />
                </button>

                {isLenderOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-xl border border-stroke/30 shadow-xl p-1.5 z-50 max-h-48 overflow-y-auto">
                    {availableLenders.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setLenderCompany(name)
                          setIsLenderOpen(false)
                          if (fieldErrors.lender) setFieldErrors((p) => ({ ...p, lender: undefined }))
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                          lenderCompany === name ? 'bg-primary/10 text-primary font-semibold' : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <span className="truncate">{name}</span>
                        {lenderCompany === name && <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                {fieldErrors.lender && <p className="text-2xs text-red-500">{fieldErrors.lender}</p>}
              </div>

              {/* 5. Principal Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Principal Amount (₱) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg text-xs font-bold pointer-events-none">
                    ₱
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      setAmount(val)
                      if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }))
                    }}
                    className={cn('pl-7 h-10 text-xs sm:text-sm rounded-xl tabular-nums', fieldErrors.amount && 'border-red-500')}
                    required
                  />
                </div>
                {fieldErrors.amount && <p className="text-2xs text-red-500">{fieldErrors.amount}</p>}
              </div>

              {/* 6. Interest Rate */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Interest Rate (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="pr-7 h-10 text-xs sm:text-sm rounded-xl tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg text-xs font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* 7. Particulars / Purpose */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-focus block">
                  Particulars / Purpose <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Commercial Kitchen Heavy Equipment Financing"
                  value={particulars}
                  onChange={(e) => {
                    setParticulars(e.target.value)
                    if (fieldErrors.particulars) setFieldErrors((p) => ({ ...p, particulars: undefined }))
                  }}
                  className={cn('h-10 text-xs sm:text-sm rounded-xl', fieldErrors.particulars && 'border-red-500')}
                  required
                />
                {fieldErrors.particulars && <p className="text-2xs text-red-500">{fieldErrors.particulars}</p>}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stroke/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
              >
                Record Loan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="text-left pb-2 pr-6">
            <DialogTitle className="text-lg font-bold text-focus leading-tight">
              Confirm Loan Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg font-normal">
              Please verify the inter-company loan details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 my-2">
            <div className="flex justify-between">
              <span className="text-muted-fg font-medium">Borrower:</span>
              <span className="font-bold text-focus">{borrowerCompany}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg font-medium">Lender:</span>
              <span className="font-bold text-focus">{lenderCompany}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg font-medium">Principal Amount:</span>
              <span className="font-bold text-emerald-600 tabular-nums">
                {formatPHP(parseFloat(amount.replace(/,/g, '')) || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg font-medium">Interest Rate:</span>
              <span className="font-bold text-primary">{parseFloat(interestRate) || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg font-medium">Date:</span>
              <span className="font-medium text-focus">{date}</span>
            </div>
            {dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-fg font-medium">Due Date:</span>
                <span className="font-medium text-focus">{dueDate}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-muted-fg block">Purpose:</span>
              <span className="font-medium text-focus italic">{particulars}</span>
            </div>
          </div>

          <p className="text-2xs text-muted-fg">
            * Note: This loan request will be placed in <strong>Pending Approval</strong> until confirmed by <strong>{lenderCompany}</strong>.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              className="h-9 px-3 rounded-lg text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-lg bg-[#960C01] hover:bg-[#800a01] text-white text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? 'Recording…' : 'Confirm & Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
