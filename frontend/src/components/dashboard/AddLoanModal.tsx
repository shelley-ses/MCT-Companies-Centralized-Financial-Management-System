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
} from 'lucide-react'
import {
  loanService,
  type NewLoanInput,
  type LoanItem,
} from '@/services/loanService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'

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

const CATEGORY_OPTIONS = [
  'None',
  'GCash',
  'Maya',
  'PayMongo',
  'Panda',
  'In-house',
  'Cheque',
  'Bank Transfer',
  'Cash',
]

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  assignedCompany,
  companies,
}) => {
  const getTodayIso = () => new Date().toISOString().split('T')[0]

  const availableCompanies = React.useMemo(() => {
    if (companies && companies.length > 0) {
      return companies.filter((c) => c !== 'All Companies')
    }
    return DEFAULT_COMPANY_OPTIONS
  }, [companies])

  const defaultCompany =
    assignedCompany && assignedCompany !== 'All Companies'
      ? assignedCompany
      : availableCompanies[0] || 'MCT Kitchen'

  const [date, setDate] = React.useState(getTodayIso())
  const [chequeNo, setChequeNo] = React.useState('')
  const [particulars, setParticulars] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [company, setCompany] = React.useState(defaultCompany)
  const [isCompanyOpen, setIsCompanyOpen] = React.useState(false)
  const companyContainerRef = React.useRef<HTMLDivElement>(null)

  const [category, setCategory] = React.useState('None')
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false)
  const categoryContainerRef = React.useRef<HTMLDivElement>(null)

  // Confirmation dialogue state
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState<{
    date?: string
    particulars?: string
    amount?: string
    category?: string
    company?: string
  }>({})

  // Dynamic filter for category suggestions
  const filteredCategoryOptions = React.useMemo(() => {
    const q = category.trim().toLowerCase()
    if (!q) return CATEGORY_OPTIONS
    return CATEGORY_OPTIONS.filter((opt) => opt.toLowerCase().includes(q))
  }, [category])

  // Close dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(target)
      ) {
        setIsCategoryOpen(false)
      }
      if (
        companyContainerRef.current &&
        !companyContainerRef.current.contains(target)
      ) {
        setIsCompanyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setDate(getTodayIso())
      setChequeNo('')
      setParticulars('')
      setAmount('')
      setCompany(defaultCompany)
      setCategory('None')
      setIsCompanyOpen(false)
      setIsCategoryOpen(false)
      setIsConfirmOpen(false)
      setIsSubmitting(false)
      setError('')
      setFieldErrors({})
    }
  }, [open, defaultCompany])

  // Pre-validate and show confirmation dialogue
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const errors: {
      date?: string
      particulars?: string
      amount?: string
      category?: string
    } = {}

    const todayIso = getTodayIso()
    if (!date.trim()) {
      errors.date = 'Date is required.'
    } else if (date.trim() > todayIso) {
      errors.date = 'Date cannot be in the future (maximum date is today).'
    }

    if (!particulars.trim()) {
      errors.particulars = 'Particulars description is required.'
    }

    if (!company.trim()) {
      errors.company = 'Please choose a company.'
    }

    const parsedAmount = parseFloat(amount.replace(/,/g, ''))
    if (!amount.trim()) {
      errors.amount = 'Amount is required.'
    } else if (isNaN(parsedAmount) || parsedAmount < 1.0) {
      errors.amount = 'Amount must be at least 1.00 (cannot be 0 or less than 1).'
    }

    if (category === 'None' || !category.trim()) {
      errors.category = 'Please choose a category.'
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
        date: date.trim() || getTodayIso(),
        chequeNo: chequeNo.trim() || undefined,
        particulars: particulars.trim(),
        amount: parsedAmount,
        category: category.trim(),
        company: company.trim(),
        status: 'Pending',
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
        <DialogContent className="sm:max-w-[540px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4 [&>button]:w-6 [&>button]:h-6 [&>button]:p-0.5 [&>button]:rounded-md [&>button>svg]:w-3.5 [&>button>svg]:h-3.5">
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
                  Enter loan transaction record for {company}
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
              {/* 1. Date (editable, defaults to today) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  max={getTodayIso()}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (fieldErrors.date) {
                      setFieldErrors((prev) => ({ ...prev, date: undefined }))
                    }
                  }}
                  className={cn(
                    'h-10 rounded-xl border-stroke/50 text-xs font-medium',
                    fieldErrors.date && 'border-red-500 focus-visible:ring-red-200'
                  )}
                  title="Transaction date (cannot be in the future)"
                />
                {fieldErrors.date ? (
                  <p className="text-[11px] text-red-600 font-medium">{fieldErrors.date}</p>
                ) : (
                  <p className="text-[11px] text-muted-fg font-normal">
                    Defaults to today (Max: today)
                  </p>
                )}
              </div>

              {/* 2. Cheque No (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Cheque No. (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. CHK-88104"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  className="h-10 rounded-xl border-stroke/50 text-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Company & Category Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Company Dropdown Button */}
              <div className="space-y-1.5" ref={companyContainerRef}>
                <Label className="text-xs font-semibold text-focus block">
                  Company <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCompanyOpen((prev) => !prev)}
                    className={cn(
                      'w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white hover:bg-surface text-focus text-xs font-medium shadow-xs flex items-center justify-between transition-colors cursor-pointer text-left',
                      isCompanyOpen && 'ring-2 ring-focus/20 border-focus',
                      fieldErrors.company && 'border-red-500 focus-visible:ring-red-200'
                    )}
                    aria-label="Choose company"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                      <span className="truncate">{company}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-muted-fg shrink-0 transition-transform duration-200 ml-1',
                        isCompanyOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isCompanyOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-stroke/40 rounded-xl shadow-xl max-h-52 overflow-y-auto p-1.5">
                      <div className="space-y-0.5">
                        {availableCompanies.map((comp) => (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => {
                              setCompany(comp)
                              setIsCompanyOpen(false)
                              if (fieldErrors.company) {
                                setFieldErrors((prev) => ({ ...prev, company: undefined }))
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                              company === comp
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'hover:bg-slate-100 text-focus'
                            )}
                          >
                            <span>{comp}</span>
                            {company === comp && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {fieldErrors.company && (
                  <p className="text-[11px] text-red-600 font-medium">{fieldErrors.company}</p>
                )}
              </div>

              {/* Category (Searchable Dropdown) */}
              <div className="space-y-1.5" ref={categoryContainerRef}>
                <Label className="text-xs font-semibold text-focus block">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search or enter category..."
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      setIsCategoryOpen(true)
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => ({ ...prev, category: undefined }))
                      }
                    }}
                    onFocus={() => setIsCategoryOpen(true)}
                    className={cn(
                      'h-10 rounded-xl border-stroke/50 text-xs pr-8 font-medium',
                      fieldErrors.category && 'border-red-500 focus-visible:ring-red-200'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-1 cursor-pointer"
                    aria-label="Toggle category options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-stroke/40 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5">
                      <div className="space-y-0.5">
                        {filteredCategoryOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setCategory(opt)
                              setIsCategoryOpen(false)
                              if (fieldErrors.category) {
                                setFieldErrors((prev) => ({ ...prev, category: undefined }))
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                              category === opt
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'hover:bg-slate-100 text-focus'
                            )}
                          >
                            <span>{opt}</span>
                            {category === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {fieldErrors.category && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {fieldErrors.category}
                  </p>
                )}
              </div>
            </div>

            {/* 4. Particulars */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus block">
                Particulars <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. Commercial Equipment Term Loan Facility"
                value={particulars}
                onChange={(e) => {
                  setParticulars(e.target.value)
                  if (fieldErrors.particulars) {
                    setFieldErrors((prev) => ({ ...prev, particulars: undefined }))
                  }
                }}
                className={cn(
                  'h-10 rounded-xl border-stroke/50 text-xs',
                  fieldErrors.particulars && 'border-red-500 focus-visible:ring-red-200'
                )}
              />
              {fieldErrors.particulars && (
                <p className="text-[11px] text-red-600 font-medium">
                  {fieldErrors.particulars}
                </p>
              )}
            </div>

            {/* 5. Loan Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus block">
                Loan Amount (₱) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (fieldErrors.amount) {
                    setFieldErrors((prev) => ({ ...prev, amount: undefined }))
                  }
                }}
                className={cn(
                  'h-10 rounded-xl border-stroke/50 text-xs font-medium',
                  fieldErrors.amount && 'border-red-500 focus-visible:ring-red-200'
                )}
              />
              {fieldErrors.amount && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.amount}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stroke/15">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl border-stroke/60 text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Add Loan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Confirmation Dialogue */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4 [&>button]:w-6 [&>button]:h-6 [&>button]:p-0.5 [&>button]:rounded-md [&>button>svg]:w-3.5 [&>button>svg]:h-3.5">
          <DialogHeader className="text-left pb-3 border-b border-stroke/20">
            <DialogTitle className="text-lg sm:text-xl font-bold text-focus leading-tight">
              Confirm Loan Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg font-normal">
              Please review and confirm this loan transaction entry before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-fg font-medium">Company</span>
                <span className="font-semibold text-focus">{company}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-fg font-medium">Date</span>
                <span className="font-semibold text-focus">{date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-fg font-medium">Particulars</span>
                <span className="font-semibold text-focus max-w-[220px] truncate text-right">
                  {particulars}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-fg font-medium">Category</span>
                <span className="font-semibold text-focus">{category}</span>
              </div>
              {chequeNo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-fg font-medium">Cheque No.</span>
                  <span className="font-mono font-semibold text-focus">{chequeNo}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                <span className="font-bold text-focus">Total Loan Amount</span>
                <span className="font-bold text-blue-600 text-base">
                  {formatPHP(parseFloat(amount.replace(/,/g, '')) || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stroke/15">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsConfirmOpen(false)}
              className="h-10 px-4 rounded-xl border-stroke/60 text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmedSubmit}
              className="h-10 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Recording…' : 'Confirm & Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
