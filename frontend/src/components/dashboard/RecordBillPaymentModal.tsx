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
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Coins,
  Lock,
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
  const [paymentCalendarMonth, setPaymentCalendarMonth] = React.useState<Date>(() => new Date())
  const [paymentPeriod, setPaymentPeriod] = React.useState<BillPaymentPeriod | null>(null)
  const [paymentMethod, setPaymentMethod] = React.useState<string>('Cash')
  const [referenceNo, setReferenceNo] = React.useState<string>('')
  const [notes, setNotes] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

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

      const todayIso = new Date().toISOString().slice(0, 10)
      const initialDate = nextP?.periodDate || todayIso

      setAmountInput(String(remaining > 0 ? remaining : bill.amount))
      setPaymentDate(initialDate)
      setPaymentCalendarMonth(new Date(`${initialDate.slice(0, 7)}-01T00:00:00`))
      setPaymentPeriod(nextP)
      setPaymentMethod('Cash')
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)
    }
  }, [open, bill])

  if (!bill) return null

  const paymentSchedule = getBillPaymentOptions(bill).periods
  const parsedAmount = parseFloat(amountInput)
  const isPartiallyPaid = Boolean(paymentPeriod?.partiallyPaid)
  const remainingBalance =
    paymentPeriod?.remainingAmount !== undefined && paymentPeriod.remainingAmount > 0
      ? paymentPeriod.remainingAmount
      : bill.amount
  const maxAllowedAmount = isPartiallyPaid ? remainingBalance : bill.amount
  const isAmountValid =
    !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= maxAllowedAmount

  const paidByDateMap = new Map<string, number>()
  ;(bill.payments || []).forEach((p) => {
    if (!p.paymentDate) return
    paidByDateMap.set(p.paymentDate, (paidByDateMap.get(p.paymentDate) || 0) + (p.amount || 0))
  })

  const paidOnSelectedDate = paidByDateMap.get(paymentDate) || 0
  const isDateAlreadySettled = paidOnSelectedDate >= bill.amount - 0.005 && bill.amount > 0
  const willBePartiallyPaid =
    isAmountValid && parsedAmount < maxAllowedAmount - 0.005

  const handleSelectDate = (dateStr: string) => {
    setError('')
    setPaymentDate(dateStr)
    const monthKey = dateStr.slice(0, 7)
    const matchedPeriod = paymentSchedule.find((p) => p.key === monthKey)
    if (matchedPeriod) {
      setPaymentPeriod(matchedPeriod)
      const rem =
        matchedPeriod.remainingAmount !== undefined && matchedPeriod.remainingAmount > 0
          ? matchedPeriod.remainingAmount
          : bill.amount
      setAmountInput(String(rem))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!paymentDate) {
      setError('Please select a payment date.')
      return
    }

    if (!isAmountValid) {
      setError(
        parsedAmount < 1
          ? 'Payment amount cannot be lower than ₱1.00.'
          : `Payment amount cannot exceed ${formatPHP(maxAllowedAmount)}.`
      )
      return
    }

    const periodKeyToUse = paymentPeriod?.key || paymentDate.slice(0, 7)

    try {
      setIsSubmitting(true)
      const updated = await billsService.recordPayment(bill.id, {
        periodKey: periodKeyToUse,
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        refNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setSuccessBanner(`Payment of ${formatPHP(parsedAmount)} recorded!`)
      if (onBillPaid) {
        onBillPaid(updated)
      }

      setTimeout(() => {
        onOpenChange(false)
      }, 600)
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] md:max-w-[920px] max-h-[88vh] overflow-y-auto bg-white rounded-[24px] p-6 sm:p-7 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            <span>Record Payment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-fg">
            Record payment remittance for{' '}
            <strong className="text-focus">{bill.billerName}</strong> ({bill.billingCycle} Schedule).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Inline Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Date Settlement Alert if already paid */}
          {isDateAlreadySettled && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Date Already Settled ({paymentDate})</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Full bill payment for this calendar date has already been recorded and locked. Please select an unpaid or partially paid date from the calendar on the left.
              </p>
            </div>
          )}

          {/* Two-Column Layout: Left = Calendar, Right = Payment Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Interactive Calendar Date Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-focus">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-focus">
                  {paymentDate ? `Selected: ${paymentDate}` : 'Please select date'}
                </span>
              </div>

              <div className="border border-stroke/60 rounded-xl p-3.5 bg-white space-y-2.5">
                {/* Month Header & Controls */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-focus">
                    {paymentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(paymentCalendarMonth)
                        prev.setMonth(prev.getMonth() - 1)
                        setPaymentCalendarMonth(prev)
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 text-muted-fg hover:text-focus cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(paymentCalendarMonth)
                        next.setMonth(next.getMonth() + 1)
                        setPaymentCalendarMonth(next)
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 text-muted-fg hover:text-focus cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-muted-fg uppercase py-1 border-b border-slate-100">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid */}
                {(() => {
                  const calYear = paymentCalendarMonth.getFullYear()
                  const calMonth = paymentCalendarMonth.getMonth()
                  const firstDay = new Date(calYear, calMonth, 1).getDay()
                  const totalDays = new Date(calYear, calMonth + 1, 0).getDate()

                  return (
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`cal-empty-${i}`} className="h-9" />
                      ))}

                      {Array.from({ length: totalDays }).map((_, i) => {
                        const d = i + 1
                        const dStr = String(d).padStart(2, '0')
                        const mStr = String(calMonth + 1).padStart(2, '0')
                        const dateStr = `${calYear}-${mStr}-${dStr}`

                        const paidOnDate = paidByDateMap.get(dateStr) || 0
                        const isPaid = paidOnDate >= bill.amount - 0.005 && bill.amount > 0
                        const isPartial = !isPaid && paidOnDate > 0
                        const isSelected = paymentDate === dateStr
                        const isDisabled = isPaid

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (!isDisabled) {
                                handleSelectDate(dateStr)
                              }
                            }}
                            className={cn(
                              'h-9 rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all',
                              isSelected &&
                                'bg-[#960C01] text-white font-bold shadow-xs ring-2 ring-[#960C01]/30 z-10',
                              !isSelected &&
                                isPaid &&
                                'bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-not-allowed opacity-90',
                              !isSelected &&
                                isPartial &&
                                'bg-amber-50 text-amber-800 border border-amber-300 cursor-pointer font-semibold',
                              !isSelected &&
                                !isPaid &&
                                !isPartial &&
                                'hover:bg-slate-100 text-focus cursor-pointer hover:font-bold border border-transparent'
                            )}
                            title={
                              isPaid
                                ? `${dateStr}: Fully Paid & Locked`
                                : isPartial
                                ? `${dateStr}: Partially Paid (${formatPHP(paidOnDate)})`
                                : `Select ${dateStr}`
                            }
                          >
                            <span>{d}</span>
                            {isPaid && <Check className="h-2.5 w-2.5 text-emerald-600 -mt-0.5" />}
                            {isPartial && !isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute bottom-1" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-fg pt-2 border-t border-slate-100 gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Paid (Locked)
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#960C01] inline-block" /> Selected
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Partially Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Amount, Payment Method, Receipt No., Remarks/Notes */}
            <div className="space-y-3.5">
              {/* Payment Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-focus">
                    Payment Amount (₱) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-fg font-medium">
                    Target: {formatPHP(maxAllowedAmount)} • Max: {formatPHP(maxAllowedAmount)}
                  </span>
                </div>
                <Input
                  required
                  type="number"
                  min="1"
                  max={maxAllowedAmount}
                  step="any"
                  value={amountInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    setError('')
                    setAmountInput(e.target.value)
                  }}
                  placeholder="Enter payment amount"
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {amountInput && !isAmountValid && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {parsedAmount < 1
                      ? 'Payment amount cannot be lower than ₱1.00.'
                      : `Payment amount cannot exceed ${formatPHP(maxAllowedAmount)}.`}
                  </p>
                )}
                {isAmountValid && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl border text-xs bg-slate-50/80 border-slate-200/80">
                    <span className="text-muted-fg font-medium">Transaction Status Tag:</span>
                    {willBePartiallyPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Partially Paid ({formatPHP(Math.max(0, maxAllowedAmount - parsedAmount))} short of target)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Paid</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Maya">Maya</option>
                </select>
              </div>

              {/* Receipt / Ref No. */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Receipt / Ref No.
                </label>
                <Input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. OR-88201"
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter payment remarks or notes..."
                  className="w-full p-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20 resize-none transition-all placeholder:text-muted-fg/60"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              disabled={isSubmitting || !isAmountValid || isDateAlreadySettled || !paymentDate}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Review & Confirm Payment</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
