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

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newItem: ExpenseItem) => void
  assignedCompany: string
}

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

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  assignedCompany,
}) => {
  const getTodayIso = () => new Date().toISOString().split('T')[0]

  const [date, setDate] = React.useState(getTodayIso())
  const [chequeNo, setChequeNo] = React.useState('')
  const [particulars, setParticulars] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('None')
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false)
  const categoryContainerRef = React.useRef<HTMLDivElement>(null)

  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState<{
    date?: string
    particulars?: string
    amount?: string
    category?: string
  }>({})

  const filteredCategoryOptions = React.useMemo(() => {
    const q = category.trim().toLowerCase()
    if (!q) return CATEGORY_OPTIONS
    return CATEGORY_OPTIONS.filter((opt) => opt.toLowerCase().includes(q))
  }, [category])

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

  const validate = (): boolean => {
    const errors: {
      date?: string
      particulars?: string
      amount?: string
      category?: string
    } = {}

    if (!date.trim()) {
      errors.date = 'Date is required.'
    }

    if (!particulars.trim()) {
      errors.particulars = 'Particulars description is required.'
    }

    const numAmount = parseFloat(amount.replace(/,/g, ''))
    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid expense amount greater than 0.'
    }

    if (category === 'None' || !category.trim()) {
      errors.category = 'Please choose a category.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleReviewClick = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validate()) {
      setIsConfirmOpen(true)
    }
  }

  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError('')
      const numAmount = parseFloat(amount.replace(/,/g, ''))

      const input: NewExpenseInput = {
        date,
        chequeNo: chequeNo.trim() || undefined,
        particulars: particulars.trim(),
        amount: numAmount,
        category: category.trim(),
        company: assignedCompany,
        status: 'Paid',
      }

      const createdItem = await expenseService.addExpense(input)
      setIsConfirmOpen(false)
      onOpenChange(false)
      onSuccess(createdItem)
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense. Please try again.')
      setIsConfirmOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const parsedAmountNumber = parseFloat(amount.replace(/,/g, '')) || 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[460px] rounded-[24px] p-0 bg-white border border-stroke/30 shadow-2xl overflow-hidden"
          aria-describedby="add-expense-description"
        >
          <div className="bg-gradient-to-r from-red-800 to-primary p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Record New Expense
                </DialogTitle>
                <DialogDescription
                  id="add-expense-description"
                  className="text-xs text-white/80 mt-0.5"
                >
                  Record operational outflow or expenditure for {assignedCompany}
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleReviewClick} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expense-date" className="text-xs font-semibold text-focus">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: undefined }))
                  }}
                  className={cn(
                    'h-10 text-xs rounded-xl border-stroke/40 focus-visible:ring-primary',
                    fieldErrors.date && 'border-red-500'
                  )}
                />
                {fieldErrors.date && (
                  <p className="text-[11px] text-red-500 font-medium">{fieldErrors.date}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-cheque" className="text-xs font-semibold text-focus">
                  Cheque No. <span className="text-muted-fg text-[11px] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="expense-cheque"
                  type="text"
                  placeholder="e.g. CHK-99201"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  className="h-10 text-xs rounded-xl border-stroke/40 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-particulars" className="text-xs font-semibold text-focus">
                Particulars / Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-particulars"
                type="text"
                placeholder="e.g. Commercial Kitchen Gas & Utility Bill"
                value={particulars}
                onChange={(e) => {
                  setParticulars(e.target.value)
                  if (fieldErrors.particulars) setFieldErrors((p) => ({ ...p, particulars: undefined }))
                }}
                className={cn(
                  'h-10 text-xs rounded-xl border-stroke/40 focus-visible:ring-primary',
                  fieldErrors.particulars && 'border-red-500'
                )}
              />
              {fieldErrors.particulars && (
                <p className="text-[11px] text-red-500 font-medium">{fieldErrors.particulars}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expense-amount" className="text-xs font-semibold text-focus">
                  Withdrawal Amount (₱) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }))
                  }}
                  className={cn(
                    'h-10 text-xs rounded-xl border-stroke/40 focus-visible:ring-primary',
                    fieldErrors.amount && 'border-red-500'
                  )}
                />
                {fieldErrors.amount && (
                  <p className="text-[11px] text-red-500 font-medium">{fieldErrors.amount}</p>
                )}
              </div>

              <div className="space-y-1.5 relative" ref={categoryContainerRef}>
                <Label htmlFor="expense-category" className="text-xs font-semibold text-focus">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="expense-category"
                    type="text"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      setIsCategoryOpen(true)
                      if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: undefined }))
                    }}
                    onFocus={() => setIsCategoryOpen(true)}
                    className={cn(
                      'h-10 text-xs rounded-xl border-stroke/40 pr-8 focus-visible:ring-primary',
                      fieldErrors.category && 'border-red-500'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-fg hover:text-focus cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isCategoryOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-stroke/30 shadow-xl p-1.5 z-50 max-h-48 overflow-y-auto">
                    {filteredCategoryOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCategory(opt)
                          setIsCategoryOpen(false)
                          if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: undefined }))
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                          category === opt
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <span>{opt}</span>
                        {category === opt && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
                {fieldErrors.category && (
                  <p className="text-[11px] text-red-500 font-medium">{fieldErrors.category}</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 text-xs font-medium rounded-xl border-stroke/50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
              >
                Continue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent
          className="sm:max-w-[420px] rounded-[24px] p-6 bg-white border border-stroke/30 shadow-2xl"
          aria-describedby="confirm-expense-desc"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-focus">
              Confirm Expense Record
            </DialogTitle>
            <DialogDescription id="confirm-expense-desc" className="text-xs text-muted-fg mt-1">
              Please verify the details below before recording this expense into the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-fg">Company:</span>
              <span className="font-semibold text-focus">{assignedCompany}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Date:</span>
              <span className="font-semibold text-focus">{date}</span>
            </div>
            {chequeNo && (
              <div className="flex justify-between">
                <span className="text-muted-fg">Cheque No:</span>
                <span className="font-mono text-focus">{chequeNo}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-fg">Category:</span>
              <span className="font-semibold text-focus">{category}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/80 pt-2">
              <span className="text-muted-fg">Amount:</span>
              <span className="font-bold text-red-600 text-sm">
                {formatPHP(parsedAmountNumber)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsConfirmOpen(false)}
              className="h-9 px-4 text-xs font-medium rounded-xl border-stroke/50 cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
              className="h-9 px-5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              {isSubmitting ? 'Recording…' : 'Confirm & Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
