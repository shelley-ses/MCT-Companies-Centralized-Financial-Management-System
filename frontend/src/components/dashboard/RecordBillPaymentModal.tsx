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
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Hash,
  FileText,
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
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Reset or initialize on open
  React.useEffect(() => {
    if (open && bill) {
      setAmountInput(String(bill.amount))
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setPaymentPeriod(getBillPaymentOptions(bill).nextPayable)
      setPaymentMethod('Bank Transfer')
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)
    }
  }, [open, bill])

  if (!bill) return null

  const paymentSchedule = getBillPaymentOptions(bill).periods
  const parsedAmount = parseFloat(amountInput) || 0

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

    try {
      setIsSubmitting(true)
      if (!paymentPeriod) {
        setError('No unpaid billing period is available for this bill.')
        return
      }

      const updated = await billsService.recordPayment(bill.id, {
        periodKey: paymentPeriod.key,
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        refNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      setSuccessBanner(`Payment of ${formatPHP(parsedAmount)} recorded successfully!`)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-5 [&>button]:right-5">
        {/* Header matching other modals */}
        <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                Record Bill Payment
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                Settle the next bill period and capture settlement details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Bill Overview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs mt-1">
          <div>
            <div className="font-bold text-focus text-sm">{bill.billerName}</div>
            <div className="text-muted-fg flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
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
              Paying For
            </div>
            <div className="font-bold text-focus text-sm">
              {paymentPeriod?.label || bill.dueDate}
            </div>
          </div>
        </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="bill-payment-period" className="text-xs font-semibold text-focus block">
              Month / Billing Period You Are Paying
            </Label>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="text-[10px] font-bold uppercase tracking-wider">
                This payment will be recorded for
              </div>
              <div className="text-base font-bold mt-0.5">
                {paymentPeriod?.label || 'No period selected'}
              </div>
            </div>
            <select
              id="bill-payment-period"
              value={paymentPeriod?.key || ''}
              onChange={(event) => {
                const options = getBillPaymentOptions(bill).periods
                setPaymentPeriod(options.find((period) => period.key === event.target.value) || null)
              }}
              className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
              disabled={!paymentPeriod}
            >
              {paymentPeriod && (
                <option value={paymentPeriod.key}>
                  {paymentPeriod.label} — period being paid
                </option>
              )}
            </select>
            <p className="text-[11px] text-muted-fg">
              Periods must be settled in order. Once you are up to date, the next future period can be paid in advance.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-focus">
                Payment Schedule
              </Label>
              <span className="text-[11px] text-muted-fg">
                {bill.billingCycle} periods
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 space-y-1.5">
              {paymentSchedule.map((period) => (
                <div
                  key={period.key}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
                    period.key === paymentPeriod?.key
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : period.paid
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : period.isFuture
                      ? 'border-slate-200 bg-white text-slate-500'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{period.label}</div>
                    {period.paid && period.paymentDate && (
                      <div className="text-[10px] opacity-75">
                        Paid on {period.paymentDate}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold">
                    {period.key === paymentPeriod?.key
                      ? 'Next to pay'
                      : period.paid
                      ? 'Paid'
                      : period.isFuture
                      ? 'Available next'
                      : 'Outstanding'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-fg">
              Paid months, days, or years remain recorded here, including advance payments.
            </p>
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
                Scheduled: <span className="font-semibold text-focus">{formatPHP(bill.amount)}</span>
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
              disabled={isSubmitting}
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
