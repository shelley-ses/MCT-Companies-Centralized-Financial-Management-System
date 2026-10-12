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
} from 'lucide-react'
import {
  expenseService,
  type NewExpenseInput,
  type ExpenseItem,
} from '@/services/expenseService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatToYYYYMMDD } from '@/utils/dateUtils'

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: ExpenseItem) => void
  assignedCompany: string
}

const DEFAULT_CATEGORY_OPTIONS = [
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

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  assignedCompany,
}) => {
  const getTodayIso = () => formatToYYYYMMDD(new Date())

  const [date, setDate] = React.useState(getTodayIso())
  const [chequeNo, setChequeNo] = React.useState('')
  const [particulars, setParticulars] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('None')
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>(DEFAULT_CATEGORY_OPTIONS)
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

  // Fetch categories from the database
  React.useEffect(() => {
    let isMounted = true
    const fetchCategories = async () => {
      try {
        const cats = await expenseService.getCategories()
        if (isMounted && cats && cats.length > 0) {
          const names = Array.from(new Set(['None', ...cats.map((c) => c.name)]))
          setCategoryOptions(names)
        }
      } catch (err) {
        console.warn('Could not load categories from database:', err)
      }
    }
    fetchCategories()
    return () => {
      isMounted = false
    }
  }, [open])

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
      setCategory('None')
      setIsCategoryOpen(false)
      setIsConfirmOpen(false)
      setIsSubmitting(false)
      setError('')
      setFieldErrors({})
    }
  }, [open])

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
      errors.date = 'Expense date cannot be in the future (maximum date is today).'
    }

    if (!particulars.trim()) {
      errors.particulars = 'Particulars is required.'
    }

    // Amount validation: strictly positive numeric value, no letters, no negative
    const cleanAmount = amount.trim().replace(/,/g, '')
    if (!cleanAmount) {
      errors.amount = 'Withdrawal amount is required.'
    } else if (/[a-zA-Z]/.test(cleanAmount) || !/^\d+(\.\d{1,2})?$/.test(cleanAmount)) {
      errors.amount = 'Withdrawal amount must be a valid positive number without letters.'
    } else {
      const numAmount = parseFloat(cleanAmount)
      if (isNaN(numAmount) || numAmount < 1.0) {
        errors.amount = 'Withdrawal amount must be at least ₱1.00 (cannot be zero or negative).'
      }
    }

    if (category === 'None' || !category.trim()) {
      errors.category = 'Please choose a category from the database list.'
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
      const payload: NewExpenseInput = {
        date: date.trim() || getTodayIso(),
        chequeNo: chequeNo.trim() || undefined,
        particulars: particulars.trim(),
        amount: parsedAmount,
        category: category.trim(),
        company: assignedCompany,
        status: 'Paid',
      }
      const created = await expenseService.addExpense(payload)

      setIsConfirmOpen(false)
      onOpenChange(false)
      onSuccess(created)
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense entry.')
      setIsConfirmOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* 1. Main Add Expense Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4 [&>button]:w-6 [&>button]:h-6 [&>button]:p-0.5 [&>button]:rounded-md [&>button>svg]:w-3.5 [&>button>svg]:h-3.5">
          <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                  Record New Expense
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                  Enter expense outflow record for {assignedCompany}
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
                  placeholder="e.g. CHK-99201"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  className="h-10 rounded-xl border-stroke/50 text-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Particulars */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus block">
                Particulars <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. Commercial Kitchen Gas & Utility Bill"
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
              {/* 4. Withdrawal Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-focus block">
                  Withdrawal Amount (₱) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onKeyDown={(e) => {
                    // Block minus, plus, exponent keys
                    if (['-', '+', 'e', 'E'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    // Allow only digits and a single decimal point
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setAmount(val)
                      if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }))
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

              {/* 5. Category (Searchable Dropdown) */}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-1"
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
                              'w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors',
                              category === opt
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'hover:bg-slate-100 text-focus'
                            )}
                          >
                            <span>{opt}</span>
                            {category === opt && <Check className="w-3.5 h-3.5" />}
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
                Add Expense
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
              Confirm Expense Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg font-normal">
              Please review and confirm this expense transaction entry before saving.
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
                <span className="font-bold text-focus">Total Withdrawal Amount</span>
                <span className="font-bold text-rose-600 text-base">
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
