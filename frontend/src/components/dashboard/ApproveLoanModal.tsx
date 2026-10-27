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
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronDown,
  Check,
  ShieldCheck,
} from 'lucide-react'
import {
  loanService,
  type LoanItem,
  type CompanyOption,
} from '@/services/loanService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ApproveLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: LoanItem | null
  onSuccess: (approvedLoan: LoanItem) => void
  companies?: string[]
}

const DEFAULT_COMPANY_LIST = [
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

export const ApproveLoanModal: React.FC<ApproveLoanModalProps> = ({
  open,
  onOpenChange,
  loan,
  onSuccess,
  companies: propsCompanies,
}) => {
  const [dbCompanies, setDbCompanies] = React.useState<CompanyOption[]>([])
  const [selectedLender, setSelectedLender] = React.useState('')
  const [interestRate, setInterestRate] = React.useState('0')
  const [dueDate, setDueDate] = React.useState('')
  const [isLenderDropdownOpen, setIsLenderDropdownOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const lenderDropdownRef = React.useRef<HTMLDivElement>(null)

  // Fetch registered companies
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
      return dbCompanies.map((c) => c.company_name).filter(Boolean)
    }
    if (propsCompanies && propsCompanies.length > 0) {
      return propsCompanies.filter((c) => c !== 'All Companies')
    }
    return DEFAULT_COMPANY_LIST
  }, [dbCompanies, propsCompanies])

  // Filter out borrower company so borrower cannot loan to itself
  const eligibleLenders = React.useMemo(() => {
    if (!loan) return allCompanyNames
    const borrowerNorm = (loan.borrower || '').trim().toLowerCase()
    return allCompanyNames.filter((c) => c.trim().toLowerCase() !== borrowerNorm)
  }, [allCompanyNames, loan])

  const [remark, setRemark] = React.useState('')

  // Reset / initialize modal state when opened
  React.useEffect(() => {
    if (open && loan) {
      setError('')
      setRemark('')
      setIsSubmitting(false)
      setIsLenderDropdownOpen(false)
      setInterestRate(String(loan.interestRate || 0))
      setDueDate(loan.dueDate || '')

      const initialLender =
        loan.lender &&
        !loan.lender.toLowerCase().includes('pending') &&
        loan.lender.toLowerCase() !== (loan.borrower || '').toLowerCase()
          ? loan.lender
          : eligibleLenders[0] || 'MCT Hotel'

      setSelectedLender(initialLender)
    }
  }, [open, loan, eligibleLenders])

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        lenderDropdownRef.current &&
        !lenderDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLenderDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!loan) return null

  const handleEndorse = async () => {
    setError('')
    if (!selectedLender.trim()) {
      setError('Please choose what company will provide this loan.')
      return
    }

    if (
      selectedLender.trim().toLowerCase() ===
      (loan.borrower || '').trim().toLowerCase()
    ) {
      setError('Lender company cannot be the same as the borrower company.')
      return
    }

    if (!remark.trim()) {
      setError('A finance endorsement remark is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const parsedInterest = parseFloat(interestRate) || 0
      const endorsed = await loanService.endorseLoan(loan.id, {
        action: 'endorse',
        lenderCompany: selectedLender.trim(),
        interestRate: parsedInterest,
        dueDate: dueDate.trim() || undefined,
        remark: remark.trim(),
      })
      onSuccess(endorsed)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to endorse loan request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setError('')
    if (!remark.trim()) {
      setError('Please provide a reason / remark for rejecting this loan.')
      return
    }

    setIsSubmitting(true)
    try {
      const rejected = await loanService.endorseLoan(loan.id, {
        action: 'reject',
        remark: remark.trim(),
      })
      onSuccess(rejected)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to reject loan request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-focus leading-tight">
                Finance Review & Endorse Loan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-fg font-normal">
                Assign lender and endorse loan request from{' '}
                <span className="font-semibold text-focus">{loan.borrower}</span> to Internal Audit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loan Request Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Borrower (Requester):</span>
              <span className="font-bold text-focus flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                {loan.borrower}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Requested Principal:</span>
              <span className="font-bold text-emerald-600 text-sm tabular-nums">
                {formatPHP(loan.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Request Date:</span>
              <span className="font-medium text-focus">{loan.date}</span>
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-muted-fg block mb-0.5">Purpose / Particulars:</span>
              <p className="font-medium text-focus italic">{loan.particulars}</p>
            </div>
          </div>

          {/* FINANCE DECISION CONTROLS */}
          <div className="space-y-3.5 pt-1">
            {/* 1. Choose Lender Company */}
            <div className="space-y-1.5" ref={lenderDropdownRef}>
              <Label className="text-xs font-semibold text-focus flex items-center justify-between">
                <span>
                  Choose Lending Company <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] text-muted-fg font-normal">
                  (Who will finance this loan)
                </span>
              </Label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLenderDropdownOpen((prev) => !prev)}
                  className={cn(
                    'w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white hover:bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-2xs flex items-center justify-between transition-colors cursor-pointer',
                    isLenderDropdownOpen && 'ring-2 ring-blue-500/20 border-blue-600'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate font-semibold text-focus">
                      {selectedLender || 'Select lending company…'}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-muted-fg shrink-0 transition-transform duration-200',
                      isLenderDropdownOpen && 'rotate-180'
                    )}
                  />
                </button>

                {isLenderDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-56 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-fg px-2 py-1">
                      Available Subsidiaries
                    </p>
                    {eligibleLenders.map((comp) => (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setSelectedLender(comp)
                          setIsLenderDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                          selectedLender === comp
                            ? 'bg-blue-50 text-blue-800 font-semibold'
                            : 'text-focus/90 hover:bg-slate-50'
                        )}
                      >
                        <span className="truncate">{comp}</span>
                        {selectedLender === comp && (
                          <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Terms: Due Date and Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Repayment Due Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>
              </div>

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
            </div>

            {/* 3. Mandatory Finance Remark */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-focus block">
                  Finance Endorsement Remark <span className="text-red-500">* (Required)</span>
                </Label>
                <span className="text-[11px] text-muted-fg">Mandatory</span>
              </div>
              <textarea
                value={remark}
                onChange={(e) => {
                  setRemark(e.target.value)
                  if (error) setError('')
                }}
                rows={2}
                placeholder="Enter treasury verification notes, fund allocation rationale, or reason..."
                className="w-full p-2.5 rounded-xl border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none focus:ring-2 focus:ring-focus placeholder:text-muted-fg resize-none"
                required
              />
            </div>
          </div>

          <p className="text-2xs sm:text-xs text-slate-500 leading-relaxed pt-1">
            Endorsing forward will transmit this loan request to the Internal Audit team for final compliance review.
          </p>

          <div className="pt-3 flex items-center justify-between gap-2.5 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting || !remark.trim()}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
              >
                <span>{isSubmitting ? 'Rejecting…' : 'Reject'}</span>
              </Button>
              <Button
                type="button"
                onClick={handleEndorse}
                disabled={isSubmitting || !selectedLender || !remark.trim()}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Endorsing…' : 'Endorse to Audit'}</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
