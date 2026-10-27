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
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Hash,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { formatPHP } from '@/lib/format'
import {
  billsService,
  getBillPaymentOptions,
  type BillItem,
  type BillPaymentPeriod,
} from '@/services/billsService'
import { cn } from '@/lib/utils'

export interface RecordBillPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: BillItem | null
  onBillPaid?: (updatedBill: BillItem) => void
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'Cheque',
  'GCash',
  'Maya',
  'In-house',
  'Auto-Debit',
] as const

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MONTH_FULL_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const RecordBillPaymentModal: React.FC<RecordBillPaymentModalProps> = ({
  open,
  onOpenChange,
  bill,
  onBillPaid,
}) => {
  const [amountInput, setAmountInput] = React.useState<string>('')
  const [paymentDate, setPaymentDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [paymentPeriod, setPaymentPeriod] = React.useState<BillPaymentPeriod | null>(null)
  const [paymentMethod, setPaymentMethod] = React.useState<string>('Bank Transfer')
  const [referenceNo, setReferenceNo] = React.useState<string>('')
  const [notes, setNotes] = React.useState<string>('')
  const [selectedYear, setSelectedYear] = React.useState<number>(() =>
    new Date().getFullYear()
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Reset or initialize on open
  React.useEffect(() => {
    if (open && bill) {
      const options = getBillPaymentOptions(bill)
      const nextP = options.nextPayable
      setAmountInput(String(bill.amount))
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setPaymentPeriod(nextP)
      setPaymentMethod('Bank Transfer')
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)

      const targetDate = nextP?.periodDate || bill.dueDate
      const parsedYear = targetDate ? parseInt(targetDate.slice(0, 4), 10) : new Date().getFullYear()
      setSelectedYear(!isNaN(parsedYear) ? parsedYear : new Date().getFullYear())
    }
  }, [open, bill])

  if (!bill) return null

  const paymentSchedule = getBillPaymentOptions(bill).periods
  const parsedAmount = parseFloat(amountInput) || 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const currentPeriodKey = todayStr.slice(0, 7)

  // Find overdue unpaid periods (past due dates)
  const overduePeriods = paymentSchedule.filter(
    (p) => !p.paid && !p.isFuture && (p.periodDate || '') < todayStr
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!paymentDate) {
      setError('Please select a payment date')
      return
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (!paymentPeriod) {
      setError('Please select a billing period from the calendar to pay.')
      return
    }

    try {
      setIsSubmitting(true)
      const updated = await billsService.recordPayment(bill.id, {
        periodKey: paymentPeriod.key,
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        refNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setSuccessBanner(`Payment of ${formatPHP(parsedAmount)} recorded for ${paymentPeriod.label}!`)
      if (onBillPaid) {
        onBillPaid(updated)
      }

      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate 12 months for the selected year
  const dueDay = bill.dueDayOfMonth || parseInt(bill.dueDate?.slice(8, 10) || '15', 10) || 15

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl [&>button]:top-5 [&>button]:right-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                Record Bill Payment
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                Select a billing period from the calendar to settle current or overdue dues
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Bill Overview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs mt-1">
          <div>
            <div className="font-bold text-focus text-sm">{bill.billerName}</div>
            <div className="text-muted-fg flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-muted-fg" />
                {bill.company}
              </span>
              {bill.accountNo && (
                <span className="flex items-center gap-1 font-mono">
                  • <Hash className="w-3 h-3 opacity-60" />
                  {bill.accountNo}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider">
              Selected Due
            </div>
            <div className="font-bold text-focus text-sm text-[#960C01]">
              {paymentPeriod?.label || bill.dueDate}
            </div>
          </div>
        </div>

        {/* Overdue Alert Banner if multiple dues are pending */}
        {overduePeriods.length > 0 && (
          <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-950 flex items-start justify-between gap-3 animate-in fade-in-50 duration-200">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900 block">
                  {overduePeriods.length} Overdue Due{overduePeriods.length > 1 ? 's' : ''} Pending Payment
                </span>
                <span className="text-[11px] text-rose-800/90 leading-relaxed block mt-0.5">
                  This bill has missed previous due dates. You can select any overdue month directly on the calendar below to pay for that past due first.
                </span>
              </div>
            </div>
            {overduePeriods[0] && paymentPeriod?.key !== overduePeriods[0].key && (
              <button
                type="button"
                onClick={() => {
                  setPaymentPeriod(overduePeriods[0])
                  const y = parseInt(overduePeriods[0].key.slice(0, 4), 10)
                  if (!isNaN(y)) setSelectedYear(y)
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
              >
                Pay Oldest ({overduePeriods[0].label})
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* CALENDAR VIEW FOR BILL PAYMENT SCHEDULE */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#960C01]" />
                <span className="text-xs font-bold text-focus">Payment Schedule Calendar</span>
                <span className="text-[11px] text-muted-fg font-normal">
                  ({bill.billingCycle} Cycle)
                </span>
              </div>

              {/* Year Navigator */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-focus transition-colors cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-xs text-focus px-2 font-mono tabular-nums">
                  {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-focus transition-colors cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Monthly Calendar Matrix (12 months of selected year) */}
            {bill.billingCycle === 'Monthly' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {MONTH_NAMES.map((monthAbbr, idx) => {
                  const monthNum = idx + 1
                  const monthKey = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
                  const lastDayOfMonth = new Date(selectedYear, monthNum, 0).getDate()
                  const effectiveDay = Math.min(dueDay, lastDayOfMonth)
                  const periodDateStr = `${monthKey}-${String(effectiveDay).padStart(2, '0')}`

                  // Look for matching period in schedule
                  const scheduledPeriod = paymentSchedule.find((p) => p.key === monthKey)
                  const isPaid = Boolean(scheduledPeriod?.paid)
                  const isOverdue =
                    !isPaid &&
                    ((scheduledPeriod && !scheduledPeriod.isFuture && (scheduledPeriod.periodDate || '') < todayStr) ||
                      (!scheduledPeriod && periodDateStr < todayStr))
                  const isDueCurrent =
                    !isPaid && !isOverdue && monthKey === currentPeriodKey
                  const isFuture =
                    !isPaid && !isOverdue && !isDueCurrent && monthKey > currentPeriodKey
                  const isSelected = paymentPeriod?.key === monthKey

                  // Fallback period if not in original pre-generated window
                  const periodObj: BillPaymentPeriod = scheduledPeriod || {
                    key: monthKey,
                    label: `${monthAbbr} ${selectedYear}`,
                    paid: false,
                    periodDate: periodDateStr,
                    isFuture,
                  }

                  return (
                    <button
                      key={monthKey}
                      type="button"
                      onClick={() => setPaymentPeriod(periodObj)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[72px] cursor-pointer group',
                        isSelected
                          ? 'border-[#960C01] bg-[#960C01]/5 ring-2 ring-[#960C01] shadow-xs'
                          : isPaid
                          ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950'
                          : isOverdue
                          ? 'border-rose-300 bg-rose-50/80 hover:bg-rose-100/80 text-rose-950'
                          : isDueCurrent
                          ? 'border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 text-amber-950'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      {/* Top Header: Month Name & Selected Indicator */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={cn(
                            'text-xs font-bold truncate',
                            isSelected ? 'text-[#960C01]' : 'text-focus'
                          )}
                        >
                          {MONTH_FULL_NAMES[idx]}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#960C01] shrink-0" />
                        )}
                      </div>

                      {/* Due date info */}
                      <div className="text-[10px] text-muted-fg font-medium truncate mt-0.5">
                        Due: {monthAbbr} {effectiveDay}
                      </div>

                      {/* Status Badge */}
                      <div className="mt-1 pt-1 border-t border-slate-200/50 flex items-center justify-between">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Paid</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Overdue</span>
                          </span>
                        ) : isDueCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Due Soon</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Upcoming
                          </span>
                        )}

                        {scheduledPeriod?.paymentDate && (
                          <span className="text-[9px] text-emerald-600/90 font-mono truncate">
                            {scheduledPeriod.paymentDate.slice(5)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Non-Monthly Billing Cycle (Daily / Yearly fallback schedule view) */}
            {bill.billingCycle !== 'Monthly' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                {paymentSchedule.map((period) => {
                  const isSelected = paymentPeriod?.key === period.key
                  const isOverdue =
                    !period.paid && !period.isFuture && (period.periodDate || '') < todayStr
                  return (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setPaymentPeriod(period)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                        isSelected
                          ? 'border-[#960C01] bg-[#960C01]/5 ring-2 ring-[#960C01]'
                          : period.paid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : isOverdue
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      )}
                    >
                      <div className="font-bold text-xs truncate">{period.label}</div>
                      <div className="text-[10px] mt-1 flex items-center gap-1">
                        {period.paid ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="font-semibold">Paid</span>
                          </>
                        ) : isOverdue ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span className="font-semibold">Overdue</span>
                          </>
                        ) : (
                          <span>Upcoming</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Calendar Legend */}
            <div className="flex items-center justify-between text-[11px] text-muted-fg pt-1 px-1 border-t border-slate-200/60 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Paid</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Overdue (Missed)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Current / Due Soon</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span>Upcoming</span>
              </span>
            </div>
          </div>

          {/* Selected Billing Period Card */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Selected Billing Period to Pay
              </span>
              <span className="text-base font-bold text-focus block mt-0.5">
                {paymentPeriod?.label || 'No period selected'}
              </span>
              <span className="text-[11px] text-muted-fg block mt-0.5">
                Scheduled Due Date: {paymentPeriod?.periodDate || bill.dueDate}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Status
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-1',
                  paymentPeriod?.paid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : !paymentPeriod?.isFuture && (paymentPeriod?.periodDate || '') < todayStr
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                )}
              >
                {paymentPeriod?.paid
                  ? 'Already Paid (Advance Re-record)'
                  : !paymentPeriod?.isFuture && (paymentPeriod?.periodDate || '') < todayStr
                  ? 'Overdue Due'
                  : 'Current Due'}
              </span>
            </div>
          </div>

          {/* Payment Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="bill-pay-amount" className="text-xs font-semibold text-focus block">
                Amount Paid (PHP) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-fg">
                  ₱
                </span>
                <Input
                  id="bill-pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-fg">
                Scheduled Bill Amount: <span className="font-semibold text-focus">{formatPHP(bill.amount)}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bill-pay-date" className="text-xs font-semibold text-focus block">
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bill-pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-focus block">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                      isSelected
                        ? 'border-[#960C01] bg-[#960C01]/10 text-[#960C01] font-semibold shadow-xs ring-1 ring-[#960C01]'
                        : 'border-stroke/50 bg-slate-50 text-focus/80 hover:bg-slate-100 hover:border-stroke/70'
                    )}
                  >
                    {pm}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reference / OR No. */}
          <div className="space-y-1.5">
            <Label htmlFor="bill-pay-ref" className="text-xs font-semibold text-focus block">
              Reference / OR / Transaction No. (Optional)
            </Label>
            <Input
              id="bill-pay-ref"
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. OR# 98234 / BDO-98234-X"
              className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="bill-pay-notes" className="text-xs font-semibold text-focus block">
              Notes / Remarks (Optional)
            </Label>
            <Input
              id="bill-pay-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid online by finance department"
              className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stroke/20 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !paymentPeriod}
              className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Mark {paymentPeriod?.label || 'Period'} as Paid
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
