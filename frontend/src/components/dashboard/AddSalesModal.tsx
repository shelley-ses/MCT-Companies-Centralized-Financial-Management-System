import * as React from 'react'
import { SALES_CATEGORY_LIST } from '@/utils/categoryConstants'
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
} from 'lucide-react'
import {
  salesService,
  type NewSalesInput,
  type SalesItem,
} from '@/services/salesService'
import { expenseService } from '@/services/expenseService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatToYYYYMMDD } from '@/utils/dateUtils'

interface AddSalesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: SalesItem) => void
  assignedCompany: string
}

const PAYMENT_METHOD_OPTIONS = [
  'Cash',
  'GCash',
  'Maya',
  'PayMongo',
  'Panda',
  'Cheque',
  'Bank Transfer',
  'In-house',
]

const DEFAULT_SALES_CATEGORIES = SALES_CATEGORY_LIST

export const AddSalesModal: React.FC<AddSalesModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  assignedCompany,
}) => {
  // Date default is today (editable)
  const getTodayIso = () => formatToYYYYMMDD(new Date())

  const [date, setDate] = React.useState(getTodayIso())
  const [chequeNo, setChequeNo] = React.useState('')
  const [particulars, setParticulars] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState('Cash')
  const [category, setCategory] = React.useState(DEFAULT_SALES_CATEGORIES[0])
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>(DEFAULT_SALES_CATEGORIES)
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
  }>({})

  // Load categories from database
  React.useEffect(() => {
    let mounted = true
    expenseService.getCategories().then((cats) => {
      if (mounted && cats && cats.length > 0) {
        const names = Array.from(new Set([...cats.map((c) => c.name), ...DEFAULT_SALES_CATEGORIES]))
        setCategoryOptions(names)
      }
    })
    return () => {
      mounted = false
    }
  }, [open])

  // Dynamic filter for category suggestions
  const filteredCategoryOptions = React.useMemo(() => {
    const q = category.trim().toLowerCase()
    if (!q) return categoryOptions
    return categoryOptions.filter((opt) => opt.toLowerCase().includes(q))
  }, [category, categoryOptions])

  // Close category dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false)
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
      setPaymentMethod('Cash')
      setCategory(DEFAULT_SALES_CATEGORIES[0])
      setError('')
      setFieldErrors({})
      setIsConfirmOpen(false)
    }
  }, [open])

  // Step 1: Pre-validate and show confirmation dialogue
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const errors: { date?: string; particulars?: string; amount?: string; category?: string } = {}

    const todayIso = getTodayIso()
    if (!date.trim()) {
      errors.date = 'Date is required.'
    } else if (date.trim() > todayIso) {
      errors.date = 'Date cannot be in the future (maximum date is today).'
    }

    if (!particulars.trim()) {
      errors.particulars = 'Particulars is required.'
    }

    const parsedAmount = parseFloat(amount)
    if (!amount.trim()) {
      errors.amount = 'Amount is required.'
    } else if (isNaN(parsedAmount) || parsedAmount < 1.0) {
      errors.amount = 'Amount must be at least 1.00 (cannot be 0 or less than 1).'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fill in all required fields.')
      return
    }

    setFieldErrors({})
    setIsConfirmOpen(true)
  }

  // Step 2: Confirmed submission
  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const parsedAmount = parseFloat(amount.replace(/,/g, ''))
      const catTrimmed = category.trim() || DEFAULT_SALES_CATEGORIES[0]
      if (catTrimmed && !categoryOptions.includes(catTrimmed)) {
        expenseService.createCategory(catTrimmed).catch((e) => console.warn('Could not persist category:', e))
      }

      const payload: NewSalesInput = {
        date: date.trim() || getTodayIso(),
        chequeNo: chequeNo.trim(),
        particulars: particulars.trim(),
        amount: parsedAmount,
        category: catTrimmed,
        paymentMethod: paymentMethod,
        company: assignedCompany,
        status: 'Paid',
      }
      const created = await salesService.addSale(payload)

      // Close confirmation and modal
      setIsConfirmOpen(false)
      onOpenChange(false)

      // Trigger callback to redirect & highlight newly added row in table
      onSuccess(created)
    } catch (err: any) {
      setError(err?.message || 'Failed to record sales entry.')
      setIsConfirmOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* 1. Main Add Sales Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4 [&>button]:w-6 [&>button]:h-6 [&>button]:p-0.5 [&>button]:rounded-md [&>button>svg]:w-3.5 [&>button>svg]:h-3.5">
          <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                  Record New Sale
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                  Enter sales inflow record for {assignedCompany}
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

              {/* 2. Cheque No (no icon in label) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Cheque No. (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. CHQ-8899"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  className="h-10 rounded-xl border-stroke/50 text-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Particulars (no 'Notes', no icon in label, required asterisk) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus block">
                Particulars <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. Corporate Banquet Catering Deposit"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 4. Amount (no icon in label, required asterisk) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Amount (PHP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1.00"
                  placeholder="1.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (fieldErrors.amount) {
                      setFieldErrors((prev) => ({ ...prev, amount: undefined }))
                    }
                  }}
                  className={cn(
                    'h-10 rounded-xl border-stroke/50 text-xs font-semibold tabular-nums',
                    fieldErrors.amount && 'border-red-500 focus-visible:ring-red-200'
                  )}
                />
                {fieldErrors.amount && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {fieldErrors.amount}
                  </p>
                )}
              </div>

              {/* 5. Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs font-medium text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
                >
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6. Category (Searchable / Configurable) */}
            <div className="space-y-1.5" ref={categoryContainerRef}>
              <Label className="text-xs font-semibold text-focus block">
                Category <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setIsCategoryOpen(true)
                    if (fieldErrors.category) {
                      setFieldErrors((prev) => ({ ...prev, category: undefined }))
                    }
                  }}
                  onFocus={() => setIsCategoryOpen(true)}
                  placeholder="Select or type category…"
                  className={cn(
                    'h-10 rounded-xl border-stroke/50 text-xs pr-8 font-medium bg-white',
                    fieldErrors.category && 'border-red-500 focus-visible:ring-red-200'
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIsCategoryOpen((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-0.5 rounded cursor-pointer transition-colors"
                  aria-label="Toggle category list"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isCategoryOpen && 'rotate-180')} />
                </button>

                {/* Suggestions dropdown with dynamic matching or custom input indication */}
                {isCategoryOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 max-h-52 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-fg uppercase tracking-wider flex items-center justify-between">
                      <span>Specific Categories</span>
                      {category.trim() && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {filteredCategoryOptions.length} match{filteredCategoryOptions.length === 1 ? '' : 'es'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {filteredCategoryOptions.length > 0 ? (
                        filteredCategoryOptions.map((opt) => (
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
                              'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer',
                              category.toLowerCase() === opt.toLowerCase()
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-focus/80 hover:bg-slate-50'
                            )}
                          >
                            <span>{opt}</span>
                            {category.toLowerCase() === opt.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-2">
                          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-left">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-focus break-all">"{category.trim()}"</span>
                              <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                User Input
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-fg mt-1">
                              Will be saved as specific category in dropdown.
                            </p>
                          </div>
                        </div>
                      )}
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
                Add Sales
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
              Confirm Sales Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg font-normal">
              Please review and confirm this sales transaction entry before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-fg font-medium">Company</span>
                <span className="font-semibold text-focus">{assignedCompany}</span>
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
                <span className="text-muted-fg font-medium">Payment Method</span>
                <span className="font-semibold text-focus">{paymentMethod}</span>
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
                <span className="font-bold text-focus">Total Deposit Amount</span>
                <span className="font-bold text-emerald-600 text-base">
                  {formatPHP(parseFloat(amount) || 0)}
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
