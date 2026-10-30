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
  HandCoins,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Loader2,
  Check,
  FileText,
} from 'lucide-react'
import { formatPHP } from '@/lib/format'
import { loanService, type LoanItem } from '@/services/loanService'
import { expenseService, type ExpenseItem } from '@/services/expenseService'
import { cn } from '@/lib/utils'

export interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan?: LoanItem | null
  expense?: ExpenseItem | null
  onLoanPaid?: (updatedLoan: LoanItem) => void
  onExpensePaid?: (updatedExpense: ExpenseItem) => void
  onViewAuditDetails?: () => void
}

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Cheque',
  'GCash',
  'Maya',
  'In-house',
] as const

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  open,
  onOpenChange,
  loan,
  expense,
  onLoanPaid,
  onExpensePaid,
  onViewAuditDetails,
}) => {
  const isLoan = Boolean(loan)
  const isExpense = Boolean(!loan && expense)

  // Derived financials
  const totalAmount = isLoan
    ? loan?.amount || 0
    : expense?.withdrawal || expense?.netAmount || 0

  const totalPaidSoFar = isLoan
    ? loan?.totalPaid || 0
    : expense?.totalPaid || 0

  const outstandingBalance = isLoan
    ? (loan?.outstandingBalance !== undefined ? loan.outstandingBalance : Math.max(0, totalAmount - totalPaidSoFar))
    : (expense?.outstandingBalance !== undefined ? expense.outstandingBalance : Math.max(0, totalAmount - totalPaidSoFar))

  // Form states
  const [paymentMode, setPaymentMode] = React.useState<'partial' | 'full'>('partial')
  const [amountInput, setAmountInput] = React.useState<string>('')
  const [paymentDate, setPaymentDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [paymentMethod, setPaymentMethod] = React.useState<string>('Cash')
  const [referenceNo, setReferenceNo] = React.useState<string>('')
  const [notes, setNotes] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Reset or initialize on open
  React.useEffect(() => {
    if (open) {
      setPaymentMode('partial')
      setAmountInput('')
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setPaymentMethod('Cash')
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)
    }
  }, [open, loan, expense])

  // Handle Full payment mode switch
  const handleModeChange = (mode: 'partial' | 'full') => {
    setPaymentMode(mode)
    if (mode === 'full') {
      setAmountInput(String(outstandingBalance))
    } else {
      setAmountInput('')
    }
    setError('')
  }

  // Quick preset button handler
  const handlePresetAmount = (val: number) => {
    const capped = Math.min(val, outstandingBalance)
    setAmountInput(String(capped))
    if (capped === outstandingBalance) {
      setPaymentMode('full')
    } else {
      setPaymentMode('partial')
    }
    setError('')
  }

  const numericAmount = parseFloat(amountInput) || 0
  const projectedRemaining = Math.max(0, outstandingBalance - numericAmount)
  const willBeFullyPaid = numericAmount >= outstandingBalance && outstandingBalance > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.')
      return
    }

    if (numericAmount > outstandingBalance) {
      setError(
        `Payment amount (₱${numericAmount.toLocaleString('en-US')}) cannot exceed remaining balance (₱${outstandingBalance.toLocaleString('en-US')}).`
      )
      return
    }

    setIsSubmitting(true)
    try {
      if (isLoan && loan) {
        const updated = await loanService.recordRepayment(loan.id, {
          amount: numericAmount,
          paymentDate,
          referenceNo: referenceNo.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        })
        setSuccessBanner(`Payment of ${formatPHP(numericAmount)} successfully recorded!`)
        if (onLoanPaid) onLoanPaid(updated)
        setTimeout(() => {
          onOpenChange(false)
        }, 800)
      } else if (isExpense && expense) {
        const updated = await expenseService.recordExpensePayment(expense.id, {
          amount: numericAmount,
          paymentDate,
          referenceNo: referenceNo.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        })
        setSuccessBanner(`Payment of ${formatPHP(numericAmount)} successfully recorded!`)
        if (onExpensePaid) onExpensePaid(updated)
        setTimeout(() => {
          onOpenChange(false)
        }, 800)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!loan && !expense) return null

  // Badging helper
  const getStatusBadge = () => {
    const st = isLoan ? loan?.status : expense?.status
    if (st === 'Paid' || outstandingBalance <= 0) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: CheckCircle2,
        label: 'Fully Paid / Settled',
      }
    }
    if (st === 'Partially Paid' || totalPaidSoFar > 0) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
        icon: Clock,
        label: 'Partially Paid',
      }
    }
    if (st === 'Overdue') {
      return {
        bg: 'bg-red-50 text-red-700 border-red-200/80',
        icon: AlertTriangle,
        label: 'Overdue',
      }
    }
    return {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      icon: Clock,
      label: st || 'Pending Repayment',
    }
  }

  const statusBadge = getStatusBadge()
  const StatusIcon = statusBadge.icon

  // Previous repayments list
  const repaymentsHistory = isLoan
    ? loan?.repayments || []
    : expense?.repayments || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        {/* 1. Header */}
        <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#960C01]/10 text-[#960C01] flex items-center justify-center shrink-0 shadow-xs">
                {isLoan ? (
                  <HandCoins className="w-5 h-5 text-[#960C01]" />
                ) : (
                  <Receipt className="w-5 h-5 text-[#960C01]" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-focus leading-tight">
                  {isLoan ? 'Update Loan Repayment' : 'Update Expense Payment'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg mt-0.5">
                  {isLoan
                    ? `Record partial or full payment for borrowed loan facility ${loan?.refNo}`
                    : `Record partial or settled payment for expense transaction ${expense?.refNo}`}
                </DialogDescription>
              </div>
            </div>

            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs',
                statusBadge.bg
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusBadge.label}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Success Banner */}
        {successBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* 2. Financial Metrics: Principal / Total Paid / Remaining Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg block">
              {isLoan ? 'Total Borrowed' : 'Total Expense'}
            </span>
            <span className="text-base sm:text-lg font-bold text-focus mt-0.5 block tabular-nums">
              {formatPHP(totalAmount)}
            </span>
            <span className="text-[10px] text-muted-fg block mt-0.5">Original obligation</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 block">
              Total Paid So Far
            </span>
            <span className="text-base sm:text-lg font-bold text-blue-900 mt-0.5 block tabular-nums">
              {formatPHP(totalPaidSoFar)}
            </span>
            <span className="text-[10px] text-blue-600/80 block mt-0.5">
              {totalAmount > 0
                ? `${((totalPaidSoFar / totalAmount) * 100).toFixed(0)}% settled`
                : '0% settled'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block">
              Remaining Balance
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-950 mt-0.5 block tabular-nums">
              {formatPHP(outstandingBalance)}
            </span>
            <span className="text-[10px] text-amber-700/80 block mt-0.5">
              {outstandingBalance <= 0 ? 'Zero balance remaining' : 'Due for repayment'}
            </span>
          </div>
        </div>

        {/* 3. Information Pill Row */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-2 mt-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-muted-fg text-[10px] block uppercase font-medium">Ref No.</span>
              <span className="font-mono font-semibold text-focus block mt-0.5">
                {isLoan ? loan?.refNo : expense?.refNo}
              </span>
            </div>
            <div>
              <span className="text-muted-fg text-[10px] block uppercase font-medium">
                {isLoan ? 'Lender Company' : 'Vendor / Particulars'}
              </span>
              <span className="font-semibold text-focus block mt-0.5 truncate" title={isLoan ? loan?.lender : expense?.particulars}>
                {isLoan ? loan?.lender || '—' : expense?.particulars || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-fg text-[10px] block uppercase font-medium">Date Recorded</span>
              <span className="font-medium text-focus block mt-0.5">
                {isLoan ? loan?.date : expense?.date}
              </span>
            </div>
            <div>
              <span className="text-muted-fg text-[10px] block uppercase font-medium">
                {isLoan ? 'Due Date / Int. Rate' : 'Category'}
              </span>
              <span className="font-medium text-focus block mt-0.5">
                {isLoan
                  ? `${loan?.dueDate || '—'} (${loan?.interestRate || 0}%)`
                  : expense?.category}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Payment Submission Form */}
        {outstandingBalance > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-stroke/20 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-focus">Record a Repayment</h3>

              {/* Mode Toggle: Partial vs Full */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleModeChange('partial')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    paymentMode === 'partial'
                      ? 'bg-white text-focus shadow-2xs font-bold'
                      : 'text-muted-fg hover:text-focus'
                  )}
                >
                  Pay Partial
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('full')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    paymentMode === 'full'
                      ? 'bg-[#960C01] text-white shadow-2xs font-bold'
                      : 'text-muted-fg hover:text-focus'
                  )}
                >
                  Pay Full ({formatPHP(outstandingBalance)})
                </button>
              </div>
            </div>

            {/* Amount Field + Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-focus">
                  Repayment Amount (PHP) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-fg">
                  Max: <strong className="text-focus">{formatPHP(outstandingBalance)}</strong>
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-focus/70">
                  ₱
                </span>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  max={outstandingBalance}
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value)
                    setError('')
                  }}
                  placeholder="0.00"
                  className="pl-8 h-11 text-base font-bold tabular-nums rounded-xl border-stroke/60 focus-visible:ring-2 focus-visible:ring-focus"
                  autoFocus
                />
              </div>

              {/* Quick Preset Amount Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {[5000, 10000, 25000, 50000].map((preset) => {
                  if (preset >= outstandingBalance) return null
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetAmount(preset)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-focus transition-colors cursor-pointer"
                    >
                      + ₱{preset.toLocaleString('en-US')}
                    </button>
                  )
                })}
                {outstandingBalance > 1000 && (
                  <button
                    type="button"
                    onClick={() => handlePresetAmount(Math.round(outstandingBalance / 2))}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-focus transition-colors cursor-pointer"
                  >
                    50% (₱{Math.round(outstandingBalance / 2).toLocaleString('en-US')})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePresetAmount(outstandingBalance)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                  Full Balance
                </button>
              </div>

              {/* Projected Balance Preview Banner */}
              {numericAmount > 0 && numericAmount <= outstandingBalance && (
                <div
                  className={cn(
                    'mt-2.5 p-3 rounded-xl border flex items-center justify-between text-xs',
                    willBeFullyPaid
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-fg" />
                    <span>
                      New remaining balance after this payment:{' '}
                      <strong className="text-sm font-bold tabular-nums">
                        {formatPHP(projectedRemaining)}
                      </strong>
                    </span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      willBeFullyPaid
                        ? 'bg-emerald-200/80 text-emerald-800'
                        : 'bg-blue-200/80 text-blue-800'
                    )}
                  >
                    {willBeFullyPaid ? 'Will Mark as Fully Paid' : 'Will Remain Partially Paid'}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Details: Date, Payment Method & Cheque/Ref */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus">
                  Payment Date <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg pointer-events-none" />
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="pl-9 h-10 text-xs rounded-xl border-stroke/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus">
                  Reference / Cheque No. (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. OR-84920 or CHQ-1092"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="h-10 text-xs rounded-xl border-stroke/60 font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-focus">Payment Method</Label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                      paymentMethod === method
                        ? 'bg-[#960C01]/10 border-[#960C01] text-[#960C01] font-bold'
                        : 'bg-slate-50 border-stroke/50 text-focus/80 hover:bg-slate-100'
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks / Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus">Payment Notes (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. First partial installment for October rent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 text-xs rounded-xl border-stroke/60"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl p-2.5">
                {error}
              </p>
            )}

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-stroke/20">
              <div>
                {onViewAuditDetails && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onViewAuditDetails}
                    className="h-10 px-3 rounded-xl text-xs font-semibold text-muted-fg hover:text-focus hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                    title="Open full audit record & transaction log"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Audit Details</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
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
                  disabled={isSubmitting || numericAmount <= 0 || numericAmount > outstandingBalance}
                  className="h-10 px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Record Payment</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">This obligation is completely settled!</p>
                <p className="text-emerald-700/90 text-[11px] mt-0.5">
                  The remaining balance is ₱0.00. No further payments are required.
                </p>
              </div>
            </div>
            {onViewAuditDetails && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewAuditDetails}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer shrink-0"
              >
                Audit Details
              </Button>
            )}
          </div>
        )}

        {/* 5. Repayment History Timeline */}
        <div className="pt-5 border-t border-stroke/20 mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-fg">
              Repayment History ({repaymentsHistory.length})
            </h4>
            {repaymentsHistory.length > 0 && (
              <span className="text-[11px] text-muted-fg font-medium">
                Latest transactions on record
              </span>
            )}
          </div>

          {repaymentsHistory.length === 0 ? (
            <div className="py-6 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-muted-fg">
              No previous repayments recorded yet for this item.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-muted-fg border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ref No.</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Method / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repaymentsHistory.map((rep, idx) => (
                    <tr key={rep.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-focus whitespace-nowrap">
                        {rep.paymentDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg whitespace-nowrap">
                        {rep.referenceNo || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                        {formatPHP(rep.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-focus tabular-nums whitespace-nowrap">
                        {formatPHP(rep.remainingBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-fg max-w-[150px] truncate">
                        {rep.notes || rep.paymentMethod || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
