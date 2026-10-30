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
  Pencil,
  AlertCircle,
  Building2,
  Calendar,
  Bell,
  Check,
} from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import {
  billsService,
  type BillItem,
  type BillStatus,
  type UpdateBillInput,
} from '@/services/billsService'
import { loanService } from '@/services/loanService'
import { cn } from '@/lib/utils'

interface EditBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: BillItem) => void
  bill: BillItem | null
  isCompanyScoped?: boolean
  companies?: string[]
}

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

export const EditBillModal: React.FC<EditBillModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  bill,
  companies: propsCompanies,
}) => {
  const { user } = useSession()
  const isFinance = user?.role === 'Finance'
  const isAdmin = user?.role === 'Admin'
  const canChooseCompany = isFinance || isAdmin

  const [dbCompanies, setDbCompanies] = React.useState<string[]>(
    propsCompanies || DEFAULT_COMPANIES
  )

  React.useEffect(() => {
    let mounted = true
    loanService.getCompanies().then((res) => {
      if (mounted && res.length > 0) {
        const names = res.map((c) => c.company_name).filter(Boolean)
        setDbCompanies(Array.from(new Set([...names, ...DEFAULT_COMPANIES])))
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Form states
  const [billerName, setBillerName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [company, setCompany] = React.useState('')
  const [billingCycle, setBillingCycle] = React.useState<'Daily' | 'Monthly' | 'Yearly'>('Monthly')
  const [reminderDaysBefore, setReminderDaysBefore] = React.useState<number>(5)
  const [status, setStatus] = React.useState<BillStatus>('Unpaid')
  const [notes, setNotes] = React.useState('')

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [fieldErrors, setFieldErrors] = React.useState<{
    billerName?: string
    amount?: string
    dueDate?: string
  }>({})

  // Populate from bill prop
  React.useEffect(() => {
    if (bill && open) {
      setBillerName(bill.billerName || '')
      setAmount(bill.amount?.toString() || '')
      setDueDate(bill.dueDate || '')
      setCompany(bill.company || 'MCT Kitchen')
      setBillingCycle(
        bill.billingCycle === 'Daily' || bill.billingCycle === 'Yearly'
          ? bill.billingCycle
          : 'Monthly'
      )
      setReminderDaysBefore(bill.reminderDaysBefore ?? 5)
      setStatus(bill.status || 'Unpaid')
      setNotes(bill.notes || '')
      setError('')
      setFieldErrors({})
      setIsSubmitting(false)
    }
  }, [bill, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bill) return
    setError('')

    const errors: { billerName?: string; amount?: string; dueDate?: string } = {}

    if (!billerName.trim()) {
      errors.billerName = 'Bill / Provider name is required.'
    }

    const cleanAmount = amount.replace(/,/g, '').trim()
    const numAmount = parseFloat(cleanAmount)
    if (!cleanAmount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid bill amount greater than ₱0.'
    }

    if (!dueDate) {
      errors.dueDate = 'Due date is required.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const input: UpdateBillInput = {
        billerName: billerName.trim(),
        amount: numAmount,
        dueDate,
        company: canChooseCompany ? company : bill.company,
        billingCycle,
        reminderDaysBefore,
        status,
        notes: notes.trim(),
      }

      const updated = await billsService.updateBill(bill.id, input)
      onSuccess(updated)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to update bill record.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[85vh] overflow-y-auto rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
        <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                Update Recurring Bill
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                Edit bill details, amount, due date schedule, and status
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Biller Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
              <span>Bill / Provider Name</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="e.g. Meralco Commercial Power, Manila Water..."
              value={billerName}
              onChange={(e) => {
                setBillerName(e.target.value)
                if (fieldErrors.billerName) {
                  setFieldErrors((prev) => ({ ...prev, billerName: undefined }))
                }
              }}
              className={cn(
                'h-10 rounded-xl border-stroke/50 text-xs font-medium',
                fieldErrors.billerName && 'border-red-500 focus-visible:ring-red-200'
              )}
            />
            {fieldErrors.billerName && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.billerName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 2. Company */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                <span>Company</span>
              </Label>
              {canChooseCompany ? (
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs font-medium text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
                >
                  {dbCompanies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full h-10 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-xs text-focus font-semibold flex items-center truncate">
                  {bill?.company}
                </div>
              )}
            </div>

            {/* 3. Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
                <span>Amount (₱)</span>
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-fg">
                  ₱
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setAmount(val)
                      if (fieldErrors.amount) {
                        setFieldErrors((p) => ({ ...p, amount: undefined }))
                      }
                    }
                  }}
                  className={cn(
                    'h-10 pl-7 rounded-xl border-stroke/50 text-xs font-mono font-medium',
                    fieldErrors.amount && 'border-red-500 focus-visible:ring-red-200'
                  )}
                />
              </div>
              {fieldErrors.amount && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 4. Recurring Schedule */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                <span>Recurring</span>
                <span className="text-red-500">*</span>
              </Label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'Daily' | 'Monthly' | 'Yearly')}
                className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs font-medium text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
              >
                <option value="Daily">Daily</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            {/* 5. Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                <span>Due Date</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  if (fieldErrors.dueDate) {
                    setFieldErrors((p) => ({ ...p, dueDate: undefined }))
                  }
                }}
                className={cn(
                  'h-10 rounded-xl border-stroke/50 text-xs font-medium',
                  fieldErrors.dueDate && 'border-red-500 focus-visible:ring-red-200'
                )}
              />
              {fieldErrors.dueDate && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.dueDate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 6. Reminder Notification */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Due Date Reminder</span>
              </Label>
              <select
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10))}
                className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs font-medium text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
              >
                <option value={1}>1 day before due date</option>
                <option value={3}>3 days before due date</option>
                <option value={5}>5 days before due date</option>
                <option value={7}>7 days before due date</option>
                <option value={10}>10 days before due date</option>
              </select>
            </div>

            {/* 7. Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus block">Payment Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-stroke/50 bg-white text-xs font-medium text-focus shadow-2xs focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-focus cursor-pointer"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Due Soon">Due Soon</option>
                <option value="Overdue">Overdue</option>
                <option value="Partially Paid">Partially Paid</option>
              </select>
            </div>
          </div>

          {/* 8. Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-focus block">Notes</Label>
            <Input
              type="text"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-xl border-stroke/50 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stroke/15">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Update Bill'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
