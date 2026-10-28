import * as React from 'react'
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { formatPHP } from '@/lib/format'
import {
  getBillPaymentOptions,
  type BillItem,
} from '@/services/billsService'
import {
  MONTH_NAMES,
  MONTH_FULL_NAMES,
} from '@/components/dashboard/RecordBillPaymentModal'
import { cn } from '@/lib/utils'

interface BillDetailPageViewProps {
  bill: BillItem
  onBack: () => void
  onPay: () => void
  onEdit: () => void
  onDelete: () => void
  onMarkAudit?: (status: 'Verified' | 'Flagged') => void
  isAudit: boolean
}

const HISTORY_PAGE_SIZE = 10

export const BillDetailPageView: React.FC<BillDetailPageViewProps> = ({
  bill,
  onBack,
  onPay,
  onEdit,
  onDelete,
  onMarkAudit,
  isAudit,
}) => {
  const [calendarYear, setCalendarYear] = React.useState<number>(() => {
    const targetDate = bill.dueDate
    const parsedYear = targetDate ? parseInt(targetDate.slice(0, 4), 10) : new Date().getFullYear()
    return !isNaN(parsedYear) ? Math.max(2025, parsedYear) : Math.max(2025, new Date().getFullYear())
  })
  const [historyPage, setHistoryPage] = React.useState<number>(1)

  const todayStr = new Date().toISOString().slice(0, 10)
  const currentPeriodKey = todayStr.slice(0, 7)
  const schedule = getBillPaymentOptions(bill).periods
  const dueDay = bill.dueDayOfMonth || parseInt(bill.dueDate?.slice(8, 10) || '15', 10) || 15

  const payments = bill.payments || []
  const totalHistoryPages = Math.max(1, Math.ceil(payments.length / HISTORY_PAGE_SIZE))
  const paginatedPayments = payments.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  )
  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Header Row with Back Button and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-10 px-4 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-stroke/50 bg-white text-focus hover:bg-surface"
          >
            <ArrowLeft className="w-4 h-4 text-focus/70" />
            <span>Back to Bills</span>
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <span className="hover:text-focus cursor-pointer transition-colors" onClick={onBack}>
              Monthly Bills
            </span>
            <span>/</span>
            <span className="font-semibold text-focus truncate max-w-[200px] sm:max-w-xs">
              {bill.billerName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isAudit && (
            <>
              <Button
                type="button"
                onClick={onPay}
                className="h-10 px-4 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Bill</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className="h-10 px-3.5 rounded-xl border border-stroke/50 bg-white text-focus hover:bg-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-fg" />
                <span>Edit</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                className="h-10 px-3.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </Button>
            </>
          )}

          {isAudit && onMarkAudit && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => onMarkAudit('Verified')}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Audit</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onMarkAudit('Flagged')}
                className="h-10 px-4 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Mark as Discrepancy</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Bill Overview Card */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Receipt className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-focus tracking-tight">
                  {bill.billerName}
                </h1>
                {bill.status === 'Paid' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paid</span>
                  </span>
                ) : bill.status === 'Partially Paid' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Partially Paid</span>
                  </span>
                ) : bill.status === 'Overdue' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Overdue</span>
                  </span>
                ) : bill.status === 'Due Soon' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Due Soon</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unpaid</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-fg flex-wrap">
                <span className="font-semibold text-focus/90 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-fg" />
                  {bill.company}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-muted-fg" />
                  {bill.category}
                </span>
                {bill.accountNo && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-focus/80">Account #{bill.accountNo}</span>
                  </>
                )}
                <span>•</span>
                <span className="font-medium text-slate-600">{bill.billingCycle} Recurring</span>
              </div>
            </div>
          </div>

          <div className="lg:text-right">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Monthly Obligation Amount
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#960C01] tabular-nums tracking-tight block mt-0.5">
              {formatPHP(bill.amount)}
            </span>
            <span className="text-xs text-muted-fg block mt-1">
              Scheduled Due Date: <strong className="text-focus">{bill.dueDate}</strong> (Remind {bill.reminderDaysBefore}d before)
            </span>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Total Payments Made
            </span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums block">
              {formatPHP(totalPaidAmount)}
            </span>
            <span className="text-[11px] text-muted-fg block">
              {payments.length} payment record{payments.length === 1 ? '' : 's'} recorded
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Due Day of Cycle
            </span>
            <span className="text-xl font-bold text-focus tabular-nums block">
              Day {dueDay}
            </span>
            <span className="text-[11px] text-muted-fg block">
              Every {bill.billingCycle.toLowerCase()} cycle
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Latest Settlement
            </span>
            <span className="text-xl font-bold text-focus truncate block">
              {bill.lastPaidDate || 'None recorded'}
            </span>
            <span className="text-[11px] text-muted-fg block">
              {bill.lastPaymentMethod ? `Via ${bill.lastPaymentMethod}` : 'Pending settlement'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Compliance & Audit
            </span>
            <span className={cn(
              'text-xl font-bold truncate block',
              bill.auditStatus === 'Verified'
                ? 'text-emerald-700'
                : bill.auditStatus === 'Flagged'
                ? 'text-amber-700'
                : 'text-slate-600'
            )}>
              {bill.auditStatus || 'Pending Audit'}
            </span>
            <span className="text-[11px] text-muted-fg block">
              {bill.auditDate ? `Verified on ${bill.auditDate}` : 'Internal audit review'}
            </span>
          </div>
        </div>

        {bill.notes && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs">
            <span className="font-bold text-amber-900 block mb-0.5">Notes & Particulars:</span>
            <p className="text-amber-950 font-medium leading-relaxed">{bill.notes}</p>
          </div>
        )}
      </Card>

      {/* Payment Schedule Calendar Matrix */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#960C01]" />
            <div>
              <h3 className="text-base font-bold text-focus">Payment Schedule Calendar</h3>
              <p className="text-xs text-muted-fg">Annual schedule of paid obligations, upcoming due dates, and arrears</p>
            </div>
          </div>

          {/* Year Navigator (Minimum 2025) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              disabled={calendarYear <= 2025}
              onClick={() => setCalendarYear((y) => Math.max(2025, y - 1))}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center text-focus transition-colors',
                calendarYear <= 2025
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-white cursor-pointer'
              )}
              title="Previous Year (Minimum 2025)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-focus px-3 font-mono tabular-nums">
              {calendarYear}
            </span>
            <button
              type="button"
              onClick={() => setCalendarYear((y) => y + 1)}
              className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-focus transition-colors cursor-pointer"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12-Month Calendar Grid */}
        {bill.billingCycle === 'Monthly' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {MONTH_NAMES.map((monthAbbr, idx) => {
              const monthNum = idx + 1
              const monthKey = `${calendarYear}-${String(monthNum).padStart(2, '0')}`
              const lastDayOfMonth = new Date(calendarYear, monthNum, 0).getDate()
              const effectiveDay = Math.min(dueDay, lastDayOfMonth)
              const periodDateStr = `${monthKey}-${String(effectiveDay).padStart(2, '0')}`

              const scheduledPeriod = schedule.find((p) => p.key === monthKey)
              const isPaid = Boolean(scheduledPeriod?.paid && !scheduledPeriod?.partiallyPaid)
              const isPartiallyPaid = Boolean(scheduledPeriod?.partiallyPaid)
              const isOverdue =
                !isPaid &&
                !isPartiallyPaid &&
                ((scheduledPeriod && !scheduledPeriod.isFuture && (scheduledPeriod.periodDate || '') < todayStr) ||
                  (!scheduledPeriod && periodDateStr < todayStr))
              const isDueCurrent =
                !isPaid && !isPartiallyPaid && !isOverdue && monthKey === currentPeriodKey

              const paidAmount = scheduledPeriod?.paidAmount || 0
              const remainingAmount =
                scheduledPeriod?.remainingAmount !== undefined
                  ? scheduledPeriod.remainingAmount
                  : Math.max(0, bill.amount - paidAmount)

              return (
                <div
                  key={monthKey}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[96px] select-none',
                    isPaid
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-2xs'
                      : isPartiallyPaid
                      ? 'border-amber-300 bg-amber-50/80 text-amber-950 shadow-2xs'
                      : isOverdue
                      ? 'border-rose-300 bg-rose-50/80 text-rose-950 shadow-2xs'
                      : isDueCurrent
                      ? 'border-blue-200 bg-blue-50/70 text-blue-950 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold truncate text-focus">
                        {MONTH_FULL_NAMES[idx]}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-fg font-medium truncate mt-0.5">
                      Due: {monthAbbr} {effectiveDay}
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Paid</span>
                        </span>
                      ) : isPartiallyPaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Partial</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Overdue</span>
                        </span>
                      ) : isDueCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>Due Soon</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Upcoming</span>
                      )}

                      {scheduledPeriod?.paymentDate && (
                        <span className="text-[10px] text-emerald-600/90 font-mono truncate">
                          {scheduledPeriod.paymentDate.slice(5)}
                        </span>
                      )}
                    </div>

                    {isPartiallyPaid && (
                      <div className="text-[10px] text-amber-900 font-medium font-mono pt-1 border-t border-amber-200/50 flex flex-col">
                        <span>Paid: {formatPHP(paidAmount)}</span>
                        <span className="font-bold text-amber-800">
                          Rem: {formatPHP(remainingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {schedule.map((period) => {
              const isPaid = Boolean(period.paid && !period.partiallyPaid)
              const isPartiallyPaid = Boolean(period.partiallyPaid)
              const isOverdue =
                !isPaid && !isPartiallyPaid && !period.isFuture && (period.periodDate || '') < todayStr
              return (
                <div
                  key={period.key}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all flex flex-col justify-between select-none',
                    isPaid
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : isPartiallyPaid
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : isOverdue
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  <div className="font-bold text-xs truncate">{period.label}</div>
                  <div className="text-[11px] mt-2 flex items-center gap-1">
                    {isPaid ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold">Paid</span>
                      </>
                    ) : isPartiallyPaid ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold">Partially Paid</span>
                      </>
                    ) : isOverdue ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span className="font-semibold">Overdue</span>
                      </>
                    ) : (
                      <span>Upcoming</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Full-Width Payment History Table Card */}
      <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#960C01]" />
            <div>
              <h3 className="text-base font-bold text-focus">Payment History</h3>
              <p className="text-xs text-muted-fg">Detailed audit log of all remittances, settlement methods, and receipts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
              {payments.length} Record{payments.length === 1 ? '' : 's'}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              Total Paid: {formatPHP(totalPaidAmount)}
            </span>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="border-b border-slate-200/80 bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[15%]">
                  PERIOD
                </TableHead>
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[18%]">
                  PAYMENT DATE
                </TableHead>
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-right w-[18%]">
                  AMOUNT PAID
                </TableHead>
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[18%]">
                  PAYMENT METHOD
                </TableHead>
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[16%]">
                  REFERENCE NO.
                </TableHead>
                <TableHead className="px-4 py-3.5 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[15%]">
                  NOTES / REMARKS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-fg">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-focus text-sm">No payment history records yet</p>
                      <p className="text-xs text-muted-fg">
                        Payments recorded through "Pay Bill" will be catalogued here with full audit trails.
                      </p>
                      {!isAudit && (
                        <Button
                          type="button"
                          onClick={onPay}
                          className="mt-2 h-9 px-4 rounded-xl bg-[#960C01] hover:bg-[#800a01] text-white text-xs font-semibold cursor-pointer"
                        >
                          + Record First Payment
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <TableCell className="px-4 py-3.5 font-bold text-[#960C01] font-mono text-xs">
                      {p.periodKey ? `Period ${p.periodKey}` : 'Billing Period'}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-medium text-focus text-xs">
                      {p.paymentDate}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-bold text-emerald-700 text-right tabular-nums text-xs">
                      {formatPHP(p.amount)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-focus font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {p.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs font-mono text-focus/80">
                      {p.refNo || '—'}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-muted-fg">
                      {p.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {payments.length > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
            <span className="font-medium text-focus/80">
              Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}-
              {Math.min(historyPage * HISTORY_PAGE_SIZE, payments.length)} of {payments.length} records
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted-fg italic">
                Page {historyPage} out of {totalHistoryPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Previous history page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Next history page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
