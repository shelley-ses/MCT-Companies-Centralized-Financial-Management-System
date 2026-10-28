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
] as const

export const MONTH_NAMES = [
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

export const MONTH_FULL_NAMES = [
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
    Math.max(2025, new Date().getFullYear())
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Reset or initialize on open - automatically locks to oldest unpaid or partially paid month (2025 onwards)
  React.useEffect(() => {
    if (open && bill) {
      const options = getBillPaymentOptions(bill)
      const nextP = options.nextPayable
      const remaining =
        nextP.remainingAmount !== undefined && nextP.remainingAmount > 0
          ? nextP.remainingAmount
          : nextP.paidAmount && nextP.paidAmount > 0
          ? Math.max(0, bill.amount - nextP.paidAmount)
          : bill.amount

      setAmountInput(String(remaining > 0 ? remaining : bill.amount))
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setPaymentPeriod(nextP)
      setPaymentMethod('Bank Transfer')
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)

      const targetDate = nextP?.periodDate || bill.dueDate
      const parsedYear = targetDate ? parseInt(targetDate.slice(0, 4), 10) : new Date().getFullYear()
      setSelectedYear(!isNaN(parsedYear) ? Math.max(2025, parsedYear) : Math.max(2025, new Date().getFullYear()))
    }
  }, [open, bill])

  if (!bill) return null

  const paymentSchedule = getBillPaymentOptions(bill).periods
  const parsedAmount = parseFloat(amountInput) || 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const currentPeriodKey = todayStr.slice(0, 7)

  // Find overdue unpaid or partially paid periods (past due dates)
  const overduePeriods = paymentSchedule.filter(
    (p) => !p.paid && !p.isFuture && (p.periodDate || '') < todayStr
  )

  const isPartiallyPaid = Boolean(paymentPeriod?.partiallyPaid)
  const remainingBalance =
    paymentPeriod?.remainingAmount !== undefined && paymentPeriod.remainingAmount > 0
      ? paymentPeriod.remainingAmount
      : bill.amount
  const maxAllowedAmount = isPartiallyPaid ? remainingBalance : bill.amount
  const isExceeding = parsedAmount > maxAllowedAmount || parsedAmount > bill.amount

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

    if (isExceeding) {
      if (isPartiallyPaid && paymentPeriod?.remainingAmount !== undefined) {
        setError(`Amount paid cannot be greater than the remaining balance (${formatPHP(paymentPeriod.remainingAmount)}).`)
      } else {
        setError(`Amount paid cannot be greater than the Monthly Bill Amount (${formatPHP(bill.amount)}).`)
      }
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
      <DialogContent className="sm:max-w-[880px] md:max-w-[940px] max-h-[85vh] overflow-y-auto rounded-[24px] p-5 sm:p-6 bg-white border border-stroke/30 shadow-2xl">
        {/* Header */}
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-focus leading-tight">
                  Record Bill Payment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg font-normal">
                  Review the payment schedule and record payment
                </DialogDescription>
              </div>
            </div>

            {/* Biller & Amount Summary Pill */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs self-start sm:self-auto">
              <div>
                <div className="font-bold text-focus text-xs truncate max-w-[150px]">{bill.billerName}</div>
                <div className="text-[11px] text-muted-fg flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-muted-fg" />
                  <span className="truncate max-w-[120px]">{bill.company}</span>
                </div>
              </div>
              <div className="border-l border-slate-200 pl-2.5 text-right">
                <span className="text-[10px] uppercase font-bold text-muted-fg block">Monthly Bill</span>
                <span className="text-xs font-bold text-focus">{formatPHP(bill.amount)}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pt-2">
          {error && (
            <div className="mb-2.5 p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successBanner && (
            <div className="mb-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* LEFT COLUMN: Payment Schedule Calendar & Target Period */}
            <div className="md:col-span-7 space-y-2">
              {/* Overdue Alert Banner if dues are pending */}
              {overduePeriods.length > 0 && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="text-[11px] font-semibold truncate">
                    {overduePeriods.length} Overdue Due{overduePeriods.length > 1 ? 's' : ''} Pending Payment
                  </span>
                </div>
              )}

              {/* CALENDAR VIEW FOR BILL PAYMENT SCHEDULE */}
              <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200">
                {/* Calendar Controls */}
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#960C01]" />
                    <span className="text-xs font-bold text-focus">Payment Schedule</span>
                    <span className="text-[10px] text-muted-fg font-normal">
                      ({bill.billingCycle} Cycle)
                    </span>
                  </div>

                  {/* Year Navigator (Minimum 2025) */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5 shadow-2xs">
                    <button
                      type="button"
                      disabled={selectedYear <= 2025}
                      onClick={() => setSelectedYear((y) => Math.max(2025, y - 1))}
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center text-focus transition-colors',
                        selectedYear <= 2025 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
                      )}
                      title="Previous Year (Minimum 2025)"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-[11px] text-focus px-1.5 font-mono tabular-nums">
                      {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-focus transition-colors cursor-pointer"
                      title="Next Year"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Monthly Calendar Matrix (12 months of selected year) */}
                {bill.billingCycle === 'Monthly' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {MONTH_NAMES.map((monthAbbr, idx) => {
                      const monthNum = idx + 1
                      const monthKey = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
                      const lastDayOfMonth = new Date(selectedYear, monthNum, 0).getDate()
                      const effectiveDay = Math.min(dueDay, lastDayOfMonth)
                      const periodDateStr = `${monthKey}-${String(effectiveDay).padStart(2, '0')}`

                      // Look for matching period in schedule
                      const scheduledPeriod = paymentSchedule.find((p) => p.key === monthKey)
                      const isPaid = Boolean(scheduledPeriod?.paid && !scheduledPeriod?.partiallyPaid)
                      const isPartiallyPaid = Boolean(scheduledPeriod?.partiallyPaid)
                      const isOverdue =
                        !isPaid &&
                        !isPartiallyPaid &&
                        ((scheduledPeriod && !scheduledPeriod.isFuture && (scheduledPeriod.periodDate || '') < todayStr) ||
                          (!scheduledPeriod && periodDateStr < todayStr))
                      const isDueCurrent =
                        !isPaid && !isPartiallyPaid && !isOverdue && monthKey === currentPeriodKey
                      const isSelected = paymentPeriod?.key === monthKey

                      return (
                        <div
                          key={monthKey}
                          className={cn(
                            'p-1.5 rounded-lg border text-left transition-all relative flex flex-col justify-between min-h-[50px] select-none',
                            isSelected
                              ? 'border-[#960C01] bg-[#960C01]/5 ring-1.5 ring-[#960C01] shadow-xs'
                              : isPaid
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                              : isPartiallyPaid
                              ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                              : isOverdue
                              ? 'border-rose-300 bg-rose-50/80 text-rose-950'
                              : isDueCurrent
                              ? 'border-blue-200 bg-blue-50/70 text-blue-950'
                              : 'border-slate-200 bg-white text-slate-700'
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={cn(
                                'text-[11px] font-bold truncate',
                                isSelected ? 'text-[#960C01]' : 'text-focus'
                              )}
                            >
                              {monthAbbr}
                            </span>
                            {isSelected && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-[#960C01] text-white shrink-0">
                                Paying
                              </span>
                            )}
                          </div>

                          <div className="text-[9px] text-muted-fg font-medium truncate">
                            Day {effectiveDay}
                          </div>

                          <div className="mt-0.5 pt-0.5 border-t border-slate-200/50 flex items-center justify-between">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700">
                                <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span>Paid</span>
                              </span>
                            ) : isPartiallyPaid ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700">
                                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span>Partial</span>
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700">
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                <span>Overdue</span>
                              </span>
                            ) : isDueCurrent ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-700">
                                <Clock className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span>Due</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-medium">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Non-Monthly Billing Cycle (fallback) */}
                {bill.billingCycle !== 'Monthly' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {paymentSchedule.map((period) => {
                      const isSelected = paymentPeriod?.key === period.key
                      const isPaid = Boolean(period.paid && !period.partiallyPaid)
                      const isPartiallyPaid = Boolean(period.partiallyPaid)
                      const isOverdue =
                        !isPaid && !isPartiallyPaid && !period.isFuture && (period.periodDate || '') < todayStr
                      return (
                        <div
                          key={period.key}
                          className={cn(
                            'p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between select-none',
                            isSelected
                              ? 'border-[#960C01] bg-[#960C01]/5 ring-1.5 ring-[#960C01]'
                              : isPaid
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : isPartiallyPaid
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : isOverdue
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : 'border-slate-200 bg-white text-slate-600'
                          )}
                        >
                          <div className="font-bold text-[11px] truncate">{period.label}</div>
                          <div className="text-[9px] mt-0.5 flex items-center gap-1">
                            {isPaid ? (
                              <span className="font-semibold text-emerald-700">Paid</span>
                            ) : isPartiallyPaid ? (
                              <span className="font-semibold text-amber-700">Partial</span>
                            ) : isOverdue ? (
                              <span className="font-semibold text-rose-700">Overdue</span>
                            ) : (
                              <span>Upcoming</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Billing Period Card */}
              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">
                    Target Billing Period
                  </span>
                  <span className="text-xs font-bold text-focus block mt-0.5">
                    {paymentPeriod?.label || 'No period selected'}
                  </span>
                  <span className="text-[10px] text-muted-fg block mt-0.5">
                    Scheduled Due Date: {paymentPeriod?.periodDate || bill.dueDate}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                      paymentPeriod?.partiallyPaid
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : paymentPeriod?.paid
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : !paymentPeriod?.isFuture && (paymentPeriod?.periodDate || '') < todayStr
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    )}
                  >
                    {paymentPeriod?.partiallyPaid
                      ? 'Partially Paid'
                      : paymentPeriod?.paid
                      ? 'Already Paid'
                      : !paymentPeriod?.isFuture && (paymentPeriod?.periodDate || '') < todayStr
                      ? 'Overdue Due'
                      : 'Current Due'}
                  </span>
                  {paymentPeriod?.partiallyPaid && paymentPeriod.remainingAmount !== undefined && (
                    <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
                      Remaining: {formatPHP(paymentPeriod.remainingAmount)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Payment Inputs & Action Buttons */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                {/* Payment Amount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bill-pay-amount" className="text-xs font-semibold text-focus">
                      Amount Paid (PHP) <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-fg font-medium">
                      Monthly: <span className="font-bold text-focus">{formatPHP(bill.amount)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-fg">
                      ₱
                    </span>
                    <Input
                      id="bill-pay-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxAllowedAmount}
                      onWheel={(e) => e.currentTarget.blur()}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      className={cn(
                        'pl-7 h-9 rounded-xl text-xs font-semibold border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus',
                        isExceeding && 'border-red-500 text-red-600 focus-visible:ring-red-500'
                      )}
                      required
                    />
                  </div>
                  {isExceeding ? (
                    <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>
                        {isPartiallyPaid
                          ? `Cannot exceed remaining balance (${formatPHP(maxAllowedAmount)})`
                          : `Cannot exceed Monthly Bill Amount (${formatPHP(bill.amount)})`}
                      </span>
                    </p>
                  ) : isPartiallyPaid && paymentPeriod?.remainingAmount !== undefined ? (
                    <p className="text-[10px] text-amber-800 font-medium">
                      Remaining balance: {formatPHP(paymentPeriod.remainingAmount)}
                    </p>
                  ) : parsedAmount > 0 && parsedAmount < bill.amount ? (
                    <p className="text-[10px] text-amber-700 font-medium">
                      Partial payment. Remaining: {formatPHP(bill.amount - parsedAmount)}
                    </p>
                  ) : null}
                </div>

                {/* Payment Date */}
                <div className="space-y-1">
                  <Label htmlFor="bill-pay-date" className="text-xs font-semibold text-focus block">
                    Payment Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bill-pay-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-9 rounded-xl text-xs border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-focus block">
                    Payment Method <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    {PAYMENT_METHODS.map((pm) => {
                      const isSelected = paymentMethod === pm
                      return (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMethod(pm)}
                          className={cn(
                            'px-2 py-1.5 rounded-lg text-[10px] font-medium border text-center transition-all cursor-pointer truncate',
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
                <div className="space-y-1">
                  <Label htmlFor="bill-pay-ref" className="text-[11px] font-semibold text-focus block">
                    Reference / OR No. (Optional)
                  </Label>
                  <Input
                    id="bill-pay-ref"
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. OR# 98234 / BDO-98234-X"
                    className="h-8.5 rounded-xl text-xs border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>

                {/* Notes / Remarks */}
                <div className="space-y-1">
                  <Label htmlFor="bill-pay-notes" className="text-[11px] font-semibold text-focus block">
                    Notes / Remarks (Optional)
                  </Label>
                  <Input
                    id="bill-pay-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid online by finance"
                    className="h-8.5 rounded-xl text-xs border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-stroke/20 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="rounded-xl h-9 px-4 text-xs font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !paymentPeriod || parsedAmount <= 0 || isExceeding}
                  className="rounded-xl h-9 px-5 text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Bill</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
